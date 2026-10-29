import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../common/Toast.js';
import type {
  InventoryDashboardData,
  InventoryCategory,
  InventoryStore,
  InventoryItem,
  StockTransaction,
  Asset,
  Vendor,
  PurchaseRequest,
  PurchaseOrder,
  GoodsReceipt,
  InventoryNotification
} from '../../types/inventory.js';
import {
  Package,
  Layers,
  Warehouse,
  Bell,
  Cpu,
  RefreshCw,
  ShoppingBag,
  Building2,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Tag,
  DollarSign,
  UserCheck,
  Calendar,
  FileText,
  Printer,
  ChevronRight,
  ExternalLink,
  SlidersHorizontal,
  Wrench,
  QrCode,
  ArrowRightLeft,
  ClipboardCheck,
  Download,
  FileDown,
  Trash2,
  Truck,
  FileSpreadsheet
} from 'lucide-react';

import { AddItemModal } from './AddItemModal.js';
import { RecordMovementModal } from './RecordMovementModal.js';
import { AddAssetModal } from './AddAssetModal.js';
import { AssetActionModal } from './AssetActionModal.js';
import { PurchaseRequestModal } from './PurchaseRequestModal.js';
import { AddVendorModal } from './AddVendorModal.js';
import { AddStoreModal } from './AddStoreModal.js';
import { BarcodePrintModal } from './BarcodePrintModal.js';
import { StockTransferModal } from './StockTransferModal.js';
import { StockCountModal } from './StockCountModal.js';
import { CreatePOModal } from './CreatePOModal.js';
import { GoodsReceiptModal } from './GoodsReceiptModal.js';

type InventoryTab = 'overview' | 'items' | 'assets' | 'movements' | 'procurement' | 'stores' | 'vendors' | 'alerts';
type ProcurementSubTab = 'requests' | 'orders' | 'receipts';

