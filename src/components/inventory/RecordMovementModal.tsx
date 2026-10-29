import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { InventoryItem, InventoryStore } from '../../types/inventory.js';
import { X, ArrowDownRight, ArrowUpRight, RefreshCw, AlertTriangle, Building } from 'lucide-react';

interface RecordMovementModalProps {
  schoolId: string;
  items: InventoryItem[];
  stores: InventoryStore[];
  preselectedItem?: InventoryItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const RecordMovementModal: React.FC<RecordMovementModalProps> = ({
  schoolId,
  items,
  stores,
  preselectedItem,
  onClose,
  onSuccess
}) => {
  const { addToast } = useToast();
  const [itemId, setItemId] = useState(preselectedItem?.id || items[0]?.id || '');
  const [storeId, setStoreId] = useState(preselectedItem?.default_store_id || stores[0]?.id || '');
  const [transactionType, setTransactionType] = useState<'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGE'>('STOCK_OUT');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number | string>(preselectedItem ? preselectedItem.unit_price : 0);
  const [referenceType, setReferenceType] = useState('DEPARTMENT_ISSUE');
  const [referenceId, setReferenceId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  const currentSelectedItem = items.find((i) => i.id === itemId);

  const handleItemChange = (selectedId: string) => {
    setItemId(selectedId);
    const it = items.find((i) => i.id === selectedId);
    if (it) {
      if (it.default_store_id) setStoreId(it.default_store_id);
      setUnitPrice(it.unit_price);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId) {
      addToast('Please select an item', 'error');
      return;
    }
    if (!storeId) {
      addToast('Please select a storage location', 'error');
      return;
    }
    if (!quantity || quantity <= 0) {
      addToast('Quantity must be greater than zero', 'error');
      return;
    }

    // Check balance for STOCK_OUT
    if ((transactionType === 'STOCK_OUT' || transactionType === 'DAMAGE') && currentSelectedItem) {
      if (quantity > currentSelectedItem.current_stock) {
        addToast(`Insufficient stock! Current available: ${currentSelectedItem.current_stock} ${currentSelectedItem.unit}`, 'error');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await api.inventory.createTransaction({
        schoolId,
        itemId,
        storeId,
        transactionType,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice) || 0,
        referenceType,
        referenceId: referenceId.trim() || undefined,
        recipientName: recipientName.trim() || undefined,
        remarks: remarks.trim() || undefined
      });

      addToast(res.message || 'Stock transaction recorded', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Failed to record stock movement', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden my-8 border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-amber-400" />
            <h2 className="font-semibold text-base">Record Stock Movement / Issue</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Movement Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
              Transaction Nature *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTransactionType('STOCK_OUT');
                  setReferenceType('DEPARTMENT_ISSUE');
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  transactionType === 'STOCK_OUT'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                Issue (Out)
              </button>

              <button
                type="button"
                onClick={() => {
                  setTransactionType('STOCK_IN');
                  setReferenceType('PURCHASE_RECEIPT');
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  transactionType === 'STOCK_IN'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                Receipt (In)
              </button>

              <button
                type="button"
                onClick={() => {
                  setTransactionType('ADJUSTMENT');
                  setReferenceType('STOCK_AUDIT');
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  transactionType === 'ADJUSTMENT'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <RefreshCw className="w-4 h-4 text-blue-600" />
                Adjust / Audit
              </button>
            </div>
          </div>

          {/* Item Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Select Inventory Item *
            </label>
            <select
              value={itemId}
              onChange={(e) => handleItemChange(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              required
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} (SKU: {i.sku}) — Available: {i.current_stock} {i.unit}
                </option>
              ))}
            </select>
            {currentSelectedItem && (
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2 rounded-md border border-slate-100">
                <span>Unit: <strong>{currentSelectedItem.unit}</strong></span>
                <span>Current Ledger Stock: <strong>{currentSelectedItem.current_stock}</strong></span>
                <span>Reorder Point: <strong>{currentSelectedItem.reorder_level}</strong></span>
              </div>
            )}
          </div>

          {/* Store Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Depot / Warehouse Location *
            </label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              required
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) - {s.building} {s.room_number ? `(${s.room_number})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity & Unit Price */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Quantity {transactionType === 'STOCK_OUT' ? 'to Issue' : 'to Add'} *
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full text-sm font-bold border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Unit Valuation (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Recipient / Reference Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Recipient Faculty / Department
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. Physics Department / Dr. Mishra"
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Voucher / Requisition Slip #
              </label>
              <input
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="e.g. REQ-2026-441"
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Purpose & Remarks
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Issued for upcoming annual term exams answer sheets"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {loading ? 'Posting...' : 'Commit Movement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
