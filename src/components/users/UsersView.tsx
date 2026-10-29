import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import type { User, Role } from '../../types/erp.js';
import { Modal } from '../common/Modal.js';
import { ConfirmDialog } from '../common/ConfirmDialog.js';
import { useToast } from '../common/Toast.js';
import {
  Users,
  Plus,
  Edit,
  KeyRound,
  Trash2,
  Search,
  Building2,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export const UsersView: React.FC = () => {
  const { user: currentUser, activeSchool, availableSchools, isSuperAdmin, hasPermission } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedSchool, setSelectedSchool] = useState(activeSchool?.id || '');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    roleId: '',
    schoolId: activeSchool?.id || ''
  });

  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsersAndRoles = useCallback(async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        api.users.list({
          schoolId: selectedSchool || undefined,
          roleId: selectedRole || undefined,
          search: search || undefined
        }),
        api.roles.list()
      ]);
      setUsers(usersRes.users);
      setRoles(rolesRes.roles);
      if (rolesRes.roles.length > 0 && !formData.roleId) {
        setFormData(prev => ({ ...prev, roleId: rolesRes.roles[0].id }));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch user directory.');
    } finally {
      setLoading(false);
    }
  }, [selectedSchool, selectedRole, search, toast]);

  useEffect(() => {
    fetchUsersAndRoles();
  }, [fetchUsersAndRoles]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.email || !formData.password || !formData.firstName || !formData.lastName || !formData.roleId) {
      toast.error('All mandatory fields must be filled.');
      return;
    }

    setActionLoading(true);
    try {
      await api.users.create({
        ...formData,
        schoolId: formData.schoolId || null
      });
      toast.success(`User '${formData.username}' created successfully.`);
      setIsAddModalOpen(false);
      setFormData({
        username: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        roleId: roles[0]?.id || '',
        schoolId: activeSchool?.id || ''
      });
      fetchUsersAndRoles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user account.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setActionLoading(true);
    try {
      await api.users.update(editingUser.id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        roleId: formData.roleId,
        schoolId: formData.schoolId || null
      });
      toast.success('User profile updated.');
      setEditingUser(null);
      fetchUsersAndRoles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setActionLoading(true);
    try {
      await api.users.resetPassword(resettingUser.id, newPassword);
      toast.success(`Password reset for ${resettingUser.username}. Active sessions invalidated.`);
      setResettingUser(null);
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivateUser = async () => {
    if (!deactivatingUser) return;

    setActionLoading(true);
    try {
      await api.users.delete(deactivatingUser.id);
      toast.success(`User '${deactivatingUser.username}' deactivated.`);
      setDeactivatingUser(null);
      fetchUsersAndRoles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to deactivate user.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Users & Staff Directory
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Administer user accounts, credential security, campus assignments, and role allocations
          </p>
        </div>

        {hasPermission('users.create') && (
          <button
            onClick={() => {
              setFormData({
                username: '',
                email: '',
                password: 'ChangeMe@123',
                firstName: '',
                lastName: '',
                phone: '',
                roleId: roles.find(r => r.name === 'teacher')?.id || roles[0]?.id || '',
                schoolId: activeSchool?.id || ''
              });
              setIsAddModalOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add New User
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 w-full md:w-auto">
          <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or username..."
            className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-700 font-medium"
          >
            <option value="">All Roles ({roles.length})</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.display_name}</option>
            ))}
          </select>

          {/* School Filter */}
          {isSuperAdmin && (
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-700 font-medium"
            >
              <option value="">All Campuses</option>
              {availableSchools.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Registered Accounts
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {users.length} accounts found
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading user directory...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No user accounts match current criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-3">User & Contact</th>
                  <th className="px-6 py-3">Role Designation</th>
                  <th className="px-6 py-3">Assigned Campus</th>
                  <th className="px-6 py-3">Last Login</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt={u.display_name || `${u.first_name} ${u.last_name}`}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                              {(u.display_name || `${u.first_name} ${u.last_name}`)
                                .split(' ')
                                .filter(Boolean)
                                .map((n: string) => n[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                              <span>{u.display_name || `${u.first_name} ${u.last_name}`}</span>
                              {u.display_name && u.display_name !== `${u.first_name} ${u.last_name}` && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ({u.first_name} {u.last_name})
                                </span>
                              )}
                              {isCurrent && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {u.username} · {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-3.5">
                        <span className="text-xs font-semibold text-slate-800">
                          {u.role_display_name}
                        </span>
                      </td>

                      <td className="px-6 py-3.5">
                        {u.school_name ? (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{u.school_name}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            All Campuses (Global)
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-3.5 font-mono text-[11px] text-slate-500 tabular-nums">
                        {u.last_login_at
                          ? new Date(u.last_login_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Never'}
                      </td>

                      <td className="px-6 py-3.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                          u.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {u.status}
                        </span>
                      </td>

                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {hasPermission('users.reset_pwd') && (
                            <button
                              onClick={() => {
                                setResettingUser(u);
                                setNewPassword('');
                              }}
                              className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Reset Password"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {hasPermission('users.edit') && (
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setFormData({
                                  username: u.username,
                                  email: u.email,
                                  password: '',
                                  firstName: u.first_name,
                                  lastName: u.last_name,
                                  phone: u.phone || '',
                                  roleId: u.role_id,
                                  schoolId: u.school_id || ''
                                });
                              }}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Edit User"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {hasPermission('users.delete') && !isCurrent && u.status === 'active' && (
                            <button
                              onClick={() => setDeactivatingUser(u)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Deactivate Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create System User Account"
        description="Provision administrative, academic, or staff credentials"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Username *</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="e.g. jdoe.vvps"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jdoe@erp.edu"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password *</label>
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98350 00000"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role Designation *</label>
              <select
                required
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.display_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Campus Assignment</label>
              <select
                value={formData.schoolId}
                onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
              >
                {isSuperAdmin && <option value="">Global / Master (All Campuses)</option>}
                {availableSchools.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
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
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors"
            >
              {actionLoading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Edit User Profile"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
              <select
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.display_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Campus</label>
              <select
                value={formData.schoolId}
                onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
              >
                {isSuperAdmin && <option value="">Global / Master</option>}
                {availableSchools.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditingUser(null)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors"
            >
              {actionLoading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Administrative Password Reset Modal */}
      <Modal
        isOpen={!!resettingUser}
        onClose={() => setResettingUser(null)}
        title="Administrative Password Reset"
        description={`Set a new temporary password for ${resettingUser?.username}`}
        maxWidth="sm"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Resetting this password will immediately invalidate all active sessions for this user.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setResettingUser(null)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:bg-amber-400 transition-colors"
            >
              {actionLoading ? 'Resetting...' : 'Confirm Reset'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Deactivate User Dialog */}
      <ConfirmDialog
        isOpen={!!deactivatingUser}
        onClose={() => setDeactivatingUser(null)}
        onConfirm={handleDeactivateUser}
        title="Deactivate User Account"
        message={`Are you sure you want to deactivate ${deactivatingUser?.first_name} ${deactivatingUser?.last_name} (${deactivatingUser?.username})? They will no longer be able to log in.`}
        confirmLabel="Deactivate Account"
        isDestructive
        loading={actionLoading}
      />
    </div>
  );
};
