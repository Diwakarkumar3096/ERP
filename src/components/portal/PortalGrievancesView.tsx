import React, { useState, useEffect } from 'react';
import { ChildStudent } from './PortalCommon.js';
import { useToast } from '../common/Toast.js';
import {
  MessageSquareWarning,
  Send,
  Plus,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShieldAlert
} from 'lucide-react';

interface PortalGrievancesViewProps {
  child: ChildStudent;
}

export const PortalGrievancesView: React.FC<PortalGrievancesViewProps> = ({ child }) => {
  const { showToast } = useToast();

  const [grievances, setGrievances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [department, setDepartment] = useState('ACADEMIC');
  const [priority, setPriority] = useState('NORMAL');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchGrievances();
  }, [child.id]);

  const fetchGrievances = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/portal/grievances?schoolId=${child.school_id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load tickets');
      setGrievances(data.grievances || []);
    } catch (err: any) {
      showToast(err.message || 'Error loading grievance tickets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      showToast('Please provide subject and description', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/portal/grievances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department,
          subject: subject.trim(),
          description: description.trim(),
          priority
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      showToast(`Grievance ticket #${data.ticketNumber} registered successfully!`, 'success');
      setIsModalOpen(false);
      setSubject('');
      setDescription('');
      fetchGrievances();
    } catch (err: any) {
      showToast(err.message || 'Error submitting ticket', 'error');
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
            <MessageSquareWarning className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Redressal Center</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Grievance & Feedback Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit formal concerns regarding academics, transportation, fees, or student safety with confidential ticketing.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Lodge Grievance Ticket</span>
        </button>
      </div>

      {/* Tickets Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Registered Grievance History</h3>
            <p className="text-[11px] text-slate-500">Track resolution notes and assigned redressal officers</p>
          </div>
          <span className="text-xs font-bold text-slate-500">{grievances.length} Tickets</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading tickets...</div>
        ) : grievances.length === 0 ? (
          <p className="text-xs text-slate-400 p-8 text-center bg-slate-50 rounded-xl">
            No grievance tickets lodged. All feedback and concerns will be tracked here.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {grievances.map((g) => (
              <div key={g.id} className="py-4 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{g.subject}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                      #{g.ticket_number}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {g.assigned_department}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold self-start sm:self-auto ${
                      g.status === 'RESOLVED' || g.status === 'CLOSED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {g.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{g.description}</p>

                <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                  <span>Filed on: {new Date(g.created_at).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>Priority: {g.priority || 'NORMAL'}</span>
                  {g.assigned_officer_name && (
                    <>
                      <span>•</span>
                      <span>Assigned to: {g.assigned_officer_name}</span>
                    </>
                  )}
                </div>

                {g.resolution && (
                  <div className="mt-2 p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                    <strong>Official Resolution:</strong> {g.resolution}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LODGE GRIEVANCE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Lodge Grievance / Concern</h3>
                <p className="text-xs text-slate-400">Institutional review and redressal</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department *
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="ACADEMIC">Academic / Curriculum</option>
                    <option value="FEES">Fees & Billing</option>
                    <option value="TRANSPORT">Transportation & Fleet</option>
                    <option value="SAFETY">Student Safety & Disciplinary</option>
                    <option value="HOSTEL">Hostel & Boarding</option>
                    <option value="FACILITY">Campus Facilities / Hygiene</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Priority Level *
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent / Safety Concern</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Summarize the issue briefly..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Detailed Description *
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe the incident, dates, personnel or location involved..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500">
                Grievance tickets are processed with strict institutional confidentiality by the designated redressal committee.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  <span>{submitting ? 'Submitting...' : 'Register Ticket'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
