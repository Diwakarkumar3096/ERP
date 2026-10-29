import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { InventoryItem, InventoryStore } from '../../types/inventory.js';
import { X, ArrowRightLeft, Warehouse, Layers } from 'lucide-react';

interface StockTransferModalProps {
  schoolId: string;
  items: InventoryItem[];
  stores: InventoryStore[];
  onClose: () => void;
  onSuccess: () => void;
}

export const StockTransferModal: React.FC<StockTransferModalProps> = ({
  schoolId,
  items,
  stores,
  onClose,
  onSuccess
}) => {
  const { addToast } = useToast();
  const [fromStoreId, setFromStoreId] = useState(stores[0]?.id || '');
  const [toStoreId, setToStoreId] = useState(stores[1]?.id || stores[0]?.id || '');
  const [itemId, setItemId] = useState(items[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedItem = items.find((i) => i.id === itemId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromStoreId || !toStoreId) {
      addToast('Please select both source and destination storage depots', 'error');
      return;
    }
    if (fromStoreId === toStoreId) {
      addToast('Source and destination warehouse cannot be the same', 'error');
      return;
    }
    if (!selectedItem || quantity <= 0) {
      addToast('Quantity must be greater than zero', 'error');
      return;
    }
    if (quantity > selectedItem.current_stock) {
      addToast(`Requested quantity exceeds available stock (${selectedItem.current_stock} ${selectedItem.unit})`, 'error');
      return;
    }

    setLoading(true);
    try {
      await api.inventory.createTransfer({
        schoolId,
        fromStoreId,
        toStoreId,
        itemId,
        quantity: Number(quantity),
        reason: reason.trim() || undefined
      });

      addToast('Stock transfer dispatched and recorded in ledger', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Transfer failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden my-8 border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
            <h2 className="font-semibold text-base">Inter-Depot Stock Transfer</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Source Depot (From) *
              </label>
              <select
                value={fromStoreId}
                onChange={(e) => setFromStoreId(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                required
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Destination Depot (To) *
              </label>
              <select
                value={toStoreId}
                onChange={(e) => setToStoreId(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                required
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Material / Item to Transfer *
            </label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              required
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} (SKU: {i.sku}) — Available: {i.current_stock} {i.unit}
                </option>
              ))}
            </select>
            {selectedItem && (
              <span className="text-[11px] text-slate-500 mt-1 block">
                Current total stock: <strong>{selectedItem.current_stock} {selectedItem.unit}</strong>
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Transfer Quantity *
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full text-sm font-bold border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Dispatch Purpose / Justification
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Replenishment for Science Wing Practical exam batch"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
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
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {loading ? 'Transferring...' : 'Execute Stock Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
