import React, { useState, useEffect } from 'react';
import { ChildStudent } from './PortalCommon.js';
import { useToast } from '../common/Toast.js';
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  Plus,
  X,
  AlertCircle
} from 'lucide-react';

interface PortalEventsViewProps {
  child: ChildStudent;
}

export const PortalEventsView: React.FC<PortalEventsViewProps> = ({ child }) => {
  const { showToast } = useToast();

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [child.id]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/portal/events?schoolId=${child.school_id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch events');
      setEvents(data.events || []);
    } catch (err: any) {
      showToast(err.message || 'Error loading events', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (eventId: string, title: string) => {
    try {
      setRegisteringId(eventId);
      const res = await fetch(`/api/portal/events/${eventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: child.id,
          participantName: `${child.first_name} ${child.last_name}`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      showToast(`Registered for "${title}" successfully!`, 'success');
      fetchEvents();
    } catch (err: any) {
      showToast(err.message || 'Error registering for event', 'error');
    } finally {
      setRegisteringId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <CalendarDays className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Campus Activities</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">School Calendar & Event Registration</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Participate in annual sports meets, parent-teacher conferences, science exhibitions & workshops.
          </p>
        </div>

        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
          {events.length} Upcoming Events
        </span>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading events calendar...</div>
      ) : events.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">No Upcoming Events Scheduled</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Campus co-curricular competitions and conferences will appear here once announced by school administration.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {ev.event_type || 'CAMPUS_EVENT'}
                  </span>
                  {ev.isUserRegistered && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      Registered
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-900 text-sm">{ev.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{ev.description || 'Institutional school event.'}</p>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {new Date(ev.start_datetime).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </span>
                  </div>

                  {ev.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{ev.location}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {ev.registration_count || 0} {ev.max_participants ? `/ ${ev.max_participants}` : ''} participants
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={ev.isUserRegistered || registeringId === ev.id}
                  onClick={() => handleRegister(ev.id, ev.title)}
                  className={`w-full py-2 px-3 text-xs font-bold rounded-xl shadow-sm transition-colors ${
                    ev.isUserRegistered
                      ? 'bg-slate-100 text-slate-500 cursor-default'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {ev.isUserRegistered
                    ? 'Registration Confirmed'
                    : registeringId === ev.id
                    ? 'Registering...'
                    : 'Register for Event'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
