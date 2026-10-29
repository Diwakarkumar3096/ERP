import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import type { School, Department, Designation, Role } from '../../types/erp.js';
import {
  X,
  UserPlus,
  Building2,
  Briefcase,
  GraduationCap,
  KeyRound,
  FileText,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2
} from 'lucide-react';

interface CreateEmployeeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateEmployeeModal: React.FC<CreateEmployeeModalProps> = ({
  onClose,
  onSuccess
}) => {
  const { user, isSuperAdmin, activeSchool } = useAuth();

  const [schools, setSchools] = useState<School[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  // Core Form State
  const [selectedSchoolId, setSelectedSchoolId] = useState(activeSchool?.id || user?.schoolId || '');
  const [employeeIdNumber, setEmployeeIdNumber] = useState('');
  const [employeeType, setEmployeeType] = useState<'Teaching' | 'Non-Teaching'>('Teaching');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [profilePhoto, setProfilePhoto] = useState('');

  // Contact
  const [mobileNumber, setMobileNumber] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [email, setEmail] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState(activeSchool?.city || 'Deoghar');
  const [district, setDistrict] = useState('Deoghar');
  const [state, setState] = useState(activeSchool?.state || 'Jharkhand');
  const [pinCode, setPinCode] = useState('814112');

  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('Spouse');

  // Employment
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState(new Date().toISOString().split('T')[0]);
  const [employmentStatus, setEmploymentStatus] = useState<'ACTIVE' | 'ON_PROBATION'>('ACTIVE');
  const [qualification, setQualification] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [experienceYears, setExperienceYears] = useState('0');
  const [previousEmployer, setPreviousEmployer] = useState('');
  const [remarks, setRemarks] = useState('');

  // Structured Qualifications array
  const [extraQuals, setExtraQuals] = useState<{ qualification: string; specialization: string; institution: string; passing_year: string }[]>([]);

  // Optional User Account
  const [createUserAccount, setCreateUserAccount] = useState(false);
  const [userAccountUsername, setUserAccountUsername] = useState('');
  const [userAccountPassword, setUserAccountPassword] = useState('Staff@123');
  const [userAccountRoleId, setUserAccountRoleId] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const promises: Promise<any>[] = [
      api.schools.list(),
      api.roles.list()
    ];

    Promise.all(promises)
      .then(([schRes, rolesRes]) => {
        if (!mounted) return;
        setSchools(schRes.schools || []);
        setRoles(rolesRes.roles || []);

        const defaultRole = rolesRes.roles.find((r: any) => r.name === 'teacher') || rolesRes.roles[0];
        if (defaultRole) setUserAccountRoleId(defaultRole.id);

        const initSchoolId = selectedSchoolId || schRes.schools?.[0]?.id;
        if (initSchoolId) {
          setSelectedSchoolId(initSchoolId);
          fetchMetadata(initSchoolId);
        }
      })
      .catch((err) => {
        if (mounted) setError(err?.message || 'Failed to initialize form');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const fetchMetadata = async (schId: string) => {
    try {
      const [deptRes, desigRes, nextIdRes] = await Promise.all([
        api.employees.getDepartments(schId),
        api.employees.getDesignations(schId),
        api.employees.nextEmployeeId(schId)
      ]);
      setDepartments(deptRes.departments || []);
      setDesignations(desigRes.designations || []);
      setEmployeeIdNumber(nextIdRes.nextEmployeeId || '');

      if (deptRes.departments?.length > 0) setDepartmentId(deptRes.departments[0].id);
      if (desigRes.designations?.length > 0) setDesignationId(desigRes.designations[0].id);
    } catch (err: any) {
      console.error('Failed to load school metadata', err);
    }
  };

  const handleSchoolChange = (newSchId: string) => {
    setSelectedSchoolId(newSchId);
    fetchMetadata(newSchId);
  };

  const handleRefreshNextId = async () => {
    if (!selectedSchoolId) return;
    try {
      const res = await api.employees.nextEmployeeId(selectedSchoolId);
      setEmployeeIdNumber(res.nextEmployeeId);
    } catch (err) {
      console.error(err);
    }
  };

  const addQualRow = () => {
    setExtraQuals([...extraQuals, { qualification: '', specialization: '', institution: '', passing_year: '' }]);
  };

  const removeQualRow = (index: number) => {
    setExtraQuals(extraQuals.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !mobileNumber.trim() || !dateOfBirth || !dateOfJoining) {
      setError('Please complete all required fields.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const allQualifications = [];
      if (qualification) {
        allQualifications.push({
          qualification,
          specialization,
          institution: previousEmployer,
          passing_year: null
        });
      }
      extraQuals.forEach(q => {
        if (q.qualification) allQualifications.push(q);
      });

      await api.employees.create({
        school_id: selectedSchoolId,
        employee_id_number: employeeIdNumber,
        employee_type: employeeType,
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        profile_photo: profilePhoto || null,
        gender,
        date_of_birth: dateOfBirth,
        blood_group: bloodGroup,
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
        employment_status: employmentStatus,
        qualification,
        specialization,
        experience_years: parseFloat(experienceYears || '0'),
        previous_employer: previousEmployer,
        remarks,
        qualifications: allQualifications,
        create_user_account: createUserAccount,
        user_account_username: userAccountUsername || email || `emp.${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
        user_account_password: userAccountPassword,
        user_account_role_id: userAccountRoleId
      });

      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to register employee');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Onboard New Employee / Faculty</h3>
              <p className="text-xs text-slate-500 font-medium">Phase 4 staff registration and HR record</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Institutional Assignment */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              1. Institutional Assignment & Identifier
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {isSuperAdmin ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    School Campus <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedSchoolId}
                    onChange={(e) => handleSchoolChange(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">School Campus</label>
                  <input
                    type="text"
                    disabled
                    value={activeSchool?.name || user?.schoolName || 'Assigned School'}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Employee Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={employeeType}
                  onChange={(e) => setEmployeeType(e.target.value as 'Teaching' | 'Non-Teaching')}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="Teaching">Teaching Faculty</option>
                  <option value="Non-Teaching">Non-Teaching Staff</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Employee ID <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRefreshNextId}
                    title="Generate next sequential ID"
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Auto-ID
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={employeeIdNumber}
                  onChange={(e) => setEmployeeIdNumber(e.target.value)}
                  placeholder="e.g. VVP-EMP-0009"
                  className="w-full text-xs font-mono font-semibold px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Personal Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
              2. Personal Demographics
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Profile Photo URL</label>
                <input
                  type="text"
                  value={profilePhoto}
                  onChange={(e) => setProfilePhoto(e.target.value)}
                  placeholder="https://..."
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Contact & Address */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <Phone className="w-3.5 h-3.5 text-indigo-600" />
              3. Contact & Address Details
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="+91 98350 00000"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Personal Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official School Email</label>
                <input
                  type="email"
                  value={officialEmail}
                  onChange={(e) => setOfficialEmail(e.target.value)}
                  placeholder="faculty@school.edu.in"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Flat / Quarter / Street"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code</label>
                <input
                  type="text"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Emergency Contact Person</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="Name of Next of Kin / Spouse"
                  className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                />
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="Emergency Mobile"
                  className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                />
                <input
                  type="text"
                  value={emergencyRelation}
                  onChange={(e) => setEmergencyRelation(e.target.value)}
                  placeholder="Relationship (e.g. Spouse, Father)"
                  className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Employment & Role Assignment */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
              4. Department, Designation & Service Terms
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">-- Unassigned --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                <select
                  value={designationId}
                  onChange={(e) => setDesignationId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">-- Unassigned --</option>
                  {designations.map((des) => (
                    <option key={des.id} value={des.id}>
                      {des.name} ({des.employee_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Joining <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dateOfJoining}
                  onChange={(e) => setDateOfJoining(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Status</label>
                <select
                  value={employmentStatus}
                  onChange={(e) => setEmploymentStatus(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="ON_PROBATION">On Probation</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 5: Qualifications & Experience */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              5. Educational Credentials & Prior Experience
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Highest Degree</label>
                <input
                  type="text"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  placeholder="e.g. M.Sc Physics, B.Ed, MCA"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Specialization / Focus</label>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Pure Mathematics, Early Phonics"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Prior Experience (Years)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Previous School / Organization</label>
              <input
                type="text"
                value={previousEmployer}
                onChange={(e) => setPreviousEmployer(e.target.value)}
                placeholder="e.g. Delhi Public School Bokaro"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Extra qualifications rows */}
            {extraQuals.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                <input
                  type="text"
                  value={row.qualification}
                  onChange={(e) => {
                    const copy = [...extraQuals];
                    copy[idx].qualification = e.target.value;
                    setExtraQuals(copy);
                  }}
                  placeholder="Degree (e.g. B.Ed)"
                  className="w-1/4 text-xs px-2.5 py-1.5 border border-slate-200 rounded bg-white"
                />
                <input
                  type="text"
                  value={row.specialization}
                  onChange={(e) => {
                    const copy = [...extraQuals];
                    copy[idx].specialization = e.target.value;
                    setExtraQuals(copy);
                  }}
                  placeholder="Subject"
                  className="w-1/4 text-xs px-2.5 py-1.5 border border-slate-200 rounded bg-white"
                />
                <input
                  type="text"
                  value={row.institution}
                  onChange={(e) => {
                    const copy = [...extraQuals];
                    copy[idx].institution = e.target.value;
                    setExtraQuals(copy);
                  }}
                  placeholder="College / University"
                  className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded bg-white"
                />
                <button
                  type="button"
                  onClick={() => removeQualRow(idx)}
                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addQualRow}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Additional Degree / Certification
            </button>
          </div>

          {/* Section 6: Optional ERP Login Account */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-bold text-slate-900">Provision ERP Login Account</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createUserAccount}
                  onChange={(e) => setCreateUserAccount(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span className="text-xs text-slate-700 font-medium">Enable Staff Login</span>
              </label>
            </div>

            {createUserAccount && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Username / Login ID</label>
                  <input
                    type="text"
                    value={userAccountUsername}
                    onChange={(e) => setUserAccountUsername(e.target.value)}
                    placeholder={email || `staff.${firstName.toLowerCase() || 'id'}`}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Temporary Password</label>
                  <input
                    type="text"
                    value={userAccountPassword}
                    onChange={(e) => setUserAccountPassword(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">System Role</label>
                  <select
                    value={userAccountRoleId}
                    onChange={(e) => setUserAccountRoleId(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.display_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">
            Employee record will be created in PostgreSQL with unique ID {employeeIdNumber}
          </span>
          <div className="flex items-center gap-2.5">
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
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Creating Record...' : 'Complete Registration'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
