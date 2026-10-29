import React, { useState } from 'react';
import { X, Calendar, Check, AlertCircle, Clock } from 'lucide-react';
import { api } from '../../services/api.js';
import type { TransportRoute, Vehicle, TransportDriver, Employee } from '../../types/erp.js';

interface CreateTripModalProps {
  schoolId: string;
  routes: TransportRoute[];
  vehicles: Vehicle[];
  drivers: TransportDriver[];
  conductors: Employee[];
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateTripModal: React.FC<CreateTripModalProps> = ({
  schoolId,
  routes,
  vehicles,
  drivers,
  conductors,
  onClose,
  onSuccess
}) => {
  const [routeId, setRouteId] = useState(routes[0]?.id || '');
  const [vehicleId, setVehicleId] = useState(routes[0]?.assigned_vehicle_id || (vehicles[0]?.id || ''));
  const [driverId, setDriverId] = useState(routes[0]?.assigned_driver_id || (drivers[0]?.id || ''));
  const [conductorId, setConductorId] = useState(routes[0]?.assigned_conductor_id || '');
  const [tripDate, setTripDate] = useState(new Date().toISOString().split('T')[0]);
  const [tripType, setTripType] = useState<'Morning Pickup' | 'Afternoon Drop' | 'Special Trip' | 'Emergency Trip'>('Morning Pickup');
  const [scheduledStartTime, setScheduledStartTime] = useState('06:50 AM');
  const [scheduledEndTime, setScheduledEndTime] = useState('07:45 AM');
  const [odometerStart, setOdometerStart] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When route changes, auto-fill assigned vehicle, driver, and conductor
  const handleRouteChange = (selectedRouteId: string) => {
    setRouteId(selectedRouteId);
    const r = routes.find(rt => rt.id === selectedRouteId);
    if (r) {
      if (r.assigned_vehicle_id) setVehicleId(r.assigned_vehicle_id);
      if (r.assigned_driver_id) setDriverId(r.assigned_driver_id);
      if (r.assigned_conductor_id) setConductorId(r.assigned_conductor_id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeId || !vehicleId || !driverId || !tripDate || !tripType) {
      setError('Route, vehicle, driver, date, and trip type are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await api.transport.createTrip({
        schoolId,
        routeId,
        vehicleId,
        driverId,
        conductorId: conductorId || null,
        tripDate,
        tripType,
        scheduledStartTime,
        scheduledEndTime,
        odometerStart: odometerStart ? parseInt(odometerStart, 10) : undefined,
        notes: notes.trim()
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch trip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-700 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Dispatch Daily Transport Trip</h3>
              <p className="text-xs text-slate-500">Schedule morning pickup, afternoon drop, or special run</p>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Route *</label>
              <select
                value={routeId}
                onChange={e => handleRouteChange(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white font-medium"
              >
                {routes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.code} - {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Trip Type *</label>
              <select
                value={tripType}
                onChange={e => {
                  const val = e.target.value as any;
                  setTripType(val);
                  if (val === 'Morning Pickup') {
                    setScheduledStartTime('06:50 AM');
                    setScheduledEndTime('07:45 AM');
                  } else if (val === 'Afternoon Drop') {
                    setScheduledStartTime('02:15 PM');
                    setScheduledEndTime('03:10 PM');
                  }
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white font-medium"
              >
                <option value="Morning Pickup">Morning Student Pickup</option>
                <option value="Afternoon Drop">Afternoon Return Drop</option>
                <option value="Special Trip">Special Field Trip / Sports</option>
                <option value="Emergency Trip">Emergency Repositioning / Evacuation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Fleet Vehicle *</label>
              <select
                value={vehicleId}
                onChange={e => setVehicleId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white"
              >
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.vehicle_number} ({v.registration_number}) - {v.status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Driver *</label>
              <select
                value={driverId}
                onChange={e => setDriverId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white"
              >
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.driver_name} ({d.license_number})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Conductor / Attendant</label>
              <select
                value={conductorId}
                onChange={e => setConductorId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white"
              >
                <option value="">-- None --</option>
                {conductors.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Trip Date *</label>
              <input
                type="date"
                value={tripDate}
                onChange={e => setTripDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Scheduled Departure</label>
              <input
                type="text"
                value={scheduledStartTime}
                onChange={e => setScheduledStartTime(e.target.value)}
                placeholder="e.g. 06:50 AM"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Scheduled Arrival</label>
              <input
                type="text"
                value={scheduledEndTime}
                onChange={e => setScheduledEndTime(e.target.value)}
                placeholder="e.g. 07:45 AM"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 font-mono"
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
              className="px-5 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Dispatching...' : 'Dispatch Trip'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
