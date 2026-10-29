import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type {
  School,
  ClassItem,
  SectionItem,
  Subject,
  Employee,
  ClassroomRoom,
  TimetablePeriod,
  TimetableConflict
} from '../../types/erp.js';
import {
  X,
  AlertTriangle,
  Clock,
  Building2,
  User,
  BookOpen,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

interface TimetableSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  timetableId: string;
  schoolId: string;
  classId: string;
  sectionId?: string;
  preselectedDay?: string;
  preselectedPeriodId?: string;
  classes: ClassItem[];
  subjects: Subject[];
  teachers: Employee[];
  rooms: ClassroomRoom[];
  periods: TimetablePeriod[];
}

export const TimetableSlotModal: React.FC<TimetableSlotModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  timetableId,
  schoolId,
  classId,
  sectionId,
  preselectedDay = 'Monday',
  preselectedPeriodId,
  subjects,
  teachers,
  rooms,
  periods
}) => {
  const { showToast } = useToast();
  const [dayOfWeek, setDayOfWeek] = useState(preselectedDay);
  const [periodId, setPeriodId] = useState(preselectedPeriodId || periods[0]?.id || '');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [teacherId, setTeacherId] = useState(teachers[0]?.id || '');
  const [roomId, setRoomId] = useState<string>('');
  const [allowOverride, setAllowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);
  const [conflicts, setConflicts] = useState<TimetableConflict[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (preselectedDay) setDayOfWeek(preselectedDay);
    if (preselectedPeriodId) setPeriodId(preselectedPeriodId);
    else if (periods.length > 0 && !periodId) setPeriodId(periods[0].id);
    if (subjects.length > 0 && !subjectId) setSubjectId(subjects[0].id);
    if (teachers.length > 0 && !teacherId) setTeacherId(teachers[0].id);
    if (rooms.length > 0 && !roomId) setRoomId(rooms[0].id);
  }, [preselectedDay, preselectedPeriodId, periods, subjects, teachers, rooms]);

  // Check conflicts in real-time when assignment slot parameters change
  useEffect(() => {
    if (!dayOfWeek || !periodId || !teacherId || !classId) return;

    let isCancelled = false;
    setIsCheckingConflict(true);

    api.classroom
      .checkConflict({
        schoolId,
        dayOfWeek,
        periodId,
        teacherId,
        classId,
        sectionId,
        roomId: roomId || undefined
      })
      .then((res) => {
        if (!isCancelled) {
          setConflicts(res.conflicts || []);
          if (res.conflicts.length === 0) {
            setAllowOverride(false);
            setOverrideReason('');
          }
        }
      })
      .catch((err) => {
        console.warn('[CONFLICT CHECK FAILED]', err);
      })
      .finally(() => {
        if (!isCancelled) setIsCheckingConflict(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [schoolId, dayOfWeek, periodId, teacherId, classId, sectionId, roomId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (conflicts.length > 0 && !allowOverride) {
      showToast('Timetable conflict detected. Please resolve conflict or provide authorized override.', 'error');
      return;
    }

    if (conflicts.length > 0 && allowOverride && !overrideReason.trim()) {
      showToast('Please state a valid reason for overriding the schedule conflict.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.classroom.createEntry({
        timetableId,
        dayOfWeek,
        periodId,
        subjectId,
        teacherId,
        roomId: roomId || undefined,
        allowOverride,
        overrideReason: allowOverride ? overrideReason.trim() : undefined
      });

      showToast('Timetable slot scheduled successfully!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to save timetable slot.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Assign Timetable Period Slot</h3>
              <p className="text-xs text-slate-500">Configure subject, teacher, and classroom venue</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Weekday *</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                required
              >
                {days.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Period Slot *</label>
              <select
                value={periodId}
                onChange={(e) => setPeriodId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                required
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.start_time} - {p.end_time})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                required
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Teacher *</label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                required
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.first_name} {t.last_name} ({t.employee_id_number || 'Teacher'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Room / Venue (Optional)</label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">No designated room (Class default)</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} · Room {r.room_number} ({r.room_type})
                </option>
              ))}
            </select>
          </div>

          {/* Conflict Detection Banner */}
          {conflicts.length > 0 && (
            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="font-bold">Schedule Conflict Detected:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-rose-700">
                    {conflicts.map((c, i) => (
                      <li key={i}>{c.message}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-rose-200/60 flex items-start gap-2">
                <input
                  type="checkbox"
                  id="overrideConflict"
                  checked={allowOverride}
                  onChange={(e) => setAllowOverride(e.target.checked)}
                  className="mt-0.5 rounded border-rose-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-xs">
                  <label htmlFor="overrideConflict" className="font-semibold text-rose-900 cursor-pointer">
                    Authorize Administrator Conflict Override
                  </label>
                  <p className="text-[10px] text-rose-600">
                    Will be audited with reason, timestamp, and administrator credentials.
                  </p>
                </div>
              </div>

              {allowOverride && (
                <div className="pt-1">
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Enter reason for overriding conflict (e.g. Combined lecture, Co-teaching)..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800"
                    required
                  />
                </div>
              )}
            </div>
          )}

          {conflicts.length === 0 && !isCheckingConflict && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>No schedule conflicts detected for teacher, class, or room venue.</span>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (conflicts.length > 0 && !allowOverride)}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
            >
              {submitting ? 'Saving Slot...' : 'Schedule Period Slot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
