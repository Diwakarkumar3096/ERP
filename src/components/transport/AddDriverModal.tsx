import React, { useState, useEffect } from 'react';
import { X, UserCheck, Check, AlertCircle } from 'lucide-react';
import { api } from '../../services/api.js';
import type { Employee } from '../../types/erp.js';

interface AddDriverModalProps {
  schoolId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddDriverModal: React.FC<AddDriverModalProps> = ({
  schoolId,
  onClose,
  onSuccess
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseType, setLicenseType] = useState('Heavy Passenger Commercial Vehicle (HMV)');
  const [licenseIssueDate, setLicenseIssueDate] = useState('2018-05-10');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('2028-05-09');
  const [experienceYears, setExperienceYears] = useState('8');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [medicalFitnessStatus, setMedicalFitnessStatus] = useState('FIT');
  const [policeVerificationStatus, setPoliceVerificationStatus] = useState('VERIFIED');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [fetchingStaff, setFetchingStaff] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch school staff to link
    api.employees.list({ schoolId, limit: 100 })
      .then(res => {
        setEmployees(res.employees || []);
        if (res.employees?.length > 0) {
          setEmployeeId(res.employees[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setFetchingStaff(false));
  }, [schoolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !licenseNumber || !licenseIssueDate || !licenseExpiryDate) {
      setError('Please select an employee and fill all license details.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await api.transport.createDriver({
        schoolId,
        employeeId,
        licenseNumber: licenseNumber.trim(),
        licenseType,
        licenseIssueDate,
        licenseExpiryDate,
        experienceYears: parseInt(experienceYears, 10),
        badgeNumber: badgeNumber.trim(),
        medicalFitnessStatus,
        policeVerificationStatus,
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
        notes: notes.trim()
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register driver');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-hidden border border-slate-100">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Register Transport Driver</h3>
              <p className="text-xs text-slate-500">Link staff member with commercial driver licensing</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select School Staff Member *</label>
            {fetchingStaff ? (
              <div className="text-xs text-slate-500 py-2">Loading staff database...</div>
            ) : (
              <select
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_id_number || emp.id}) - {emp.department_name || 'Staff'}
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-slate-500 mt-1">Reuses existing staff profile; maintains unified employee records.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Commercial License No. *</label>
              <input
                type="text"
                value={licenseNumber}
                onChange={e => setLicenseNumber(e.target.value.toUpperCase())}
                placeholder="e.g. UP70 20140098765"
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">License Category</label>
              <select
                value={licenseType}
                onChange={e => setLicenseType(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              >
                <option value="Heavy Passenger Commercial Vehicle (HMV)">Heavy Passenger Commercial (HMV)</option>
                <option value="Commercial Medium Passenger (LMV-Transport)">Medium Vehicle (LMV-Transport)</option>
                <option value="Light Motor Vehicle (LMV)">Light Motor Vehicle (LMV)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Date *</label>
              <input
                type="date"
                value={licenseIssueDate}
                onChange={e => setLicenseIssueDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date *</label>
              <input
                type="date"
                value={licenseExpiryDate}
                onChange={e => setLicenseExpiryDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Driving Experience (Years)</label>
              <input
                type="number"
                min="1"
                max="45"
                value={experienceYears}
                onChange={e => setExperienceYears(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">RTO Commercial Badge No.</label>
              <input
                type="text"
                value={badgeNumber}
                onChange={e => setBadgeNumber(e.target.value)}
                placeholder="e.g. BDG-UP-7011"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Medical Fitness Status</label>
              <select
                value={medicalFitnessStatus}
                onChange={e => setMedicalFitnessStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              >
                <option value="FIT">FIT (Passed eye & medical exam)</option>
                <option value="UNDER_REVIEW">UNDER REVIEW</option>
                <option value="UNFIT">UNFIT / Temporary Rest</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Police Verification</label>
              <select
                value={policeVerificationStatus}
                onChange={e => setPoliceVerificationStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              >
                <option value="VERIFIED">VERIFIED (Clear record)</option>
                <option value="PENDING">PENDING AT POLICE STATION</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact Person</label>
              <input
                type="text"
                value={emergencyContactName}
                onChange={e => setEmergencyContactName(e.target.value)}
                placeholder="Spouse / Parent name"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Phone No.</label>
              <input
                type="text"
                value={emergencyContactPhone}
                onChange={e => setEmergencyContactPhone(e.target.value)}
                placeholder="+91 98350 XXXXX"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Registering...' : 'Register Driver'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