export const InventoryManagementView: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<InventoryTab>('overview');
  const [procurementSubTab, setProcurementSubTab] = useState<ProcurementSubTab>('requests');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(
    user?.schoolId || 'sch_vvps'
  );

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<InventoryDashboardData | null>(null);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [stores, setStores] = useState<InventoryStore[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [notifications, setNotifications] = useState<InventoryNotification[]>([]);

  // Auxiliary data for dropdowns
  const [employees, setEmployees] = useState<Array<{ id: string; name: string; empNo: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; code: string }>>([]);

  // Modals
  const [showAddItem, setShowAddItem] = useState(false);
  const [showRecordMovement, setShowRecordMovement] = useState(false);
  const [selectedMovementItem, setSelectedMovementItem] = useState<InventoryItem | null>(null);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [selectedAssetForAction, setSelectedAssetForAction] = useState<{
    asset: Asset;
    mode: 'assign' | 'return' | 'maintenance' | 'transfer' | 'dispose';
  } | null>(null);
  const [showPurchaseRequest, setShowPurchaseRequest] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showAddStore, setShowAddStore] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeTarget, setBarcodeTarget] = useState<{
    type: 'item' | 'asset';
    code: string;
    name: string;
    category?: string;
    barcode?: string;
    location?: string;
  } | null>(null);
  const [showStockTransfer, setShowStockTransfer] = useState(false);
  const [showStockCount, setShowStockCount] = useState(false);
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [selectedRequestForPO, setSelectedRequestForPO] = useState<PurchaseRequest | null>(null);
  const [showGoodsReceipt, setShowGoodsReceipt] = useState(false);
  const [selectedPOForGRN, setSelectedPOForGRN] = useState<PurchaseOrder | null>(null);

  // Filters & Search
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState('');
  const [itemStoreFilter, setItemStoreFilter] = useState('');
  const [itemStockFilter, setItemStockFilter] = useState<'ALL' | 'LOW' | 'NORMAL'>('ALL');

  const [assetSearch, setAssetSearch] = useState('');
  const [assetCategoryFilter, setAssetCategoryFilter] = useState('');
  const [assetStatusFilter, setAssetStatusFilter] = useState('');

  const [movementTypeFilter, setMovementTypeFilter] = useState('');

  // Fetch initial auxiliary data
  useEffect(() => {
    async function fetchAux() {
      try {
        const empRes = await api.employees.list({ schoolId: selectedSchoolId, limit: 100 });
        if (empRes?.employees) {
          setEmployees(
            empRes.employees.map((e: any) => ({
              id: e.id,
              name: `${e.first_name} ${e.last_name || ''}`.trim(),
              empNo: e.employee_id_number || e.id
            }))
          );
        }
      } catch (e) {
        setEmployees([
          { id: 'emp_vvps_001', name: 'Dr. Sunita Mishra', empNo: 'VVP-EMP-0001' },
          { id: 'emp_vvps_002', name: 'Rajeshwar Nath Prasad', empNo: 'VVP-EMP-0002' },
          { id: 'emp_vvps_003', name: 'Ananya Sen', empNo: 'VVP-EMP-0003' }
        ]);
      }

      setDepartments([
        { id: 'dept_vvps_acad', name: 'Academic & Pedagogy', code: 'ACAD' },
        { id: 'dept_vvps_admin', name: 'General Administration', code: 'ADMIN' },
        { id: 'dept_vvps_accts', name: 'Accounts & Finance', code: 'ACCTS' },
        { id: 'dept_vvps_sci', name: 'Science & Laboratories', code: 'SCI' },
        { id: 'dept_vvps_it', name: 'Information Technology', code: 'IT' },
        { id: 'dept_vvps_spt', name: 'Sports & Physical Education', code: 'SPT' }
      ]);
    }
    fetchAux();
  }, [selectedSchoolId]);

  // Main data loader
  const loadInventoryData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        dashRes,
        catRes,
        storeRes,
        itemsRes,
        trxRes,
        assetRes,
        vendorRes,
        reqRes,
        poRes,
        grnRes,
        notifRes
      ] = await Promise.all([
        api.inventory.getDashboard(selectedSchoolId).catch(() => null),
        api.inventory.getCategories(selectedSchoolId).catch(() => ({ categories: [] })),
        api.inventory.getStores(selectedSchoolId).catch(() => ({ stores: [] })),
        api.inventory.getItems({ schoolId: selectedSchoolId }).catch(() => ({ items: [] })),
        api.inventory.getTransactions({ schoolId: selectedSchoolId, limit: 100 }).catch(() => ({ transactions: [] })),
        api.inventory.getAssets({ schoolId: selectedSchoolId }).catch(() => ({ assets: [] })),
        api.inventory.getVendors(selectedSchoolId).catch(() => ({ vendors: [] })),
        api.inventory.getRequests(selectedSchoolId).catch(() => ({ requests: [] })),
        api.inventory.getOrders(selectedSchoolId).catch(() => ({ orders: [] })),
        api.inventory.getReceipts(selectedSchoolId).catch(() => ({ receipts: [] })),
        api.inventory.getNotifications(selectedSchoolId).catch(() => ({ notifications: [] }))
      ]);

      if (dashRes) setDashboardData(dashRes);
      if (catRes?.categories) setCategories(catRes.categories);
      if (storeRes?.stores) setStores(storeRes.stores);
      if (itemsRes?.items) setItems(itemsRes.items);
      if (trxRes?.transactions) setTransactions(trxRes.transactions);
      if (assetRes?.assets) setAssets(assetRes.assets);
      if (vendorRes?.vendors) setVendors(vendorRes.vendors);
      if (reqRes?.requests) setPurchaseRequests(reqRes.requests);
      if (poRes?.orders) setPurchaseOrders(poRes.orders);
      if (grnRes?.receipts) setGoodsReceipts(grnRes.receipts);
      if (notifRes?.notifications) setNotifications(notifRes.notifications);
    } catch (err: any) {
      addToast('Failed to load inventory information', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedSchoolId, addToast]);

  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  // Handle PR Review (Approve / Reject)
  const handleReviewPR = async (prId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.inventory.reviewRequest(prId, {
        status,
        reviewNotes: status === 'APPROVED' ? 'Approved by Administrative Directorate' : 'Rejected due to budget limits'
      });
      addToast(`Requisition marked as ${status}`, 'success');
      loadInventoryData();
    } catch (err: any) {
      addToast(err.message || 'Review action failed', 'error');
    }
  };

  // CSV Export Trigger
  const handleExportCSV = (type: 'items' | 'assets') => {
    const url = `/api/inventory/export?schoolId=${encodeURIComponent(selectedSchoolId)}&type=${type}`;
    window.location.href = url;
    addToast(`Exporting ${type === 'assets' ? 'Asset Register' : 'Inventory Catalog'} CSV...`, 'info');
  };

  // Filtered Items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !itemSearch ||
      item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.sku.toLowerCase().includes(itemSearch.toLowerCase()) ||
      (item.brand && item.brand.toLowerCase().includes(itemSearch.toLowerCase())) ||
      (item.barcode && item.barcode.includes(itemSearch));

    const matchesCat = !itemCategoryFilter || item.category_id === itemCategoryFilter;
    const matchesStore = !itemStoreFilter || item.default_store_id === itemStoreFilter;
    const matchesStock =
      itemStockFilter === 'ALL' ||
      (itemStockFilter === 'LOW' && item.current_stock <= item.reorder_level) ||
      (itemStockFilter === 'NORMAL' && item.current_stock > item.reorder_level);

    return matchesSearch && matchesCat && matchesStore && matchesStock;
  });

  // Filtered Assets
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      !assetSearch ||
      asset.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
      asset.asset_code.toLowerCase().includes(assetSearch.toLowerCase()) ||
      (asset.serial_number && asset.serial_number.toLowerCase().includes(assetSearch.toLowerCase())) ||
      (asset.location_description && asset.location_description.toLowerCase().includes(assetSearch.toLowerCase()));

    const matchesCat = !assetCategoryFilter || asset.category_id === assetCategoryFilter;
    const matchesStatus = !assetStatusFilter || asset.status === assetStatusFilter;

    return matchesSearch && matchesCat && matchesStatus;
  });

  // Filtered Transactions
  const filteredTransactions = transactions.filter((trx) => {
    return !movementTypeFilter || trx.transaction_type === movementTypeFilter;
  });

  const schoolDisplayName =
    selectedSchoolId === 'sch_gisk' ? 'Gurukul International School' : 'Vidyavahini Public School';

  return (
    <div className="space-y-6">
      {/* Top Header & Context Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Inventory, Fixed Assets & Procurement
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 tracking-wide uppercase">
                  Phase 13
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-depot stock ledger, capital asset registers, custody track, and institutional vendor procurement
              </p>
            </div>
          </div>
        </div>

        {/* School Selector & Action Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <Building2 className="w-4 h-4 text-slate-500" />
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent border-none focus:outline-hidden cursor-pointer"
            >
              <option value="sch_vvps">Vidyavahini Public School (Main Campus)</option>
              <option value="sch_gisk">Gurukul International School</option>
            </select>
          </div>

          <button
            onClick={() => loadInventoryData()}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-3 pt-2 rounded-t-xl overflow-x-auto shadow-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all shrink-0 ${
            activeTab === 'overview'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          Dashboard & KPIs
        </button>

        <button
          onClick={() => setActiveTab('items')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all shrink-0 ${
            activeTab === 'items'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Package className="w-4 h-4" />
          Stock Catalog ({items.length})
        </button>

        <button
          onClick={() => setActiveTab('assets')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all shrink-0 ${
            activeTab === 'assets'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Cpu className="w-4 h-4" />
          Capital Assets ({assets.length})
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all shrink-0 ${
            activeTab === 'movements'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          Stock Movements Ledger
        </button>

        <button
          onClick={() => setActiveTab('procurement')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all shrink-0 ${
            activeTab === 'procurement'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Procurement & Indents ({purchaseRequests.length} PRs / {purchaseOrders.length} POs)
        </button>

        <button
          onClick={() => setActiveTab('stores')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all shrink-0 ${
            activeTab === 'stores'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Warehouse className="w-4 h-4" />
          Warehouses & Depots ({stores.length})
        </button>

        <button
          onClick={() => setActiveTab('vendors')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all shrink-0 ${
            activeTab === 'vendors'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Vendor Directory ({vendors.length})
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all shrink-0 ${
            activeTab === 'alerts'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Bell className="w-4 h-4" />
          Alerts & Reminders
          {notifications.filter(n => !n.is_read).length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white leading-none">
              {notifications.filter(n => !n.is_read).length}
            </span>
          )}
        </button>
      </div>

      {/* ============================================================ */}
      {/* 1. OVERVIEW & KPI DASHBOARD TAB */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Total Catalog Items
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-bold text-slate-900">
                    {dashboardData?.items.total_items || items.length}
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    ({dashboardData?.items.total_stock_quantity || 0} units in stock)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Across all school depots</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Inventory Valuation
                </p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                  ₹{Number(dashboardData?.items.total_inventory_valuation || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">Consumables & lab supplies</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Capital Fixed Assets
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-bold text-slate-900">
                    {dashboardData?.assets.total_assets || assets.length}
                  </h3>
                  <span className="text-xs text-indigo-600 font-semibold">
                    (₹{Number(dashboardData?.assets.total_asset_valuation || 0).toLocaleString('en-IN')})
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {dashboardData?.assets.active_in_use || 0} deployed in classrooms & labs
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Cpu className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Low Stock & Reorders
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className={`text-2xl font-bold ${
                    (dashboardData?.items.low_stock_items || 0) > 0 ? 'text-amber-600' : 'text-slate-900'
                  }`}>
                    {dashboardData?.items.low_stock_items || 0}
                  </h3>
                  <span className="text-xs text-slate-500">
                    ({dashboardData?.procurement.pending_requests || 0} pending PRs)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Requires procurement action</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                (dashboardData?.items.low_stock_items || 0) > 0
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 rounded-xl text-white flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/10 text-emerald-400">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">Store Management Operations</h4>
                <p className="text-xs text-slate-300">
                  Record material receipt, issue goods to departments, register capital equipment, or submit indents
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setSelectedMovementItem(null);
                  setShowRecordMovement(true);
                }}
                className="px-3.5 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Record Stock Issue / Receipt
              </button>
              <button
                onClick={() => setShowStockTransfer(true)}
                className="px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Transfer Stock
              </button>
              <button
                onClick={() => setShowStockCount(true)}
                className="px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                Stock Audit
              </button>
              <button
                onClick={() => setShowAddItem(true)}
                className="px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Catalog Item
              </button>
              <button
                onClick={() => setShowAddAsset(true)}
                className="px-3.5 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Cpu className="w-3.5 h-3.5" />
                Register Asset
              </button>
              <button
                onClick={() => setShowPurchaseRequest(true)}
                className="px-3.5 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center gap-1.5"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Raise Indent
              </button>
            </div>
          </div>

          {/* Low Stock Warning Banner if any */}
          {dashboardData?.lowStockList && dashboardData.lowStockList.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Urgent Low Stock Warnings ({dashboardData.lowStockList.length})
                </div>
                <button
                  onClick={() => {
                    setItemStockFilter('LOW');
                    setActiveTab('items');
                  }}
                  className="text-xs font-semibold text-amber-800 hover:underline flex items-center gap-1"
                >
                  View in Catalog <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {dashboardData.lowStockList.map((ls) => (
                  <div key={ls.id} className="bg-white p-3 rounded-lg border border-amber-200 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-600 font-semibold">{ls.sku}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                        Stock: {ls.current_stock} / Reorder: {ls.reorder_level}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 mt-1 truncate">{ls.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Depot: {ls.store_name || 'Central Store'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Two-Column Grid: Category Valuation Breakdown + Recent Stock Movements */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Category Breakdown */}
            <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Category Valuation & Stock Distribution
              </h3>

              <div className="space-y-3">
                {dashboardData?.categoryBreakdown && dashboardData.categoryBreakdown.length > 0 ? (
                  dashboardData.categoryBreakdown.map((cat) => (
                    <div key={cat.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{cat.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded-sm">
                            {cat.code}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 mt-0.5 block">
                          {cat.item_count} items ({cat.total_stock} total units)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-700">
                          ₹{Number(cat.total_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">No category data recorded yet.</p>
                )}
              </div>
            </div>

            {/* Recent Stock Movements */}
            <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                  Recent Material Movements & Issues
                </h3>
                <button
                  onClick={() => setActiveTab('movements')}
                  className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  Full Stock Ledger <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                      <th className="pb-2">Date / Type</th>
                      <th className="pb-2">Material / Item</th>
                      <th className="pb-2">Depot</th>
                      <th className="pb-2 text-right">Qty</th>
                      <th className="pb-2">Issued To</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {transactions.slice(0, 6).map((trx) => (
                      <tr key={trx.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            trx.transaction_type === 'STOCK_IN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : trx.transaction_type === 'STOCK_OUT'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {trx.transaction_type === 'STOCK_IN' && <ArrowDownRight className="w-3 h-3" />}
                            {trx.transaction_type === 'STOCK_OUT' && <ArrowUpRight className="w-3 h-3" />}
                            {trx.transaction_type}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <div className="font-semibold text-slate-800 truncate max-w-[180px]">
                            {trx.item_name}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {trx.item_sku}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-600">
                          {trx.store_name}
                        </td>
                        <td className="py-2.5 text-right font-bold text-slate-900">
                          {trx.transaction_type === 'STOCK_OUT' ? `-${trx.quantity}` : `+${trx.quantity}`}
                        </td>
                        <td className="py-2.5 text-slate-600 truncate max-w-[120px]">
                          {trx.recipient_name || trx.department_name || 'Stock Refill'}
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          No transactions recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. INVENTORY ITEMS & STOCK CATALOG TAB */}
      {/* ============================================================ */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search catalog by SKU, name, barcode, brand..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={itemCategoryFilter}
                onChange={(e) => setItemCategoryFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={itemStoreFilter}
                onChange={(e) => setItemStoreFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="">All Depots / Stores</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                value={itemStockFilter}
                onChange={(e) => setItemStockFilter(e.target.value as any)}
                className="text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
              >
                <option value="ALL">All Stock Levels</option>
                <option value="LOW">Low Stock / Reorder Needed</option>
                <option value="NORMAL">Normal In-Stock</option>
              </select>

              <button
                onClick={() => handleExportCSV('items')}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                title="Export Catalog to CSV"
              >
                <FileDown className="w-3.5 h-3.5" />
                Export CSV
              </button>

              <button
                onClick={() => setShowAddItem(true)}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>
          </div>

          {/* Catalog Data Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Item & Specification</th>
                    <th className="py-3 px-4">SKU / Barcode</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Default Depot</th>
                    <th className="py-3 px-4 text-center">Current Stock</th>
                    <th className="py-3 px-4 text-center">Reorder Threshold</th>
                    <th className="py-3 px-4 text-right">Unit Price (₹)</th>
                    <th className="py-3 px-4 text-right">Valuation (₹)</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredItems.map((item) => {
                    const isLowStock = item.current_stock <= item.reorder_level;
                    const isOutOfStock = item.current_stock === 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            {item.brand && <span>Brand: {item.brand}</span>}
                            {item.model && <span>• Model: {item.model}</span>}
                            <span>• Unit: {item.unit}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono">
                          <span className="font-semibold text-slate-800">{item.sku}</span>
                          {item.barcode && (
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              {item.barcode}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded-sm text-[11px] font-medium">
                            {item.category_name}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-600">
                          {item.store_name || 'Central Warehouse'}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-full text-xs ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-800'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {item.current_stock} {item.unit}
                            {isLowStock && <AlertTriangle className="w-3 h-3" />}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center font-medium text-slate-600">
                          {item.reorder_level} {item.unit}
                        </td>

                        <td className="py-3 px-4 text-right font-medium text-slate-700">
                          ₹{Number(item.unit_price).toFixed(2)}
                        </td>

                        <td className="py-3 px-4 text-right font-bold text-emerald-700">
                          ₹{(item.current_stock * Number(item.unit_price)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedMovementItem(item);
                                setShowRecordMovement(true);
                              }}
                              className="px-2 py-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1"
                              title="Record Issue / In"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Issue
                            </button>
                            <button
                              onClick={() => {
                                setBarcodeTarget({
                                  type: 'item',
                                  code: item.sku,
                                  name: item.name,
                                  category: item.category_name,
                                  barcode: item.barcode,
                                  location: item.store_name
                                });
                                setShowBarcodeModal(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                              title="Print Barcode Tag"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No inventory catalog items match your search and filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. CAPITAL FIXED ASSETS REGISTER TAB */}
      {/* ============================================================ */}
      {activeTab === 'assets' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search assets by tag, name, serial #, room..."
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={assetCategoryFilter}
                onChange={(e) => setAssetCategoryFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={assetStatusFilter}
                onChange={(e) => setAssetStatusFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="">All Statuses</option>
                <option value="IN_USE">In Use / Deployed</option>
                <option value="AVAILABLE">Available in Store</option>
                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                <option value="DAMAGED">Damaged / Defective</option>
                <option value="DISPOSED">Disposed / Retired</option>
              </select>

              <button
                onClick={() => handleExportCSV('assets')}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                title="Export Asset Register to CSV"
              >
                <FileDown className="w-3.5 h-3.5" />
                Export CSV
              </button>

              <button
                onClick={() => setShowAddAsset(true)}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Register Asset
              </button>
            </div>
          </div>

          {/* Assets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssets.map((asset) => {
              const isWarrantyActive =
                asset.warranty_end_date && new Date(asset.warranty_end_date) >= new Date();

              return (
                <div
                  key={asset.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 hover:border-indigo-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Tag + Status */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {asset.asset_code}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        asset.status === 'IN_USE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : asset.status === 'UNDER_MAINTENANCE'
                          ? 'bg-amber-100 text-amber-800'
                          : asset.status === 'DAMAGED'
                          ? 'bg-rose-100 text-rose-800'
                          : asset.status === 'DISPOSED'
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {asset.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 leading-tight">
                      {asset.name}
                    </h4>

                    {asset.serial_number && (
                      <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                        SN: {asset.serial_number}
                      </span>
                    )}

                    {/* Room & Custodian */}
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          <strong>Location:</strong> {asset.location_description || 'Unassigned room'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          <strong>Custodian:</strong> {asset.assigned_employee_name || 'Department Pool'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          <strong>Department:</strong> {asset.department_name || 'General Administration'}
                        </span>
                      </div>
                    </div>

                    {/* Financials & Warranty */}
                    <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">Cost</span>
                        <span className="font-bold text-slate-800">
                          ₹{Number(asset.purchase_cost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">Warranty</span>
                        <span className={`text-[11px] font-semibold ${isWarrantyActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {isWarrantyActive ? `Active till ${asset.warranty_end_date}` : (asset.warranty_end_date ? 'Expired' : 'None')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                    <button
                      onClick={() => {
                        setBarcodeTarget({
                          type: 'asset',
                          code: asset.asset_code,
                          name: asset.name,
                          category: asset.category_name,
                          barcode: asset.barcode,
                          location: asset.location_description
                        });
                        setShowBarcodeModal(true);
                      }}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                      title="Print Tag"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedAssetForAction({ asset, mode: 'maintenance' })}
                        className="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                      >
                        Service
                      </button>

                      <button
                        onClick={() => setSelectedAssetForAction({ asset, mode: 'transfer' })}
                        className="px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
                      >
                        Transfer
                      </button>

                      {asset.status === 'IN_USE' ? (
                        <button
                          onClick={() => setSelectedAssetForAction({ asset, mode: 'return' })}
                          className="px-2 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors"
                        >
                          Return
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedAssetForAction({ asset, mode: 'assign' })}
                          className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                        >
                          Assign
                        </button>
                      )}

                      {asset.status !== 'DISPOSED' && (
                        <button
                          onClick={() => setSelectedAssetForAction({ asset, mode: 'dispose' })}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                          title="Dispose Asset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredAssets.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                No fixed assets match the current search filters.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. STOCK MOVEMENTS LEDGER TAB */}
      {/* ============================================================ */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700 uppercase">Filter Movement:</span>
              <select
                value={movementTypeFilter}
                onChange={(e) => setMovementTypeFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="">All Movement Types</option>
                <option value="STOCK_IN">Stock In / Direct Purchase</option>
                <option value="STOCK_OUT">Stock Out / Department Issue</option>
                <option value="TRANSFER">Inter-Store Transfer</option>
                <option value="ADJUSTMENT">Stock Audit Adjustment</option>
                <option value="RETURN">Return to Warehouse</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowStockTransfer(true)}
                className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Transfer Between Depots
              </button>

              <button
                onClick={() => {
                  setSelectedMovementItem(null);
                  setShowRecordMovement(true);
                }}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Record Movement
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Nature</th>
                    <th className="py-3 px-4">Item & SKU</th>
                    <th className="py-3 px-4">Depot</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    <th className="py-3 px-4 text-right">Balance After</th>
                    <th className="py-3 px-4">Department / Recipient</th>
                    <th className="py-3 px-4">Reference Voucher</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredTransactions.map((trx) => (
                    <tr key={trx.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {trx.created_at ? new Date(trx.created_at).toLocaleDateString() : 'Today'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          trx.transaction_type === 'STOCK_IN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : trx.transaction_type === 'STOCK_OUT'
                            ? 'bg-rose-100 text-rose-800'
                            : trx.transaction_type === 'TRANSFER'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {trx.transaction_type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">{trx.item_name}</span>
                        <span className="block font-mono text-[10px] text-slate-400">{trx.item_sku}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {trx.store_name}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {trx.transaction_type === 'STOCK_OUT' ? `-${trx.quantity}` : `+${trx.quantity}`}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                        {trx.balance_after}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {trx.recipient_name || trx.department_name || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {trx.reference_id || 'DIRECT'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate">
                        {trx.remarks || '—'}
                      </td>
                    </tr>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No transactions found for the selected filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. PROCUREMENT, PURCHASE ORDERS & GRN TAB */}
      {/* ============================================================ */}
      {activeTab === 'procurement' && (
        <div className="space-y-4">
          {/* Sub Tab Switcher */}
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setProcurementSubTab('requests')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  procurementSubTab === 'requests'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                1. Purchase Requisitions ({purchaseRequests.length})
              </button>
              <button
                onClick={() => setProcurementSubTab('orders')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  procurementSubTab === 'orders'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                2. Purchase Orders ({purchaseOrders.length})
              </button>
              <button
                onClick={() => setProcurementSubTab('receipts')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  procurementSubTab === 'receipts'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                3. Goods Receipts / GRN ({goodsReceipts.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              {procurementSubTab === 'requests' && (
                <button
                  onClick={() => setShowPurchaseRequest(true)}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Indent Requisition
                </button>
              )}
              {procurementSubTab === 'orders' && (
                <button
                  onClick={() => {
                    setSelectedRequestForPO(null);
                    setShowCreatePO(true);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Generate Purchase Order
                </button>
              )}
              {procurementSubTab === 'receipts' && (
                <button
                  onClick={() => {
                    setSelectedPOForGRN(null);
                    setShowGoodsReceipt(true);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Record Goods Receipt (GRN)
                </button>
              )}
            </div>
          </div>

          {/* Subtab 1: Purchase Requests */}
          {procurementSubTab === 'requests' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="py-3 px-4">Request #</th>
                      <th className="py-3 px-4">Title & Details</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4 text-right">Est. Budget (₹)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Action / Workflow</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {purchaseRequests.map((pr) => (
                      <tr key={pr.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                          {pr.request_number}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {pr.request_date}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{pr.title}</div>
                          <p className="text-[11px] text-slate-500 truncate max-w-sm">{pr.reason || 'No description'}</p>
                        </td>

                        <td className="py-3 px-4 text-slate-700">
                          {pr.department_name || 'School Wing'}
                        </td>

                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            pr.priority === 'URGENT' || pr.priority === 'HIGH'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {pr.priority}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          ₹{Number(pr.estimated_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            pr.status === 'APPROVED' || pr.status === 'CONVERTED_TO_PO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : pr.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {pr.status.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          {pr.status === 'PENDING' ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleReviewPR(pr.id, 'APPROVED')}
                                className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReviewPR(pr.id, 'REJECTED')}
                                className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          ) : pr.status === 'APPROVED' ? (
                            <button
                              onClick={() => {
                                setSelectedRequestForPO(pr);
                                setShowCreatePO(true);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
                            >
                              Generate PO
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {purchaseRequests.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          No purchase requisitions raised yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab 2: Purchase Orders */}
          {procurementSubTab === 'orders' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="py-3 px-4">PO Number</th>
                      <th className="py-3 px-4">Vendor</th>
                      <th className="py-3 px-4">Order Date</th>
                      <th className="py-3 px-4">Expected Delivery</th>
                      <th className="py-3 px-4 text-right">Order Amount (₹)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Receipt Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {purchaseOrders.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {po.po_number}
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-semibold">
                          {po.vendor_name || 'Vendor'}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {po.order_date}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {po.expected_delivery_date || 'Standard'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          ₹{Number(po.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            po.status === 'FULLY_RECEIVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : po.status === 'APPROVED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {po.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {po.status !== 'FULLY_RECEIVED' ? (
                            <button
                              onClick={() => {
                                setSelectedPOForGRN(po);
                                setShowGoodsReceipt(true);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                            >
                              Receive GRN
                            </button>
                          ) : (
                            <span className="text-emerald-600 text-xs font-semibold flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Received
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {purchaseOrders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          No purchase orders generated yet. Click &quot;Generate Purchase Order&quot; above to create one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab 3: Goods Receipts Notes */}
          {procurementSubTab === 'receipts' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="py-3 px-4">GRN #</th>
                      <th className="py-3 px-4">PO Reference</th>
                      <th className="py-3 px-4">Vendor</th>
                      <th className="py-3 px-4">Receiving Depot</th>
                      <th className="py-3 px-4">Receipt Date</th>
                      <th className="py-3 px-4">Invoice / Challan #</th>
                      <th className="py-3 px-4 text-right">Accepted Value (₹)</th>
                      <th className="py-3 px-4 text-center">Accounts Expense</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {goodsReceipts.map((grn) => (
                      <tr key={grn.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {grn.receipt_number}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          {grn.po_number || 'Direct PO'}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {grn.vendor_name || 'Vendor'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {grn.store_name || 'Central Store'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                          {grn.receipt_date}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          {grn.invoice_number || grn.challan_number || '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700">
                          ₹{Number(grn.total_accepted_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Synced to Ledger
                          </span>
                        </td>
                      </tr>
                    ))}

                    {goodsReceipts.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          No Goods Receipts (GRN) recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. WAREHOUSES & STORAGE LOCATIONS TAB */}
      {/* ============================================================ */}
      {activeTab === 'stores' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Campus Storage Depots & Rooms</h3>
              <p className="text-xs text-slate-500">
                Institutional distribution hubs and secured stockrooms
              </p>
            </div>

            <button
              onClick={() => setShowAddStore(true)}
              className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Add Storage Location
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((store) => (
              <div
                key={store.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 hover:border-indigo-300 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {store.code}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {store.status}
                  </span>
                </div>

                <h4 className="font-bold text-base text-slate-900">{store.name}</h4>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <p>
                    <strong>Building:</strong> {store.building || 'Campus Central Block'}
                  </p>
                  <p>
                    <strong>Floor & Room:</strong> {store.floor || 'Ground Floor'} {store.room_number ? `(${store.room_number})` : ''}
                  </p>
                  {store.incharge_name && (
                    <p>
                      <strong>Store Supervisor:</strong> {store.incharge_name}
                    </p>
                  )}
                  {store.notes && (
                    <p className="text-slate-400 italic pt-1 border-t border-slate-100 mt-2 text-[11px]">
                      {store.notes}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Stored Materials:</span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {store.items_count || 0} Catalog SKUs
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. VENDOR DIRECTORY TAB */}
      {/* ============================================================ */}
      {activeTab === 'vendors' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Approved Institutional Vendors & Suppliers</h3>
              <p className="text-xs text-slate-500">
                Registered suppliers for classroom goods, lab consumables, IT hardware and sports equipment
              </p>
            </div>

            <button
              onClick={() => setShowAddVendor(true)}
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Register Vendor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((vendor) => (
              <div
                key={vendor.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 hover:border-emerald-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                      {vendor.category}
                    </span>
                    <span className="text-xs font-bold text-amber-600">
                      ★ {Number(vendor.rating).toFixed(1)}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 mt-1">{vendor.name}</h4>
                  {vendor.contact_person && (
                    <p className="text-xs text-slate-500 mt-0.5">Contact: {vendor.contact_person}</p>
                  )}

                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1 text-slate-600">
                    <p><strong>Phone:</strong> {vendor.phone}</p>
                    {vendor.email && <p><strong>Email:</strong> {vendor.email}</p>}
                    {vendor.gstin && <p className="font-mono text-[11px]"><strong>GSTIN:</strong> {vendor.gstin}</p>}
                    {vendor.city && <p><strong>Location:</strong> {vendor.city}, {vendor.state}</p>}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Status</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {vendor.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 8. ALERTS & NOTIFICATIONS TAB */}
      {/* ============================================================ */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Inventory & Procurement Alerts</h3>
                <p className="text-xs text-slate-500">
                  Real-time monitoring for low stock thresholds, out-of-stock items, purchase requisitions, and warranty expirations
                </p>
              </div>
            </div>
            {notifications.some(n => !n.is_read) && (
              <button
                onClick={async () => {
                  try {
                    await api.inventory.markAllNotificationsRead(selectedSchoolId);
                    addToast('All alerts marked as read', 'success');
                    loadInventoryData();
                  } catch (e: any) {
                    addToast(e.message || 'Failed to mark alerts as read', 'error');
                  }
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Mark All as Read
              </button>
            )}
          </div>

          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">All Systems Operational</h4>
                <p className="text-xs text-slate-500 mt-1">No pending inventory, warranty, or procurement alerts.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                    !notif.is_read
                      ? 'bg-rose-50/30 border-rose-200 shadow-xs'
                      : 'bg-white border-slate-200 opacity-80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      notif.priority === 'URGENT'
                        ? 'bg-rose-100 text-rose-700'
                        : notif.priority === 'HIGH'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {notif.event_type.includes('STOCK') ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : notif.event_type.includes('WARRANTY') ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : (
                        <ShoppingBag className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">{notif.title}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          notif.priority === 'URGENT'
                            ? 'bg-rose-100 text-rose-800'
                            : notif.priority === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {notif.priority}
                        </span>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
                      <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(notif.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!notif.is_read && (
                      <button
                        onClick={async () => {
                          try {
                            await api.inventory.markNotificationRead(notif.id);
                            loadInventoryData();
                          } catch (e: any) {
                            addToast('Failed to update alert', 'error');
                          }
                        }}
                        className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        Dismiss
                      </button>
                    )}
                    {notif.event_type.includes('STOCK') && (
                      <button
                        onClick={() => {
                          setShowPurchaseRequest(true);
                        }}
                        className="px-3 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                      >
                        Create Requisition
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL DIALOGS */}
      {/* ============================================================ */}
      {showAddItem && (
        <AddItemModal
          schoolId={selectedSchoolId}
          categories={categories}
          stores={stores}
          onClose={() => setShowAddItem(false)}
          onSuccess={() => loadInventoryData()}
        />
      )}

      {showRecordMovement && (
        <RecordMovementModal
          schoolId={selectedSchoolId}
          items={items}
          stores={stores}
          preselectedItem={selectedMovementItem}
          onClose={() => {
            setShowRecordMovement(false);
            setSelectedMovementItem(null);
          }}
          onSuccess={() => loadInventoryData()}
        />
      )}

      {showStockTransfer && (
        <StockTransferModal
          schoolId={selectedSchoolId}
          items={items}
          stores={stores}
          onClose={() => setShowStockTransfer(false)}
          onSuccess={() => loadInventoryData()}
        />
      )}

      {showStockCount && (
        <StockCountModal
          schoolId={selectedSchoolId}
          items={items}
          stores={stores}
          onClose={() => setShowStockCount(false)}
          onSuccess={() => loadInventoryData()}
        />
      )}

      {showAddAsset && (
        <AddAssetModal
          schoolId={selectedSchoolId}
          categories={categories}
          stores={stores}
          vendors={vendors}
          employees={employees}
          departments={departments}
          onClose={() => setShowAddAsset(false)}
          onSuccess={() => loadInventoryData()}
        />
      )}

      {selectedAssetForAction && (
        <AssetActionModal
          schoolId={selectedSchoolId}
          asset={selectedAssetForAction.asset}
          stores={stores}
          employees={employees}
          departments={departments}
          mode={selectedAssetForAction.mode}
          onClose={() => setSelectedAssetForAction(null)}
          onSuccess={() => loadInventoryData()}
        />
      )}

      {showPurchaseRequest && (
        <PurchaseRequestModal
          schoolId={selectedSchoolId}
          items={items}
          departments={departments}
          onClose={() => setShowPurchaseRequest(false)}
          onSuccess={() => loadInventoryData()}
        />
      )}

      {showCreatePO && (
        <CreatePOModal
          schoolId={selectedSchoolId}
          vendors={vendors}
          approvedRequests={purchaseRequests.filter((pr) => pr.status === 'APPROVED')}
          items={items}
          preselectedRequest={selectedRequestForPO}
          onClose={() => {
            setShowCreatePO(false);
            setSelectedRequestForPO(null);
          }}
          onSuccess={() => loadInventoryData()}
        />
      )}

      {showGoodsReceipt && (
        <GoodsReceiptModal
          schoolId={selectedSchoolId}
          orders={purchaseOrders}
          stores={stores}
          items={items}
          preselectedOrder={selectedPOForGRN}
          onClose={() => {
            setShowGoodsReceipt(false);
            setSelectedPOForGRN(null);
          }}
          onSuccess={() => loadInventoryData()}
        />
      )}

      {showAddVendor && (
        <AddVendorModal
          schoolId={selectedSchoolId}
          onClose={() => setShowAddVendor(false)}
          onSuccess={() => loadInventoryData()}
        />
      )}

      {showAddStore && (
        <AddStoreModal
          schoolId={selectedSchoolId}
          employees={employees}
          onClose={() => setShowAddStore(false)}
          onSuccess={() => loadInventoryData()}
        />
      )}

      {showBarcodeModal && barcodeTarget && (
        <BarcodePrintModal
          itemOrAsset={barcodeTarget}
          schoolName={schoolDisplayName}
          onClose={() => {
            setShowBarcodeModal(false);
            setBarcodeTarget(null);
          }}
        />
      )}
    </div>
  );
};
