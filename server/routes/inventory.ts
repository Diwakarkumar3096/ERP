import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, requirePermission } from '../auth.js';
import { recordAuditLog } from '../audit.js';

const router = Router();

// Internal Notification Helper
async function createInventoryNotification({
  schoolId,
  userId,
  eventType,
  title,
  message,
  entityType,
  entityId,
  priority = 'NORMAL'
}: {
  schoolId: string;
  userId?: string | null;
  eventType: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  priority?: string;
}) {
  try {
    const id = `notif_inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(`
      INSERT INTO inventory_notifications (
        id, school_id, user_id, event_type, title, message, entity_type, entity_id, priority, is_read
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE)
    `, [id, schoolId, userId || null, eventType, title, message, entityType || null, entityId || null, priority]);
  } catch (err) {
    console.warn('[INVENTORY NOTIFICATION WARN]', err);
  }
}

// ==========================================
// 1. INVENTORY & ASSET DASHBOARD
// ==========================================
router.get('/dashboard', requireAuth, requirePermission('inventory.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    // Total Items & Stock Summary
    const itemStats = await db.query(`
      SELECT
        COUNT(*) as total_items,
        COALESCE(SUM(current_stock), 0) as total_stock_quantity,
        COUNT(CASE WHEN current_stock <= min_stock_level AND current_stock > 0 THEN 1 END) as low_stock_items,
        COUNT(CASE WHEN current_stock = 0 THEN 1 END) as out_of_stock_items,
        COALESCE(SUM(current_stock * unit_price), 0) as total_inventory_valuation
      FROM inventory_items
      WHERE school_id = $1 AND status = 'ACTIVE'
    `, [schoolId]);

    // Fixed Assets Summary
    const assetStats = await db.query(`
      SELECT
        COUNT(*) as total_assets,
        COUNT(CASE WHEN status = 'IN_USE' THEN 1 END) as active_in_use,
        COUNT(CASE WHEN status = 'AVAILABLE' THEN 1 END) as available_assets,
        COUNT(CASE WHEN status = 'UNDER_MAINTENANCE' THEN 1 END) as under_maintenance,
        COUNT(CASE WHEN status IN ('DAMAGED', 'LOST') THEN 1 END) as damaged_lost_assets,
        COALESCE(SUM(purchase_cost), 0) as total_asset_valuation
      FROM assets
      WHERE school_id = $1
    `, [schoolId]);

    // Procurement Pipeline
    const procStats = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM purchase_requests WHERE school_id = $1 AND status = 'PENDING') as pending_requests,
        (SELECT COUNT(*) FROM purchase_orders WHERE school_id = $1 AND status IN ('APPROVED', 'SENT', 'PARTIALLY_RECEIVED')) as active_orders,
        (SELECT COUNT(*) FROM goods_receipts WHERE school_id = $1) as total_receipts
    `, [schoolId]);

    // Recent Stock Movements
    const recentMovements = await db.query(`
      SELECT
        t.*,
        i.name as item_name,
        i.sku as item_sku,
        i.unit,
        s.name as store_name
      FROM inventory_stock_transactions t
      JOIN inventory_items i ON t.item_id = i.id
      JOIN inventory_stores s ON t.store_id = s.id
      WHERE t.school_id = $1
      ORDER BY t.created_at DESC
      LIMIT 6
    `, [schoolId]);

    // Low Stock Alert Items
    const lowStockList = await db.query(`
      SELECT
        i.*,
        c.name as category_name,
        s.name as store_name
      FROM inventory_items i
      JOIN inventory_categories c ON i.category_id = c.id
      LEFT JOIN inventory_stores s ON i.default_store_id = s.id
      WHERE i.school_id = $1 AND i.status = 'ACTIVE' AND i.current_stock <= i.reorder_level
      ORDER BY i.current_stock ASC
      LIMIT 6
    `, [schoolId]);

    // Category-wise Breakdown
    const categoryBreakdown = await db.query(`
      SELECT
        c.id,
        c.name,
        c.code,
        COUNT(i.id) as item_count,
        COALESCE(SUM(i.current_stock), 0) as total_stock,
        COALESCE(SUM(i.current_stock * i.unit_price), 0) as total_value
      FROM inventory_categories c
      LEFT JOIN inventory_items i ON i.category_id = c.id AND i.status = 'ACTIVE'
      WHERE c.school_id = $1 AND c.is_active = true
      GROUP BY c.id, c.name, c.code
      ORDER BY total_value DESC
    `, [schoolId]);

    return res.json({
      items: itemStats.rows[0],
      assets: assetStats.rows[0],
      procurement: procStats.rows[0],
      recentMovements: recentMovements.rows,
      lowStockList: lowStockList.rows,
      categoryBreakdown: categoryBreakdown.rows
    });
  } catch (err: any) {
    console.error('[INVENTORY DASHBOARD ERROR]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. INVENTORY CATEGORIES
// ==========================================
router.get('/categories', requireAuth, requirePermission('inventory.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const result = await db.query(`
      SELECT
        c.*,
        (SELECT COUNT(*) FROM inventory_items i WHERE i.category_id = c.id) as item_count,
        (SELECT COUNT(*) FROM assets a WHERE a.category_id = c.id) as asset_count
      FROM inventory_categories c
      WHERE c.school_id = $1
      ORDER BY c.name ASC
    `, [schoolId]);

    return res.json({ categories: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/categories', requireAuth, requirePermission('inventory.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { name, code, description, isActive } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Category Name and Code are required.' });
  }

  try {
    const catId = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const result = await db.query(`
      INSERT INTO inventory_categories (id, school_id, name, code, description, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [catId, schoolId, name.trim(), code.trim().toUpperCase(), description || null, isActive !== false]);

    recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId,
      action: 'CREATE_INVENTORY_CATEGORY',
      module: 'INVENTORY',
      description: `Created inventory category: ${name} (${code})`,
      details: { categoryId: catId, name }
    });

    return res.status(201).json({ category: result.rows[0], message: 'Inventory category created successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. INVENTORY STORES & WAREHOUSES
// ==========================================
router.get('/stores', requireAuth, requirePermission('inventory.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const result = await db.query(`
      SELECT
        s.*,
        concat(e.first_name, ' ', e.last_name) as incharge_name,
        e.employee_id_number as incharge_emp_id,
        (SELECT COUNT(*) FROM inventory_items i WHERE i.default_store_id = s.id) as items_count,
        (SELECT COUNT(*) FROM assets a WHERE a.current_store_id = s.id) as assets_count
      FROM inventory_stores s
      LEFT JOIN employees e ON s.responsible_employee_id = e.id
      WHERE s.school_id = $1
      ORDER BY s.name ASC
    `, [schoolId]);

    return res.json({ stores: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/stores', requireAuth, requirePermission('inventory.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { name, code, building, floor, roomNumber, responsibleEmployeeId, notes } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Store Name and Code are required.' });
  }

  try {
    const storeId = `store_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const result = await db.query(`
      INSERT INTO inventory_stores (
        id, school_id, name, code, building, floor, room_number, responsible_employee_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [storeId, schoolId, name.trim(), code.trim().toUpperCase(), building || null, floor || null, roomNumber || null, responsibleEmployeeId || null, notes || null]);

    return res.status(201).json({ store: result.rows[0], message: 'Store location created successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. INVENTORY ITEMS & STOCK
// ==========================================
router.get('/items', requireAuth, requirePermission('inventory.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const { categoryId, storeId, status, search, lowStock } = req.query;

  try {
    let sql = `
      SELECT
        i.*,
        c.name as category_name,
        c.code as category_code,
        s.name as store_name,
        s.code as store_code,
        (i.current_stock * i.unit_price) as stock_valuation,
        CASE
          WHEN i.current_stock = 0 THEN 'OUT_OF_STOCK'
          WHEN i.current_stock <= i.min_stock_level THEN 'CRITICAL'
          WHEN i.current_stock <= i.reorder_level THEN 'LOW'
          ELSE 'NORMAL'
        END as stock_status
      FROM inventory_items i
      JOIN inventory_categories c ON i.category_id = c.id
      LEFT JOIN inventory_stores s ON i.default_store_id = s.id
      WHERE i.school_id = $1
    `;
    const params: any[] = [schoolId];

    if (categoryId && categoryId !== 'all') {
      params.push(categoryId);
      sql += ` AND i.category_id = $${params.length}`;
    }
    if (storeId && storeId !== 'all') {
      params.push(storeId);
      sql += ` AND i.default_store_id = $${params.length}`;
    }
    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND i.status = $${params.length}`;
    }
    if (lowStock === 'true') {
      sql += ` AND i.current_stock <= i.reorder_level`;
    }
    if (search) {
      params.push(`%${(search as string).trim().toLowerCase()}%`);
      sql += ` AND (LOWER(i.name) LIKE $${params.length} OR LOWER(i.sku) LIKE $${params.length} OR LOWER(COALESCE(i.barcode, '')) LIKE $${params.length})`;
    }

    sql += ` ORDER BY i.name ASC`;
    const result = await db.query(sql, params);

    return res.json({ items: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/items', requireAuth, requirePermission('inventory.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const {
    categoryId, name, sku, barcode, unit, brand, model, description,
    minStockLevel, reorderLevel, maxStockLevel, openingStock, unitPrice, defaultStoreId
  } = req.body;

  if (!name || !sku || !categoryId) {
    return res.status(400).json({ error: 'Item Name, SKU, and Category are required.' });
  }

  try {
    const itemId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const initStock = openingStock ? parseInt(openingStock, 10) : 0;
    const priceVal = unitPrice ? parseFloat(unitPrice) : 0;

    const result = await db.query(`
      INSERT INTO inventory_items (
        id, school_id, category_id, name, sku, barcode, unit, brand, model,
        description, min_stock_level, reorder_level, max_stock_level, current_stock,
        unit_price, default_store_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'ACTIVE')
      RETURNING *
    `, [
      itemId, schoolId, categoryId, name.trim(), sku.trim().toUpperCase(),
      barcode || null, unit || 'Piece', brand || null, model || null, description || null,
      minStockLevel ? parseInt(minStockLevel, 10) : 5,
      reorderLevel ? parseInt(reorderLevel, 10) : 10,
      maxStockLevel ? parseInt(maxStockLevel, 10) : 100,
      initStock, priceVal, defaultStoreId || null
    ]);

    // If opening stock provided, record opening stock transaction
    if (initStock > 0 && defaultStoreId) {
      const trxId = `trx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await db.query(`
        INSERT INTO inventory_stock_transactions (
          id, school_id, item_id, store_id, transaction_type, quantity, unit_price,
          total_value, balance_after, reference_type, reference_id, remarks, created_by_id
        ) VALUES ($1, $2, $3, $4, 'STOCK_IN', $5, $6, $7, $5, 'OPENING_STOCK', 'OPN-BALANCE', 'Opening inventory stock entry', $8)
      `, [trxId, schoolId, itemId, defaultStoreId, initStock, priceVal, initStock * priceVal, req.user!.id]);
    }

    recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId,
      action: 'CREATE_INVENTORY_ITEM',
      module: 'INVENTORY',
      description: `Created inventory item: ${name} (SKU: ${sku})`,
      details: { itemId, sku, name, openingStock: initStock }
    });

    return res.status(201).json({ item: result.rows[0], message: 'Inventory item registered successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. STOCK MOVEMENTS & TRANSACTIONS
// ==========================================
router.get('/transactions', requireAuth, requirePermission('inventory.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const { itemId, storeId, transactionType, limit } = req.query;

  try {
    let sql = `
      SELECT
        t.*,
        i.name as item_name,
        i.sku as item_sku,
        i.unit,
        s.name as store_name,
        d.name as department_name,
        concat(e.first_name, ' ', e.last_name) as recipient_emp_name,
        concat(u.first_name, ' ', u.last_name) as recorded_by_name
      FROM inventory_stock_transactions t
      JOIN inventory_items i ON t.item_id = i.id
      JOIN inventory_stores s ON t.store_id = s.id
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN employees e ON t.recipient_employee_id = e.id
      LEFT JOIN users u ON t.created_by_id = u.id
      WHERE t.school_id = $1
    `;
    const params: any[] = [schoolId];

    if (itemId) {
      params.push(itemId);
      sql += ` AND t.item_id = $${params.length}`;
    }
    if (storeId) {
      params.push(storeId);
      sql += ` AND t.store_id = $${params.length}`;
    }
    if (transactionType && transactionType !== 'all') {
      params.push(transactionType);
      sql += ` AND t.transaction_type = $${params.length}`;
    }

    sql += ` ORDER BY t.created_at DESC LIMIT ${limit ? parseInt(limit as string, 10) : 50}`;
    const result = await db.query(sql, params);

    return res.json({ transactions: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/transactions', requireAuth, requirePermission('inventory.stock.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user?.schoolId || 'sch_vvps';
  const {
    itemId, storeId, transactionType, quantity, unitPrice,
    referenceType, referenceId, departmentId, recipientEmployeeId,
    recipientName, remarks
  } = req.body;

  const qty = parseInt(quantity, 10);
  if (!itemId || !storeId || !transactionType || !qty || qty <= 0) {
    return res.status(400).json({ error: 'Item, Store, Transaction Type and a valid quantity (>0) are required.' });
  }

  try {
    // 1. Fetch current item stock
    const itemRes = await db.query(`SELECT * FROM inventory_items WHERE id = $1 AND school_id = $2`, [itemId, schoolId]);
    if (itemRes.rows.length === 0) return res.status(404).json({ error: 'Item not found.' });

    const currentItem = itemRes.rows[0] as any;
    let newBalance = currentItem.current_stock;
    const priceVal = unitPrice ? parseFloat(unitPrice) : parseFloat(currentItem.unit_price);

    if (['STOCK_IN', 'RETURN'].includes(transactionType)) {
      newBalance += qty;
    } else if (['STOCK_OUT', 'DAMAGE'].includes(transactionType)) {
      if (currentItem.current_stock < qty) {
        return res.status(400).json({
          error: `Insufficient stock. Requested: ${qty} ${currentItem.unit}, Available in store: ${currentItem.current_stock} ${currentItem.unit}.`
        });
      }
      newBalance -= qty;
    }

    // 2. Update item stock
    await db.query(`
      UPDATE inventory_items
      SET current_stock = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [newBalance, itemId]);

    // Check low stock / out of stock threshold
    if (newBalance <= (currentItem.reorder_level || currentItem.min_stock_level || 5)) {
      createInventoryNotification({
        schoolId,
        eventType: newBalance === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
        title: newBalance === 0 ? `Out of Stock: ${currentItem.name}` : `Low Stock Alert: ${currentItem.name}`,
        message: `${currentItem.name} (${currentItem.sku}) has reached ${newBalance} ${currentItem.unit || 'units'} in inventory (Reorder threshold: ${currentItem.reorder_level || currentItem.min_stock_level || 5}).`,
        entityType: 'item',
        entityId: itemId,
        priority: newBalance === 0 ? 'URGENT' : 'HIGH'
      });
    }

    // 3. Insert transaction
    const trxId = `trx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const totalVal = qty * priceVal;

    const result = await db.query(`
      INSERT INTO inventory_stock_transactions (
        id, school_id, item_id, store_id, transaction_type, quantity, unit_price,
        total_value, balance_after, reference_type, reference_id, department_id,
        recipient_employee_id, recipient_name, remarks, created_by_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      trxId, schoolId, itemId, storeId, transactionType, qty, priceVal, totalVal,
      newBalance, referenceType || 'MANUAL_ENTRY', referenceId || null,
      departmentId || null, recipientEmployeeId || null, recipientName || null,
      remarks || null, req.user!.id
    ]);

    recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId,
      action: `STOCK_${transactionType}`,
      module: 'INVENTORY',
      description: `Stock ${transactionType} (${qty} items) for item ${itemId}`,
      details: { trxId, itemId, qty, newBalance, recipientName }
    });

    return res.status(201).json({
      transaction: result.rows[0],
      currentStock: newBalance,
      message: `Stock transaction recorded successfully. New balance: ${newBalance} ${currentItem.unit}.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. STOCK TRANSFERS
// ==========================================
router.get('/transfers', requireAuth, requirePermission('inventory.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const result = await db.query(`
      SELECT
        st.*,
        i.name as item_name,
        i.sku as item_sku,
        i.unit,
        fs.name as from_store_name,
        ts.name as to_store_name,
        concat(u.first_name, ' ', u.last_name) as requested_by_name
      FROM inventory_stock_transfers st
      JOIN inventory_items i ON st.item_id = i.id
      JOIN inventory_stores fs ON st.from_store_id = fs.id
      JOIN inventory_stores ts ON st.to_store_id = ts.id
      LEFT JOIN users u ON st.requested_by_id = u.id
      WHERE st.school_id = $1
      ORDER BY st.transfer_date DESC, st.created_at DESC
    `, [schoolId]);

    return res.json({ transfers: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/transfers', requireAuth, requirePermission('inventory.stock.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { fromStoreId, toStoreId, itemId, quantity, reason } = req.body;

  const qty = parseInt(quantity, 10);
  if (!fromStoreId || !toStoreId || !itemId || !qty || qty <= 0) {
    return res.status(400).json({ error: 'Source Store, Destination Store, Item and valid Quantity (>0) are required.' });
  }
  if (fromStoreId === toStoreId) {
    return res.status(400).json({ error: 'Source and destination store cannot be the same.' });
  }

  try {
    const itemRes = await db.query(`SELECT * FROM inventory_items WHERE id = $1 AND school_id = $2`, [itemId, schoolId]);
    if (itemRes.rows.length === 0) return res.status(404).json({ error: 'Item not found.' });

    const currentItem = itemRes.rows[0] as any;
    if (currentItem.current_stock < qty) {
      return res.status(400).json({
        error: `Insufficient stock for transfer. Available: ${currentItem.current_stock} ${currentItem.unit}, requested: ${qty} ${currentItem.unit}.`
      });
    }

    const transferNum = `TRF-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const transferId = `trf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Create Transfer record
    const result = await db.query(`
      INSERT INTO inventory_stock_transfers (
        id, school_id, transfer_number, from_store_id, to_store_id,
        item_id, quantity, transfer_date, status, reason, requested_by_id, approved_by_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, 'COMPLETED', $8, $9, $9)
      RETURNING *
    `, [transferId, schoolId, transferNum, fromStoreId, toStoreId, itemId, qty, reason || null, req.user!.id]);

    // Record ledger transaction for audit
    await db.query(`
      INSERT INTO inventory_stock_transactions (
        id, school_id, item_id, store_id, transaction_type, quantity, unit_price,
        total_value, balance_after, reference_type, reference_id, remarks, created_by_id
      ) VALUES ($1, $2, $3, $4, 'TRANSFER', $5, $6, $7, $8, 'INTER_STORE_TRANSFER', $9, $10, $11)
    `, [
      `trx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      schoolId, itemId, toStoreId, qty, currentItem.unit_price,
      qty * parseFloat(currentItem.unit_price), currentItem.current_stock,
      transferNum, `Transferred from Store ${fromStoreId} to ${toStoreId}`, req.user!.id
    ]);

    return res.status(201).json({
      transfer: result.rows[0],
      message: `Stock transfer of ${qty} ${currentItem.unit} processed successfully.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. PHYSICAL STOCK COUNTS / AUDITS
// ==========================================
router.get('/counts', requireAuth, requirePermission('inventory.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const result = await db.query(`
      SELECT
        sc.*,
        s.name as store_name,
        concat(u.first_name, ' ', u.last_name) as verified_by_name
      FROM inventory_stock_counts sc
      JOIN inventory_stores s ON sc.store_id = s.id
      LEFT JOIN users u ON sc.verified_by_id = u.id
      WHERE sc.school_id = $1
      ORDER BY sc.count_date DESC, sc.created_at DESC
    `, [schoolId]);

    return res.json({ counts: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/counts', requireAuth, requirePermission('inventory.audit.count'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { storeId, countTitle, countDate, notes, items } = req.body;

  if (!storeId || !countTitle || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Store, Audit Title, and item count rows are required.' });
  }

  try {
    const countId = `sc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let totalItems = 0;
    let totalVarianceQty = 0;
    let totalVarianceVal = 0;

    for (const it of items) {
      const sysQty = parseInt(it.systemQuantity, 10) || 0;
      const phyQty = parseInt(it.physicalQuantity, 10) || 0;
      const varQty = phyQty - sysQty;
      const uPrice = parseFloat(it.unitPrice) || 0;
      const varVal = varQty * uPrice;

      totalItems++;
      totalVarianceQty += varQty;
      totalVarianceVal += varVal;

      await db.query(`
        INSERT INTO inventory_stock_count_items (
          id, count_id, item_id, system_quantity, physical_quantity,
          variance_quantity, unit_price, variance_value, adjustment_status, remarks
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ADJUSTED', $9)
      `, [
        `sci_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        countId, it.itemId, sysQty, phyQty, varQty, uPrice, varVal, it.remarks || null
      ]);

      // Apply adjustment to inventory item
      await db.query(`
        UPDATE inventory_items
        SET current_stock = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [phyQty, it.itemId]);

      // Record adjustment in stock ledger
      if (varQty !== 0) {
        await db.query(`
          INSERT INTO inventory_stock_transactions (
            id, school_id, item_id, store_id, transaction_type, quantity, unit_price,
            total_value, balance_after, reference_type, reference_id, remarks, created_by_id
          ) VALUES ($1, $2, $3, $4, 'ADJUSTMENT', $5, $6, $7, $8, 'STOCK_COUNT_AUDIT', $9, $10, $11)
        `, [
          `trx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          schoolId, it.itemId, storeId, Math.abs(varQty), uPrice, Math.abs(varVal),
          phyQty, countId, `Physical audit adjustment (Variance: ${varQty > 0 ? '+' : ''}${varQty})`, req.user!.id
        ]);
      }
    }

    const result = await db.query(`
      INSERT INTO inventory_stock_counts (
        id, school_id, store_id, count_title, count_date, status,
        total_items_counted, total_variance_qty, total_variance_value,
        verified_by_id, approved_by_id, notes
      ) VALUES ($1, $2, $3, $4, $5, 'COMPLETED', $6, $7, $8, $9, $9, $10)
      RETURNING *
    `, [
      countId, schoolId, storeId, countTitle.trim(), countDate || new Date().toISOString().split('T')[0],
      totalItems, totalVarianceQty, totalVarianceVal, req.user!.id, notes || null
    ]);

    recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId,
      action: 'PHYSICAL_STOCK_COUNT',
      module: 'INVENTORY',
      description: `Physical stock count completed: ${countTitle}`,
      details: { countId, countTitle, totalItems, totalVarianceQty, totalVarianceVal }
    });

    return res.status(201).json({
      count: result.rows[0],
      message: `Physical audit completed and stock quantities synchronized (${totalItems} items adjusted).`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. FIXED ASSETS MASTER
// ==========================================
router.get('/assets', requireAuth, requirePermission('inventory.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const { categoryId, status, condition, search, employeeId, departmentId, storeId } = req.query;

  try {
    let sql = `
      SELECT
        a.*,
        c.name as category_name,
        c.code as category_code,
        s.name as store_name,
        d.name as department_name,
        v.name as vendor_name,
        concat(e.first_name, ' ', e.last_name) as assigned_employee_name,
        e.employee_id_number as assigned_employee_code
      FROM assets a
      JOIN inventory_categories c ON a.category_id = c.id
      LEFT JOIN inventory_stores s ON a.current_store_id = s.id
      LEFT JOIN departments d ON a.department_id = d.id
      LEFT JOIN vendors v ON a.vendor_id = v.id
      LEFT JOIN employees e ON a.assigned_employee_id = e.id
      WHERE a.school_id = $1
    `;
    const params: any[] = [schoolId];

    if (categoryId && categoryId !== 'all') {
      params.push(categoryId);
      sql += ` AND a.category_id = $${params.length}`;
    }
    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND a.status = $${params.length}`;
    }
    if (condition && condition !== 'all') {
      params.push(condition);
      sql += ` AND a.current_condition = $${params.length}`;
    }
    if (employeeId && employeeId !== 'all') {
      params.push(employeeId);
      sql += ` AND a.assigned_employee_id = $${params.length}`;
    }
    if (departmentId && departmentId !== 'all') {
      params.push(departmentId);
      sql += ` AND a.department_id = $${params.length}`;
    }
    if (storeId && storeId !== 'all') {
      params.push(storeId);
      sql += ` AND a.current_store_id = $${params.length}`;
    }
    if (search) {
      params.push(`%${(search as string).trim().toLowerCase()}%`);
      sql += ` AND (LOWER(a.name) LIKE $${params.length} OR LOWER(a.asset_code) LIKE $${params.length} OR LOWER(COALESCE(a.serial_number, '')) LIKE $${params.length})`;
    }

    sql += ` ORDER BY a.name ASC`;
    const result = await db.query(sql, params);

    return res.json({ assets: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/assets', requireAuth, requirePermission('inventory.assets.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const {
    categoryId, assetCode, name, serialNumber, barcode, brand, model,
    purchaseDate, purchaseCost, vendorId, warrantyStartDate, warrantyEndDate,
    warrantyProvider, currentCondition, status, currentStoreId, departmentId,
    assignedEmployeeId, locationDescription, specifications
  } = req.body;

  if (!assetCode || !name || !categoryId) {
    return res.status(400).json({ error: 'Asset Code, Name, and Category are required.' });
  }

  try {
    const assetId = `ast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const costVal = purchaseCost ? parseFloat(purchaseCost) : 0;

    const result = await db.query(`
      INSERT INTO assets (
        id, school_id, category_id, asset_code, name, serial_number, barcode,
        brand, model, purchase_date, purchase_cost, vendor_id, warranty_start_date,
        warranty_end_date, warranty_provider, current_condition, status, current_store_id,
        department_id, assigned_employee_id, location_description, specifications
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *
    `, [
      assetId, schoolId, categoryId, assetCode.trim().toUpperCase(), name.trim(),
      serialNumber || null, barcode || null, brand || null, model || null,
      purchaseDate || null, costVal, vendorId || null, warrantyStartDate || null,
      warrantyEndDate || null, warrantyProvider || null, currentCondition || 'GOOD',
      status || (assignedEmployeeId ? 'IN_USE' : 'AVAILABLE'),
      currentStoreId || null, departmentId || null, assignedEmployeeId || null,
      locationDescription || null, specifications || null
    ]);

    // If assigned to employee on creation, add assignment history
    if (assignedEmployeeId) {
      await db.query(`
        INSERT INTO asset_assignments (
          id, school_id, asset_id, employee_id, department_id, location_room,
          assigned_date, condition_at_assignment, status, assigned_by_id, remarks
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7, 'ACTIVE', $8, 'Initial assignment on registration')
      `, [
        `asg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        schoolId, assetId, assignedEmployeeId, departmentId || null,
        locationDescription || null, currentCondition || 'GOOD', req.user!.id
      ]);
    }

    recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId,
      action: 'CREATE_ASSET',
      module: 'INVENTORY',
      description: `Created asset: ${name} (${assetCode})`,
      details: { assetId, assetCode, name }
    });

    return res.status(201).json({ asset: result.rows[0], message: 'Asset registered successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Asset Custody Allocation / Reassignment
router.post('/assets/:id/assign', requireAuth, requirePermission('inventory.assets.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { id } = req.params;
  const { employeeId, departmentId, locationRoom, expectedReturnDate, condition, remarks } = req.body;

  if (!employeeId && !departmentId) {
    return res.status(400).json({ error: 'Either Employee or Department is required for asset custody.' });
  }

  try {
    // 1. Mark previous active assignments as returned
    await db.query(`
      UPDATE asset_assignments
      SET status = 'RETURNED', actual_return_date = CURRENT_DATE, condition_at_return = $1
      WHERE asset_id = $2 AND school_id = $3 AND status = 'ACTIVE'
    `, [condition || 'GOOD', id, schoolId]);

    // 2. Insert new assignment
    const asgId = `asg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(`
      INSERT INTO asset_assignments (
        id, school_id, asset_id, employee_id, department_id, location_room,
        assigned_date, expected_return_date, condition_at_assignment, status, assigned_by_id, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7, $8, 'ACTIVE', $9, $10)
    `, [
      asgId, schoolId, id, employeeId || null, departmentId || null,
      locationRoom || null, expectedReturnDate || null, condition || 'GOOD',
      req.user!.id, remarks || null
    ]);

    // 3. Update asset status
    await db.query(`
      UPDATE assets
      SET status = 'IN_USE', assigned_employee_id = $1, department_id = $2,
          location_description = COALESCE($3, location_description),
          current_condition = COALESCE($4, current_condition),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND school_id = $6
    `, [employeeId || null, departmentId || null, locationRoom || null, condition || 'GOOD', id, schoolId]);

    return res.json({ message: 'Asset allocated to new custodian successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Asset Return / De-allocation
router.post('/assets/:id/return', requireAuth, requirePermission('inventory.assets.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { id } = req.params;
  const { returnStoreId, returnCondition, remarks } = req.body;

  try {
    await db.query(`
      UPDATE asset_assignments
      SET status = 'RETURNED', actual_return_date = CURRENT_DATE,
          condition_at_return = $1, remarks = COALESCE($2, remarks)
      WHERE asset_id = $3 AND school_id = $4 AND status = 'ACTIVE'
    `, [returnCondition || 'GOOD', remarks || null, id, schoolId]);

    await db.query(`
      UPDATE assets
      SET status = 'AVAILABLE', assigned_employee_id = NULL,
          current_store_id = COALESCE($1, current_store_id),
          current_condition = COALESCE($2, current_condition),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND school_id = $4
    `, [returnStoreId || null, returnCondition || 'GOOD', id, schoolId]);

    return res.json({ message: 'Asset returned to inventory successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Asset Maintenance & Servicing
router.post('/assets/:id/maintenance', requireAuth, requirePermission('inventory.assets.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { id } = req.params;
  const {
    maintenanceDate, maintenanceType, description, vendorCenter, cost,
    invoiceNumber, isUnderWarranty, nextMaintenanceDate, remarks
  } = req.body;

  if (!description || !maintenanceType) {
    return res.status(400).json({ error: 'Maintenance Type and Description are required.' });
  }

  try {
    const costVal = cost ? parseFloat(cost) : 0;
    const maintId = `maint_ast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Integrated Finance Posting: Record in Accounts `expenses` table
    let expId: string | null = null;
    if (costVal > 0) {
      expId = `exp_invmaint_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const expCatId = `expcat_${schoolId}_inventory`;
      await db.query(`
        INSERT INTO expense_categories (id, school_id, name, code, status)
        VALUES ($1, $2, 'Store Inventory, Assets & Campus Procurement', 'INVENTORY', 'active')
        ON CONFLICT (id) DO NOTHING;
      `, [expCatId, schoolId]);

      const adminName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'Administrator';
      await db.query(`
        INSERT INTO expenses (
          id, school_id, category_id, amount, expense_date, payment_mode,
          payee_vendor, reference_no, description, approval_status,
          created_by_id, created_by_name, approved_by_id, approved_by_name
        ) VALUES (
          $1, $2, $3, $4, $5, 'BANK_TRANSFER',
          $6, $7, $8, 'APPROVED',
          $9, $10, $9, $10
        ) ON CONFLICT (id) DO NOTHING;
      `, [
        expId, schoolId, expCatId, costVal, maintenanceDate || new Date().toISOString().split('T')[0],
        vendorCenter || 'Authorized Service Provider',
        invoiceNumber || `MAINT-${maintId.substring(9)}`,
        `Asset Servicing (${maintenanceType}) for ${id}: ${description.substring(0, 80)}`,
        req.user!.id, adminName
      ]);
    }

    const result = await db.query(`
      INSERT INTO asset_maintenance (
        id, school_id, asset_id, maintenance_date, maintenance_type, description,
        vendor_center, cost, invoice_number, is_under_warranty, next_maintenance_date,
        expense_record_id, remarks, created_by_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      maintId, schoolId, id, maintenanceDate || new Date().toISOString().split('T')[0],
      maintenanceType, description, vendorCenter || null, costVal, invoiceNumber || null,
      isUnderWarranty === true, nextMaintenanceDate || null, expId, remarks || null, req.user!.id
    ]);

    return res.status(201).json({
      maintenance: result.rows[0],
      message: 'Asset maintenance record added and cost synced with Accounts ledger.'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. VENDORS & SUPPLIERS
// ==========================================
router.get('/vendors', requireAuth, requirePermission('inventory.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const result = await db.query(`
      SELECT
        v.*,
        (SELECT COUNT(*) FROM purchase_orders po WHERE po.vendor_id = v.id) as total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM purchase_orders po WHERE po.vendor_id = v.id) as total_business_volume
      FROM vendors v
      WHERE v.school_id = $1
      ORDER BY v.name ASC
    `, [schoolId]);

    return res.json({ vendors: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/vendors', requireAuth, requirePermission('inventory.vendors.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const {
    name, contactPerson, phone, email, address, city, state,
    gstin, pan, bankName, bankAccountNumber, bankIfsc, category, rating
  } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Vendor Name and Phone are required.' });
  }

  try {
    const vendorId = `vnd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const result = await db.query(`
      INSERT INTO vendors (
        id, school_id, name, contact_person, phone, email, address, city, state,
        gstin, pan, bank_name, bank_account_number, bank_ifsc, category, status, rating
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'ACTIVE', $16)
      RETURNING *
    `, [
      vendorId, schoolId, name.trim(), contactPerson || null, phone.trim(),
      email || null, address || null, city || null, state || null,
      gstin || null, pan || null, bankName || null, bankAccountNumber || null,
      bankIfsc || null, category || 'General', rating ? parseFloat(rating) : 4.5
    ]);

    return res.status(201).json({ vendor: result.rows[0], message: 'Vendor profile created successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 10. PROCUREMENT - PURCHASE REQUESTS
// ==========================================
router.get('/requests', requireAuth, requirePermission('inventory.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const result = await db.query(`
      SELECT
        pr.*,
        d.name as department_name,
        concat(u.first_name, ' ', u.last_name) as requested_by_name,
        (SELECT COUNT(*) FROM purchase_request_items pri WHERE pri.request_id = pr.id) as items_count
      FROM purchase_requests pr
      LEFT JOIN departments d ON pr.department_id = d.id
      LEFT JOIN users u ON pr.requested_by_id = u.id
      WHERE pr.school_id = $1
      ORDER BY pr.request_date DESC, pr.created_at DESC
    `, [schoolId]);

    return res.json({ requests: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/requests', requireAuth, requirePermission('inventory.procurement.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { departmentId, requiredByDate, priority, title, reason, items } = req.body;

  if (!title || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Title and at least one purchase item are required.' });
  }

  try {
    const reqNum = `PR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const reqId = `pr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let estTotal = 0;
    for (const it of items) {
      const q = parseInt(it.quantity, 10) || 1;
      const p = parseFloat(it.estimatedUnitPrice) || 0;
      estTotal += q * p;
    }

    const result = await db.query(`
      INSERT INTO purchase_requests (
        id, school_id, request_number, department_id, requested_by_id, request_date,
        required_by_date, priority, title, reason, estimated_total, status
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, $8, $9, $10, 'PENDING')
      RETURNING *
    `, [
      reqId, schoolId, reqNum, departmentId || null, req.user!.id,
      requiredByDate || null, priority || 'MEDIUM', title.trim(), reason || null, estTotal
    ]);

    for (const it of items) {
      const q = parseInt(it.quantity, 10) || 1;
      const p = parseFloat(it.estimatedUnitPrice) || 0;
      const tot = q * p;

      await db.query(`
        INSERT INTO purchase_request_items (
          id, request_id, item_name, item_id, quantity, unit, estimated_unit_price, estimated_total, specifications
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        `pri_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        reqId, it.itemName, it.itemId || null, q, it.unit || 'Piece', p, tot, it.specifications || null
      ]);
    }

    return res.status(201).json({
      request: result.rows[0],
      message: `Purchase request ${reqNum} submitted for review.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/requests/:id/review', requireAuth, requirePermission('inventory.procurement.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { id } = req.params;
  const { status, reviewNotes } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Status must be APPROVED or REJECTED.' });
  }

  try {
    const result = await db.query(`
      UPDATE purchase_requests
      SET status = $1, reviewed_by_id = $2, reviewed_at = CURRENT_TIMESTAMP, review_notes = $3
      WHERE id = $4 AND school_id = $5
      RETURNING *
    `, [status, req.user!.id, reviewNotes || null, id, schoolId]);

    return res.json({ request: result.rows[0], message: `Purchase request marked as ${status}.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 11. PROCUREMENT - PURCHASE ORDERS
// ==========================================
router.get('/orders', requireAuth, requirePermission('inventory.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const result = await db.query(`
      SELECT
        po.*,
        v.name as vendor_name,
        v.contact_person as vendor_contact,
        v.phone as vendor_phone,
        (SELECT COUNT(*) FROM purchase_order_items poi WHERE poi.po_id = po.id) as items_count,
        (SELECT COUNT(*) FROM goods_receipts gr WHERE gr.po_id = po.id) as receipts_count
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      WHERE po.school_id = $1
      ORDER BY po.order_date DESC, po.created_at DESC
    `, [schoolId]);

    return res.json({ orders: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/orders', requireAuth, requirePermission('inventory.procurement.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const {
    vendorId, requestId, expectedDeliveryDate, items,
    taxAmount, discountAmount, shippingCost, termsAndConditions
  } = req.body;

  if (!vendorId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Vendor and order item rows are required.' });
  }

  try {
    const poNum = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const poId = `po_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    let subtotal = 0;
    for (const it of items) {
      const q = parseInt(it.quantity, 10) || 1;
      const p = parseFloat(it.unitPrice) || 0;
      subtotal += q * p;
    }

    const tax = taxAmount ? parseFloat(taxAmount) : 0;
    const disc = discountAmount ? parseFloat(discountAmount) : 0;
    const ship = shippingCost ? parseFloat(shippingCost) : 0;
    const grandTotal = subtotal + tax + ship - disc;

    const result = await db.query(`
      INSERT INTO purchase_orders (
        id, school_id, po_number, vendor_id, request_id, order_date, expected_delivery_date,
        subtotal, tax_amount, discount_amount, shipping_cost, total_amount, terms_and_conditions,
        status, approved_by_id, created_by_id
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, $8, $9, $10, $11, $12, 'APPROVED', $13, $13)
      RETURNING *
    `, [
      poId, schoolId, poNum, vendorId, requestId || null, expectedDeliveryDate || null,
      subtotal, tax, disc, ship, grandTotal, termsAndConditions || null, req.user!.id
    ]);

    for (const it of items) {
      const q = parseInt(it.quantity, 10) || 1;
      const p = parseFloat(it.unitPrice) || 0;
      const tot = q * p;

      await db.query(`
        INSERT INTO purchase_order_items (
          id, po_id, item_id, item_name, quantity, unit, unit_price, total_price, received_quantity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0)
      `, [
        `poi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        poId, it.itemId || null, it.itemName, q, it.unit || 'Piece', p, tot
      ]);
    }

    // If linked to request, update request status
    if (requestId) {
      await db.query(`UPDATE purchase_requests SET status = 'CONVERTED_TO_PO' WHERE id = $1`, [requestId]);
    }

    return res.status(201).json({
      order: result.rows[0],
      message: `Purchase order ${poNum} generated successfully.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 12. PROCUREMENT - GOODS RECEIPTS (GRN)
// ==========================================
router.get('/receipts', requireAuth, requirePermission('inventory.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const result = await db.query(`
      SELECT
        gr.*,
        po.po_number,
        v.name as vendor_name,
        s.name as store_name,
        concat(u.first_name, ' ', u.last_name) as received_by_name
      FROM goods_receipts gr
      JOIN purchase_orders po ON gr.po_id = po.id
      JOIN vendors v ON gr.vendor_id = v.id
      JOIN inventory_stores s ON gr.target_store_id = s.id
      LEFT JOIN users u ON gr.received_by_id = u.id
      WHERE gr.school_id = $1
      ORDER BY gr.receipt_date DESC, gr.created_at DESC
    `, [schoolId]);

    return res.json({ receipts: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/receipts', requireAuth, requirePermission('inventory.procurement.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const {
    poId, targetStoreId, receiptDate, challanNumber, invoiceNumber, remarks, items
  } = req.body;

  if (!poId || !targetStoreId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Purchase Order, Receiving Store, and item lines are required.' });
  }

  try {
    const poRes = await db.query(`SELECT * FROM purchase_orders WHERE id = $1 AND school_id = $2`, [poId, schoolId]);
    if (poRes.rows.length === 0) return res.status(404).json({ error: 'Purchase Order not found.' });

    const po = poRes.rows[0] as any;
    const grnNum = `GRN-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const grnId = `gr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let totalAcceptedVal = 0;

    for (const it of items) {
      const ordQ = parseInt(it.orderedQuantity, 10) || 0;
      const recQ = parseInt(it.receivedQuantity, 10) || 0;
      const accQ = parseInt(it.acceptedQuantity, 10) || recQ;
      const rejQ = parseInt(it.rejectedQuantity, 10) || 0;
      const uPrice = parseFloat(it.unitPrice) || 0;
      const lineVal = accQ * uPrice;
      totalAcceptedVal += lineVal;

      await db.query(`
        INSERT INTO goods_receipt_items (
          id, receipt_id, po_item_id, item_id, item_name, ordered_quantity,
          received_quantity, accepted_quantity, rejected_quantity, unit_price, total_value, rejection_reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        `gri_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        grnId, it.poItemId || null, it.itemId || null, it.itemName,
        ordQ, recQ, accQ, rejQ, uPrice, lineVal, it.rejectionReason || null
      ]);

      // If item is linked to inventory, increment stock
      if (it.itemId && accQ > 0) {
        const itemRes = await db.query(`SELECT current_stock, unit_price FROM inventory_items WHERE id = $1`, [it.itemId]);
        if (itemRes.rows.length > 0) {
          const newBal = (itemRes.rows[0] as any).current_stock + accQ;
          await db.query(`UPDATE inventory_items SET current_stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [newBal, it.itemId]);

          // Ledger entry
          await db.query(`
            INSERT INTO inventory_stock_transactions (
              id, school_id, item_id, store_id, transaction_type, quantity, unit_price,
              total_value, balance_after, reference_type, reference_id, remarks, created_by_id
            ) VALUES ($1, $2, $3, $4, 'STOCK_IN', $5, $6, $7, $8, 'PURCHASE_RECEIPT', $9, $10, $11)
          `, [
            `trx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            schoolId, it.itemId, targetStoreId, accQ, uPrice, lineVal, newBal,
            grnNum, `Procurement Delivery under ${po.po_number}`, req.user!.id
          ]);
        }
      }
    }

    // Integrated Accounts Posting: Create Purchase Invoice expense entry
    let expId: string | null = null;
    if (totalAcceptedVal > 0) {
      expId = `exp_grn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const expCatId = `expcat_${schoolId}_inventory`;
      await db.query(`
        INSERT INTO expense_categories (id, school_id, name, code, status)
        VALUES ($1, $2, 'Store Inventory, Assets & Campus Procurement', 'INVENTORY', 'active')
        ON CONFLICT (id) DO NOTHING;
      `, [expCatId, schoolId]);

      const adminName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'Administrator';
      await db.query(`
        INSERT INTO expenses (
          id, school_id, category_id, amount, expense_date, payment_mode,
          payee_vendor, reference_no, description, approval_status,
          created_by_id, created_by_name, approved_by_id, approved_by_name
        ) VALUES (
          $1, $2, $3, $4, $5, 'BANK_TRANSFER',
          $6, $7, $8, 'APPROVED',
          $9, $10, $9, $10
        ) ON CONFLICT (id) DO NOTHING;
      `, [
        expId, schoolId, expCatId, totalAcceptedVal, receiptDate || new Date().toISOString().split('T')[0],
        po.vendor_id, invoiceNumber || challanNumber || grnNum,
        `Goods Receipt (${grnNum}) for PO ${po.po_number}: Accepted goods stock entry`,
        req.user!.id, adminName
      ]);
    }

    const result = await db.query(`
      INSERT INTO goods_receipts (
        id, school_id, receipt_number, po_id, vendor_id, target_store_id, receipt_date,
        challan_number, invoice_number, total_accepted_value, expense_record_id, status, remarks, received_by_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'COMPLETED', $12, $13)
      RETURNING *
    `, [
      grnId, schoolId, grnNum, poId, po.vendor_id, targetStoreId,
      receiptDate || new Date().toISOString().split('T')[0],
      challanNumber || null, invoiceNumber || null, totalAcceptedVal, expId, remarks || null, req.user!.id
    ]);

    // Update PO status to FULLY_RECEIVED
    await db.query(`UPDATE purchase_orders SET status = 'FULLY_RECEIVED' WHERE id = $1`, [poId]);

    return res.status(201).json({
      receipt: result.rows[0],
      message: `Goods receipt ${grnNum} processed. Stock updated and purchase invoice posted to Accounts.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 13. REPORTS & EXPORTS
// ==========================================
router.get('/reports/summary', requireAuth, requirePermission('inventory.reports.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const stockReport = await db.query(`
      SELECT
        c.name as category_name,
        COUNT(i.id) as items_count,
        COALESCE(SUM(i.current_stock), 0) as total_units,
        COALESCE(SUM(i.current_stock * i.unit_price), 0) as valuation
      FROM inventory_categories c
      LEFT JOIN inventory_items i ON i.category_id = c.id AND i.status = 'ACTIVE'
      WHERE c.school_id = $1
      GROUP BY c.name
      ORDER BY valuation DESC
    `, [schoolId]);

    const assetReport = await db.query(`
      SELECT
        c.name as category_name,
        COUNT(a.id) as asset_count,
        COALESCE(SUM(a.purchase_cost), 0) as total_asset_value,
        COUNT(CASE WHEN a.status = 'IN_USE' THEN 1 END) as in_use_count
      FROM inventory_categories c
      LEFT JOIN assets a ON a.category_id = c.id
      WHERE c.school_id = $1
      GROUP BY c.name
      ORDER BY total_asset_value DESC
    `, [schoolId]);

    const financialReport = await db.query(`
      SELECT
        COALESCE((SELECT SUM(purchase_cost) FROM assets WHERE school_id = $1), 0) as total_asset_value,
        COALESCE((SELECT SUM(current_stock * unit_price) FROM inventory_items WHERE school_id = $1 AND status = 'ACTIVE'), 0) as current_stock_valuation,
        COALESCE((SELECT SUM(cost) FROM asset_maintenance WHERE school_id = $1), 0) as total_maintenance_spent,
        COALESCE((SELECT SUM(total_accepted_value) FROM goods_receipts WHERE school_id = $1), 0) as total_procured_value
    `, [schoolId]);

    return res.json({
      stockByCategory: stockReport.rows,
      assetsByCategory: assetReport.rows,
      financials: financialReport.rows[0]
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 14. ASSET TRANSFERS & DISPOSALS
// ==========================================
router.post('/assets/:id/transfer', requireAuth, requirePermission('inventory.assets.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { id } = req.params;
  const { toDepartmentId, toEmployeeId, toLocationRoom, condition, remarks } = req.body;

  try {
    const assetRes = await db.query(`SELECT * FROM assets WHERE id = $1 AND school_id = $2`, [id, schoolId]);
    if (assetRes.rows.length === 0) return res.status(404).json({ error: 'Asset not found.' });

    const currentAsset = assetRes.rows[0] as any;
    const oldDepartment = currentAsset.department_id;
    const oldEmployee = currentAsset.assigned_employee_id;
    const oldLocation = currentAsset.location_description;

    // Terminate existing assignment
    await db.query(`
      UPDATE asset_assignments
      SET actual_return_date = CURRENT_DATE, condition_at_return = $1, status = 'RETURNED'
      WHERE asset_id = $2 AND status = 'ACTIVE'
    `, [condition || currentAsset.current_condition || 'GOOD', id]);

    // Create new assignment record
    const asgId = `asg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.query(`
      INSERT INTO asset_assignments (
        id, school_id, asset_id, employee_id, department_id, location_room,
        assigned_date, condition_at_assignment, status, assigned_by_id, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7, 'ACTIVE', $8, $9)
    `, [
      asgId, schoolId, id, toEmployeeId || null, toDepartmentId || null,
      toLocationRoom || null, condition || currentAsset.current_condition || 'GOOD',
      req.user!.id, remarks || `Transferred from ${oldLocation || 'previous room'}`
    ]);

    // Update asset master record
    await db.query(`
      UPDATE assets
      SET department_id = $1, assigned_employee_id = $2,
          location_description = $3, current_condition = $4,
          status = 'IN_USE', updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND school_id = $6
    `, [
      toDepartmentId || null, toEmployeeId || null,
      toLocationRoom || null, condition || currentAsset.current_condition || 'GOOD',
      id, schoolId
    ]);

    recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId,
      action: 'TRANSFER_ASSET',
      module: 'INVENTORY',
      description: `Transferred asset ${currentAsset.name} (${currentAsset.asset_code}) to ${toLocationRoom || 'new location'}`,
      details: { assetId: id, from: { oldDepartment, oldEmployee, oldLocation }, to: { toDepartmentId, toEmployeeId, toLocationRoom } }
    });

    return res.json({ message: 'Asset transferred successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/assets/:id/dispose', requireAuth, requirePermission('inventory.assets.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const { id } = req.params;
  const { disposalReason, disposalMethod, saleValue, remarks } = req.body;

  if (!disposalReason) {
    return res.status(400).json({ error: 'Disposal reason is required.' });
  }

  try {
    const assetRes = await db.query(`SELECT * FROM assets WHERE id = $1 AND school_id = $2`, [id, schoolId]);
    if (assetRes.rows.length === 0) return res.status(404).json({ error: 'Asset not found.' });
    const asset = assetRes.rows[0] as any;

    const dispId = `dsp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const saleVal = saleValue ? parseFloat(saleValue) : 0;

    await db.query(`
      INSERT INTO inventory_disposals (
        id, school_id, asset_id, disposal_date, disposal_reason,
        disposal_method, sale_value, remarks, approved_by_id
      ) VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8)
    `, [
      dispId, schoolId, id, disposalReason, disposalMethod || 'SCRAP_SALE',
      saleVal, remarks || null, req.user!.id
    ]);

    // Close any active custody assignments
    await db.query(`
      UPDATE asset_assignments
      SET actual_return_date = CURRENT_DATE, condition_at_return = 'DISPOSED', status = 'RETURNED'
      WHERE asset_id = $1 AND status = 'ACTIVE'
    `, [id]);

    // Update asset status to DISPOSED (NEVER permanently delete)
    await db.query(`
      UPDATE assets
      SET status = 'DISPOSED', current_condition = 'UNUSABLE',
          assigned_employee_id = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND school_id = $2
    `, [id, schoolId]);

    recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId,
      action: 'DISPOSE_ASSET',
      module: 'INVENTORY',
      description: `Disposed asset ${asset.name} (${asset.asset_code}). Reason: ${disposalReason}`,
      details: { assetId: id, disposalReason, disposalMethod, saleValue: saleVal }
    });

    return res.json({ message: 'Asset marked as disposed and archived in asset ledger.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/disposals', requireAuth, requirePermission('inventory.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;

  try {
    const result = await db.query(`
      SELECT
        d.*,
        a.asset_code,
        a.name as asset_name,
        a.purchase_cost,
        concat(u.first_name, ' ', u.last_name) as approved_by_name
      FROM inventory_disposals d
      LEFT JOIN assets a ON d.asset_id = a.id
      LEFT JOIN users u ON d.approved_by_id = u.id
      WHERE d.school_id = $1
      ORDER BY d.disposal_date DESC
    `, [schoolId]);

    return res.json({ disposals: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// CSV Export Endpoint
router.get('/export', requireAuth, requirePermission('inventory.reports.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const type = (req.query.type as string) || 'items';

  try {
    if (type === 'assets') {
      const result = await db.query(`
        SELECT a.asset_code, a.name, c.name as category, a.brand, a.model, a.serial_number,
               a.purchase_date, a.purchase_cost, a.current_condition, a.status,
               a.location_description, d.name as department
        FROM assets a
        LEFT JOIN inventory_categories c ON a.category_id = c.id
        LEFT JOIN departments d ON a.department_id = d.id
        WHERE a.school_id = $1
        ORDER BY a.asset_code ASC
      `, [schoolId]);

      const headers = ['Asset Code', 'Asset Name', 'Category', 'Brand', 'Model', 'Serial Number', 'Purchase Date', 'Cost (INR)', 'Condition', 'Status', 'Location', 'Department'];
      let csv = headers.join(',') + '\n';
      for (const row of result.rows as any[]) {
        csv += [
          `"${row.asset_code}"`, `"${(row.name || '').replace(/"/g, '""')}"`, `"${row.category || ''}"`,
          `"${row.brand || ''}"`, `"${row.model || ''}"`, `"${row.serial_number || ''}"`,
          `"${row.purchase_date || ''}"`, `"${row.purchase_cost}"`, `"${row.current_condition}"`,
          `"${row.status}"`, `"${row.location_description || ''}"`, `"${row.department || ''}"`
        ].join(',') + '\n';
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="assets_${schoolId}.csv"`);
      return res.send(csv);
    } else {
      const result = await db.query(`
        SELECT i.sku, i.name, c.name as category, i.unit, i.brand, i.model,
               i.min_stock_level, i.reorder_level, i.current_stock, i.unit_price,
               s.name as store_name, i.status
        FROM inventory_items i
        LEFT JOIN inventory_categories c ON i.category_id = c.id
        LEFT JOIN inventory_stores s ON i.default_store_id = s.id
        WHERE i.school_id = $1
        ORDER BY i.sku ASC
      `, [schoolId]);

      const headers = ['SKU', 'Item Name', 'Category', 'Unit', 'Brand', 'Model', 'Min Level', 'Reorder Level', 'Current Stock', 'Unit Price (INR)', 'Warehouse', 'Status'];
      let csv = headers.join(',') + '\n';
      for (const row of result.rows as any[]) {
        csv += [
          `"${row.sku}"`, `"${(row.name || '').replace(/"/g, '""')}"`, `"${row.category || ''}"`,
          `"${row.unit}"`, `"${row.brand || ''}"`, `"${row.model || ''}"`,
          `"${row.min_stock_level}"`, `"${row.reorder_level}"`, `"${row.current_stock}"`,
          `"${row.unit_price}"`, `"${row.store_name || ''}"`, `"${row.status}"`
        ].join(',') + '\n';
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="inventory_catalog_${schoolId}.csv"`);
      return res.send(csv);
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 17. NOTIFICATIONS & ALERTS
// ==========================================
router.get('/notifications', requireAuth, requirePermission('inventory.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  try {
    const result = await db.query(`
      SELECT * FROM inventory_notifications
      WHERE school_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [schoolId]);
    return res.json({ notifications: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/notifications/:id/read', requireAuth, requirePermission('inventory.view'), async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`UPDATE inventory_notifications SET is_read = TRUE WHERE id = $1`, [id]);
    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/notifications/mark-all-read', requireAuth, requirePermission('inventory.view'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  try {
    await db.query(`UPDATE inventory_notifications SET is_read = TRUE WHERE school_id = $1`, [schoolId]);
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 18. WARRANTY EXPIRY REMINDERS
// ==========================================
router.get('/assets/warranties-expiring', requireAuth, requirePermission('inventory.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const days = parseInt((req.query.days as string) || '90', 10);
  try {
    const result = await db.query(`
      SELECT a.*, c.name as category_name, d.name as department_name
      FROM assets a
      JOIN inventory_categories c ON a.category_id = c.id
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE a.school_id = $1
        AND a.warranty_end_date IS NOT NULL
        AND a.warranty_end_date >= CURRENT_DATE
        AND a.warranty_end_date <= (CURRENT_DATE + ($2 || ' days')::INTERVAL)
      ORDER BY a.warranty_end_date ASC
    `, [schoolId, `${days}`]);
    return res.json({ assets: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 19. ASSET ASSIGNMENT HISTORY & EMPLOYEE CLEARANCE
// ==========================================
router.get('/assets/:id/history', requireAuth, requirePermission('inventory.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const { id } = req.params;
  try {
    const result = await db.query(`
      SELECT
        aa.*,
        concat(e.first_name, ' ', e.last_name) as employee_name,
        e.employee_id_number as employee_code,
        d.name as department_name,
        concat(u.first_name, ' ', u.last_name) as assigned_by_name
      FROM asset_assignments aa
      LEFT JOIN employees e ON aa.employee_id = e.id
      LEFT JOIN departments d ON aa.department_id = d.id
      LEFT JOIN users u ON aa.assigned_by_id = u.id
      WHERE aa.asset_id = $1 AND aa.school_id = $2
      ORDER BY aa.assigned_date DESC, aa.created_at DESC
    `, [id, schoolId]);
    return res.json({ history: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/assets/employee/:employeeId', requireAuth, requirePermission('inventory.view'), async (req, res) => {
  const schoolId = (req.query.schoolId as string) || req.user!.schoolId;
  const { employeeId } = req.params;
  try {
    const result = await db.query(`
      SELECT
        a.*,
        c.name as category_name,
        d.name as department_name,
        aa.assigned_date,
        aa.expected_return_date,
        aa.condition_at_assignment
      FROM assets a
      JOIN inventory_categories c ON a.category_id = c.id
      LEFT JOIN departments d ON a.department_id = d.id
      JOIN asset_assignments aa ON a.id = aa.asset_id AND aa.status = 'ACTIVE'
      WHERE a.school_id = $1 AND a.assigned_employee_id = $2
      ORDER BY a.name ASC
    `, [schoolId, employeeId]);
    return res.json({ assets: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 20. BULK IMPORT INVENTORY ITEMS
// ==========================================
router.post('/items/import', requireAuth, requirePermission('inventory.manage'), async (req, res) => {
  const schoolId = (req.body.schoolId as string) || req.user!.schoolId;
  const itemsToImport = req.body.items as Array<any>;

  if (!Array.isArray(itemsToImport) || itemsToImport.length === 0) {
    return res.status(400).json({ error: 'Array of items is required for import.' });
  }

  try {
    await db.exec('BEGIN');
    const importedIds: string[] = [];

    for (const raw of itemsToImport) {
      if (!raw.name || !raw.sku || !raw.categoryId) {
        continue;
      }

      // Check existing SKU
      const existing = await db.query(
        'SELECT id FROM inventory_items WHERE school_id = $1 AND sku = $2',
        [schoolId, raw.sku.trim()]
      );
      if (existing.rows.length > 0) continue;

      const itemId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const currentStock = parseInt(raw.openingStock || raw.currentStock || '0', 10);
      const unitPrice = parseFloat(raw.unitPrice || '0');

      await db.query(`
        INSERT INTO inventory_items (
          id, school_id, category_id, sku, name, description, unit, brand, model,
          specifications, barcode, min_stock_level, reorder_level, max_stock_level,
          current_stock, unit_price, default_store_id, room_shelf_location, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'ACTIVE'
        )
      `, [
        itemId, schoolId, raw.categoryId, raw.sku.trim(), raw.name.trim(),
        raw.description || null, raw.unit || 'Piece', raw.brand || null, raw.model || null,
        raw.specifications || null, raw.barcode || raw.sku.trim(),
        raw.minLevel ? parseInt(raw.minLevel, 10) : 5,
        raw.reorderLevel ? parseInt(raw.reorderLevel, 10) : 10,
        raw.maxLevel ? parseInt(raw.maxLevel, 10) : 500,
        currentStock, unitPrice, raw.storeId || null, raw.shelfLocation || null
      ]);

      if (currentStock > 0) {
        const trxId = `trx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await db.query(`
          INSERT INTO inventory_stock_transactions (
            id, school_id, item_id, store_id, transaction_type, quantity,
            unit_price, total_value, balance_after, reference_type, reference_id, remarks, created_by_id
          ) VALUES ($1, $2, $3, $4, 'STOCK_IN', $5, $6, $7, $5, 'IMPORT_OPENING', 'Opening balance import', 'Imported opening balance', $8)
        `, [trxId, schoolId, itemId, raw.storeId || null, currentStock, unitPrice, currentStock * unitPrice, req.user!.id]);
      }

      importedIds.push(itemId);
    }

    await db.exec('COMMIT');

    recordAuditLog({
      req,
      userId: req.user!.id,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      userRole: req.user!.roleName,
      schoolId,
      action: 'IMPORT_INVENTORY_ITEMS',
      module: 'INVENTORY',
      description: `Bulk imported ${importedIds.length} inventory items`,
      details: { importedCount: importedIds.length }
    });

    return res.status(201).json({
      success: true,
      importedCount: importedIds.length,
      message: `Successfully imported ${importedIds.length} items.`
    });
  } catch (err: any) {
    await db.exec('ROLLBACK');
    return res.status(500).json({ error: err.message });
  }
});

export default router;
