import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { Asset, InventoryStore } from '../../types/inventory.js';
import { X, Wrench, UserCheck, CornerUpLeft, ArrowRightLeft, Trash2 } from 'lucide-react';

interface AssetActionModalProps {
  schoolId: string;
  asset: Asset;
  stores: InventoryStore[];
  employees: Array<{ id: string; name: string; empNo: string }>;
  departments: Array<{ id: string; name: string; code: string }>;
  mode: 'assign' | 'return' | 'maintenance' | 'transfer' | 'dispose';
  onClose: () => void;
  onSuccess: () => void;
}

export const AssetActionModal: React.FC<AssetActionModalProps> = ({
  schoolId,
  asset,
  stores,
  employees,
  departments,
  mode,
  onClose,
  onSuccess
}) => {
  const { addToast } = useToast();
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || '');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [locationRoom, setLocationRoom] = useState(asset.location_description || '');
  const [condition, setCondition] = useState<'NEW' | 'GOOD' | 'FAIR' | 'DAMAGED' | 'CRITICAL' | 'UNUSABLE'>(
    (asset.current_condition as any) || 'GOOD'
  );
  const [remarks, setRemarks] = useState('');

  // Return mode
  const [returnStoreId, setReturnStoreId] = useState(stores[0]?.id || '');

  // Maintenance mode
  const [maintenanceDate, setMaintenanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [maintenanceType, setMaintenanceType] = useState<'PREVENTIVE' | 'CORRECTIVE' | 'REPAIR' | 'REPLACEMENT' | 'INSPECTION'>('PREVENTIVE');
  const [description, setDescription] = useState('');
  const [vendorCenter, setVendorCenter] = useState('');
  const [cost, setCost] = useState<number | string>(0);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isUnderWarranty, setIsUnderWarranty] = useState(false);
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState('');

  // Disposal mode
  const [disposalReason, setDisposalReason] = useState('BEYOND_REPAIR');
  const [disposalMethod, setDisposalMethod] = useState('SCRAP_SALE');
  const [saleValue, setSaleValue] = useState<number | string>(0);

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'assign') {
        if (!employeeId && !departmentId) {
          addToast('Please assign to at least an employee or department', 'error');
          setLoading(false);
          return;
        }
        await api.inventory.assignAsset(asset.id, {
          schoolId,
          employeeId: employeeId || undefined,
          departmentId: departmentId || undefined,
          locationRoom: locationRoom.trim() || undefined,
          conditionAtAssignment: condition,
          remarks: remarks.trim() || undefined
        });
        addToast('Asset assigned successfully', 'success');
      } else if (mode === 'return') {
        await api.inventory.returnAsset(asset.id, {
          schoolId,
          targetStoreId: returnStoreId || undefined,
          conditionAtReturn: condition,
          remarks: remarks.trim() || undefined
        });
        addToast('Asset returned to central depot successfully', 'success');
      } else if (mode === 'maintenance') {
        if (!description.trim()) {
          addToast('Maintenance description is required', 'error');
          setLoading(false);
          return;
        }
        await api.inventory.createAssetMaintenance(asset.id, {
          schoolId,
          maintenanceDate,
          maintenanceType,
          description: description.trim(),
          vendorCenter: vendorCenter.trim() || undefined,
          cost: Number(cost) || 0,
          invoiceNumber: invoiceNumber.trim() || undefined,
          isUnderWarranty,
          nextMaintenanceDate: nextMaintenanceDate || undefined,
          remarks: remarks.trim() || undefined
        });
        addToast('Asset maintenance record and service log saved', 'success');
      } else if (mode === 'transfer') {
        await api.inventory.transferAsset(asset.id, {
          schoolId,
          toDepartmentId: departmentId || undefined,
          toEmployeeId: employeeId || undefined,
          toLocationRoom: locationRoom.trim() || undefined,
          condition,
          remarks: remarks.trim() || undefined
        });
        addToast('Asset transfer logged in custody register', 'success');
      } else if (mode === 'dispose') {
        await api.inventory.disposeAsset(asset.id, {
          schoolId,
          disposalReason,
          disposalMethod,
          saleValue: Number(saleValue) || 0,
          remarks: remarks.trim() || undefined
        });
        addToast('Asset officially retired and archived as disposed', 'success');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Action failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden my-8 border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            {mode === 'assign' && <UserCheck className="w-5 h-5 text-emerald-400" />}
            {mode === 'return' && <CornerUpLeft className="w-5 h-5 text-amber-400" />}
            {mode === 'maintenance' && <Wrench className="w-5 h-5 text-blue-400" />}
            {mode === 'transfer' && <ArrowRightLeft className="w-5 h-5 text-indigo-400" />}
            {mode === 'dispose' && <Trash2 className="w-5 h-5 text-rose-400" />}
            <h2 className="font-semibold text-base">
              {mode === 'assign' && 'Assign Custody / Location'}
              {mode === 'return' && 'Return Asset to Warehouse'}
              {mode === 'maintenance' && 'Record Maintenance & Servicing'}
              {mode === 'transfer' && 'Transfer Asset Custody / Location'}
              {mode === 'dispose' && 'Authorize Asset Disposal'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Asset Header Info */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-sm">
              {asset.asset_code}
            </span>
            <p className="text-xs font-semibold text-slate-800 mt-1">{asset.name}</p>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            SN: {asset.serial_number || 'N/A'}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {(mode === 'assign' || mode === 'transfer') && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  {mode === 'transfer' ? 'New Faculty / Staff Custodian' : 'Assign to Faculty / Staff *'}
                </label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="">-- Select Employee Custodian --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.empNo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  {mode === 'transfer' ? 'New Target Department' : 'Target Department'}
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="">-- Select Department --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  {mode === 'transfer' ? 'New Room / Lab / Campus Location' : 'Room / Lab / Location'}
                </label>
                <input
                  type="text"
                  value={locationRoom}
                  onChange={(e) => setLocationRoom(e.target.value)}
                  placeholder="e.g. Senior Computer Lab 1, Terminal 04"
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Condition at Handover
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as any)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="NEW">New (Unused)</option>
                  <option value="GOOD">Good / Prime Condition</option>
                  <option value="FAIR">Fair / Functional</option>
                  <option value="DAMAGED">Damaged</option>
                </select>
              </div>
            </>
          )}

          {mode === 'return' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Receiving Warehouse / Depot *
                </label>
                <select
                  value={returnStoreId}
                  onChange={(e) => setReturnStoreId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  required
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) - {s.building}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Condition at Check-in *
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as any)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                >
                  <option value="GOOD">Good / Ready for Reissue</option>
                  <option value="FAIR">Fair / Functional</option>
                  <option value="DAMAGED">Damaged / Requires Servicing</option>
                  <option value="CRITICAL">Defective / Unusable</option>
                </select>
              </div>
            </>
          )}

          {mode === 'maintenance' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Service Date *
                  </label>
                  <input
                    type="date"
                    value={maintenanceDate}
                    onChange={(e) => setMaintenanceDate(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Maintenance Type *
                  </label>
                  <select
                    value={maintenanceType}
                    onChange={(e) => setMaintenanceType(e.target.value as any)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5"
                  >
                    <option value="PREVENTIVE">Preventive Maintenance</option>
                    <option value="CORRECTIVE">Corrective Servicing</option>
                    <option value="REPAIR">Component Repair</option>
                    <option value="REPLACEMENT">Parts Replacement</option>
                    <option value="INSPECTION">Calibration / Audit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Service Work Description *
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Cleaned heat sink, replaced thermal paste, updated BIOS firmware"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Service Center / Vendor
                  </label>
                  <input
                    type="text"
                    value={vendorCenter}
                    onChange={(e) => setVendorCenter(e.target.value)}
                    placeholder="e.g. Netcore IT Solutions"
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Servicing Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Invoice / Service Slip #
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-SRV-901"
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Next Due Date
                  </label>
                  <input
                    type="date"
                    value={nextMaintenanceDate}
                    onChange={(e) => setNextMaintenanceDate(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="underWarranty"
                  checked={isUnderWarranty}
                  onChange={(e) => setIsUnderWarranty(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <label htmlFor="underWarranty" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Covered under active Manufacturer Warranty / AMC (Zero School Outflow)
                </label>
              </div>
            </>
          )}

          {mode === 'dispose' && (
            <>
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-xs text-rose-800">
                <strong>Attention:</strong> Asset disposal retires the item from active operations. Historical records, maintenance logs and audit trails remain permanently archived.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Disposal Justification *
                </label>
                <select
                  value={disposalReason}
                  onChange={(e) => setDisposalReason(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                >
                  <option value="BEYOND_REPAIR">Beyond Economical Repair (BER)</option>
                  <option value="OBSOLETE">Technically Obsolete / Outdated</option>
                  <option value="DAMAGED">Physical Destruction / Damaged</option>
                  <option value="LOST_STOLEN">Lost / Unaccounted in Stock Verification</option>
                  <option value="REPLACED">Institutional Technology Upgrade</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Disposal Method *
                  </label>
                  <select
                    value={disposalMethod}
                    onChange={(e) => setDisposalMethod(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5"
                  >
                    <option value="SCRAP_SALE">Scrap Auction / Recycler Sale</option>
                    <option value="E_WASTE_RECYCLE">Certified E-Waste Management</option>
                    <option value="DONATION">Charity / Educational Donation</option>
                    <option value="WRITE_OFF">Complete Institutional Write-Off</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Scrap / Salvage Sale Value (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={saleValue}
                    onChange={(e) => setSaleValue(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 font-semibold"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Remarks & Log Notes
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Authorized by Principal / School Admin"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-slate-500 focus:outline-hidden"
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
              className={`px-5 py-2 text-xs font-semibold text-white rounded-lg transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50 ${
                mode === 'dispose' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              {loading ? 'Processing...' : 'Confirm Action'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
