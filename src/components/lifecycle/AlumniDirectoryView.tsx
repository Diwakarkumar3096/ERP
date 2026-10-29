import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../common/Toast.js';
import {
  GraduationCap,
  Search,
  Filter,
  Plus,
  Building2,
  MapPin,
  Mail,
  Phone,
  FileText,
  Download,
  Calendar,
  UserCheck,
  Briefcase
} from 'lucide-react';

interface AlumniProfile {
  id: string;
  student_id: string;
  school_id: string;
  admission_number: string;
  student_name: string;
  leaving_date: string;
  leaving_class: string;
  leaving_session: string;
  tc_number: string;
  current_organization?: string;
  current_city?: string;
  contact_email?: string;
  contact_phone?: string;
  notes?: string;
  school_name?: string;
}

interface StudentOption {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_name?: string;
}

export const AlumniDirectoryView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [alumni, setAlumni] = useState<AlumniProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add/Convert Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [currentOrg, setCurrentOrg] = useState('');
  const [currentCity, setCurrentCity] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAlumni();
  }, [user]);

  const fetchAlumni = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/lifecycle/alumni');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch alumni');
      setAlumni(data.alumni || []);
    } catch (err: any) {
      showToast(err.message || 'Error loading alumni directory', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadEligibleStudents = async (query = '') => {
    try {
      const res = await fetch(`/api/students?limit=50&search=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok) {
        setStudents(data.students || []);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSelectedStudent(null);
    setStudentSearch('');
    setCurrentOrg('');
    setCurrentCity('');
    setContactEmail('');
    setContactPhone('');
    setNotes('');
    loadEligibleStudents();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      showToast('Please select a student', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/lifecycle/alumni/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          currentOrganization: currentOrg,
          currentCity,
          contactEmail,
          contactPhone,
          notes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add student to alumni');

      showToast('Student successfully enrolled in Alumni directory!', 'success');
      setIsModalOpen(false);
      fetchAlumni();
    } catch (err: any) {
      showToast(err.message || 'Error adding alumni', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const exportCsv = () => {
    if (alumni.length === 0) return;
    const headers = ['Name,Admission Number,Leaving Class,Session,TC Number,Organization,City,Email,Phone,Leaving Date'];
    const rows = alumni.map((a) =>
      `"${a.student_name}","${a.admission_number}","${a.leaving_class || ''}","${a.leaving_session || ''}","${a.tc_number || ''}","${a.current_organization || ''}","${a.current_city || ''}","${a.contact_email || ''}","${a.contact_phone || ''}","${a.leaving_date || ''}"`
    );
    const blob = new Blob([[...headers, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Alumni_Directory_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredAlumni = alumni.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      !searchQuery ||
      a.student_name.toLowerCase().includes(q) ||
      a.admission_number.toLowerCase().includes(q) ||
      a.tc_number?.toLowerCase().includes(q) ||
      a.current_organization?.toLowerCase().includes(q) ||
      a.current_city?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <GraduationCap className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Institution Legacy</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Alumni Directory & Network</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Preserve lifelong institutional connections, career progressions, higher studies & verified TC records.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={exportCsv}
            disabled={alumni.length === 0}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-2 border border-slate-200 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleOpenModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Enroll Alumni</span>
          </button>
        </div>
      </div>

      {/* Search & Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search alumni by name, admission #, TC #, organization, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
          />
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900">{alumni.length}</div>
            <div className="text-[11px] text-slate-500 font-medium">Total Registered Alumni</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900">
              {alumni.filter((a) => a.tc_number && a.tc_number !== 'N/A').length}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">TC Certified Graduates</div>
          </div>
        </div>
      </div>

      {/* Alumni Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading alumni network...</div>
      ) : filteredAlumni.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">No Alumni Records Found</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            When students graduate or are issued formal Transfer Certificates, their profiles can be converted to the Alumni directory.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAlumni.map((alum) => (
            <div
              key={alum.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {alum.student_name}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Admission #{alum.admission_number}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {alum.leaving_class || 'Graduated'}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs">
                  {alum.current_organization && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium truncate">{alum.current_organization}</span>
                    </div>
                  )}

                  {alum.current_city && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{alum.current_city}</span>
                    </div>
                  )}

                  {alum.contact_email && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{alum.contact_email}</span>
                    </div>
                  )}

                  {alum.contact_phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{alum.contact_phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  TC: {alum.tc_number || 'N/A'}
                </span>
                <span>
                  Left: {alum.leaving_date ? new Date(alum.leaving_date).getFullYear() : 'N/A'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ENROLL ALUMNI MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">Enroll Student to Alumni Network</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Student *
                </label>
                {selectedStudent ? (
                  <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">
                      {selectedStudent.first_name} {selectedStudent.last_name} (#{selectedStudent.admission_number})
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(null)}
                      className="text-indigo-600 font-semibold text-xs"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="Search student..."
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        loadEligibleStudents(e.target.value);
                      }}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                    />
                    <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-slate-50">
                      {students.slice(0, 6).map((stu) => (
                        <div
                          key={stu.id}
                          onClick={() => setSelectedStudent(stu)}
                          className="p-2 text-xs hover:bg-indigo-50 cursor-pointer flex justify-between"
                        >
                          <span className="font-medium text-slate-800">{stu.first_name} {stu.last_name}</span>
                          <span className="text-slate-400 font-mono text-[11px]">#{stu.admission_number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current College / University / Organization
                </label>
                <input
                  type="text"
                  placeholder="e.g. Indian Institute of Technology (IIT) Delhi / Software Engineer at TCS"
                  value={currentOrg}
                  onChange={(e) => setCurrentOrg(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current City / Country
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. New Delhi, India"
                    value={currentCity}
                    onChange={(e) => setCurrentCity(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  placeholder="alumni@domain.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
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
                  disabled={submitting || !selectedStudent}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Enrolling...' : 'Enroll to Alumni'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
