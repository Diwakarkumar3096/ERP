import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../common/Toast.js';
import { Modal } from '../common/Modal.js';
import { ConfirmDialog } from '../common/ConfirmDialog.js';
import type { Parent, School, Student } from '../../types/erp.js';
import {
  Shield,
  UserPlus,
  Search,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Link2,
  Trash2,
  Edit2,
  Plus,
  Download,
  Building2,
  X,
  AlertCircle
} from 'lucide-react';

export const ParentsView: React.FC = () => {
  const { activeSchool, availableSchools, isSuperAdmin, hasPermission } = useAuth();
  const toast = useToast();

  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalParents, setTotalParents] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState(activeSchool?.id || '');

  // Add / Edit Modal
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [parentToEdit, setParentToEdit] = useState<Parent | null>(null);
  const [name, setName] = useState('');
  const [relationshipType, setRelationshipType] = useState('Father');
  const [mobileNumber, setMobileNumber] = useState('');
  const [altMobile, setAltMobile] = useState('');
  const [email, setEmail] = useState('');
  const [occupation, setOccupation] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [savingParent, setSavingParent] = useState(false);

  // Link Ward Modal
  const [linkWardModalOpen, setLinkWardModalOpen] = useState(false);
  const [activeParentForLinking, setActiveParentForLinking] = useState<Parent | null>(null);
  const [schoolStudents, setSchoolStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [wardRelationship, setWardRelationship] = useState('Father');
  const [isPrimaryGuardian, setIsPrimaryGuardian] = useState(false);
  const [linkingWard, setLinkingWard] = useState(false);

  // Delete Parent
  const [parentToDelete, setParentToDelete] = useState<Parent | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (activeSchool?.id) {
      setSelectedSchoolId(activeSchool.id);
    }
  }, [activeSchool]);

  const fetchParents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.parents.list({
        schoolId: selectedSchoolId || undefined,
        search: searchTerm.trim() || undefined,
        limit: 100
      });
      setParents(res.parents);
      setTotalParents(res.total);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch parents directory.');
    } finally {
      setLoading(false);
    }
  }, [selectedSchoolId, searchTerm]);

  useEffect(() => {
    fetchParents();
  }, [fetchParents]);

  // Load students for active school when link modal opens
  const openLinkWardModal = async (parent: Parent) => {
    setActiveParentForLinking(parent);
    setWardRelationship(parent.relationship_type || 'Father');
    setIsPrimaryGuardian(false);
    setSelectedStudentId('');
    setLinkWardModalOpen(true);

    try {
      const res = await api.students.list({
        schoolId: parent.school_id,
        limit: 100
      });
      setSchoolStudents(res.students);
      if (res.students.length > 0) {
        setSelectedStudentId(res.students[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLinkWard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeParentForLinking || !selectedStudentId) return;

    setLinkingWard(true);
    try {
      await api.parents.linkStudent(activeParentForLinking.id, {
        student_id: selectedStudentId,
        relationship: wardRelationship,
        is_primary_guardian: isPrimaryGuardian
      });
      toast.success('Linked ward to guardian successfully.');
      setLinkWardModalOpen(false);
      fetchParents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to link ward.');
    } finally {
      setLinkingWard(false);
    }
  };

  const handleUnlinkWard = async (parentId: string, studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to unlink ward ${studentName}?`)) return;
    try {
      await api.parents.unlinkStudent(parentId, studentId);
      toast.success(`Unlinked ward from guardian.`);
      fetchParents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to unlink ward.');
    }
  };

  const openFormModal = (parent?: Parent) => {
    if (parent) {
      setParentToEdit(parent);
      setName(parent.name);
      setRelationshipType(parent.relationship_type);
      setMobileNumber(parent.mobile_number);
      setAltMobile(parent.alternate_mobile || '');
      setEmail(parent.email || '');
      setOccupation(parent.occupation || '');
      setAddress(parent.address || '');
      setCity(parent.city || '');
      setDistrict(parent.district || '');
      setState(parent.state || '');
      setPinCode(parent.pin_code || '');
    } else {
      setParentToEdit(null);
      setName('');
      setRelationshipType('Father');
      setMobileNumber('');
      setAltMobile('');
      setEmail('');
      setOccupation('');
      setAddress('');
      setCity(activeSchool?.city || '');
      setDistrict(activeSchool?.city || '');
      setState(activeSchool?.state || '');
      setPinCode(activeSchool?.postal_code || '');
    }
    setFormModalOpen(true);
  };

  const handleSaveParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobileNumber.trim()) {
      toast.error('Name and Mobile Number are required.');
      return;
    }

    setSavingParent(true);
    try {
      if (parentToEdit) {
        await api.parents.update(parentToEdit.id, {
          name: name.trim(),
          relationship_type: relationshipType,
          mobile_number: mobileNumber.trim(),
          alternate_mobile: altMobile.trim() || null,
          email: email.trim() || null,
          occupation: occupation.trim() || null,
          address: address.trim() || null,
          city: city.trim() || null,
          district: district.trim() || null,
          state: state.trim() || null,
          pin_code: pinCode.trim() || null
        });
        toast.success(`Updated parent ${name}.`);
      } else {
        await api.parents.create({
          school_id: selectedSchoolId,
          name: name.trim(),
          relationship_type: relationshipType,
          mobile_number: mobileNumber.trim(),
          alternate_mobile: altMobile.trim() || null,
          email: email.trim() || null,
          occupation: occupation.trim() || null,
          address: address.trim() || null,
          city: city.trim() || null,
          district: district.trim() || null,
          state: state.trim() || null,
          pin_code: pinCode.trim() || null
        });
        toast.success(`Registered parent ${name}.`);
      }

      setFormModalOpen(false);
      fetchParents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save parent record.');
    } finally {
      setSavingParent(false);
    }
  };

  const handleDeleteParent = async () => {
    if (!parentToDelete) return;
    setDeleting(true);
    try {
      await api.parents.delete(parentToDelete.id);
      toast.success(`Deleted guardian record for ${parentToDelete.name}.`);
      setParentToDelete(null);
      fetchParents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete parent.');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCSV = () => {
    if (parents.length === 0) {
      toast.error('No parents to export.');
      return;
    }

    const headers = ['Parent Name', 'Relationship', 'Mobile Number', 'Alternate Mobile', 'Email', 'Occupation', 'City', 'State', 'Wards'];
    const rows = parents.map(p => [
      `"${p.name}"`,
      `"${p.relationship_type}"`,
      `"${p.mobile_number}"`,
      `"${p.alternate_mobile || ''}"`,
      `"${p.email || ''}"`,
      `"${p.occupation || ''}"`,
      `"${p.city || ''}"`,
      `"${p.state || ''}"`,
      `"${p.wards ? p.wards.map(w => `${w.student_name} (${w.class_name}-${w.section_name})`).join('; ') : ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Parents_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded parents directory CSV.');
  };

  const totalWardsCount = parents.reduce((acc, p) => acc + (p.wards?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Parents & Guardians Directory
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Family & Wards
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authorized emergency contacts, family demographics, and bidirectional student ward linkages.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {hasPermission('parents.create') && (
            <button
              type="button"
              onClick={() => openFormModal()}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Parent / Guardian</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Registered Guardians
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {totalParents}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Fathers, Mothers & Authorized Guardians
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Linked Student Wards
            </span>
            <span className="text-2xl font-bold text-emerald-600 mt-1 block">
              {totalWardsCount}
            </span>
            <span className="text-[11px] text-emerald-700 font-medium mt-0.5 block">
              Direct student relationships mapped
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              SMS & Portal Status
            </span>
            <span className="text-2xl font-bold text-indigo-600 mt-1 block">
              Active
            </span>
            <span className="text-[11px] text-indigo-700 font-medium mt-0.5 block">
              Automated notifications enabled
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <Phone className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & School Filter */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search parent name, phone, email, occupation..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        {isSuperAdmin && (
          <div className="w-full sm:w-72">
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              {availableSchools.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Guardian Name</th>
                <th className="py-3 px-4">Relationship</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Occupation & City</th>
                <th className="py-3 px-4">Linked Student Wards</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span className="text-xs font-medium">Loading parents directory...</span>
                  </td>
                </tr>
              ) : parents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">No guardian records found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try a different search term or register a parent.</p>
                  </td>
                </tr>
              ) : (
                parents.map((parent) => (
                  <tr key={parent.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Guardian Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-200">
                          {parent.name[0]}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{parent.name}</span>
                          <span className="text-[11px] text-slate-400">{parent.school_name}</span>
                        </div>
                      </div>
                    </td>

                    {/* Relationship */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {parent.relationship_type}
                      </span>
                    </td>

                    {/* Contact Phone */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-slate-800 font-semibold">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{parent.mobile_number}</span>
                      </div>
                      {parent.alternate_mobile && (
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          Alt: {parent.alternate_mobile}
                        </span>
                      )}
                      {parent.email && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{parent.email}</span>
                        </div>
                      )}
                    </td>

                    {/* Occupation & City */}
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700 block">
                        {parent.occupation || 'Not specified'}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-300" />
                        {parent.city || parent.district || 'Local'}
                      </span>
                    </td>

                    {/* Linked Wards */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {parent.wards && parent.wards.length > 0 ? (
                          parent.wards.map((ward) => (
                            <span
                              key={ward.student_id}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] bg-slate-100 text-slate-800 border border-slate-200"
                            >
                              <GraduationCap className="w-3 h-3 text-indigo-600" />
                              <strong className="font-semibold">{ward.student_name}</strong>
                              <span className="text-slate-500 text-[10px]">({ward.class_name}-{ward.section_name})</span>
                              {hasPermission('parents.edit') && (
                                <button
                                  type="button"
                                  onClick={() => handleUnlinkWard(parent.id, ward.student_id, ward.student_name)}
                                  className="text-slate-400 hover:text-rose-600 ml-0.5"
                                  title="Unlink Ward"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No wards linked</span>
                        )}

                        {hasPermission('parents.edit') && (
                          <button
                            type="button"
                            onClick={() => openLinkWardModal(parent)}
                            className="p-1 rounded-md text-indigo-600 hover:bg-indigo-50 border border-dashed border-indigo-300 transition-colors"
                            title="Link Ward"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {hasPermission('parents.edit') && (
                          <button
                            type="button"
                            onClick={() => openFormModal(parent)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Parent"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {hasPermission('parents.delete') && (
                          <button
                            type="button"
                            onClick={() => setParentToDelete(parent)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Parent"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add / Edit Parent */}
      <Modal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={parentToEdit ? 'Edit Parent Record' : 'Register New Parent / Guardian'}
        description="Parent information is verified for SMS alerts and family portal governance"
        maxWidth="md"
      >
        <form onSubmit={handleSaveParent} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Parent Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Relationship Type *
              </label>
              <select
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
                <option value="Other">Other Authorized Person</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="+91 98350 xxxxx"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alternate Mobile
              </label>
              <input
                type="tel"
                value={altMobile}
                onChange={(e) => setAltMobile(e.target.value)}
                placeholder="+91 98350 xxxxx"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guardian@example.com"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Occupation
              </label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="e.g. Civil Engineer, Doctor"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Residential Address
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House No, Street, Landmark"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code</label>
              <input
                type="text"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setFormModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingParent}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors shadow-sm"
            >
              {savingParent ? 'Saving...' : 'Save Guardian'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Link Ward */}
      <Modal
        isOpen={linkWardModalOpen}
        onClose={() => setLinkWardModalOpen(false)}
        title="Link Student Ward to Guardian"
        description={`Connect student ward to ${activeParentForLinking?.name}`}
        maxWidth="sm"
      >
        <form onSubmit={handleLinkWard} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Student *
            </label>
            <select
              required
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="">-- Choose Student --</option>
              {schoolStudents.map(s => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} ({s.class_name}-{s.section_name} · {s.admission_number})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Relationship to Ward *
            </label>
            <select
              value={wardRelationship}
              onChange={(e) => setWardRelationship(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="Father">Father</option>
              <option value="Mother">Mother</option>
              <option value="Guardian">Legal Guardian</option>
              <option value="Local Guardian">Local Guardian</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={isPrimaryGuardian}
              onChange={(e) => setIsPrimaryGuardian(e.target.checked)}
              className="rounded text-slate-900 focus:ring-slate-900"
            />
            <span>Set as Primary Emergency Guardian for this Ward</span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setLinkWardModalOpen(false)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={linkingWard || !selectedStudentId}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors shadow-sm"
            >
              {linkingWard ? 'Linking...' : 'Confirm Ward Link'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      {parentToDelete && (
        <ConfirmDialog
          isOpen={Boolean(parentToDelete)}
          onClose={() => setParentToDelete(null)}
          onConfirm={handleDeleteParent}
          title="Delete Parent Record"
          message={`Are you sure you want to delete ${parentToDelete.name}? Any student ward connections will be unlinked.`}
          confirmLabel="Delete Guardian"
          isDestructive={true}
          loading={deleting}
        />
      )}
    </div>
  );
};
