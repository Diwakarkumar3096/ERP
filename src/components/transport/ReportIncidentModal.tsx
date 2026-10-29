import React, { useState } from 'react';
import { X, AlertTriangle, Check, AlertCircle } from 'lucide-react';
import { api } from '../../services/api.js';
import type { Vehicle, TransportRoute, TransportDriver } from '../../types/erp.js';

interface ReportIncidentModalProps {
  schoolId: string;
  vehicles: Vehicle[];
  routes: TransportRoute[];
  drivers: TransportDriver[];
  onClose: () => void;
  onSuccess: () => void;
}

export const ReportIncidentModal: React.FC<ReportIncidentModalProps> = ({
  schoolId,
  vehicles,
  routes,
  drivers,
  onClose,
  onSuccess
}) => {
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [incidentTime, setIncidentTime] = useState(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
  const [incidentType, setIncidentType] = useState('Route Delay');
  const [severity, setSeverity] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [vehicleId, setVehicleId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [location, setLocation] = useState('');
  const [studentsInvolved, setStudentsInvolved] = useState('');
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [reportedBy, setReportedBy] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentDate || !incidentType || !description) {
      setError('Date, incident type, and description are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await api.transport.createIncident({
        schoolId,
        incidentDate,
        incidentTime,
        incidentType,
        severity,
        vehicleId: vehicleId || null,
        routeId: routeId || null,
        driverId: driverId || null,
        location: location.trim(),
        studentsInvolved: studentsInvolved.trim(),
        description: description.trim(),
        actionTaken: actionTaken.trim(),
        reportedBy: reportedBy.trim()
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to report incident');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-hidden border border-slate-100">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Report Transport Incident / Delay</h3>
              <p className="text-xs text-slate-500">Record breakdown, delay, behavior, or emergency event</p>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Incident Type *</label>
              <select
                value={incidentType}
                onChange={e => setIncidentType(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white font-medium"
              >
                <option value="Route Delay">Route Traffic Delay / Diversion</option>
                <option value="Vehicle Breakdown">Vehicle Breakdown / Puncture</option>
                <option value="Accident">Minor Accident / Collision</option>
                <option value="Student Injury">Student Medical / Minor Injury</option>
                <option value="Student Behaviour">Disciplinary / Student Misbehaviour</option>
                <option value="Missing Student">Student Missing from Scheduled Stop</option>
                <option value="Driver Issue">Driver / Crew Operational Issue</option>
                <option value="Other">Other Safety Incident</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Severity Level *</label>
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value as any)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white font-semibold"
              >
                <option value="Low">Low (Informational / minor delay)</option>
                <option value="Medium">Medium (Attention required)</option>
                <option value="High">High (Immediate action taken)</option>
                <option value="Critical">Critical (Emergency protocol)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Incident Date *</label>
              <input
                type="date"
                value={incidentDate}
                onChange={e => setIncidentDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Incident Time</label>
              <input
                type="text"
                value={incidentTime}
                onChange={e => setIncidentTime(e.target.value)}
                placeholder="e.g. 07:25 AM"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle Involved</label>
              <select
                value={vehicleId}
                onChange={e => setVehicleId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
              >
                <option value="">-- None / General --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.vehicle_number} ({v.registration_number})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Route Involved</label>
              <select
                value={routeId}
                onChange={e => setRouteId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
              >
                <option value="">-- None / General --</option>
                {routes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.code} - {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Location of Occurrence</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Near Cantonment Flyover Crossing, Stanley Road"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Incident Description *</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="State what occurred, student status, and cause..."
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Action Taken / Resolution</label>
            <textarea
              rows={2}
              value={actionTaken}
              onChange={e => setActionTaken(e.target.value)}
              placeholder="e.g. Replacement bus dispatched, parents notified via broadcast, first-aid administered..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
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
              className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Submitting...' : 'Log Incident'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
