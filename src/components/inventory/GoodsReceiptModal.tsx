import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { PurchaseOrder, InventoryStore, InventoryItem } from '../../types/inventory.js';
import { X, CheckSquare, Truck, DollarSign, AlertCircle } from 'lucide-react';

interface GoodsReceiptModalProps {
  schoolId: string;
  orders: PurchaseOrder[];
  stores: InventoryStore[];
  items: InventoryItem[];
  preselectedOrder?: PurchaseOrder | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const GoodsReceiptModal: React.FC<GoodsReceiptModalProps> = ({
  schoolId,
  orders,
  stores,
  items,
  preselectedOrder,
  onClose,
  onSuccess
}) => {
  const { addToast } = useToast();
  const [poId, setPoId] = useState(preselectedOrder?.id || orders[0]?.id || '');
  const [targetStoreId, setTargetStoreId] = useState(stores[0]?.id || '');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [challanNumber, setChallanNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedPO = orders.find((o) => o.id === poId);

  // Default receipt line based on the selected PO or general item
  const [receiptLines, setReceiptLines] = useState<Array<{
    itemId?: string;
    itemName: string;
    orderedQuantity: number;
    receivedQuantity: number;
    acceptedQuantity: number;
    rejectedQuantity: number;
    unitPrice: number;
    rejectionReason?: string;
  }>>([
    {
      itemName: selectedPO ? `Consignment under ${selectedPO.po_number}` : (items[0]?.name || 'Supplies Consignment'),
      itemId: items[0]?.id || undefined,
      orderedQuantity: 10,
      receivedQuantity: 10,
      acceptedQuantity: 10,
      rejectedQuantity: 0,
      unitPrice: 100
    }
  ]);

  const handleLineChange = (index: number, field: string, val: any) => {
    const updated = [...receiptLines];
    (updated[index] as any)[field] = val;

    if (field === 'receivedQuantity') {
      const rec = parseInt(val, 10) || 0;
      updated[index].acceptedQuantity = rec;
      updated[index].rejectedQuantity = 0;
    } else if (field === 'acceptedQuantity') {
      const acc = parseInt(val, 10) || 0;
      const rec = updated[index].receivedQuantity;
      updated[index].rejectedQuantity = Math.max(0, rec - acc);
    }

    setReceiptLines(updated);
  };

  const totalAcceptedValue = receiptLines.reduce(
    (acc, line) => acc + (line.acceptedQuantity * line.unitPrice || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poId) {
      addToast('Please select a valid Purchase Order', 'error');
      return;
    }
    if (!targetStoreId) {
      addToast('Please select receiving warehouse depot', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.inventory.createReceipt({
        schoolId,
        poId,
        targetStoreId,
        receiptDate,
        challanNumber: challanNumber.trim() || undefined,
        invoiceNumber: invoiceNumber.trim() || undefined,
        remarks: remarks.trim() || undefined,
        items: receiptLines
      });

      addToast('Goods Receipt (GRN) generated! Stock incremented and purchase expense posted to Accounts.', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Failed to record goods receipt', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden my-8 border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-base">Record Goods Receipt Note (GRN)</h2>
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
                Purchase Order Reference *
              </label>
              <select
                value={poId}
                onChange={(e) => setPoId(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                required
              >
                {orders.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.po_number} ({po.vendor_name || 'Vendor'}) — ₹{Number(po.total_amount).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Receiving Depot / Warehouse *
              </label>
              <select
                value={targetStoreId}
                onChange={(e) => setTargetStoreId(e.target.value)}
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
                Delivery Receipt Date *
              </label>
              <input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Transporter Challan / Waybill #
              </label>
              <input
                type="text"
                value={challanNumber}
                onChange={(e) => setChallanNumber(e.target.value)}
                placeholder="e.g. CHN-2026-904"
                className="w-full text-sm font-mono border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Vendor Commercial Invoice #
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-APX-8812"
                className="w-full text-sm font-mono border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-bold"
              />
            </div>
          </div>

          {/* Inspection and Receiving Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 uppercase">
                Inspection & Quality Verification
              </span>
              <span className="text-xs font-bold text-emerald-700">
                Accepted Value: ₹{totalAcceptedValue.toFixed(2)}
              </span>
            </div>

            <div className="p-3 space-y-3">
              {receiptLines.map((line, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <div className="md:col-span-5">
                      <label className="block text-[10px] text-slate-400 font-medium uppercase">Catalog Item Link</label>
                      <select
                        value={line.itemId || ''}
                        onChange={(e) => {
                          const it = items.find((i) => i.id === e.target.value);
                          const updated = [...receiptLines];
                          updated[idx].itemId = e.target.value;
                          if (it) {
                            updated[idx].itemName = it.name;
                            updated[idx].unitPrice = Number(it.unit_price) || 0;
                          }
                          setReceiptLines(updated);
                        }}
                        className="w-full text-xs border border-slate-300 rounded-md p-1.5"
                      >
                        <option value="">-- Manual Non-Catalog Item --</option>
                        {items.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({i.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] text-slate-400 font-medium uppercase text-center">Received</label>
                      <input
                        type="number"
                        min="1"
                        value={line.receivedQuantity}
                        onChange={(e) => handleLineChange(idx, 'receivedQuantity', e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-md p-1.5 text-center font-bold"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] text-emerald-600 font-semibold uppercase text-center">Accepted</label>
                      <input
                        type="number"
                        min="0"
                        max={line.receivedQuantity}
                        value={line.acceptedQuantity}
                        onChange={(e) => handleLineChange(idx, 'acceptedQuantity', e.target.value)}
                        className="w-full text-xs border border-emerald-300 bg-emerald-50 text-emerald-800 rounded-md p-1.5 text-center font-bold"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[10px] text-slate-400 font-medium uppercase text-right">Unit Rate (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(e) => handleLineChange(idx, 'unitPrice', e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-md p-1.5 text-right font-medium"
                      />
                    </div>
                  </div>

                  {line.rejectedQuantity > 0 && (
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-rose-700">
                        Rejected: {line.rejectedQuantity} units
                      </span>
                      <input
                        type="text"
                        placeholder="Rejection reason (damage, specification mismatch, etc.)"
                        value={line.rejectionReason || ''}
                        onChange={(e) => handleLineChange(idx, 'rejectionReason', e.target.value)}
                        className="flex-1 text-xs border border-rose-200 rounded-md p-1 bg-rose-50/50"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
            <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>Automated Accounts Integration:</strong> Confirming this receipt will automatically increment physical stock in the warehouse and register an approved purchase expense voucher under the Accounts & Fees module.
            </span>
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
              {loading ? 'Recording...' : 'Commit Goods Receipt (GRN)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
