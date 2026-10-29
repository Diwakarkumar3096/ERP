import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { Vendor, PurchaseRequest, InventoryItem } from '../../types/inventory.js';
import { X, FileSpreadsheet, Plus, Trash2, Calendar, DollarSign } from 'lucide-react';

interface CreatePOModalProps {
  schoolId: string;
  vendors: Vendor[];
  approvedRequests: PurchaseRequest[];
  items: InventoryItem[];
  preselectedRequest?: PurchaseRequest | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreatePOModal: React.FC<CreatePOModalProps> = ({
  schoolId,
  vendors,
  approvedRequests,
  items,
  preselectedRequest,
  onClose,
  onSuccess
}) => {
  const { addToast } = useToast();
  const [vendorId, setVendorId] = useState(vendors[0]?.id || '');
  const [requestId, setRequestId] = useState(preselectedRequest?.id || '');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [taxAmount, setTaxAmount] = useState<number | string>(0);
  const [discountAmount, setDiscountAmount] = useState<number | string>(0);
  const [shippingCost, setShippingCost] = useState<number | string>(0);
  const [termsAndConditions, setTermsAndConditions] = useState(
    '1. Material must conform strictly to school specifications.\n2. Goods delivery at designated campus warehouse.\n3. Payment net 30 days upon physical inspection & verified GRN.'
  );

  const [poItems, setPoItems] = useState<Array<{
    itemId?: string;
    itemName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
  }>>([
    {
      itemName: preselectedRequest ? preselectedRequest.title : '',
      quantity: 1,
      unit: 'Piece',
      unitPrice: preselectedRequest ? Number(preselectedRequest.estimated_total) : 0
    }
  ]);

  const [loading, setLoading] = useState(false);

  const handleAddItemRow = () => {
    setPoItems([
      ...poItems,
      {
        itemName: '',
        quantity: 1,
        unit: 'Piece',
        unitPrice: 0
      }
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (poItems.length === 1) return;
    setPoItems(poItems.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...poItems];
    (updated[index] as any)[field] = val;

    if (field === 'itemId') {
      const it = items.find((i) => i.id === val);
      if (it) {
        updated[index].itemName = it.name;
        updated[index].unit = it.unit;
        updated[index].unitPrice = Number(it.unit_price) || 0;
      }
    }

    setPoItems(updated);
  };

  const subtotal = poItems.reduce((acc, it) => acc + (it.quantity * it.unitPrice || 0), 0);
  const grandTotal = subtotal + Number(taxAmount || 0) + Number(shippingCost || 0) - Number(discountAmount || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) {
      addToast('Please select a supplier vendor', 'error');
      return;
    }
    const invalid = poItems.some((r) => !r.itemName.trim() || r.quantity <= 0);
    if (invalid) {
      addToast('All order lines must have a valid item description and quantity', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.inventory.createOrder({
        schoolId,
        vendorId,
        requestId: requestId || undefined,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        items: poItems,
        taxAmount: Number(taxAmount) || 0,
        discountAmount: Number(discountAmount) || 0,
        shippingCost: Number(shippingCost) || 0,
        termsAndConditions: termsAndConditions.trim() || undefined
      });

      addToast('Purchase Order generated and registered in procurement ledger', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Failed to generate PO', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden my-8 border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            <h2 className="font-semibold text-base">Generate Official Purchase Order (PO)</h2>
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
                Supplier Vendor *
              </label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                required
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Linked Purchase Indent
              </label>
              <select
                value={requestId}
                onChange={(e) => setRequestId(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="">-- Direct Purchase Order --</option>
                {approvedRequests.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.request_number} - {pr.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 uppercase">
                Purchase Order Lines ({poItems.length})
              </label>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item Line
              </button>
            </div>

            <div className="space-y-3">
              {poItems.map((item, index) => (
                <div
                  key={index}
                  className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-2 items-center"
                >
                  <div className="md:col-span-5">
                    <input
                      type="text"
                      value={item.itemName}
                      onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                      placeholder="Item name & specifications"
                      className="w-full text-xs border border-slate-300 rounded-md p-2 bg-white"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                      placeholder="Qty"
                      className="w-full text-xs border border-slate-300 rounded-md p-2 bg-white text-center font-bold"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      placeholder="Unit"
                      className="w-full text-xs border border-slate-300 rounded-md p-2 bg-white"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      placeholder="Unit Price ₹"
                      className="w-full text-xs border border-slate-300 rounded-md p-2 bg-white text-right font-medium"
                    />
                  </div>

                  <div className="md:col-span-1 flex justify-center">
                    <button
                      type="button"
                      disabled={poItems.length === 1}
                      onClick={() => handleRemoveItemRow(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-200 transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">Subtotal</label>
              <div className="font-bold text-slate-800 text-sm py-1.5">₹{subtotal.toFixed(2)}</div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">Taxes / GST (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">Shipping (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">Grand Total</label>
              <div className="font-bold text-indigo-700 text-base py-1">₹{grandTotal.toFixed(2)}</div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Terms & Delivery Clauses
            </label>
            <textarea
              rows={2}
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
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
              {loading ? 'Generating...' : 'Issue Purchase Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
