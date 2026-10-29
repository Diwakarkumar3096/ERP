import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import type { School, AcademicSession, ClassItem, SectionItem, AdmissionType } from '../../types/erp.js';
import {
  X,
  User,
  GraduationCap,
  Calendar,
  Layers,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface CreateApplicationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateApplicationModal: React.FC<CreateApplicationModalProps> = ({
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(user?.schoolId || '');
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    admission_type: 'NEW' as AdmissionType,
    applying_class_id: '',
    applying_section_id: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'MALE',
    blood_group: 'B+',
    nationality: 'Indian',
    category: 'General',
    aadhaar_number: '',
    religion: 'Hindu',
    address: '',
    city: 'Deoghar',
    district: 'Deoghar',
    state: 'Jharkhand',
    pin_code: '814112',
    previous_school: '',
    previous_class: '',
    father_name: '',
    mother_name: '',
    guardian_name: '',
    parent_mobile: '',
    alternate_mobile: '',
    parent_email: '',
    emergency_contact: '',
    source_of_application: 'Walk-in / Direct',
    application_status: 'SUBMITTED',
    remarks: ''
  });

  // Load schools
  useEffect(() => {
    async function loadSchools() {
      try {
        const res = await api.schools.list();
        if (res.schools && res.schools.length > 0) {
          setSchools(res.schools);
          if (!selectedSchoolId) {
            setSelectedSchoolId(res.schools[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load schools', err);
      }
    }
    loadSchools();
  }, []);

  // When school changes, load sessions & classes
  useEffect(() => {
    if (!selectedSchoolId) return;

    async function loadMetadata() {
      try {
        const [sessRes, classRes] = await Promise.all([
          api.sessions.list(selectedSchoolId),
          api.classes.list(selectedSchoolId)
        ]);

        setSessions(sessRes.sessions || []);
        if (sessRes.sessions && sessRes.sessions.length > 0) {
          const current = sessRes.sessions.find(s => s.status === 'upcoming' || s.is_current) || sessRes.sessions[0];
          setSelectedSessionId(current.id);
        }

        setClasses(classRes.classes || []);
        if (classRes.classes && classRes.classes.length > 0) {
          setFormData(prev => ({ ...prev, applying_class_id: classRes.classes[0].id }));
        }
      } catch (err) {
        console.error('Failed to load school metadata', err);
      }
    }

    loadMetadata();
  }, [selectedSchoolId]);

  // When applying class changes, load sections
  useEffect(() => {
    if (!formData.applying_class_id) {
      setSections([]);
      return;
    }

    async function loadSections() {
      try {
        const res = await api.sections.list(formData.applying_class_id, selectedSchoolId);
        setSections(res.sections || []);
      } catch (err) {
        console.error('Failed to load sections', err);
      }
    }

    loadSections();
  }, [formData.applying_class_id, selectedSchoolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolId || !selectedSessionId || !formData.applying_class_id) {
      setError('School, Academic Session, and Class are required');
      return;
    }
    if (!formData.first_name || !formData.last_name || !formData.date_of_birth) {
      setError('Candidate First Name, Last Name, and Date of Birth are required');
      return;
    }
    if (!formData.parent_mobile) {
      setError('Primary Parent Mobile Number is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        school_id: selectedSchoolId,
        session_id: selectedSessionId,
        ...formData,
        applying_section_id: formData.applying_section_id || null
      };

      await api.admissions.create(payload);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to register admission application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden animate-fade-in">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                New Admission Registration
              </h3>
              <p className="text-xs text-slate-400">
                Staff front-office entry for walk-in or offline candidate dossiers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
          {/* Section 1: Institutional Target */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>1. Institutional Allocation</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {user?.roleName === 'super_admin' && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">School Campus *</label>
                  <select
                    value={selectedSchoolId}
                    onChange={e => setSelectedSchoolId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  >
                    {schools.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Academic Session *</label>
                <select
                  value={selectedSessionId}
                  onChange={e => setSelectedSessionId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.name} {s.is_current ? '(Current)' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Applying Grade / Class *</label>
                <select
                  value={formData.applying_class_id}
                  onChange={e => setFormData({ ...formData, applying_class_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  required
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Admission Type</label>
                <select
                  value={formData.admission_type}
                  onChange={e => setFormData({ ...formData, admission_type: e.target.value as AdmissionType })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                >
                  <option value="NEW">New Admission</option>
                  <option value="TRANSFER">Transfer Admission</option>
                  <option value="READMISSION">Re-admission</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Student Demographics */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>2. Candidate Personal Information</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">First Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Aarav"
                  value={formData.first_name}
                  onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Middle Name</label>
                <input
                  type="text"
                  placeholder="Optional"
                  value={formData.middle_name}
                  onChange={e => setFormData({ ...formData, middle_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Last Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Sharma"
                  value={formData.last_name}
                  onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Gender *</label>
                <select
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Blood Group</label>
                <select
                  value={formData.blood_group}
                  onChange={e => setFormData({ ...formData, blood_group: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                >
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                  <option value="EWS">EWS</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nationality</label>
                <input
                  type="text"
                  value={formData.nationality}
                  onChange={e => setFormData({ ...formData, nationality: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Aadhaar Number</label>
                <input
                  type="text"
                  placeholder="xxxx xxxx xxxx"
                  value={formData.aadhaar_number}
                  onChange={e => setFormData({ ...formData, aadhaar_number: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Parents & Contacts */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-indigo-400" />
              <span>3. Parent & Guardian Contacts</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Father's Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Sunil Sharma"
                  value={formData.father_name}
                  onChange={e => setFormData({ ...formData, father_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Mother's Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sunita Sharma"
                  value={formData.mother_name}
                  onChange={e => setFormData({ ...formData, mother_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Primary Mobile *</label>
                <input
                  type="tel"
                  placeholder="+91 98351 11001"
                  value={formData.parent_mobile}
                  onChange={e => setFormData({ ...formData, parent_mobile: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Alternate Phone</label>
                <input
                  type="tel"
                  placeholder="Optional"
                  value={formData.alternate_mobile}
                  onChange={e => setFormData({ ...formData, alternate_mobile: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Parent Email</label>
                <input
                  type="email"
                  placeholder="parent@example.com"
                  value={formData.parent_email}
                  onChange={e => setFormData({ ...formData, parent_email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Emergency Contact</label>
                <input
                  type="text"
                  placeholder="e.g. Relative / Neighbor"
                  value={formData.emergency_contact}
                  onChange={e => setFormData({ ...formData, emergency_contact: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Address */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              <span>4. Residential Address</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-300 mb-1">Street Address *</label>
                <input
                  type="text"
                  placeholder="House/Flat No, Area, Landmark"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">City *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">State *</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">District</label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={e => setFormData({ ...formData, district: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">PIN Code *</label>
                <input
                  type="text"
                  value={formData.pin_code}
                  onChange={e => setFormData({ ...formData, pin_code: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 5: Previous School & Notes */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
              <span>5. Previous Academic Background</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-300 mb-1">Previous School Name</label>
                <input
                  type="text"
                  placeholder="e.g. Modern Public School"
                  value={formData.previous_school}
                  onChange={e => setFormData({ ...formData, previous_school: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Previous Grade Passed</label>
                <input
                  type="text"
                  placeholder="e.g. Class 5"
                  value={formData.previous_class}
                  onChange={e => setFormData({ ...formData, previous_class: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block font-semibold text-slate-300 mb-1">Admission Desk Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Direct walk-in application submitted at front office"
                  value={formData.remarks}
                  onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                />
              </div>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
            >
              {loading ? (
                <span>Registering Application...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Register Application</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
