import React, { useState, useEffect } from 'react';
import { ChildStudent } from './PortalCommon.js';
import { useToast } from '../common/Toast.js';
import {
  Calendar,
  Clock,
  UserCheck,
  Building,
  Plus,
  X,
  Send,
  AlertTriangle,
  CheckCircle,
  Ban
} from 'lucide-react';

interface PortalAppointmentsViewProps {
  child: ChildStudent;
}

export const PortalAppointmentsView: React.FC<PortalAppointmentsViewProps> = ({ child }) => {
  const { showToast } = useToast();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking form state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [department, setDepartment] = useState('PRINCIPAL');
  const [appointmentDate, setAppointmentDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState('10:00 AM');
  const [purpose, setPurpose] = useState('Discussion regarding student academic progress and Olympiad coaching');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, [child.id]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/portal/appointments?schoolId=${child.school_id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load appointments');
      setAppointments(data.appointments || []);
    } catch (err: any) {
      showToast(err.message || 'Error loading appointments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentDate || !startTime || !purpose.trim()) {
      showToast('Please specify date, time slot, and purpose', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/portal/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: child.school_id,
          department,
          appointmentDate,
          startTime,
          purpose: purpose.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to book slot');

      showToast(data.message || 'Appointment requested successfully!', 'success');
      setIsBookModalOpen(false);
      fetchAppointments();
    } catch (err: any) {
      showToast(err.message || 'Appointment booking failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <Calendar className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Campus Appointments</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Parent-School Appointment System</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pre-book official consultation slots with the Principal, Class Teachers, Accounts, or Student Counselors.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsBookModalOpen(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Book Appointment Slot</span>
        </button>
      </div>

      {/* Booked Appointments Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Your Appointment History & Status</h3>
            <p className="text-[11px] text-slate-500">Track confirmation and designated campus meeting venues</p>
          </div>
          <span className="text-xs font-bold text-slate-500">{appointments.length} Slots</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading appointments...</div>
        ) : appointments.length === 0 ? (
          <p className="text-xs text-slate-400 p-8 text-center bg-slate-50 rounded-xl">
            No active or past school appointments. Click "Book Appointment Slot" to schedule a meeting.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Officer / Department</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{apt.staff_name}</div>
                      <div className="text-[11px] text-slate-500">{apt.staff_role || 'Designated Officer'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">
                        {new Date(apt.appointment_date).toLocaleDateString()}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{apt.start_time} (20 mins)</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-xs">
                      {apt.purpose}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          apt.status === 'CONFIRMED' || apt.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : apt.status === 'CANCELLED' || apt.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {apt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* BOOK APPOINTMENT MODAL */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Book Campus Appointment</h3>
                <p className="text-xs text-slate-400">Institutional consultation scheduling</p>
              </div>
              <button type="button" onClick={() => setIsBookModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department / Officer *
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="PRINCIPAL">Principal's Office (Dr. Sunita Mishra)</option>
                  <option value="CLASS_TEACHER">Class Teacher (Priya Pandey)</option>
                  <option value="ACCOUNTS">Accounts & Finance Office</option>
                  <option value="ADMINISTRATION">Administrative Superintendent</option>
                  <option value="COUNSELOR">Student Academic Counselor</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Appointment Date *
                  </label>
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Time Slot *
                  </label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-mono"
                  >
                    <option value="09:30 AM">09:30 AM - 09:50 AM</option>
                    <option value="10:00 AM">10:00 AM - 10:20 AM</option>
                    <option value="11:30 AM">11:30 AM - 11:50 AM</option>
                    <option value="02:00 PM">02:00 PM - 02:20 PM</option>
                    <option value="03:30 PM">03:30 PM - 03:50 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Purpose of Meeting *
                </label>
                <textarea
                  rows={3}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Detail the topics you wish to discuss..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500">
                Double bookings are strictly prohibited. Confirmation will be dispatched to your portal notification feed once reviewed.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Booking...' : 'Confirm Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
