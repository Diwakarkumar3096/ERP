import type { PGlite } from '@electric-sql/pglite';

export async function ensurePhase13SchemaAndData(db: PGlite) {
  try {
    console.log('[DB] Checking Phase 13 Inventory, Assets & Procurement Management schema...');

    // 1. Core Inventory & Asset Architecture Tables
    await db.exec(`
      -- 1. Inventory Categories
      CREATE TABLE IF NOT EXISTS inventory_categories (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, code)
      );

      -- 2. Inventory Stores / Warehouses
      CREATE TABLE IF NOT EXISTS inventory_stores (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL,
        building VARCHAR(100),
        floor VARCHAR(50),
        room_number VARCHAR(50),
        responsible_employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, code)
      );

      -- 3. Inventory Items
      CREATE TABLE IF NOT EXISTS inventory_items (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        category_id VARCHAR(50) NOT NULL REFERENCES inventory_categories(id) ON DELETE RESTRICT,
        name VARCHAR(150) NOT NULL,
        sku VARCHAR(50) NOT NULL,
        barcode VARCHAR(100),
        unit VARCHAR(50) NOT NULL DEFAULT 'Piece',
        brand VARCHAR(100),
        model VARCHAR(100),
        description TEXT,
        min_stock_level INT DEFAULT 5,
        reorder_level INT DEFAULT 10,
        max_stock_level INT DEFAULT 100,
        current_stock INT DEFAULT 0,
        unit_price NUMERIC(10, 2) DEFAULT 0.00,
        default_store_id VARCHAR(50) REFERENCES inventory_stores(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, sku)
      );

      -- 4. Stock Movement & Ledger Transactions
      CREATE TABLE IF NOT EXISTS inventory_stock_transactions (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        item_id VARCHAR(50) NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
        store_id VARCHAR(50) NOT NULL REFERENCES inventory_stores(id) ON DELETE CASCADE,
        transaction_type VARCHAR(30) NOT NULL,
        quantity INT NOT NULL,
        unit_price NUMERIC(10, 2) DEFAULT 0.00,
        total_value NUMERIC(12, 2) DEFAULT 0.00,
        balance_after INT NOT NULL,
        reference_type VARCHAR(50),
        reference_id VARCHAR(100),
        department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
        recipient_employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE SET NULL,
        recipient_name VARCHAR(150),
        remarks TEXT,
        created_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 5. Stock Transfers Between Stores
      CREATE TABLE IF NOT EXISTS inventory_stock_transfers (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        transfer_number VARCHAR(50) NOT NULL,
        from_store_id VARCHAR(50) NOT NULL REFERENCES inventory_stores(id) ON DELETE RESTRICT,
        to_store_id VARCHAR(50) NOT NULL REFERENCES inventory_stores(id) ON DELETE RESTRICT,
        item_id VARCHAR(50) NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
        quantity INT NOT NULL,
        transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
        status VARCHAR(20) DEFAULT 'COMPLETED',
        reason TEXT,
        requested_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        approved_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 6. Physical Stock Counts / Audits
      CREATE TABLE IF NOT EXISTS inventory_stock_counts (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        store_id VARCHAR(50) NOT NULL REFERENCES inventory_stores(id) ON DELETE CASCADE,
        count_title VARCHAR(150) NOT NULL,
        count_date DATE NOT NULL DEFAULT CURRENT_DATE,
        status VARCHAR(20) DEFAULT 'COMPLETED',
        total_items_counted INT DEFAULT 0,
        total_variance_qty INT DEFAULT 0,
        total_variance_value NUMERIC(12, 2) DEFAULT 0.00,
        verified_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        approved_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS inventory_stock_count_items (
        id VARCHAR(50) PRIMARY KEY,
        count_id VARCHAR(50) NOT NULL REFERENCES inventory_stock_counts(id) ON DELETE CASCADE,
        item_id VARCHAR(50) NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
        system_quantity INT NOT NULL,
        physical_quantity INT NOT NULL,
        variance_quantity INT NOT NULL,
        unit_price NUMERIC(10, 2) DEFAULT 0.00,
        variance_value NUMERIC(12, 2) DEFAULT 0.00,
        adjustment_status VARCHAR(20) DEFAULT 'ADJUSTED',
        remarks TEXT
      );

      -- 7. Vendors & Suppliers
      CREATE TABLE IF NOT EXISTS vendors (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        contact_person VARCHAR(100),
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(100),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        gstin VARCHAR(50),
        pan VARCHAR(50),
        bank_name VARCHAR(100),
        bank_account_number VARCHAR(50),
        bank_ifsc VARCHAR(30),
        category VARCHAR(100) DEFAULT 'General',
        status VARCHAR(20) DEFAULT 'ACTIVE',
        rating NUMERIC(2, 1) DEFAULT 4.5,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, name)
      );

      -- 8. Fixed Assets Master
      CREATE TABLE IF NOT EXISTS assets (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        category_id VARCHAR(50) NOT NULL REFERENCES inventory_categories(id) ON DELETE RESTRICT,
        asset_code VARCHAR(50) NOT NULL,
        name VARCHAR(150) NOT NULL,
        serial_number VARCHAR(100),
        barcode VARCHAR(100),
        brand VARCHAR(100),
        model VARCHAR(100),
        purchase_date DATE,
        purchase_cost NUMERIC(12, 2) DEFAULT 0.00,
        vendor_id VARCHAR(50) REFERENCES vendors(id) ON DELETE SET NULL,
        warranty_start_date DATE,
        warranty_end_date DATE,
        warranty_provider VARCHAR(150),
        current_condition VARCHAR(30) DEFAULT 'GOOD',
        status VARCHAR(30) DEFAULT 'ACTIVE',
        current_store_id VARCHAR(50) REFERENCES inventory_stores(id) ON DELETE SET NULL,
        department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
        assigned_employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE SET NULL,
        location_description TEXT,
        specifications TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, asset_code)
      );

      -- 9. Asset Custody & Assignments
      CREATE TABLE IF NOT EXISTS asset_assignments (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        asset_id VARCHAR(50) NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE SET NULL,
        department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
        location_room VARCHAR(100),
        assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
        expected_return_date DATE,
        actual_return_date DATE,
        condition_at_assignment VARCHAR(30) DEFAULT 'GOOD',
        condition_at_return VARCHAR(30),
        status VARCHAR(20) DEFAULT 'ACTIVE',
        assigned_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 10. Asset Servicing & Maintenance
      CREATE TABLE IF NOT EXISTS asset_maintenance (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        asset_id VARCHAR(50) NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        maintenance_date DATE NOT NULL DEFAULT CURRENT_DATE,
        maintenance_type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        vendor_center VARCHAR(150),
        cost NUMERIC(10, 2) DEFAULT 0.00,
        invoice_number VARCHAR(100),
        is_under_warranty BOOLEAN DEFAULT false,
        next_maintenance_date DATE,
        expense_record_id VARCHAR(50) REFERENCES expenses(id) ON DELETE SET NULL,
        remarks TEXT,
        created_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 11. Purchase Requests
      CREATE TABLE IF NOT EXISTS purchase_requests (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        request_number VARCHAR(50) NOT NULL,
        department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
        requested_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        request_date DATE NOT NULL DEFAULT CURRENT_DATE,
        required_by_date DATE,
        priority VARCHAR(20) DEFAULT 'MEDIUM',
        title VARCHAR(200) NOT NULL,
        reason TEXT,
        estimated_total NUMERIC(12, 2) DEFAULT 0.00,
        status VARCHAR(30) DEFAULT 'PENDING',
        reviewed_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        review_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, request_number)
      );

      CREATE TABLE IF NOT EXISTS purchase_request_items (
        id VARCHAR(50) PRIMARY KEY,
        request_id VARCHAR(50) NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
        item_name VARCHAR(150) NOT NULL,
        item_id VARCHAR(50) REFERENCES inventory_items(id) ON DELETE SET NULL,
        quantity INT NOT NULL DEFAULT 1,
        unit VARCHAR(50) DEFAULT 'Piece',
        estimated_unit_price NUMERIC(10, 2) DEFAULT 0.00,
        estimated_total NUMERIC(12, 2) DEFAULT 0.00,
        specifications TEXT
      );

      -- 12. Purchase Orders
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        po_number VARCHAR(50) NOT NULL,
        vendor_id VARCHAR(50) NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
        request_id VARCHAR(50) REFERENCES purchase_requests(id) ON DELETE SET NULL,
        order_date DATE NOT NULL DEFAULT CURRENT_DATE,
        expected_delivery_date DATE,
        subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        tax_amount NUMERIC(12, 2) DEFAULT 0.00,
        discount_amount NUMERIC(12, 2) DEFAULT 0.00,
        shipping_cost NUMERIC(10, 2) DEFAULT 0.00,
        total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        terms_and_conditions TEXT,
        status VARCHAR(30) DEFAULT 'APPROVED',
        approved_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, po_number)
      );

      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id VARCHAR(50) PRIMARY KEY,
        po_id VARCHAR(50) NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        item_id VARCHAR(50) REFERENCES inventory_items(id) ON DELETE SET NULL,
        item_name VARCHAR(150) NOT NULL,
        quantity INT NOT NULL,
        unit VARCHAR(50) DEFAULT 'Piece',
        unit_price NUMERIC(10, 2) NOT NULL,
        total_price NUMERIC(12, 2) NOT NULL,
        received_quantity INT DEFAULT 0
      );

      -- 13. Goods Receipts
      CREATE TABLE IF NOT EXISTS goods_receipts (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        receipt_number VARCHAR(50) NOT NULL,
        po_id VARCHAR(50) NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
        vendor_id VARCHAR(50) NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
        target_store_id VARCHAR(50) NOT NULL REFERENCES inventory_stores(id) ON DELETE RESTRICT,
        receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
        challan_number VARCHAR(100),
        invoice_number VARCHAR(100),
        total_accepted_value NUMERIC(12, 2) DEFAULT 0.00,
        expense_record_id VARCHAR(50) REFERENCES expenses(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'COMPLETED',
        remarks TEXT,
        received_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, receipt_number)
      );

      CREATE TABLE IF NOT EXISTS goods_receipt_items (
        id VARCHAR(50) PRIMARY KEY,
        receipt_id VARCHAR(50) NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
        po_item_id VARCHAR(50) REFERENCES purchase_order_items(id) ON DELETE SET NULL,
        item_id VARCHAR(50) REFERENCES inventory_items(id) ON DELETE SET NULL,
        item_name VARCHAR(150) NOT NULL,
        ordered_quantity INT NOT NULL,
        received_quantity INT NOT NULL,
        accepted_quantity INT NOT NULL,
        rejected_quantity INT DEFAULT 0,
        unit_price NUMERIC(10, 2) NOT NULL,
        total_value NUMERIC(12, 2) NOT NULL,
        rejection_reason TEXT
      );

      -- 14. Asset & Stock Disposals
      CREATE TABLE IF NOT EXISTS inventory_disposals (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        asset_id VARCHAR(50) REFERENCES assets(id) ON DELETE SET NULL,
        item_id VARCHAR(50) REFERENCES inventory_items(id) ON DELETE SET NULL,
        disposal_date DATE NOT NULL DEFAULT CURRENT_DATE,
        disposal_reason VARCHAR(100) NOT NULL,
        disposal_method VARCHAR(100),
        sale_value NUMERIC(10, 2) DEFAULT 0.00,
        remarks TEXT,
        approved_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 15. Inventory & Asset Notifications (Low-stock, Maintenance, Procurement Alerts)
      CREATE TABLE IF NOT EXISTS inventory_notifications (
        id VARCHAR(50) PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        entity_type VARCHAR(50),
        entity_id VARCHAR(50),
        priority VARCHAR(20) DEFAULT 'NORMAL',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Performance Indexes
      CREATE INDEX IF NOT EXISTS idx_inv_item_sch ON inventory_items(school_id);
      CREATE INDEX IF NOT EXISTS idx_inv_item_cat ON inventory_items(category_id);
      CREATE INDEX IF NOT EXISTS idx_inv_trx_item ON inventory_stock_transactions(item_id);
      CREATE INDEX IF NOT EXISTS idx_inv_trx_store ON inventory_stock_transactions(store_id);
      CREATE INDEX IF NOT EXISTS idx_inv_asset_sch ON assets(school_id);
      CREATE INDEX IF NOT EXISTS idx_inv_asset_cat ON assets(category_id);
      CREATE INDEX IF NOT EXISTS idx_inv_po_sch ON purchase_orders(school_id);
      CREATE INDEX IF NOT EXISTS idx_inv_po_vendor ON purchase_orders(vendor_id);
      CREATE INDEX IF NOT EXISTS idx_inv_gr_po ON goods_receipts(po_id);
      CREATE INDEX IF NOT EXISTS idx_inv_notif_sch ON inventory_notifications(school_id, is_read, created_at);
    `);

    // 2. Ensure Expense Category for Inventory & Procurement (Phase 6 Integration)
    await db.exec(`
      INSERT INTO expense_categories (id, school_id, name, code, status)
      VALUES
        ('expcat_sch_vvps_inventory', 'sch_vvps', 'Store Inventory, Assets & Campus Procurement', 'INVENTORY', 'active')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 3. Register Phase 13 RBAC Permissions
    const inventoryPermissions = [
      { id: 'inventory.view', module: 'INVENTORY', name: 'View Inventory & Assets', desc: 'View inventory items, stock levels, assets, vendors and reports' },
      { id: 'inventory.manage', module: 'INVENTORY', name: 'Manage Inventory & Stores', desc: 'Add, update inventory items, categories and warehouse locations' },
      { id: 'inventory.stock.manage', module: 'INVENTORY', name: 'Manage Stock Movements', desc: 'Perform stock in, stock out, department issues, and inter-store transfers' },
      { id: 'inventory.assets.manage', module: 'INVENTORY', name: 'Manage Fixed Assets', desc: 'Register assets, track custody assignments, transfers, and maintenance' },
      { id: 'inventory.procurement.manage', module: 'INVENTORY', name: 'Manage Procurement', desc: 'Create and review purchase requests, purchase orders, and goods receipts' },
      { id: 'inventory.vendors.manage', module: 'INVENTORY', name: 'Manage Vendors', desc: 'Register and manage vendor directories, contracts and compliance' },
      { id: 'inventory.audit.count', module: 'INVENTORY', name: 'Perform Physical Stock Count', desc: 'Execute physical audits, calculate variances and apply stock adjustments' },
      { id: 'inventory.reports.view', module: 'INVENTORY', name: 'View Inventory Reports', desc: 'Access stock ledger, consumption analysis, and asset registers' }
    ];

    for (const p of inventoryPermissions) {
      await db.query(`
        INSERT INTO permissions (id, module, name, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING;
      `, [p.id, p.module, p.name, p.desc]);
    }

    // Role Assignments
    const allInvPermIds = inventoryPermissions.map(p => p.id);
    for (const pid of allInvPermIds) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_super_admin', $1) ON CONFLICT DO NOTHING;`, [pid]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_school_admin', $1) ON CONFLICT DO NOTHING;`, [pid]);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_principal', $1) ON CONFLICT DO NOTHING;`, [pid]);
    }

    // Accountant view & procurement permissions
    for (const pid of ['inventory.view', 'inventory.procurement.manage', 'inventory.vendors.manage', 'inventory.reports.view']) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_accountant', $1) ON CONFLICT DO NOTHING;`, [pid]);
    }

    // Teacher & Staff view & request permissions
    for (const pid of ['inventory.view', 'inventory.stock.manage']) {
      await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_teacher', $1) ON CONFLICT DO NOTHING;`, [pid]);
    }

    // 4. Seed Inventory Categories for Vidyavahini Public School (VVPS)
    await db.exec(`
      INSERT INTO inventory_categories (id, school_id, name, code, description, is_active)
      VALUES
        ('cat_vvps_stat', 'sch_vvps', 'Stationery & Office Supplies', 'STAT', 'Paper, registers, notebooks, pens, markers, and desk stationery', true),
        ('cat_vvps_lab', 'sch_vvps', 'Laboratory Chemicals & Glassware', 'LAB', 'Physics apparatus, chemistry glassware, reagents and biological models', true),
        ('cat_vvps_it', 'sch_vvps', 'IT Hardware & Computer Accessories', 'IT-EQUIP', 'Desktops, laptops, projectors, networking switches, printers and toners', true),
        ('cat_vvps_furn', 'sch_vvps', 'Furniture & Classroom Fixtures', 'FURN', 'Student desks, executive tables, ergonomic chairs, boards and almirahs', true),
        ('cat_vvps_sports', 'sch_vvps', 'Sports Equipment & Athletics', 'SPORTS', 'Cricket kits, footballs, volleyballs, gym mats and sports gear', true),
        ('cat_vvps_clean', 'sch_vvps', 'Cleaning & Campus Sanitization', 'CLEAN', 'Disinfectants, hand wash, trash bins, brooms and hygiene consumables', true),
        ('cat_vvps_hostel', 'sch_vvps', 'Hostel Linen & Residential Supplies', 'HOSTEL', 'Bedsheets, mattresses, pillow covers, kitchen cutlery and dining supplies', true)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 5. Seed Stores & Locations for VVPS
    await db.exec(`
      INSERT INTO inventory_stores (id, school_id, name, code, building, floor, room_number, status, notes)
      VALUES
        ('store_vvps_main', 'sch_vvps', 'Central Campus Warehouse', 'STORE-CENTRAL', 'Administrative Block', 'Ground Floor', 'G-04', 'ACTIVE', 'Primary receiving depot and bulk material distribution hub'),
        ('store_vvps_sci', 'sch_vvps', 'Science Laboratory Store', 'STORE-SCI-LAB', 'Science & Innovation Wing', 'First Floor', 'S-102', 'ACTIVE', 'Secured glass cabinets and ventilated chemical inventory room'),
        ('store_vvps_it', 'sch_vvps', 'IT Hardware & Server Depo', 'STORE-IT-DEP', 'Technology Complex', 'Second Floor', 'T-204', 'ACTIVE', 'Climate-controlled electronics storage and workstation repair room'),
        ('store_vvps_sports', 'sch_vvps', 'Sports Complex Equipment Room', 'STORE-SPORTS', 'Indoor Sports Pavilion', 'Ground Floor', 'P-02', 'ACTIVE', 'Athletics gear, balls, protective guards and tournament accessories'),
        ('store_vvps_hostel', 'sch_vvps', 'Hostel Provisions & Linen Store', 'STORE-HOSTEL', 'Vivekananda Boys Hostel Block A', 'Ground Floor', 'H-01', 'ACTIVE', 'Bedding sets, cleaning detergents, and dining consumables')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 6. Seed Vendors for VVPS
    await db.exec(`
      INSERT INTO vendors (
        id, school_id, name, contact_person, phone, email, address, city, state,
        gstin, pan, bank_name, bank_account_number, bank_ifsc, category, status, rating
      ) VALUES
        (
          'vnd_vvps_001', 'sch_vvps', 'Prabhat Paper & Educational Supplies Mart',
          'Vinod Gupta', '+91 98350 44001', 'orders@prabhatpaper.in',
          'Shop 18, Katra Commercial Market', 'Prayagraj', 'Uttar Pradesh',
          '09AAACP1234F1Z5', 'AAACP1234F', 'State Bank of India', '39088210041', 'SBIN0001234',
          'Stationery', 'ACTIVE', 4.8
        ),
        (
          'vnd_vvps_002', 'sch_vvps', 'Apex Scientific Instruments & Reagents Corp',
          'Dr. R. K. Saxena', '+91 98350 44002', 'sales@apexscientific.com',
          'Plot 45, Naini Industrial Estate', 'Prayagraj', 'Uttar Pradesh',
          '09AAGCA9876C1Z2', 'AAGCA9876C', 'Punjab National Bank', '4120002100114', 'PUNB0041200',
          'Laboratory Equipment', 'ACTIVE', 4.7
        ),
        (
          'vnd_vvps_003', 'sch_vvps', 'Netcore IT Solutions & Hardware Services',
          'Amitabh Verma', '+91 98350 44003', 'support@netcoreit.co.in',
          'Civil Lines Cyber Tower, Floor 3', 'Prayagraj', 'Uttar Pradesh',
          '09AABCN5544B1Z8', 'AABCN5544B', 'HDFC Bank Ltd', '50200088114422', 'HDFC0000210',
          'IT & Electronics', 'ACTIVE', 4.9
        ),
        (
          'vnd_vvps_004', 'sch_vvps', 'Royal Godrej Institutional Furnishers',
          'Harish Tandon', '+91 98350 44004', 'info@royalfurnishers.com',
          'Zero Road Industrial Complex', 'Prayagraj', 'Uttar Pradesh',
          '09AAECR3322E1Z3', 'AAECR3322E', 'Bank of Baroda', '00440200011882', 'BARB0CIVILP',
          'Furniture', 'ACTIVE', 4.6
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 7. Seed Inventory Items for VVPS
    await db.exec(`
      INSERT INTO inventory_items (
        id, school_id, category_id, name, sku, barcode, unit, brand, model,
        description, min_stock_level, reorder_level, max_stock_level, current_stock,
        unit_price, default_store_id, status
      ) VALUES
        (
          'item_vvps_pap_a4', 'sch_vvps', 'cat_vvps_stat', 'JK Copier A4 Paper Ream (75 GSM, 500 Sheets)',
          'STAT-PAP-A4', '890123400001', 'Box', 'JK Paper', '75 GSM Super White',
          'High brightness multipurpose copier paper for school examination and administrative printing',
          15, 30, 200, 85, 290.00, 'store_vvps_main', 'ACTIVE'
        ),
        (
          'item_vvps_marker', 'sch_vvps', 'cat_vvps_stat', 'Camlin Whiteboard Marker Pens (Pack of 10, Assorted)',
          'STAT-WBM-10', '890123400002', 'Pack', 'Kokuyo Camlin', 'Whiteboard Pro',
          'Low odor whiteboard markers for classroom whiteboards; black, blue, green and red inks',
          10, 25, 150, 42, 220.00, 'store_vvps_main', 'ACTIVE'
        ),
        (
          'item_vvps_flask', 'sch_vvps', 'cat_vvps_lab', 'Borosil Conical Erlenmeyer Flask 250ml (Borosilicate 3.3)',
          'LAB-FLK-250', '890123400003', 'Piece', 'Borosil', 'Class A Graduation',
          'Thermal shock resistant borosilicate laboratory flask with clear graduation markings for chemistry practicals',
          10, 20, 80, 48, 145.00, 'store_vvps_sci', 'ACTIVE'
        ),
        (
          'item_vvps_toner', 'sch_vvps', 'cat_vvps_it', 'HP 88A Original Black LaserJet Toner Cartridge',
          'IT-TNR-88A', '890123400004', 'Piece', 'HP', 'CC388A',
          'Original monochrome toner cartridge delivering crisp black text for staff room and examination printers',
          3, 6, 25, 4, 3850.00, 'store_vvps_it', 'ACTIVE'
        ),
        (
          'item_vvps_bball', 'sch_vvps', 'cat_vvps_sports', 'Spalding TF-150 Outdoor Basketball Size 7',
          'SPT-BSK-S7', '890123400005', 'Piece', 'Spalding', 'TF-150 Grip',
          'All-weather composite rubber basketball built for concrete outdoor and gymnasium courts',
          5, 10, 40, 18, 950.00, 'store_vvps_sports', 'ACTIVE'
        ),
        (
          'item_vvps_sanit', 'sch_vvps', 'cat_vvps_clean', 'Dettol Hospital Disinfectant Liquid 5 Litre Can',
          'CLN-SAN-5L', '890123400006', 'Can', 'Reckitt Dettol', 'Professional 5L',
          'Concentrated antibacterial surface disinfectant and sanitizer for campus washrooms and corridors',
          4, 8, 30, 12, 1150.00, 'store_vvps_main', 'ACTIVE'
        ),
        (
          'item_vvps_sheet', 'sch_vvps', 'cat_vvps_hostel', 'Bombay Dyeing Pure Cotton Single Bedsheet with Pillow Cover',
          'HST-BED-SNG', '890123400007', 'Set', 'Bombay Dyeing', 'Hostel Standard 180TC',
          'Durable breathable cotton bedding set designed for hostel student single cots',
          20, 40, 150, 75, 580.00, 'store_vvps_hostel', 'ACTIVE'
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 8. Seed Stock Transactions (Initial Stock In & Issues)
    await db.exec(`
      INSERT INTO inventory_stock_transactions (
        id, school_id, item_id, store_id, transaction_type, quantity, unit_price,
        total_value, balance_after, reference_type, reference_id, recipient_name, remarks
      ) VALUES
        (
          'trx_vvps_001', 'sch_vvps', 'item_vvps_pap_a4', 'store_vvps_main', 'STOCK_IN',
          100, 290.00, 29000.00, 100, 'PURCHASE_RECEIPT', 'PO-VVPS-2026-081',
          'Central Storekeeper', 'Opening procurement delivery received from Prabhat Paper Mart'
        ),
        (
          'trx_vvps_002', 'sch_vvps', 'item_vvps_pap_a4', 'store_vvps_main', 'STOCK_OUT',
          15, 290.00, 4350.00, 85, 'DEPT_ISSUE', 'ISS-VVPS-001',
          'Examination Committee', 'Issued for Term 1 Mid-Term Question Paper and Answer Sheet sets'
        ),
        (
          'trx_vvps_003', 'sch_vvps', 'item_vvps_marker', 'store_vvps_main', 'STOCK_IN',
          50, 220.00, 11000.00, 50, 'PURCHASE_RECEIPT', 'PO-VVPS-2026-081',
          'Central Storekeeper', 'Bulk batch received for academic semester'
        ),
        (
          'trx_vvps_004', 'sch_vvps', 'item_vvps_marker', 'store_vvps_main', 'STOCK_OUT',
          8, 220.00, 1760.00, 42, 'DEPT_ISSUE', 'ISS-VVPS-002',
          'Senior Secondary Science Teachers', 'Issued to Physics, Chemistry and Math faculty rooms'
        ),
        (
          'trx_vvps_005', 'sch_vvps', 'item_vvps_toner', 'store_vvps_it', 'STOCK_IN',
          6, 3850.00, 23100.00, 6, 'PURCHASE_RECEIPT', 'PO-VVPS-2026-082',
          'IT Coordinator', 'Quarterly laser printer toner stock intake'
        ),
        (
          'trx_vvps_006', 'sch_vvps', 'item_vvps_toner', 'store_vvps_it', 'STOCK_OUT',
          2, 3850.00, 7700.00, 4, 'DEPT_ISSUE', 'ISS-VVPS-003',
          'Accounts & Administrative Office', 'Replacement toner cartridges installed in Admin LaserJets'
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 9. Seed Fixed Assets for VVPS
    await db.exec(`
      INSERT INTO assets (
        id, school_id, category_id, asset_code, name, serial_number, barcode,
        brand, model, purchase_date, purchase_cost, vendor_id, warranty_start_date,
        warranty_end_date, warranty_provider, current_condition, status, current_store_id,
        department_id, assigned_employee_id, location_description, specifications
      ) VALUES
        (
          'ast_vvps_pc1', 'sch_vvps', 'cat_vvps_it', 'AST-IT-PC-001',
          'Dell OptiPlex 7090 Desktop Workstation (Intel Core i7, 16GB, 512GB SSD)',
          'DLL-SN-998811', 'BAR-AST-001', 'Dell Technologies', 'OptiPlex 7090 MT',
          '2024-04-10', 68500.00, 'vnd_vvps_003', '2024-04-10', '2027-04-09',
          'Dell ProSupport On-Site 3-Year Warranty', 'GOOD', 'IN_USE', 'store_vvps_it',
          'dept_vvps_it', 'emp_vvps_001', 'Senior Computer Lab 1, Terminal 01',
          'Intel Core i7-11700, 16GB DDR4, 512GB NVMe SSD, Dell 24-inch FHD Monitor, Keyboard & Optical Mouse'
        ),
        (
          'ast_vvps_proj1', 'sch_vvps', 'cat_vvps_it', 'AST-IT-PRJ-001',
          'Epson EB-E01 3LCD XGA Interactive Classroom Projector (3300 Lumens)',
          'EPS-SN-443322', 'BAR-AST-002', 'Epson', 'EB-E01 3LCD',
          '2023-08-15', 38000.00, 'vnd_vvps_003', '2023-08-15', '2025-08-14',
          'Epson India Carry-in Warranty', 'GOOD', 'IN_USE', 'store_vvps_it',
          'dept_vvps_acad', 'emp_vvps_002', 'Senior Smart Classroom 10-A (Ceiling Mounted)',
          '3300 Lumens color brightness, XGA 1024x768 resolution, HDMI/VGA dual inputs, 12,000 hrs lamp life'
        ),
        (
          'ast_vvps_alm1', 'sch_vvps', 'cat_vvps_furn', 'AST-FUR-ALM-001',
          'Godrej Interio Heavy Duty Steel Record Almirah (4 Adjustable Shelves)',
          'GDJ-SN-112233', 'BAR-AST-003', 'Godrej Interio', 'Storwel Plain Steel',
          '2022-06-01', 24500.00, 'vnd_vvps_004', '2022-06-01', '2025-06-01',
          'Godrej Manufacturing Warranty', 'GOOD', 'IN_USE', 'store_vvps_main',
          'dept_vvps_admin', null, 'Administrative Central Record Room G-02',
          'CRCA steel sheet body, 3-way unpickable locking system, anti-corrosion phosphate coating'
        ),
        (
          'ast_vvps_ac1', 'sch_vvps', 'cat_vvps_it', 'AST-APL-AC-001',
          'Voltas 2-Ton 5-Star Heavy Duty Inverter Split AC',
          'VLT-SN-556677', 'BAR-AST-004', 'Voltas Tata Enterprise', '245V Vectra',
          '2023-03-20', 54000.00, 'vnd_vvps_003', '2023-03-20', '2028-03-19',
          'Voltas 1-Year Comprehensive + 5-Year Compressor Warranty', 'GOOD', 'IN_USE', 'store_vvps_it',
          'dept_vvps_acad', null, 'Main Staff Council Room & Teacher Lounge',
          '100% Copper condenser, Dual filtration, R32 refrigerant, High ambient cooling up to 52°C'
        ),
        (
          'ast_vvps_prn1', 'sch_vvps', 'cat_vvps_it', 'AST-IT-PRN-001',
          'HP LaserJet Pro M404dn High-Speed Duplex Network Printer',
          'HPP-SN-778899', 'BAR-AST-005', 'HP', 'LaserJet Pro M404dn',
          '2024-01-10', 31500.00, 'vnd_vvps_003', '2024-01-10', '2027-01-09',
          'HP Care Pack Next Business Day Onsite Warranty', 'GOOD', 'IN_USE', 'store_vvps_it',
          'dept_vvps_admin', null, 'Examination & Principal Office Secretariat',
          'Up to 40 ppm print speed, Automatic 2-sided duplex, Gigabit Ethernet, 350-sheet total input capacity'
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 10. Seed Asset Custody Assignments
    await db.exec(`
      INSERT INTO asset_assignments (
        id, school_id, asset_id, employee_id, department_id, location_room,
        assigned_date, condition_at_assignment, status, remarks
      ) VALUES
        (
          'asg_vvps_001', 'sch_vvps', 'ast_vvps_pc1', 'emp_vvps_001', 'dept_vvps_it',
          'Computer Lab 1 - Teacher Master Workstation', '2024-04-12', 'NEW', 'ACTIVE',
          'Allocated to Senior Computer Science faculty for practical instruction and student programming lab'
        ),
        (
          'asg_vvps_002', 'sch_vvps', 'ast_vvps_proj1', 'emp_vvps_002', 'dept_vvps_acad',
          'Classroom 10-A Ceiling Projector Dock', '2023-08-16', 'NEW', 'ACTIVE',
          'Allocated to Class Teacher for interactive digital blackboard and audiovisual multimedia instruction'
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 11. Seed Asset Servicing & Maintenance
    await db.exec(`
      INSERT INTO asset_maintenance (
        id, school_id, asset_id, maintenance_date, maintenance_type, description,
        vendor_center, cost, invoice_number, is_under_warranty, next_maintenance_date, remarks
      ) VALUES
        (
          'maint_inv_001', 'sch_vvps', 'ast_vvps_ac1', CURRENT_DATE - INTERVAL '20 days',
          'PREVENTIVE', 'Quarterly Seasonal AC General Servicing: Chemical foam coil wash, blower jet cleaning and gas pressure check',
          'Voltas Authorized Care Hub, Civil Lines', 1850.00, 'INV-VLT-2026-904', true,
          CURRENT_DATE + INTERVAL '70 days', 'Coils sanitized, cooling efficiency verified at optimum 18 degrees'
        ),
        (
          'maint_inv_002', 'sch_vvps', 'ast_vvps_proj1', CURRENT_DATE - INTERVAL '10 days',
          'INSPECTION', 'Periodic Optical Alignment & Lens Cleaning: Projector lamp hour reading checked (1,420 hrs used), air filter blown clean',
          'Netcore IT Solutions On-Site Engineer', 850.00, 'INV-NET-2026-118', true,
          CURRENT_DATE + INTERVAL '80 days', 'Keystone correction calibrated; display brightness in prime condition'
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 12. Seed Purchase Request for Science Lab
    await db.exec(`
      INSERT INTO purchase_requests (
        id, school_id, request_number, department_id, requested_by_id, request_date,
        required_by_date, priority, title, reason, estimated_total, status, review_notes
      ) VALUES
        (
          'pr_vvps_001', 'sch_vvps', 'PR-VVPS-2026-001', 'dept_vvps_sci', 'usr_super_admin',
          CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '5 days', 'HIGH',
          'Annual Science Lab Consumables & Reagents Replenishment',
          'Required for Board Exam Practical examinations (Physics optical benches, Chemistry organic reagents and titration flasks)',
          24500.00, 'APPROVED', 'Budget sanctioned under Annual Academic Lab Grant 2026-27'
        )
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO purchase_request_items (
        id, request_id, item_name, item_id, quantity, unit, estimated_unit_price, estimated_total, specifications
      ) VALUES
        ('pri_vvps_001', 'pr_vvps_001', 'Borosil Conical Erlenmeyer Flask 250ml', 'item_vvps_flask', 40, 'Piece', 145.00, 5800.00, 'Borosilicate Class A 3.3'),
        ('pri_vvps_002', 'pr_vvps_001', 'Hydrochloric Acid HCl 35% Analytical Reagent (500ml Bottle)', null, 15, 'Bottle', 380.00, 5700.00, 'AR Grade purity bottle with safety hazard seal'),
        ('pri_vvps_003', 'pr_vvps_001', 'Compound Student Monocular Microscope 1000x', null, 5, 'Piece', 2600.00, 13000.00, 'Die-cast metal body, LED illumination and 10x/40x/100x oil immersion lenses')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 13. Seed Purchase Order for Lab Supplies
    await db.exec(`
      INSERT INTO purchase_orders (
        id, school_id, po_number, vendor_id, request_id, order_date, expected_delivery_date,
        subtotal, tax_amount, discount_amount, shipping_cost, total_amount, terms_and_conditions,
        status, approved_by_id, created_by_id
      ) VALUES
        (
          'po_vvps_001', 'sch_vvps', 'PO-VVPS-2026-081', 'vnd_vvps_002', 'pr_vvps_001',
          CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '2 days',
          24500.00, 4410.00, 1000.00, 500.00, 28410.00,
          '1. Delivery to Vidyavahini Public School Science Depot. 2. Glassware breakage during transit to be replaced free of cost. 3. Payment within 15 days of accepted Goods Receipt.',
          'FULLY_RECEIVED', 'usr_super_admin', 'usr_super_admin'
        )
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO purchase_order_items (
        id, po_id, item_id, item_name, quantity, unit, unit_price, total_price, received_quantity
      ) VALUES
        ('poi_vvps_001', 'po_vvps_001', 'item_vvps_flask', 'Borosil Conical Erlenmeyer Flask 250ml', 40, 'Piece', 145.00, 5800.00, 40),
        ('poi_vvps_002', 'po_vvps_001', null, 'Hydrochloric Acid HCl 35% Analytical Reagent (500ml Bottle)', 15, 'Bottle', 380.00, 5700.00, 15),
        ('poi_vvps_003', 'po_vvps_001', null, 'Compound Student Monocular Microscope 1000x', 5, 'Piece', 2600.00, 13000.00, 5)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 14. Seed Goods Receipt
    await db.exec(`
      INSERT INTO goods_receipts (
        id, school_id, receipt_number, po_id, vendor_id, target_store_id, receipt_date,
        challan_number, invoice_number, total_accepted_value, status, remarks, received_by_id
      ) VALUES
        (
          'gr_vvps_001', 'sch_vvps', 'GRN-VVPS-2026-042', 'po_vvps_001', 'vnd_vvps_002',
          'store_vvps_sci', CURRENT_DATE - INTERVAL '3 days', 'DC-APX-8821', 'INV-APX-2026-1102',
          28410.00, 'COMPLETED', 'All glass items verified without breakage. Microscopes optical alignment checked by Lab Assistant.',
          'usr_super_admin'
        )
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO goods_receipt_items (
        id, receipt_id, po_item_id, item_id, item_name, ordered_quantity, received_quantity,
        accepted_quantity, rejected_quantity, unit_price, total_value
      ) VALUES
        ('gri_vvps_001', 'gr_vvps_001', 'poi_vvps_001', 'item_vvps_flask', 'Borosil Conical Erlenmeyer Flask 250ml', 40, 40, 40, 0, 145.00, 5800.00),
        ('gri_vvps_002', 'gr_vvps_001', 'poi_vvps_002', null, 'Hydrochloric Acid HCl 35% Analytical Reagent (500ml Bottle)', 15, 15, 15, 0, 380.00, 5700.00),
        ('gri_vvps_003', 'gr_vvps_001', 'poi_vvps_003', null, 'Compound Student Monocular Microscope 1000x', 5, 5, 5, 0, 2600.00, 13000.00)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 15. Seed Initial System Notifications
    await db.exec(`
      INSERT INTO inventory_notifications (
        id, school_id, user_id, event_type, title, message, entity_type, entity_id, priority, is_read, created_at
      ) VALUES
        (
          'notif_inv_001', 'sch_vvps', 'usr_super_admin', 'LOW_STOCK',
          'Low Stock Alert: HP 88A Toner Cartridge',
          'Current stock of HP 88A Original Black LaserJet Toner Cartridge has reached 4 units (Reorder threshold: 6 units). Depot: IT Hardware & Server Depo.',
          'item', 'item_vvps_toner', 'HIGH', FALSE, CURRENT_TIMESTAMP - INTERVAL '1 hour'
        ),
        (
          'notif_inv_002', 'sch_vvps', 'usr_super_admin', 'OUT_OF_STOCK',
          'Out of Stock Alert: Nivia Football Size 5',
          'Nivia FIFA Pro Match Football Size 5 is currently at 0 units in Sports & Athletics Store. Please initiate a purchase requisition.',
          'item', 'item_vvps_football', 'URGENT', FALSE, CURRENT_TIMESTAMP - INTERVAL '3 hours'
        ),
        (
          'notif_inv_003', 'sch_vvps', 'usr_super_admin', 'WARRANTY_REMINDER',
          'Asset Warranty Active: Voltas 2-Ton Inverter AC',
          'Asset AST-APL-AC-001 (Voltas 2-Ton 5-Star Split AC) warranty is valid with Voltas Tata Care until 2026-03-20.',
          'asset', 'asset_vvps_ac', 'NORMAL', FALSE, CURRENT_TIMESTAMP - INTERVAL '1 day'
        ),
        (
          'notif_inv_004', 'sch_vvps', 'usr_super_admin', 'GOODS_RECEIVED',
          'Goods Receipt Processed: GRN-VVPS-2026-042',
          'Goods received for PO-VVPS-2026-081 from Apex Science & Surgical Instruments. Total accepted stock value ₹28,410.00 posted to Accounts expenses.',
          'goods_receipt', 'gr_vvps_001', 'NORMAL', TRUE, CURRENT_TIMESTAMP - INTERVAL '3 days'
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('[DB] Phase 13 Inventory, Assets & Procurement Management module initialized and seeded successfully.');
  } catch (err: any) {
    (globalThis as any).__phase13Error = err?.message || String(err);
    console.error('[DB PHASE 13 INIT ERROR]', err);
  }
}
