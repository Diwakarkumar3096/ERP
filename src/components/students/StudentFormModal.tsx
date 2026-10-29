import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../common/Toast.js';
import { Modal } from '../common/Modal.js';
import type { Student, School, AcademicSession, ClassItem, SectionItem } from '../../types/erp.js';
import {
  User,
  GraduationCap,
  Phone,
  Shield,
  FileText,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentToEdit?: Student | null;
  onSaved: () => void;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  onClose,
  studentToEdit,
  onSaved
}) => {
  const { activeSchool, activeSession, availableSchools, isSuperAdmin } = useAuth();
  const toast = useToast();

  const isEdit = Boolean(studentToEdit);

  // Active section tab in form
  const [activeStep, setActiveStep] = useState<'personal' | 'academic' | 'contact' | 'guardians' | 'additional'>('personal');

  // Form State
  const [schoolId, setSchoolId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');

  // Dropdown options
  const [schools, setSchools] = useState<School[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);

  // Admission number state
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [autoGenAdmNo, setAutoGenAdmNo] = useState(true);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [rollNumber, setRollNumber] = useState('');

  // Personal
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [nationality, setNationality] = useState('Indian');
  const [religion, setReligion] = useState('Hinduism');
  const [category, setCategory] = useState('General');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');

  // Contact
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');

  // Primary Guardian
  const [primaryParentName, setPrimaryParentName] = useState('');
  const [primaryParentRel, setPrimaryParentRel] = useState('Father');
  const [primaryParentMobile, setPrimaryParentMobile] = useState('');
  const [primaryParentAltMobile, setPrimaryParentAltMobile] = useState('');
  const [primaryParentEmail, setPrimaryParentEmail] = useState('');
  const [primaryParentOccupation, setPrimaryParentOccupation] = useState('');

  // Secondary Guardian
  const [secondaryParentName, setSecondaryParentName] = useState('');
  const [secondaryParentRel, setSecondaryParentRel] = useState('Mother');
  const [secondaryParentMobile, setSecondaryParentMobile] = useState('');
  const [secondaryParentOccupation, setSecondaryParentOccupation] = useState('');

  // Additional
  const [previousSchool, setPreviousSchool] = useState('');
  const [studentStatus, setStudentStatus] = useState<'ACTIVE' | 'INACTIVE' | 'TRANSFERRED' | 'WITHDRAWN' | 'GRADUATED'>('ACTIVE');
  const [remarks, setRemarks] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Load initial options
  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg('');
    setActiveStep('personal');

    if (studentToEdit) {
      setSchoolId(studentToEdit.school_id);
      setSessionId(studentToEdit.session_id);
      setClassId(studentToEdit.class_id);
      setSectionId(studentToEdit.section_id);
      setAdmissionNumber(studentToEdit.admission_number);
      setAutoGenAdmNo(false);
      setRegistrationNumber(studentToEdit.registration_number || '');
      setAdmissionDate(studentToEdit.admission_date || '');
      setRollNumber(studentToEdit.roll_number || '');

      setFirstName(studentToEdit.first_name);
      setMiddleName(studentToEdit.middle_name || '');
      setLastName(studentToEdit.last_name);
      setDateOfBirth(studentToEdit.date_of_birth);
      setGender(studentToEdit.gender);
      setBloodGroup(studentToEdit.blood_group || 'O+');
      setNationality(studentToEdit.nationality || 'Indian');
      setReligion(studentToEdit.religion || 'Hinduism');
      setCategory(studentToEdit.category || 'General');
      setAadhaarNumber(studentToEdit.aadhaar_number || '');
      setProfilePhoto(studentToEdit.profile_photo || '');

      setMobileNumber(studentToEdit.mobile_number || '');
      setEmail(studentToEdit.email || '');
      setAddress(studentToEdit.address || '');
      setCity(studentToEdit.city || '');
      setDistrict(studentToEdit.district || '');
      setState(studentToEdit.state || '');
      setPinCode(studentToEdit.pin_code || '');

      setPreviousSchool(studentToEdit.previous_school || '');
      setStudentStatus(studentToEdit.student_status);
      setRemarks(studentToEdit.remarks || '');
    } else {
      // New Student Defaults
      const targetSchool = activeSchool?.id || availableSchools[0]?.id || '';
      setSchoolId(targetSchool);
      setSessionId(activeSession?.id || '');
      setClassId('');
      setSectionId('');
      setAutoGenAdmNo(true);
      setAdmissionNumber('');
      setRegistrationNumber('');
      setAdmissionDate(new Date().toISOString().split('T')[0]);
      setRollNumber('');

      setFirstName('');
      setMiddleName('');
      setLastName('');
      setDateOfBirth('');
      setGender('Male');
      setBloodGroup('O+');
      setNationality('Indian');
      setReligion('Hinduism');
      setCategory('General');
      setAadhaarNumber('');
      setProfilePhoto('');

      setMobileNumber('');
      setEmail('');
      setAddress('');
      setCity(activeSchool?.city || '');
      setDistrict(activeSchool?.city || '');
      setState(activeSchool?.state || '');
      setPinCode(activeSchool?.postal_code || '');

      setPrimaryParentName('');
      setPrimaryParentRel('Father');
      setPrimaryParentMobile('');
      setPrimaryParentAltMobile('');
      setPrimaryParentEmail('');
      setPrimaryParentOccupation('');

      setSecondaryParentName('');
      setSecondaryParentRel('Mother');
      setSecondaryParentMobile('');
      setSecondaryParentOccupation('');

      setPreviousSchool('');
      setStudentStatus('ACTIVE');
      setRemarks('');
    }
  }, [isOpen, studentToEdit, activeSchool, activeSession, availableSchools]);

  // Load Schools
  useEffect(() => {
    if (!isOpen) return;
    const fetchSchools = async () => {
      try {
        const res = await api.schools.list();
        setSchools(res.schools);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSchools();
  }, [isOpen]);

  // When School Changes, Load Sessions and Classes
  useEffect(() => {
    if (!schoolId) return;

    const fetchSessionsAndClasses = async () => {
      try {
        const [sessRes, clsRes] = await Promise.all([
          api.sessions.list(schoolId),
          api.classes.list(schoolId)
        ]);
        setSessions(sessRes.sessions);
        if (!sessionId && sessRes.sessions.length > 0) {
          const current = sessRes.sessions.find(s => s.is_current) || sessRes.sessions[0];
          setSessionId(current.id);
        }
        setClasses(clsRes.classes);
      } catch (err) {
        console.error(err);
      }
    };

    fetchSessionsAndClasses();

    // Auto-generate admission number preview if in create mode
    if (!isEdit && autoGenAdmNo) {
      api.students.nextAdmissionNumber(schoolId)
        .then(res => setAdmissionNumber(res.nextAdmissionNumber))
        .catch(() => {});
    }
  }, [schoolId, isEdit, autoGenAdmNo]);

  // When Class Changes, Load Sections
  useEffect(() => {
    if (!classId) {
      setSections([]);
      return;
    }

    const selectedCls = classes.find(c => c.id === classId);
    if (selectedCls && selectedCls.sections) {
      setSections(selectedCls.sections);
      if (!sectionId && selectedCls.sections.length > 0) {
        setSectionId(selectedCls.sections[0].id);
      }
    } else {
      api.sections.list(schoolId, classId)
        .then(res => {
          setSections(res.sections);
          if (!sectionId && res.sections.length > 0) {
            setSectionId(res.sections[0].id);
          }
        })
        .catch(console.error);
    }
  }, [classId, classes, schoolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validations
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg('First Name and Last Name are required.');
      setActiveStep('personal');
      return;
    }

    if (!dateOfBirth) {
      setErrorMsg('Date of birth is required.');
      setActiveStep('personal');
      return;
    }

    if (!schoolId || !sessionId || !classId || !sectionId) {
      setErrorMsg('School branch, session, class, and section must all be selected.');
      setActiveStep('academic');
      return;
    }

    if (!isEdit && !primaryParentName.trim()) {
      setErrorMsg('Please specify at least one Primary Guardian name.');
      setActiveStep('guardians');
      return;
    }

    setLoading(true);
    try {
      if (isEdit && studentToEdit) {
        await api.students.update(studentToEdit.id, {
          first_name: firstName.trim(),
          middle_name: middleName.trim() || null,
          last_name: lastName.trim(),
          date_of_birth: dateOfBirth,
          gender,
          blood_group: bloodGroup,
          nationality,
          religion,
          category,
          aadhaar_number: aadhaarNumber.trim() || null,
          profile_photo: profilePhoto || null,
          mobile_number: mobileNumber.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          city: city.trim() || null,
          district: district.trim() || null,
          state: state.trim() || null,
          pin_code: pinCode.trim() || null,
          class_id: classId,
          section_id: sectionId,
          roll_number: rollNumber.trim() || null,
          previous_school: previousSchool.trim() || null,
          student_status: studentStatus,
          remarks: remarks.trim() || null
        });
        toast.success(`Student ${firstName} ${lastName} updated successfully.`);
      } else {
        const payload: any = {
          school_id: schoolId,
          session_id: sessionId,
          class_id: classId,
          section_id: sectionId,
          admission_number: autoGenAdmNo ? undefined : admissionNumber.trim(),
          registration_number: registrationNumber.trim() || null,
          admission_date: admissionDate,
          roll_number: rollNumber.trim() || null,
          first_name: firstName.trim(),
          middle_name: middleName.trim() || null,
          last_name: lastName.trim(),
          date_of_birth: dateOfBirth,
          gender,
          blood_group: bloodGroup,
          nationality,
          religion,
          category,
          aadhaar_number: aadhaarNumber.trim() || null,
          profile_photo: profilePhoto || null,
          mobile_number: mobileNumber.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          city: city.trim() || null,
          district: district.trim() || null,
          state: state.trim() || null,
          pin_code: pinCode.trim() || null,
          previous_school: previousSchool.trim() || null,
          student_status: studentStatus,
          remarks: remarks.trim() || null,
          primary_parent: {
            name: primaryParentName.trim(),
            relationship: primaryParentRel,
            mobile: primaryParentMobile.trim() || mobileNumber.trim(),
            alternate_mobile: primaryParentAltMobile.trim() || null,
            email: primaryParentEmail.trim() || null,
            occupation: primaryParentOccupation.trim() || null,
            address: address.trim() || null
          }
        };

        if (secondaryParentName.trim()) {
          payload.secondary_parent = {
            name: secondaryParentName.trim(),
            relationship: secondaryParentRel,
            mobile: secondaryParentMobile.trim() || null,
            occupation: secondaryParentOccupation.trim() || null
          };
        }

        const res = await api.students.create(payload);
        toast.success(`Enrolled ${firstName} ${lastName} with Admission No: ${res.admissionNumber}`);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save student record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Student Dossier' : 'New Student Admission & Registration'}
      description={isEdit ? `Updating student ${studentToEdit?.admission_number}` : 'Complete 5-step institutional enrollment with real database validation'}
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Step Navigation Pill */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveStep('personal')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeStep === 'personal'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>1. Personal</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('academic')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeStep === 'academic'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>2. Academic & Roster</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('contact')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeStep === 'contact'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>3. Contact & Address</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('guardians')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeStep === 'guardians'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>4. Guardians</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('additional')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeStep === 'additional'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>5. History & Status</span>
          </button>
        </div>

        {/* STEP 1: Personal Details */}
        {activeStep === 'personal' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Student Identity & Bio
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Aarav"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="e.g. Kumar"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Sharma"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  required
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gender *
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Blood Group
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                  <option value="EWS">EWS</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Aadhaar Number / National ID
                </label>
                <input
                  type="text"
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value)}
                  placeholder="xxxx xxxx xxxx"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Religion
                </label>
                <input
                  type="text"
                  value={religion}
                  onChange={(e) => setReligion(e.target.value)}
                  placeholder="e.g. Hinduism, Islam, Christianity, etc."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nationality
                </label>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="e.g. Indian"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Academic & Roster */}
        {activeStep === 'academic' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              School Campus & Class Enrollment
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  School Campus *
                </label>
                <select
                  disabled={!isSuperAdmin && Boolean(activeSchool?.id)}
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-100"
                >
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Session *
                </label>
                <select
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.name} {s.is_current ? '(Active)' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enrolled Class *
                </label>
                <select
                  required
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">-- Select Class --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.stream})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Section *
                </label>
                <select
                  required
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">-- Select Section --</option>
                  {sections.map(sec => (
                    <option key={sec.id} value={sec.id}>Section {sec.name} (Cap: {sec.capacity})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Roll Number
                </label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 01"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>
            </div>

            {/* Admission Number Configuration */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-900 block">
                    Institutional Admission Number
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Unique identifier within campus (e.g. VVP-2026-0001 or GIS-2026-0001)
                  </p>
                </div>
                {!isEdit && (
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoGenAdmNo}
                      onChange={(e) => setAutoGenAdmNo(e.target.checked)}
                      className="rounded text-slate-900 focus:ring-slate-900"
                    />
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Auto-Generate</span>
                  </label>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Admission Number *
                  </label>
                  <input
                    type="text"
                    required
                    readOnly={!isEdit && autoGenAdmNo}
                    value={admissionNumber}
                    onChange={(e) => setAdmissionNumber(e.target.value)}
                    placeholder="e.g. VVP-2026-0001"
                    className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold text-slate-900 ${
                      !isEdit && autoGenAdmNo ? 'bg-slate-100 text-slate-700' : 'bg-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Admission Date
                  </label>
                  <input
                    type="date"
                    value={admissionDate}
                    onChange={(e) => setAdmissionDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Contact & Address */}
        {activeStep === 'contact' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Student Communication & Residential Address
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Mobile Number
                </label>
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="+91 98350 xxxxx"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@family.com"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Residential Address
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House / Flat No, Street, Landmark"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Deoghar"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  District
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Deoghar / Banka"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Jharkhand / Bihar"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  PIN Code
                </label>
                <input
                  type="text"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="814112"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Parent & Guardian Details */}
        {activeStep === 'guardians' && (
          <div className="space-y-5">
            {isEdit ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                <span className="font-bold text-slate-800 block mb-1">Guardian Links Note</span>
                Existing linked parents and authorized guardians can be inspected and managed in the Student Profile View or via the Parents Directory.
              </div>
            ) : (
              <>
                {/* Primary Guardian */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Primary Guardian (Mandatory for Communications & Portal)</span>
                    </h5>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded">
                      Primary Contact
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required={!isEdit}
                        value={primaryParentName}
                        onChange={(e) => setPrimaryParentName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Relationship *
                      </label>
                      <select
                        value={primaryParentRel}
                        onChange={(e) => setPrimaryParentRel(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Guardian">Legal Guardian</option>
                        <option value="Other">Other Authorized Person</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Mobile Number *
                      </label>
                      <input
                        type="tel"
                        required={!isEdit}
                        value={primaryParentMobile}
                        onChange={(e) => setPrimaryParentMobile(e.target.value)}
                        placeholder="+91 98350 xxxxx"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Alternate Mobile
                      </label>
                      <input
                        type="tel"
                        value={primaryParentAltMobile}
                        onChange={(e) => setPrimaryParentAltMobile(e.target.value)}
                        placeholder="+91 98350 xxxxx"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={primaryParentEmail}
                        onChange={(e) => setPrimaryParentEmail(e.target.value)}
                        placeholder="guardian@example.com"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Occupation
                      </label>
                      <input
                        type="text"
                        value={primaryParentOccupation}
                        onChange={(e) => setPrimaryParentOccupation(e.target.value)}
                        placeholder="e.g. Civil Engineer, Doctor"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Secondary Guardian */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Secondary Guardian (Optional Mother / Co-Guardian)
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={secondaryParentName}
                        onChange={(e) => setSecondaryParentName(e.target.value)}
                        placeholder="e.g. Sunita Devi"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Relationship
                      </label>
                      <select
                        value={secondaryParentRel}
                        onChange={(e) => setSecondaryParentRel(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="Mother">Mother</option>
                        <option value="Father">Father</option>
                        <option value="Guardian">Local Guardian</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Mobile Number
                      </label>
                      <input
                        type="tel"
                        value={secondaryParentMobile}
                        onChange={(e) => setSecondaryParentMobile(e.target.value)}
                        placeholder="+91 98350 xxxxx"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Occupation
                      </label>
                      <input
                        type="text"
                        value={secondaryParentOccupation}
                        onChange={(e) => setSecondaryParentOccupation(e.target.value)}
                        placeholder="e.g. Teacher, Homemaker"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 5: Additional & Status */}
        {activeStep === 'additional' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Previous School & Status Lifecycle
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Previous School Name
                </label>
                <input
                  type="text"
                  value={previousSchool}
                  onChange={(e) => setPreviousSchool(e.target.value)}
                  placeholder="e.g. St. Francis Convent School"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student Enrollment Status *
                </label>
                <select
                  value={studentStatus}
                  onChange={(e) => setStudentStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-bold"
                >
                  <option value="ACTIVE">ACTIVE (Regular Student)</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="TRANSFERRED">TRANSFERRED (TC Issued)</option>
                  <option value="WITHDRAWN">WITHDRAWN</option>
                  <option value="GRADUATED">GRADUATED (Completed Course)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Office Remarks & Medical / Behavioral Notes
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Special achievements, fee concessions, medical allergies, bus route notes..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="text-[11px] text-slate-500 font-mono">
            Phase 2 Multi-Campus Enrollment
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors shadow-sm"
            >
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Confirm Admission'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
