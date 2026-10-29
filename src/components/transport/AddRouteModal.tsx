import React, { useState } from 'react';
import { X, Navigation, Check, AlertCircle } from 'lucide-react';
import { api } from '../../services/api.js';
import type { TransportRoute, Vehicle, TransportDriver, Employee } from '../../types/erp.js';

interface AddRouteModalProps {
  schoolId: string;
  sessionId?: string;
  vehicles: Vehicle[];
  drivers: TransportDriver[];
  conductors: Employee[];
  initialRoute?: TransportRoute | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddRouteModal: React.FC<AddRouteModalProps> = ({
  schoolId,
  sessionId,
  vehicles,
  drivers,
  conductors,
  initialRoute,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    name: initialRoute?.name || '',
    code: initialRoute?.code || '',
    startPoint: initialRoute?.start_point || '',
    endPoint: initialRoute?.end_point || '',
    estimatedDistanceKm: initialRoute?.estimated_distance_km?.toString() || '15',
    estimatedDurationMins: initialRoute?.estimated_duration_mins?.toString() || '45',
    assignedVehicleId: initialRoute?.assigned_vehicle_id || '',
    assignedDriverId: initialRoute?.assigned_driver_id || '',
    assignedConductorId: initialRoute?.assigned_conductor_id || '',
    status: initialRoute?.status || 'ACTIVE',
    description: initialRoute?.description || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code || !formData.startPoint || !formData.endPoint) {
      setError('Route name, code, start point, and end point are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        ...formData,
        schoolId,
        sessionId,
        estimatedDistanceKm: parseFloat(formData.estimatedDistanceKm) || 0,
        estimatedDurationMins: parseInt(formData.estimatedDurationMins, 10) || 45,
        assignedVehicleId: formData.assignedVehicleId || null,
        assignedDriverId: formData.assignedDriverId || null,
        assignedConductorId: formData.assignedConductorId || null
      };

      if (initialRoute) {
        await api.transport.updateRoute(initialRoute.id, payload);
      } else {
        await api.transport.createRoute(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save route');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-hidden border border-slate-100">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center font-bold">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">
                {initialRoute ? 'Edit Bus Route' : 'Create New Bus Route'}
              </h3>
              <p className="text-xs text-slate-500">Transit corridor, allocated bus, driver and stops</p>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Route Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. North City Corridor"
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Route Code *</label>
              <input
                type="text"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. RTE-NORTH"
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Starting Point *</label>
              <input
                type="text"
                value={formData.startPoint}
                onChange={e => setFormData({ ...formData, startPoint: e.target.value })}
                placeholder="e.g. Civil Lines Bus Depot"
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ending Point / Campus Gate *</label>
              <input
                type="text"
                value={formData.endPoint}
                onChange={e => setFormData({ ...formData, endPoint: e.target.value })}
                placeholder="e.g. VVPS Campus Gate 1"
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Est. Distance (km)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.estimatedDistanceKm}
                onChange={e => setFormData({ ...formData, estimatedDistanceKm: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Est. Duration (Minutes)</label>
              <input
                type="number"
                min="10"
                max="180"
                value={formData.estimatedDurationMins}
                onChange={e => setFormData({ ...formData, estimatedDurationMins: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Fleet & Crew Allocation</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Assigned Vehicle</label>
                <select
                  value={formData.assignedVehicleId}
                  onChange={e => setFormData({ ...formData, assignedVehicleId: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                >
                  <option value="">-- None --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.vehicle_number} ({v.total_capacity} seats)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Assigned Driver</label>
                <select
                  value={formData.assignedDriverId}
                  onChange={e => setFormData({ ...formData, assignedDriverId: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                >
                  <option value="">-- None --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.driver_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Conductor / Attendant</label>
                <select
                  value={formData.assignedConductorId}
                  onChange={e => setFormData({ ...formData, assignedConductorId: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                >
                  <option value="">-- None --</option>
                  {conductors.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Route Corridor Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Major arterial route connecting civil lines residential apartments, high court colonies, and cantonment quarters."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Saving...' : (initialRoute ? 'Update Route' : 'Create Route')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
