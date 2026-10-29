import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import type { Role, Permission } from '../../types/erp.js';
import { Modal } from '../common/Modal.js';
import { useToast } from '../common/Toast.js';
import {
  ShieldCheck,
  Plus,
  Save,
  Check,
  Shield,
  Layers,
  Lock,
  Unlock,
  Info
} from 'lucide-react';

export const RolesView: React.FC = () => {
  const { hasPermission } = useAuth();
  const toast = useToast();

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New Role Modal
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  const fetchRolesAndPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        api.roles.list(),
        api.roles.permissions()
      ]);
      setRoles(rolesRes.roles);
      setPermissions(permsRes.permissions);

      // Default select first role
      if (rolesRes.roles.length > 0 && !selectedRole) {
        handleSelectRole(rolesRes.roles[0]);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load roles and permissions.');
    } finally {
      setLoading(false);
    }
  }, [selectedRole, toast]);

  useEffect(() => {
    fetchRolesAndPermissions();
  }, [fetchRolesAndPermissions]);

  const handleSelectRole = async (role: Role) => {
    setSelectedRole(role);
    try {
      const res = await api.roles.get(role.id);
      setSelectedPermissionIds(res.permissionIds);
    } catch (err: any) {
      toast.error('Failed to load role permissions.');
    }
  };

  const handleTogglePermission = (permId: string) => {
    if (selectedRole?.name === 'super_admin') {
      toast.info('Super Admin role inherently holds all system permissions.');
      return;
    }

    setSelectedPermissionIds(prev =>
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  };

  const handleToggleModule = (moduleName: string) => {
    if (selectedRole?.name === 'super_admin') return;

    const modulePermIds = permissions
      .filter(p => p.module === moduleName)
      .map(p => p.id);

    const allSelected = modulePermIds.every(id => selectedPermissionIds.includes(id));

    if (allSelected) {
      setSelectedPermissionIds(prev => prev.filter(id => !modulePermIds.includes(id)));
    } else {
      setSelectedPermissionIds(prev => Array.from(new Set([...prev, ...modulePermIds])));
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;

    setSaving(true);
    try {
      await api.roles.updatePermissions(selectedRole.id, selectedPermissionIds);
      toast.success(`Permissions matrix updated for '${selectedRole.display_name}'.`);
      // Update count in roles list
      setRoles(prev => prev.map(r => r.id === selectedRole.id ? { ...r, permissions_count: selectedPermissionIds.length } : r));
    } catch (err: any) {
      toast.error(err.message || 'Failed to save permissions.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName) return;

    try {
      const res = await api.roles.create({
        displayName: newRoleName,
        description: newRoleDesc,
        permissionIds: []
      });
      toast.success(`Role '${newRoleName}' created.`);
      setIsAddRoleModalOpen(false);
      setNewRoleName('');
      setNewRoleDesc('');
      fetchRolesAndPermissions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create role.');
    }
  };

  // Group permissions by module
  const permissionsByModule = permissions.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Roles & Permissions Matrix
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure granular Role-Based Access Control (RBAC) across ERP subsystems and security scopes
          </p>
        </div>

        {hasPermission('roles.create') && (
          <button
            onClick={() => setIsAddRoleModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Custom Role
          </button>
        )}
      </div>

      {/* Main Split Layout: Roles Master on Left, Permission Matrix on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Roles List (Left 4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
          <div className="px-2 pb-3 mb-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              System Roles ({roles.length})
            </span>
            <span className="text-[11px] text-slate-400 font-mono">12 Standard</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading roles...</div>
          ) : (
            <div className="space-y-1 overflow-y-auto max-h-[600px] pr-1">
              {roles.map((role) => {
                const isSelected = selectedRole?.id === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => handleSelectRole(role)}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-indigo-50/50 border-indigo-400 ring-1 ring-indigo-400/20'
                        : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {role.display_name}
                        </span>
                        {role.is_system && (
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-600">
                            System
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {role.description || 'Custom institutional role'}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                        <span>{role.permissions_count || 0} permissions</span>
                        <span aria-hidden="true">·</span>
                        <span>{role.users_count || 0} active users</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Permissions Matrix (Right 8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
          {selectedRole ? (
            <>
              {/* Matrix Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      {selectedRole.display_name}
                    </h2>
                    <span className="text-xs font-mono text-slate-500 font-medium">
                      ({selectedRole.name})
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedRole.name === 'super_admin'
                      ? 'Master Super Admin possesses unrestricted capabilities across all system modules and database records.'
                      : `Selected: ${selectedPermissionIds.length} of ${permissions.length} total permissions.`}
                  </p>
                </div>

                {hasPermission('roles.edit') && selectedRole.name !== 'super_admin' && (
                  <button
                    onClick={handleSavePermissions}
                    disabled={saving}
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Saving Matrix...' : 'Save Matrix'}
                  </button>
                )}
              </div>

              {/* Module-by-Module Permission Checkboxes */}
              <div className="space-y-6 overflow-y-auto max-h-[600px] pr-2">
                {Object.entries(permissionsByModule).map(([moduleName, perms]) => {
                  const allSelected = perms.every(p => selectedPermissionIds.includes(p.id));
                  const someSelected = perms.some(p => selectedPermissionIds.includes(p.id));

                  return (
                    <div key={moduleName} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-slate-600" />
                          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            {moduleName} Module
                          </h3>
                        </div>

                        {selectedRole.name !== 'super_admin' && (
                          <button
                            type="button"
                            onClick={() => handleToggleModule(moduleName)}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            {allSelected ? 'Deselect All' : 'Select All'}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {perms.map((perm) => {
                          const isChecked = selectedRole.name === 'super_admin' || selectedPermissionIds.includes(perm.id);
                          return (
                            <label
                              key={perm.id}
                              className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                                isChecked
                                  ? 'bg-white border-indigo-200 text-slate-900 shadow-2xs'
                                  : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={selectedRole.name === 'super_admin'}
                                onChange={() => handleTogglePermission(perm.id)}
                                className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                              />
                              <div>
                                <div className="text-xs font-semibold leading-tight flex items-center gap-1.5">
                                  <span>{perm.name}</span>
                                  <span className="font-mono text-[9px] text-slate-400">
                                    {perm.id}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                  {perm.description}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400">
              Select a role on the left to configure permissions.
            </div>
          )}
        </div>
      </div>

      {/* Add Role Modal */}
      <Modal
        isOpen={isAddRoleModalOpen}
        onClose={() => setIsAddRoleModalOpen(false)}
        title="Add Custom System Role"
        description="Create a custom role with customizable permissions"
        maxWidth="md"
      >
        <form onSubmit={handleCreateRole} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Role Display Name *
            </label>
            <input
              type="text"
              required
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="e.g. Exam Coordinator, Lab Assistant"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={newRoleDesc}
              onChange={(e) => setNewRoleDesc(e.target.value)}
              placeholder="Describe the duties and intended access scope of this role..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddRoleModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Create Role
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
