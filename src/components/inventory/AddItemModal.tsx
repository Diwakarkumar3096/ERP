import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { InventoryCategory, InventoryStore } from '../../types/inventory.js';
import { X, Package, DollarSign, Layers, Warehouse } from 'lucide-react';

interface AddItemModalProps {
  schoolId: string;
  categories: InventoryCategory[];
  stores: InventoryStore[];
  onClose: () => void;
  onSuccess: () => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({
  schoolId,
  categories,
  stores,
  onClose,
  onSuccess
}) => {
  const { addToast } = useToast();
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [unit, setUnit] = useState('Piece');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');
  const [minStockLevel, setMinStockLevel] = useState(5);
  const [reorderLevel, setReorderLevel] = useState(10);
  const [maxStockLevel, setMaxStockLevel] = useState(100);
  const [initialStock, setInitialStock] = useState(0);
  const [unitPrice, setUnitPrice] = useState<number | string>(0);
  const [defaultStoreId, setDefaultStoreId] = useState(stores[0]?.id || '');
  const [loading, setLoading] = useState(false);

  // Auto-generate SKU based on category & name
  const handleGenerateSku = () => {
    const selectedCat = categories.find(c => c.id === categoryId);
    const catCode = selectedCat ? selectedCat.code.substring(0, 4).toUpperCase() : 'GEN';
    const rand = Math.floor(1000 + Math.random() * 9000);
    const generated = `SKU-${catCode}-${rand}`;
    setSku(generated);
    if (!barcode) {
      setBarcode(`BAR-${rand}${Math.floor(100 + Math.random() * 900)}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      addToast('Please select a category', 'error');
      return;
    }
    if (!name.trim()) {
      addToast('Item name is required', 'error');
      return;
    }
    if (!sku.trim()) {
      addToast('SKU identifier is required', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.inventory.createItem({
        schoolId,
        categoryId,
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        barcode: barcode.trim() || undefined,
        unit: unit.trim() || 'Piece',
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        description: description.trim() || undefined,
        minStockLevel: Number(minStockLevel) || 0,
        reorderLevel: Number(reorderLevel) || 0,
        maxStockLevel: Number(maxStockLevel) || 100,
        initialStock: Number(initialStock) || 0,
        unitPrice: Number(unitPrice) || 0,
        defaultStoreId: defaultStoreId || undefined
      });
      addToast('Inventory item added to catalog successfully', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Failed to register item', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden my-8 border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-base">New Inventory Item & Stock Catalog</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Category & Store */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Default Warehouse / Store
              </label>
              <select
                value={defaultStoreId}
                onChange={(e) => setDefaultStoreId(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="">-- No Default Depot --</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code}) - {s.building || 'Campus'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Item Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Item Name & Specifications *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. A4 Copier Paper (75 GSM, 500 Sheets Ream)"
              className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              required
            />
          </div>

          {/* SKU & Barcode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 uppercase">
                  SKU Identifier *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateSku}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium underline"
                >
                  Auto Generate
                </button>
              </div>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="e.g. SKU-STAT-8012"
                className="w-full text-sm font-mono border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden uppercase"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Barcode / EAN (Optional)
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="e.g. 890103045612"
                className="w-full text-sm font-mono border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Brand, Model, Unit */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Unit of Measure *
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="Piece">Piece / Unit</option>
                <option value="Ream">Ream (500 sheets)</option>
                <option value="Box">Box / Carton</option>
                <option value="Pack">Pack / Packet</option>
                <option value="Bottle">Bottle / Jar</option>
                <option value="Kg">Kilogram (kg)</option>
                <option value="Liter">Liter (L)</option>
                <option value="Meter">Meter (m)</option>
                <option value="Set">Kit / Set</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Brand / Manufacturer
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. JK Paper / Faber Castell"
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Model / Variant
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Copier Plus 75GSM"
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Pricing & Opening Stock */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Unit Purchase Price (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-semibold text-sm">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 text-sm font-semibold border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Initial Opening Stock Quantity
              </label>
              <input
                type="number"
                min="0"
                value={initialStock}
                onChange={(e) => setInitialStock(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="w-full text-sm font-semibold border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Recorded automatically as opening stock receipt in ledger
              </span>
            </div>
          </div>

          {/* Thresholds: Min, Reorder, Max */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                Min Stock Level
              </label>
              <input
                type="number"
                min="0"
                value={minStockLevel}
                onChange={(e) => setMinStockLevel(parseInt(e.target.value) || 0)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-amber-700 uppercase mb-1">
                Reorder Threshold *
              </label>
              <input
                type="number"
                min="0"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(parseInt(e.target.value) || 0)}
                className="w-full text-xs font-semibold text-amber-800 border border-amber-300 rounded-lg p-2 bg-amber-50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                Max Stock Cap
              </label>
              <input
                type="number"
                min="1"
                value={maxStockLevel}
                onChange={(e) => setMaxStockLevel(parseInt(e.target.value) || 100)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Internal Storage Notes / Handling Instructions
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Keep in dry moisture-free bay, store in original carton packs"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
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
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Save Catalog Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
