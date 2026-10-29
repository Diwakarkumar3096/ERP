import React, { useState, useEffect } from 'react';
import { X, UserPlus, Check, AlertCircle, ShieldAlert } from 'lucide-react';
import { api } from '../../services/api.js';
import type { TransportRoute, TransportRouteStop, Student } from '../../types/erp.js';

interface AssignStudentModalProps {
  schoolId: string;
  sessionId: string;
  routes: TransportRoute[];
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignStudentModal: React.FC<AssignStudentModalProps> = ({
  schoolId,
  sessionId,
  routes,
  onClose,
  onSuccess
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [routeId, setRouteId] = useState(routes[0]?.id || '');
  const [stops, setStops] = useState<TransportRouteStop[]>([]);
  const [pickupStopId, setPickupStopId] = useState('');
  const [dropStopId, setDropStopId] = useState('');
  const [transportType, setTransportType] = useState<'Pickup + Drop' | 'Pickup Only' | 'Drop Only'>('Pickup + Drop');
  const [monthlyFare, setMonthlyFare] = useState('1200');
  const [emergencyContactPerson, setEmergencyContactPerson] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [authorizedPickupPerson, setAuthorizedPickupPerson] = useState('');
  const [authorizedPickupPhone, setAuthorizedPickupPhone] = useState('');
  const [medicalAlertNotes, setMedicalAlertNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [fetchingStudents, setFetchingStudents] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);
  const [capacityWarning, setCapacityWarning] = useState<string | null>(null);

  // Load students
  useEffect(() => {
    api.students.list({ schoolId, limit: 100 })
      .then(res => {
        setStudents(res.students || []);
        if (res.students?.length > 0) {
          setStudentId(res.students[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setFetchingStudents(false));
  }, [schoolId]);

  // Load stops whenever route changes
  useEffect(() => {
    if (!routeId) return;
    api.transport.getRouteStops(routeId, schoolId)
      .then(res => {
        const sList = res.stops || [];
        setStops(sList);
        if (sList.length > 0) {
          setPickupStopId(sList[0].id);
          setDropStopId(sList[0].id);
          setMonthlyFare(sList[0].fare_amount?.toString() || '1200');
        }
      })
      .catch(console.error);
  }, [routeId, schoolId]);

  // Update fare when pickup stop changes
  const handlePickupStopChange = (stopId: string) => {
    setPickupStopId(stopId);
    const stop = stops.find(s => s.id === stopId);
    if (stop && stop.fare_amount) {
      setMonthlyFare(stop.fare_amount.toString());
    }
  };

  const handleSubmit = async (e?: React.FormEvent, allowOverride = false) => {
    if (e) e.preventDefault();
    if (!studentId || !routeId || !pickupStopId || !dropStopId) {
      setError('Student, route, pickup stop, and drop stop are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setCapacityWarning(null);

      await api.transport.createEnrollment({
        schoolId,
        sessionId,
        studentId,
        routeId,
        pickupStopId,
        dropStopId,
        transportType,
        monthlyFare: parseFloat(monthlyFare) || 1200,
        emergencyContactPerson: emergencyContactPerson.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
        authorizedPickupPerson: authorizedPickupPerson.trim(),
        authorizedPickupPhone: authorizedPickupPhone.trim(),
        medicalAlertNotes: medicalAlertNotes.trim(),
        allowCapacityOverride: allowOverride
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.status === 400 && err.message?.includes('capacity limit reached')) {
        setShowOverrideConfirm(true);
        setCapacityWarning(err.message);
      } else {
        setError(err.message || 'Failed to enroll student in transport');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-hidden border border-slate-100">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-700 flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Enroll Student in Transport</h3>
              <p className="text-xs text-slate-500">Assign student to route, pickup & drop stops, and transport fee</p>
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

        {showOverrideConfirm && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-amber-700" />
              <span>Vehicle Capacity Exceeded Warning</span>
            </div>
            <p className="text-xs text-amber-800">{capacityWarning}</p>
            <p className="text-xs font-semibold text-amber-950">
              Do you want to proceed with an Administrator Capacity Override? (This action is audit logged).
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleSubmit(undefined, true)}
                className="px-3 py-1.5 text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white rounded-lg shadow-sm"
              >
                Confirm Override & Enroll
              </button>
              <button
                type="button"
                onClick={() => setShowOverrideConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium bg-amber-200 text-amber-900 hover:bg-amber-300 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Student *</label>
            {fetchingStudents ? (
              <div className="text-xs text-slate-500 py-2">Loading students directory...</div>
            ) : (
              <select
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name} ({s.admission_number}) - Class {s.class_name || ''} {s.section_name || ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bus Route *</label>
              <select
                value={routeId}
                onChange={e => setRouteId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white font-medium"
              >
                {routes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.code} - {r.name} ({r.vehicle_number || 'No Bus'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Transport Service Type</label>
              <select
                value={transportType}
                onChange={e => setTransportType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
              >
                <option value="Pickup + Drop">Both (Morning Pickup + Afternoon Drop)</option>
                <option value="Pickup Only">Morning Pickup Only</option>
                <option value="Drop Only">Afternoon Drop Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Morning Pickup Stop *</label>
              <select
                value={pickupStopId}
                onChange={e => handlePickupStopChange(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
              >
                {stops.map(st => (
                  <option key={st.id} value={st.id}>
                    #{st.sequence_order} {st.stop_name} ({st.pickup_time}) - ₹{st.fare_amount}/mo
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Afternoon Drop Stop *</label>
              <select
                value={dropStopId}
                onChange={e => setDropStopId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
              >
                {stops.map(st => (
                  <option key={st.id} value={st.id}>
                    #{st.sequence_order} {st.stop_name} ({st.drop_time})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Transport Fee (₹) *</label>
              <input
                type="number"
                min="0"
                step="50"
                value={monthlyFare}
                onChange={e => setMonthlyFare(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-semibold text-teal-900"
              />
              <p className="text-[11px] text-slate-500 mt-1">Integrates with Phase 6 Accounts & Fees (Category: TRN)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Medical Alert / Motion Sickness</label>
              <input
                type="text"
                value={medicalAlertNotes}
                onChange={e => setMedicalAlertNotes(e.target.value)}
                placeholder="e.g. Inhaler required / front seat preference"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Safety & Authorized Receiver Contacts</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Emergency Contact Person</label>
                <input
                  type="text"
                  value={emergencyContactPerson}
                  onChange={e => setEmergencyContactPerson(e.target.value)}
                  placeholder="Parent / Guardian name"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Emergency Phone Number</label>
                <input
                  type="text"
                  value={emergencyContactPhone}
                  onChange={e => setEmergencyContactPhone(e.target.value)}
                  placeholder="+91 98350 XXXXX"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Authorized Person to Receive at Drop</label>
                <input
                  type="text"
                  value={authorizedPickupPerson}
                  onChange={e => setAuthorizedPickupPerson(e.target.value)}
                  placeholder="Mother / Grandfather name"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Authorized Receiver Phone</label>
                <input
                  type="text"
                  value={authorizedPickupPhone}
                  onChange={e => setAuthorizedPickupPhone(e.target.value)}
                  placeholder="+91 98350 XXXXX"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
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
              disabled={loading || showOverrideConfirm}
              className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Enrolling...' : 'Enroll in Transport'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
