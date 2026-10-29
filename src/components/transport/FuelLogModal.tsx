import React, { useState } from 'react';
import { X, Fuel, Check, AlertCircle, IndianRupee } from 'lucide-react';
import { api } from '../../services/api.js';
import type { Vehicle } from '../../types/erp.js';

interface FuelLogModalProps {
  schoolId: string;
  vehicles: Vehicle[];
  defaultVehicleId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const FuelLogModal: React.FC<FuelLogModalProps> = ({
  schoolId,
  vehicles,
  defaultVehicleId,
  onClose,
  onSuccess
}) => {
  const [vehicleId, setVehicleId] = useState(defaultVehicleId || (vehicles[0]?.id || ''));
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().split('T')[0]);
  const [fuelType, setFuelType] = useState('Diesel');
  const [quantityLitres, setQuantityLitres] = useState('50');
  const [ratePerLitre, setRatePerLitre] = useState('89.50');
  const [odometerReading, setOdometerReading] = useState('');
  const [fuelStation, setFuelStation] = useState('Indian Oil Auto Care, Civil Lines');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCalculated = (parseFloat(quantityLitres) || 0) * (parseFloat(ratePerLitre) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !fuelDate || !quantityLitres || !ratePerLitre || !odometerReading) {
      setError('Vehicle, date, quantity, rate, and odometer reading are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await api.transport.createFuel({
        schoolId,
        vehicleId,
        fuelDate,
        fuelType,
        quantityLitres: parseFloat(quantityLitres),
        ratePerLitre: parseFloat(ratePerLitre),
        totalAmount: totalCalculated,
        odometerReading: parseInt(odometerReading, 10),
        fuelStation: fuelStation.trim(),
        invoiceNumber: invoiceNumber.trim(),
        notes: notes.trim()
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to log fuel entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-700 flex items-center justify-center font-bold">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Log Vehicle Fuel Entry</h3>
              <p className="text-xs text-slate-500">Track fuel consumption, mileage & auto-sync to accounts</p>
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
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
              >
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.vehicle_number} ({v.registration_number})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fuel Type *</label>
              <select
                value={fuelType}
                onChange={e => setFuelType(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
              >
                <option value="Diesel">Diesel</option>
                <option value="CNG">CNG (kg)</option>
                <option value="Petrol">Petrol</option>
                <option value="Electric">Electric (kWh)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fuel Date *</label>
              <input
                type="date"
                value={fuelDate}
                onChange={e => setFuelDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Odometer Reading (km) *</label>
              <input
                type="number"
                min="0"
                value={odometerReading}
                onChange={e => setOdometerReading(e.target.value)}
                placeholder="Current vehicle km"
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity (Litres / kg) *</label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={quantityLitres}
                onChange={e => setQuantityLitres(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Rate per Unit (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={ratePerLitre}
                onChange={e => setRatePerLitre(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Calculated Total Expense:</span>
            <span className="text-base font-bold text-rose-700 flex items-center">
              <IndianRupee className="w-4 h-4" />
              {totalCalculated.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fuel Station / Pump</label>
              <input
                type="text"
                value={fuelStation}
                onChange={e => setFuelStation(e.target.value)}
                placeholder="e.g. Indian Oil, Civil Lines"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fuel Bill / Receipt No.</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                placeholder="e.g. IOC-RCP-9021"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono"
              />
            </div>
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
              className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Log Refueling'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
