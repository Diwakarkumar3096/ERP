import React, { useState } from 'react';
import { X, Bus, Check, AlertCircle } from 'lucide-react';
import { api } from '../../services/api.js';
import type { Vehicle } from '../../types/erp.js';

interface AddVehicleModalProps {
  schoolId: string;
  initialVehicle?: Vehicle | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddVehicleModal: React.FC<AddVehicleModalProps> = ({
  schoolId,
  initialVehicle,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    registrationNumber: initialVehicle?.registration_number || '',
    vehicleNumber: initialVehicle?.vehicle_number || '',
    vehicleType: initialVehicle?.vehicle_type || 'Bus',
    make: initialVehicle?.make || '',
    model: initialVehicle?.model || '',
    manufacturer: initialVehicle?.manufacturer || '',
    manufacturingYear: initialVehicle?.manufacturing_year?.toString() || new Date().getFullYear().toString(),
    purchaseDate: initialVehicle?.purchase_date ? initialVehicle.purchase_date.split('T')[0] : '',
    purchaseCost: initialVehicle?.purchase_cost?.toString() || '',
    seatingCapacity: initialVehicle?.seating_capacity?.toString() || '40',
    standingCapacity: initialVehicle?.standing_capacity?.toString() || '0',
    fuelType: initialVehicle?.fuel_type || 'Diesel',
    currentMileage: initialVehicle?.current_mileage?.toString() || '0',
    vehicleColor: initialVehicle?.vehicle_color || 'Golden Yellow',
    gpsDeviceId: initialVehicle?.gps_device_id || '',
    status: initialVehicle?.status || 'Active',
    notes: initialVehicle?.notes || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.registrationNumber || !formData.vehicleNumber || !formData.seatingCapacity) {
      setError('Registration Number, Vehicle Number, and Seating Capacity are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        ...formData,
        schoolId,
        seatingCapacity: parseInt(formData.seatingCapacity, 10),
        standingCapacity: parseInt(formData.standingCapacity || '0', 10),
        manufacturingYear: formData.manufacturingYear ? parseInt(formData.manufacturingYear, 10) : undefined,
        purchaseCost: formData.purchaseCost ? parseFloat(formData.purchaseCost) : 0,
        currentMileage: formData.currentMileage ? parseInt(formData.currentMileage, 10) : 0
      };

      if (initialVehicle) {
        await api.transport.updateVehicle(initialVehicle.id, payload);
      } else {
        await api.transport.createVehicle(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save vehicle details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">
                {initialVehicle ? 'Edit Vehicle Details' : 'Register New Fleet Vehicle'}
              </h3>
              <p className="text-xs text-slate-500">
                School bus, mini bus or transport feeder van details
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vehicle Call Number *
              </label>
              <input
                type="text"
                value={formData.vehicleNumber}
                onChange={e => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                placeholder="e.g. BUS-01 or VAN-02"
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                RTO Registration Number *
              </label>
              <input
                type="text"
                value={formData.registrationNumber}
                onChange={e => setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })}
                placeholder="e.g. UP 70 AB 1234"
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vehicle Type
              </label>
              <select
                value={formData.vehicleType}
                onChange={e => setFormData({ ...formData, vehicleType: e.target.value as any })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
              >
                <option value="Bus">School Bus (Standard 30-50 seats)</option>
                <option value="Mini Bus">Mini Bus (20-30 seats)</option>
                <option value="Van">Feeder Van (10-18 seats)</option>
                <option value="Other">Other Conveyance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fuel Type
              </label>
              <select
                value={formData.fuelType}
                onChange={e => setFormData({ ...formData, fuelType: e.target.value as any })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
              >
                <option value="Diesel">Diesel</option>
                <option value="CNG">CNG</option>
                <option value="Petrol">Petrol</option>
                <option value="Electric">Electric (EV)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Make / Brand
              </label>
              <input
                type="text"
                value={formData.make}
                onChange={e => setFormData({ ...formData, make: e.target.value })}
                placeholder="e.g. Tata Motors, Ashok Leyland"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Model Name
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={e => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g. Starbus Ultra 40-Seater"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Seating Capacity *
              </label>
              <input
                type="number"
                min="4"
                max="100"
                value={formData.seatingCapacity}
                onChange={e => setFormData({ ...formData, seatingCapacity: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Odometer (km)
              </label>
              <input
                type="number"
                min="0"
                value={formData.currentMileage}
                onChange={e => setFormData({ ...formData, currentMileage: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Manufacturing Year
              </label>
              <input
                type="number"
                min="2000"
                max="2030"
                value={formData.manufacturingYear}
                onChange={e => setFormData({ ...formData, manufacturingYear: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
              >
                <option value="Active">Active (In Service)</option>
                <option value="Inactive">Inactive</option>
                <option value="Under Maintenance">Under Maintenance / Workshop</option>
                <option value="Accident/Damaged">Accident / Damaged</option>
                <option value="Retired">Retired / Sold</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Safety Equipment & Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Fitted with speed governor, emergency buzzer, reverse sensor, CCTV cameras and certified first aid kit."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Saving...' : (initialVehicle ? 'Update Vehicle' : 'Register Vehicle')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
