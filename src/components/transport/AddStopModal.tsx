import React, { useState } from 'react';
import { X, MapPin, Check, AlertCircle } from 'lucide-react';
import { api } from '../../services/api.js';

interface AddStopModalProps {
  schoolId: string;
  routeId: string;
  routeName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddStopModal: React.FC<AddStopModalProps> = ({
  schoolId,
  routeId,
  routeName,
  onClose,
  onSuccess
}) => {
  const [stopName, setStopName] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [pickupTime, setPickupTime] = useState('07:15 AM');
  const [dropTime, setDropTime] = useState('02:45 PM');
  const [fareAmount, setFareAmount] = useState('1200');
  const [sequenceOrder, setSequenceOrder] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stopName || !pickupTime || !dropTime) {
      setError('Stop name, pickup time, and drop time are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await api.transport.addRouteStop(routeId, {
        schoolId,
        stopName: stopName.trim(),
        address: address.trim(),
        landmark: landmark.trim(),
        pickupTime: pickupTime.trim(),
        dropTime: dropTime.trim(),
        fareAmount: parseFloat(fareAmount) || 1200,
        sequenceOrder: sequenceOrder ? parseInt(sequenceOrder, 10) : undefined
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add stop');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-700 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Add Route Stop</h3>
              <p className="text-xs text-slate-500">Route: {routeName}</p>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Stop Name *</label>
            <input
              type="text"
              value={stopName}
              onChange={e => setStopName(e.target.value)}
              placeholder="e.g. High Court Colony Gate 2"
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Morning Pickup Time *</label>
              <input
                type="text"
                value={pickupTime}
                onChange={e => setPickupTime(e.target.value)}
                placeholder="e.g. 07:15 AM"
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Afternoon Drop Time *</label>
              <input
                type="text"
                value={dropTime}
                onChange={e => setDropTime(e.target.value)}
                placeholder="e.g. 02:45 PM"
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Fare (₹) *</label>
              <input
                type="number"
                step="50"
                min="0"
                value={fareAmount}
                onChange={e => setFareAmount(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sequence Order (Optional)</label>
              <input
                type="number"
                min="1"
                value={sequenceOrder}
                onChange={e => setSequenceOrder(e.target.value)}
                placeholder="Auto next"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Identifiable Landmark</label>
            <input
              type="text"
              value={landmark}
              onChange={e => setLandmark(e.target.value)}
              placeholder="e.g. Opposite State Bank ATM / Temple Crossing"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Address / Crossing</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. MG Marg Crossing, Stanley Road"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            />
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
              className="px-5 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Adding...' : 'Add Stop'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
