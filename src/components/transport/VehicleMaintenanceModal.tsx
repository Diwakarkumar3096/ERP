import React, { useState } from 'react';
import { X, Wrench, Check, AlertCircle, IndianRupee } from 'lucide-react';
import { api } from '../../services/api.js';
import type { Vehicle } from '../../types/erp.js';

interface VehicleMaintenanceModalProps {
  schoolId: string;
  vehicles: Vehicle[];
  defaultVehicleId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const VehicleMaintenanceModal: React.FC<VehicleMaintenanceModalProps> = ({
  schoolId,
  vehicles,
  defaultVehicleId,
  onClose,
  onSuccess
}) => {
  const [vehicleId, setVehicleId] = useState(defaultVehicleId || (vehicles[0]?.id || ''));
  const [maintenanceDate, setMaintenanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [maintenanceType, setMaintenanceType] = useState('Regular Service');
  const [description, setDescription] = useState('');
  const [vendorCenter, setVendorCenter] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [cost, setCost] = useState('4500');
  const [odometerReading, setOdometerReading] = useState('');
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState('');
  const [nextMaintenanceMileage, setNextMaintenanceMileage] = useState('');
  const [remarks, setRemarks] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !maintenanceDate || !maintenanceType || !description || !vendorCenter || !cost) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await api.transport.createMaintenance({
        schoolId,
        vehicleId,
        maintenanceDate,
        maintenanceType,
        description: description.trim(),
        vendorCenter: vendorCenter.trim(),
        invoiceNumber: invoiceNumber.trim(),
        cost: parseFloat(cost) || 0,
        odometerReading: odometerReading ? parseInt(odometerReading, 10) : undefined,
        nextMaintenanceDate: nextMaintenanceDate || undefined,
        nextMaintenanceMileage: nextMaintenanceMileage ? parseInt(nextMaintenanceMileage, 10) : undefined,
        remarks: remarks.trim()
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record maintenance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-hidden border border-slate-100">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-700 flex items-center justify-center font-bold">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Log Vehicle Maintenance & Repair</h3>
              <p className="text-xs text-slate-500">Auto-posts cost to Phase 6 Accounts & Expenses</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Fleet Vehicle *</label>
              <select
                value={vehicleId}
                onChange={e => setVehicleId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
              >
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.vehicle_number} ({v.registration_number}) - {v.make}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Maintenance Type *</label>
              <select
                value={maintenanceType}
                onChange={e => setMaintenanceType(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
              >
                <option value="Regular Service">Regular Periodic Service</option>
                <option value="Brake">Brake Pads & Hydraulics</option>
                <option value="Engine">Engine & Transmission Overhaul</option>
                <option value="Tyres">Tyre Replacement & Alignment</option>
                <option value="Battery">Battery & Electrical</option>
                <option value="AC">Air Conditioning & Ventilation</option>
                <option value="Body Repair">Body Repair & Painting</option>
                <option value="Accident Repair">Accident Repair</option>
                <option value="Other">Other Workshop Work</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Service Date *</label>
              <input
                type="date"
                value={maintenanceDate}
                onChange={e => setMaintenanceDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cost / Bill Amount (₹) *</label>
              <div className="relative">
                <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={cost}
                  onChange={e => setCost(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor / Service Workshop *</label>
              <input
                type="text"
                value={vendorCenter}
                onChange={e => setVendorCenter(e.target.value)}
                placeholder="e.g. Tata Motors Authorized Service Center"
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice / Receipt No.</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-TAT-2026-9021"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Odometer Reading (km)</label>
              <input
                type="number"
                min="0"
                value={odometerReading}
                onChange={e => setOdometerReading(e.target.value)}
                placeholder="e.g. 24500"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Next Service Due Date</label>
              <input
                type="date"
                value={nextMaintenanceDate}
                onChange={e => setNextMaintenanceDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Work Description *</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. 20,000 km regular service: engine oil, fuel filters replaced, brake drums skimmed and suspension check."
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Recording...' : 'Record Maintenance'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
