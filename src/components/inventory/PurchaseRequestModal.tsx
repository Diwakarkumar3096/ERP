import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { InventoryItem } from '../../types/inventory.js';
import { X, ShoppingBag, Plus, Trash2, Calendar, FileText } from 'lucide-react';

interface PurchaseRequestModalProps {
  schoolId: string;
  items: InventoryItem[];
  departments: Array<{ id: string; name: string; code: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

export const PurchaseRequestModal: React.FC<PurchaseRequestModalProps> = ({
  schoolId,
  items,
  departments,
  onClose,
  onSuccess
}) => {
  const { addToast } = useToast();
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [requiredByDate, setRequiredByDate] = useState('');
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [requestItems, setRequestItems] = useState<Array<{
    itemName: string;
    itemId?: string;
    quantity: number;
    unit: string;
    estimatedUnitPrice: number;
    specifications?: string;
  }>>([
    {
      itemName: '',
      quantity: 1,
      unit: 'Piece',
      estimatedUnitPrice: 0,
      specifications: ''
    }
  ]);
  const [loading, setLoading] = useState(false);

  const handleAddItemRow = () => {
    setRequestItems([
      ...requestItems,
      {
        itemName: '',
        quantity: 1,
        unit: 'Piece',
        estimatedUnitPrice: 0,
        specifications: ''
      }
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (requestItems.length === 1) return;
    setRequestItems(requestItems.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...requestItems];
    (updated[index] as any)[field] = val;

    // If selecting an existing item
    if (field === 'itemId') {
      const it = items.find((i) => i.id === val);
      if (it) {
        updated[index].itemName = it.name;
        updated[index].unit = it.unit;
        updated[index].estimatedUnitPrice = Number(it.unit_price) || 0;
      }
    }

    setRequestItems(updated);
  };

  const totalEstimated = requestItems.reduce(
    (sum, it) => sum + (it.quantity * it.estimatedUnitPrice || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      addToast('Requisition title is required', 'error');
      return;
    }
    const invalidRows = requestItems.some((r) => !r.itemName.trim() || r.quantity <= 0);
    if (invalidRows) {
      addToast('All requested items must have valid name and quantity > 0', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.inventory.createRequest({
        schoolId,
        departmentId: departmentId || undefined,
        requiredByDate: requiredByDate || undefined,
        priority,
        title: title.trim(),
        reason: reason.trim() || undefined,
        items: requestItems
      });

      addToast('Purchase requisition created and submitted for administrative approval', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Failed to submit requisition', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden my-8 border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-indigo-400" />
            <h2 className="font-semibold text-base">New Purchase & Indent Requisition</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Requesting Department *
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Requisition Priority *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="LOW">Low (Routine replenish)</option>
                <option value="MEDIUM">Medium (Normal)</option>
                <option value="HIGH">High (Urgent class needs)</option>
                <option value="URGENT">Critical / Immediate Board Exam</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Required By Target Date
              </label>
              <input
                type="date"
                value={requiredByDate}
                onChange={(e) => setRequiredByDate(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Requisition Title / Summary *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Science Chemistry Lab Organic Reagents & Flasks"
              className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Justification & Operational Need
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Necessary for Class 12 CBSE Board Practical Examination scheduled next month"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Requested Items Table */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 uppercase">
                Itemized Indent Lines ({requestItems.length})
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
              {requestItems.map((item, index) => (
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
                      placeholder="Unit (e.g. Piece)"
                      className="w-full text-xs border border-slate-300 rounded-md p-2 bg-white"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.estimatedUnitPrice}
                      onChange={(e) => handleItemChange(index, 'estimatedUnitPrice', parseFloat(e.target.value) || 0)}
                      placeholder="Est. Rate ₹"
                      className="w-full text-xs border border-slate-300 rounded-md p-2 bg-white text-right font-medium"
                    />
                  </div>

                  <div className="md:col-span-1 flex justify-center">
                    <button
                      type="button"
                      disabled={requestItems.length === 1}
                      onClick={() => handleRemoveItemRow(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-200 transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-950 font-medium text-xs">
              <span>Total Estimated Requisition Budget:</span>
              <span className="text-sm font-bold text-indigo-700">₹{totalEstimated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Indent Requisition'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
