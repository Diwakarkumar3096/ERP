import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { InventoryCategory, InventoryStore, Vendor } from '../../types/inventory.js';
import { X, ShieldAlert, Cpu, Calendar, DollarSign, Tag, User } from 'lucide-react';

interface AddAssetModalProps {
  schoolId: string;
  categories: InventoryCategory[];
  stores: InventoryStore[];
  vendors: Vendor[];
  employees: Array<{ id: string; name: string; empNo: string }>;
  departments: Array<{ id: string; name: string; code: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddAssetModal: React.FC<AddAssetModalProps> = ({
  schoolId,
  categories,
  stores,
  vendors,
  employees,
  departments,
  onClose,
  onSuccess
}) => {
  const { addToast } = useToast();
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [assetCode, setAssetCode] = useState('');
  const [name, setName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [barcode, setBarcode] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [purchaseCost, setPurchaseCost] = useState<number | string>(0);
  const [vendorId, setVendorId] = useState(vendors[0]?.id || '');
  const [warrantyStartDate, setWarrantyStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [warrantyEndDate, setWarrantyEndDate] = useState('');
  const [warrantyProvider, setWarrantyProvider] = useState('');
  const [currentCondition, setCurrentCondition] = useState<'NEW' | 'GOOD' | 'FAIR' | 'DAMAGED'>('NEW');
  const [currentStoreId, setCurrentStoreId] = useState(stores[0]?.id || '');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [specifications, setSpecifications] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerateAssetCode = () => {
    const selectedCat = categories.find(c => c.id === categoryId);
    const catCode = selectedCat ? selectedCat.code.substring(0, 3).toUpperCase() : 'AST';
    const num = Math.floor(100 + Math.random() * 900);
    const code = `AST-${catCode}-${num}`;
    setAssetCode(code);
    if (!barcode) {
      setBarcode(`BAR-${code}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      addToast('Please select an asset category', 'error');
      return;
    }
    if (!assetCode.trim()) {
      addToast('Asset tag / code is required', 'error');
      return;
    }
    if (!name.trim()) {
      addToast('Asset name is required', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.inventory.createAsset({
        schoolId,
        categoryId,
        assetCode: assetCode.trim().toUpperCase(),
        name: name.trim(),
        serialNumber: serialNumber.trim() || undefined,
        barcode: barcode.trim() || undefined,
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        purchaseDate: purchaseDate || undefined,
        purchaseCost: Number(purchaseCost) || 0,
        vendorId: vendorId || undefined,
        warrantyStartDate: warrantyStartDate || undefined,
        warrantyEndDate: warrantyEndDate || undefined,
        warrantyProvider: warrantyProvider.trim() || undefined,
        currentCondition,
        currentStoreId: currentStoreId || undefined,
        departmentId: departmentId || undefined,
        assignedEmployeeId: assignedEmployeeId || undefined,
        locationDescription: locationDescription.trim() || undefined,
        specifications: specifications.trim() || undefined
      });

      addToast('Asset registered into institutional asset register', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Failed to create asset', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden my-8 border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <h2 className="font-semibold text-base">Register Capital & Fixed Asset</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Category & Asset Code */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Asset Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
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
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 uppercase">
                  Asset Tag / Identification Code *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateAssetCode}
                  className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium underline"
                >
                  Generate Tag
                </button>
              </div>
              <input
                type="text"
                value={assetCode}
                onChange={(e) => setAssetCode(e.target.value.toUpperCase())}
                placeholder="e.g. AST-IT-004"
                className="w-full text-sm font-mono font-semibold border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden uppercase"
                required
              />
            </div>
          </div>

          {/* Name & Serial */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Asset Title & Description *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dell OptiPlex 7090 Desktop Workstation (Intel Core i7)"
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Serial Number
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. DLL-SN-998811"
                className="w-full text-sm font-mono border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Brand, Model, Barcode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Make / Manufacturer
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Dell / Epson / Voltas"
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Model Number
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. OptiPlex 7090 MT"
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Barcode / QR Code
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="e.g. BAR-AST-004"
                className="w-full text-sm font-mono border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Financials & Supplier */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Purchase Value (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-semibold text-sm">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(e.target.value)}
                  className="w-full pl-8 text-sm font-bold border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Purchase / Capitalization Date
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Authorized Supplier
              </label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="">-- No Direct Supplier --</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Warranty Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Warranty Expiry Date
              </label>
              <input
                type="date"
                value={warrantyEndDate}
                onChange={(e) => setWarrantyEndDate(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Warranty Terms & AMC Provider
              </label>
              <input
                type="text"
                value={warrantyProvider}
                onChange={(e) => setWarrantyProvider(e.target.value)}
                placeholder="e.g. Dell ProSupport 3-Year Comprehensive On-Site Warranty"
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Custody & Location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Allocated Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="">-- Unassigned Department --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Custody / Responsible Faculty
              </label>
              <select
                value={assignedEmployeeId}
                onChange={(e) => setAssignedEmployeeId(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="">-- General Campus Pool --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.empNo})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Condition
              </label>
              <select
                value={currentCondition}
                onChange={(e) => setCurrentCondition(e.target.value as any)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="NEW">New (Unused)</option>
                <option value="GOOD">Good / Prime Condition</option>
                <option value="FAIR">Fair / Functional</option>
                <option value="DAMAGED">Damaged / Requires Repair</option>
              </select>
            </div>
          </div>

          {/* Location details */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Physical Location & Room Allocation
            </label>
            <input
              type="text"
              value={locationDescription}
              onChange={(e) => setLocationDescription(e.target.value)}
              placeholder="e.g. Senior Computer Lab 1, Terminal 04 / Classroom 10-A Ceiling Mount"
              className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Specifications */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Hardware Specifications & Configuration
            </label>
            <textarea
              rows={2}
              value={specifications}
              onChange={(e) => setSpecifications(e.target.value)}
              placeholder="e.g. Intel Core i7-11700, 16GB DDR4, 512GB NVMe SSD, Dell 24-inch FHD Monitor"
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
              {loading ? 'Registering...' : 'Register Asset in Ledger'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
