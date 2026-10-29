import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import type { School } from '../../types/erp.js';
import { Modal } from '../common/Modal.js';
import { ConfirmDialog } from '../common/ConfirmDialog.js';
import { useToast } from '../common/Toast.js';
import {
  Building2,
  Plus,
  Edit,
  Power,
  MapPin,
  Phone,
  Mail,
  Award,
  Layers,
  Users,
  Search,
  CheckCircle2
} from 'lucide-react';

export const SchoolsView: React.FC = () => {
  const { isSuperAdmin, hasPermission, activeSchool, switchSchool, refreshAuth } = useAuth();
  const toast = useToast();

  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [deactivatingSchool, setDeactivatingSchool] = useState<School | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    board: 'CBSE',
    affiliationNo: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    establishedYear: new Date().getFullYear().toString()
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const res = await api.schools.list();
      setSchools(res.schools);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch schools list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      code: '',
      name: '',
      board: 'CBSE',
      affiliationNo: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      establishedYear: new Date().getFullYear().toString()
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (sch: School) => {
    setEditingSchool(sch);
    setFormData({
      code: sch.code,
      name: sch.name,
      board: sch.board || 'CBSE',
      affiliationNo: sch.affiliation_no || '',
      email: sch.email || '',
      phone: sch.phone || '',
      address: sch.address || '',
      city: sch.city || '',
      state: sch.state || '',
      postalCode: sch.postal_code || '',
      establishedYear: sch.established_year?.toString() || ''
    });
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      toast.error('Code and Name are required.');
      return;
    }

    setFormLoading(true);
    try {
      await api.schools.create(formData as any);
      toast.success(`School campus '${formData.name}' created successfully.`);
      setIsAddModalOpen(false);
      fetchSchools();
      refreshAuth();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create school.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchool) return;

    setFormLoading(true);
    try {
      await api.schools.update(editingSchool.id, formData as any);
      toast.success(`School details updated.`);
      setEditingSchool(null);
      fetchSchools();
      refreshAuth();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update school.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingSchool) return;

    setFormLoading(true);
    try {
      await api.schools.delete(deactivatingSchool.id);
      toast.success(`School campus '${deactivatingSchool.name}' marked inactive.`);
      setDeactivatingSchool(null);
      fetchSchools();
      refreshAuth();
    } catch (err: any) {
      toast.error(err.message || 'Failed to deactivate school.');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredSchools = schools.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase()) ||
    (s.city && s.city.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Schools & Campus Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Administer institutional branches, boards, affiliations, and multi-campus configurations
          </p>
        </div>

        {hasPermission('schools.create') && (
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add New Campus
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by school name, code, or city..."
          className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* School Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
        </div>
      ) : filteredSchools.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">No schools found</h3>
          <p className="text-xs text-slate-400 mt-1">Adjust search filter or register a new campus.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSchools.map((school) => {
            const isCurrentlyActive = activeSchool?.id === school.id;
            return (
              <div
                key={school.id}
                className={`bg-white rounded-xl border p-6 flex flex-col justify-between transition-all ${
                  isCurrentlyActive
                    ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold font-mono text-sm">
                        {school.code}
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900 leading-snug">
                          {school.name}
                        </h2>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>Board: {school.board}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-[11px]">Est. {school.established_year || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                      school.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {school.status}
                    </span>
                  </div>

                  {/* Affiliation & Details */}
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                    {school.affiliation_no && (
                      <div className="flex items-center gap-2">
                        <Award className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Affiliation: <strong className="font-mono font-medium text-slate-700">{school.affiliation_no}</strong></span>
                      </div>
                    )}
                    {school.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <span className="text-[11px] leading-relaxed">
                          {school.address}, {school.city}, {school.state} - {school.postal_code}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                      {school.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{school.phone}</span>
                        </div>
                      )}
                      {school.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="font-mono">{school.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metrics strip */}
                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-lg bg-slate-50">
                      <div className="text-sm font-bold font-mono tabular-nums text-slate-900">
                        {school.classes_count || 0}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">Classes</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50">
                      <div className="text-sm font-bold font-mono tabular-nums text-slate-900">
                        {school.sections_count || 0}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">Sections</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50">
                      <div className="text-sm font-bold font-mono tabular-nums text-slate-900">
                        {school.users_count || 0}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">Staff</div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {hasPermission('schools.edit') && (
                      <button
                        onClick={() => handleOpenEdit(school)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                        title="Edit Campus Details"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {hasPermission('schools.delete') && school.status === 'active' && (
                      <button
                        onClick={() => setDeactivatingSchool(school)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Deactivate Campus"
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {(isSuperAdmin || hasPermission('schools.switch')) && (
                    <button
                      onClick={() => switchSchool(school.id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                        isCurrentlyActive
                          ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {isCurrentlyActive ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active Scope</span>
                        </>
                      ) : (
                        <span>Switch Context</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Campus Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New School Campus"
        description="Add a new branch or campus location to the centralized ERP"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                School Code *
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. VVPS, GISK"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 uppercase font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Education Board
              </label>
              <select
                value={formData.board}
                onChange={(e) => setFormData({ ...formData, board: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="CBSE">CBSE (Central Board)</option>
                <option value="ICSE">ICSE / CISCE</option>
                <option value="State Board">State Board</option>
                <option value="IB">International Baccalaureate (IB)</option>
                <option value="Cambridge">Cambridge IGCSE</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              School Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Vidya Vahini Public School"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Affiliation Number
              </label>
              <input
                type="text"
                value={formData.affiliationNo}
                onChange={(e) => setFormData({ ...formData, affiliationNo: e.target.value })}
                placeholder="e.g. CBSE/AFF/2021/334201"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Established Year
              </label>
              <input
                type="number"
                value={formData.establishedYear}
                onChange={(e) => setFormData({ ...formData, establishedYear: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="office@school.edu.in"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 6432 245100"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Campus Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Campus Road / Landmark"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Deoghar"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Jharkhand"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code</label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="814112"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors"
            >
              {formLoading ? 'Registering...' : 'Register School'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Campus Modal */}
      <Modal
        isOpen={!!editingSchool}
        onClose={() => setEditingSchool(null)}
        title="Edit Campus Details"
        description="Update administrative and contact data"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">School Code</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Education Board</label>
              <select
                value={formData.board}
                onChange={(e) => setFormData({ ...formData, board: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
              >
                <option value="CBSE">CBSE</option>
                <option value="ICSE">ICSE</option>
                <option value="State Board">State Board</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">School Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Affiliation No</label>
              <input
                type="text"
                value={formData.affiliationNo}
                onChange={(e) => setFormData({ ...formData, affiliationNo: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Established Year</label>
              <input
                type="number"
                value={formData.establishedYear}
                onChange={(e) => setFormData({ ...formData, establishedYear: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code</label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditingSchool(null)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors"
            >
              {formLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Deactivate Confirm */}
      <ConfirmDialog
        isOpen={!!deactivatingSchool}
        onClose={() => setDeactivatingSchool(null)}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate School Campus"
        message={`Are you sure you want to deactivate ${deactivatingSchool?.name}? Historical student records and academic sessions will be preserved in the database.`}
        confirmLabel="Deactivate Campus"
        isDestructive
        loading={formLoading}
      />
    </div>
  );
};
