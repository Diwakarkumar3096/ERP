import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { InventoryItem, InventoryStore } from '../../types/inventory.js';
import { X, ClipboardCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface StockCountModalProps {
  schoolId: string;
  items: InventoryItem[];
  stores: InventoryStore[];
  onClose: () => void;
  onSuccess: () => void;
}

export const StockCountModal: React.FC<StockCountModalProps> = ({
  schoolId,
  items,
  stores,
  onClose,
  onSuccess
}) => {
  const { addToast } = useToast();
  const [storeId, setStoreId] = useState(stores[0]?.id || '');
  const [countTitle, setCountTitle] = useState(`Physical Stock Audit - ${new Date().toLocaleDateString('en-GB')}`);
  const [countDate, setCountDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Filter items belonging to this store or general items
  const relevantItems = items.filter(
    (i) => !i.default_store_id || i.default_store_id === storeId
  );

  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const it of items) {
      initial[it.id] = it.current_stock;
    }
    return initial;
  });

  const handlePhysicalChange = (itemId: string, val: number) => {
    setPhysicalCounts((prev) => ({
      ...prev,
      [itemId]: Math.max(0, val)
    }));
  };

  const auditItemsPayload = relevantItems.map((it) => {
    const sysQty = it.current_stock;
    const phyQty = physicalCounts[it.id] !== undefined ? physicalCounts[it.id] : sysQty;
    const variance = phyQty - sysQty;
    return {
      itemId: it.id,
      itemName: it.name,
      systemQuantity: sysQty,
      physicalQuantity: phyQty,
      variance,
      unitPrice: Number(it.unit_price) || 0
    };
  });

  const totalVarianceCount = auditItemsPayload.reduce((acc, row) => acc + Math.abs(row.variance), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) {
      addToast('Please select a storage depot for verification', 'error');
      return;
    }
    if (!countTitle.trim()) {
      addToast('Audit session title is required', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.inventory.createCount({
        schoolId,
        storeId,
        countTitle: countTitle.trim(),
        countDate,
        notes: notes.trim() || undefined,
        items: auditItemsPayload
      });

      addToast('Physical stock verification completed and variances adjusted in ledger', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Verification failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden my-8 border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-base">Physical Stock Verification & Audit</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Warehouse / Storage Depot *
              </label>
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
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
                Audit Session Title *
              </label>
              <input
                type="text"
                value={countTitle}
                onChange={(e) => setCountTitle(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Audit Date *
              </label>
              <input
                type="date"
                value={countDate}
                onChange={(e) => setCountDate(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Audit Notes & Verification Board Remarks
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. End of term physical stock verification conducted by Store Incharge & Accounts Auditor"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Verification Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 uppercase">
                Stock Verification Sheet ({relevantItems.length} Items)
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                totalVarianceCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {totalVarianceCount > 0 ? `${totalVarianceCount} Total Variance Units` : 'Balanced (Zero Variance)'}
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 text-[11px] font-semibold text-slate-500 uppercase sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Item / SKU</th>
                    <th className="py-2.5 px-3 text-center">System Ledger Qty</th>
                    <th className="py-2.5 px-3 text-center">Physical Verified Qty</th>
                    <th className="py-2.5 px-3 text-center">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {relevantItems.map((it) => {
                    const sys = it.current_stock;
                    const phy = physicalCounts[it.id] !== undefined ? physicalCounts[it.id] : sys;
                    const diff = phy - sys;

                    return (
                      <tr key={it.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3">
                          <span className="font-semibold text-slate-800">{it.name}</span>
                          <span className="block font-mono text-[10px] text-slate-400">
                            {it.sku} ({it.unit})
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-700">
                          {sys}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={phy}
                            onChange={(e) => handlePhysicalChange(it.id, parseInt(e.target.value) || 0)}
                            className="w-20 text-center font-bold text-slate-900 border border-slate-300 rounded-md p-1 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          />
                        </td>
                        <td className="py-2 px-3 text-center font-bold">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                            diff === 0
                              ? 'text-slate-500'
                              : diff > 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {loading ? 'Committing...' : 'Commit Audit & Reconcile Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
