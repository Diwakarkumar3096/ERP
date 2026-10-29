import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import type { Employee, Department, Designation } from '../../types/erp.js';
import { X, Edit3, CheckCircle2, AlertCircle } from 'lucide-react';

interface EditEmployeeModalProps {
  employee: Employee;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  employee,
  onClose,
  onSuccess
}) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);

  const [firstName, setFirstName] = useState(employee.first_name);
  const [middleName, setMiddleName] = useState(employee.middle_name || '');
  const [lastName, setLastName] = useState(employee.last_name);
  const [gender, setGender] = useState(employee.gender);
  const [dateOfBirth, setDateOfBirth] = useState(employee.date_of_birth ? new Date(employee.date_of_birth).toISOString().split('T')[0] : '');
  const [bloodGroup, setBloodGroup] = useState(employee.blood_group || 'B+');
  const [profilePhoto, setProfilePhoto] = useState(employee.profile_photo || '');

  const [mobileNumber, setMobileNumber] = useState(employee.mobile_number);
  const [alternateMobile, setAlternateMobile] = useState(employee.alternate_mobile || '');
  const [email, setEmail] = useState(employee.email || '');
  const [officialEmail, setOfficialEmail] = useState(employee.official_email || '');
  const [address, setAddress] = useState(employee.address || '');
  const [city, setCity] = useState(employee.city || '');
  const [district, setDistrict] = useState(employee.district || '');
  const [state, setState] = useState(employee.state || '');
  const [pinCode, setPinCode] = useState(employee.pin_code || '');

  const [emergencyName, setEmergencyName] = useState(employee.emergency_contact_name || '');
  const [emergencyPhone, setEmergencyPhone] = useState(employee.emergency_contact_number || '');
  const [emergencyRelation, setEmergencyRelation] = useState(employee.emergency_contact_relationship || '');

  const [departmentId, setDepartmentId] = useState(employee.department_id || '');
  const [designationId, setDesignationId] = useState(employee.designation_id || '');
  const [dateOfJoining, setDateOfJoining] = useState(employee.date_of_joining ? new Date(employee.date_of_joining).toISOString().split('T')[0] : '');
  const [qualification, setQualification] = useState(employee.qualification || '');
  const [specialization, setSpecialization] = useState(employee.specialization || '');
  const [experienceYears, setExperienceYears] = useState(employee.experience_years ? employee.experience_years.toString() : '0');
  const [previousEmployer, setPreviousEmployer] = useState(employee.previous_employer || '');
  const [remarks, setRemarks] = useState(employee.remarks || '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.employees.getDepartments(employee.school_id),
      api.employees.getDesignations(employee.school_id)
    ])
      .then(([deptRes, desigRes]) => {
        setDepartments(deptRes.departments || []);
        setDesignations(desigRes.designations || []);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [employee.school_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      await api.employees.update(employee.id, {
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        profile_photo: profilePhoto || null,
        gender,
        date_of_birth: dateOfBirth,
        mobile_number: mobileNumber,
        alternate_mobile: alternateMobile,
        email,
        official_email: officialEmail,
        address,
        city,
        district,
        state,
        pin_code: pinCode,
        emergency_contact_name: emergencyName,
        emergency_contact_number: emergencyPhone,
        emergency_contact_relationship: emergencyRelation,
        department_id: departmentId || null,
        designation_id: designationId || null,
        date_of_joining: dateOfJoining,
        qualification,
        specialization,
        experience_years: parseFloat(experienceYears || '0'),
        previous_employer: previousEmployer,
        blood_group: bloodGroup,
        remarks
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Edit Employee Profile</h3>
              <p className="text-xs text-slate-500 font-medium">ID: {employee.employee_id_number} · {employee.school_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Middle Name</label>
              <input
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth *</label>
              <input
                type="date"
                required
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
              <input
                type="text"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Profile Photo URL</label>
              <input
                type="text"
                value={profilePhoto}
                onChange={(e) => setProfilePhoto(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
              <input
                type="tel"
                required
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Personal Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email</label>
              <input
                type="email"
                value={officialEmail}
                onChange={(e) => setOfficialEmail(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg"
              >
                <option value="">-- Unassigned --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
              <select
                value={designationId}
                onChange={(e) => setDesignationId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg"
              >
                <option value="">-- Unassigned --</option>
                {designations.map((des) => (
                  <option key={des.id} value={des.id}>{des.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Joining Date *</label>
              <input
                type="date"
                required
                value={dateOfJoining}
                onChange={(e) => setDateOfJoining(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Highest Qualification</label>
              <input
                type="text"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Specialization</label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Experience (Years)</label>
              <input
                type="number"
                step="0.5"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg resize-none"
            />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Updates'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
