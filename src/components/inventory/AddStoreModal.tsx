import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import { X, Warehouse, Building, MapPin, UserCheck } from 'lucide-react';

interface AddStoreModalProps {
  schoolId: string;
  employees: Array<{ id: string; name: string; empNo: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddStoreModal: React.FC<AddStoreModalProps> = ({
  schoolId,
  employees,
  onClose,
  onSuccess
}) => {
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [building, setBuilding] = useState('Administrative Block');
  const [floor, setFloor] = useState('Ground Floor');
  const [roomNumber, setRoomNumber] = useState('');
  const [responsibleEmployeeId, setResponsibleEmployeeId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Store name is required', 'error');
      return;
    }
    if (!code.trim()) {
      addToast('Store code is required', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.inventory.createStore({
        schoolId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        building: building.trim() || undefined,
        floor: floor.trim() || undefined,
        roomNumber: roomNumber.trim() || undefined,
        responsibleEmployeeId: responsibleEmployeeId || undefined,
        notes: notes.trim() || undefined
      });

      addToast('Warehouse depot registered successfully', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Failed to create warehouse store', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden my-8 border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-indigo-400" />
            <h2 className="font-semibold text-base">New Storage Depot & Warehouse</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Depot Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Science Lab Store"
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Location Code *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. STORE-SCI-LAB"
                className="w-full text-sm font-mono border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden uppercase"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Campus Building
              </label>
              <input
                type="text"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="Main Block"
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Floor
              </label>
              <input
                type="text"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="1st Floor"
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Room No.
              </label>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="R-102"
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Store In-Charge / Supervisor
            </label>
            <select
              value={responsibleEmployeeId}
              onChange={(e) => setResponsibleEmployeeId(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="">-- No Custodian Assigned --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.empNo})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Security Notes & Access Regulations
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. High security chemical storage; dual key authorization required"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Register Storage Depot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
