import React, { useState } from 'react';
import { X, Building2, Layers, Grid } from 'lucide-react';
import { api } from '../../services/api.js';
import type { Hostel, HostelBlock, HostelFloor } from '../../types/hostel.js';

interface AddHostelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
  hostels: Hostel[];
  blocks: HostelBlock[];
  floors: HostelFloor[];
  mode?: 'hostel' | 'block' | 'floor' | 'room';
}

export const AddHostelModal: React.FC<AddHostelModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  schoolId,
  hostels,
  blocks,
  floors,
  mode = 'hostel'
}) => {
  const [activeMode, setActiveMode] = useState<'hostel' | 'block' | 'floor' | 'room'>(mode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hostel fields
  const [hostelName, setHostelName] = useState('');
  const [hostelCode, setHostelCode] = useState('');
  const [hostelType, setHostelType] = useState('Boys Hostel');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'COED'>('MALE');
  const [capacity, setCapacity] = useState('80');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [description, setDescription] = useState('');

  // Block fields
  const [selectedHostelId, setSelectedHostelId] = useState(hostels[0]?.id || '');
  const [blockName, setBlockName] = useState('');
  const [blockCode, setBlockCode] = useState('');
  const [blockDesc, setBlockDesc] = useState('');

  // Floor fields
  const [selectedBlockId, setSelectedBlockId] = useState(blocks[0]?.id || '');
  const [floorName, setFloorName] = useState('');
  const [floorNumber, setFloorNumber] = useState('0');

  // Room fields
  const [selectedFloorId, setSelectedFloorId] = useState(floors[0]?.id || '');
  const [roomNumber, setRoomNumber] = useState('');
  const [roomType, setRoomType] = useState('Standard');
  const [roomCapacity, setRoomCapacity] = useState('2');
  const [roomGender, setRoomGender] = useState('MALE');
  const [autoCreateBeds, setAutoCreateBeds] = useState(true);
  const [roomNotes, setRoomNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (activeMode === 'hostel') {
        if (!hostelName.trim() || !hostelCode.trim()) {
          throw new Error('Hostel name and code are required.');
        }
        await api.hostel.createHostel({
          schoolId,
          name: hostelName.trim(),
          code: hostelCode.trim().toUpperCase(),
          hostel_type: hostelType,
          gender,
          capacity: parseInt(capacity, 10) || 80,
          address: address.trim() || undefined,
          contact_number: contactNumber.trim() || undefined,
          description: description.trim() || undefined
        });
      } else if (activeMode === 'block') {
        if (!selectedHostelId || !blockName.trim() || !blockCode.trim()) {
          throw new Error('Hostel, block name, and block code are required.');
        }
        await api.hostel.createBlock({
          schoolId,
          hostel_id: selectedHostelId,
          name: blockName.trim(),
          code: blockCode.trim().toUpperCase(),
          description: blockDesc.trim() || undefined
        });
      } else if (activeMode === 'floor') {
        if (!selectedHostelId || !selectedBlockId || !floorName.trim()) {
          throw new Error('Hostel, block, and floor name are required.');
        }
        await api.hostel.createFloor({
          schoolId,
          hostel_id: selectedHostelId,
          block_id: selectedBlockId,
          name: floorName.trim(),
          floor_number: parseInt(floorNumber, 10) || 0
        });
      } else if (activeMode === 'room') {
        if (!selectedHostelId || !selectedBlockId || !selectedFloorId || !roomNumber.trim()) {
          throw new Error('Hostel, block, floor, and room number are required.');
        }
        await api.hostel.createRoom({
          schoolId,
          hostel_id: selectedHostelId,
          block_id: selectedBlockId,
          floor_id: selectedFloorId,
          room_number: roomNumber.trim(),
          room_type: roomType,
          capacity: parseInt(roomCapacity, 10) || 2,
          gender: roomGender,
          autoCreateBeds,
          notes: roomNotes.trim() || undefined
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to complete creation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Add Hostel Infrastructure</h3>
              <p className="text-[11px] text-slate-500">Configure building, wings, floors or rooms</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-200 px-5 pt-3 bg-slate-50/20 gap-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveMode('hostel')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeMode === 'hostel'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Hostel Building
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('block')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeMode === 'block'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Block / Wing
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('floor')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeMode === 'floor'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            Floor
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('room')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeMode === 'room'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            Room & Beds
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {error}
            </div>
          )}

          {activeMode === 'hostel' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Hostel Name *</label>
                  <input
                    type="text"
                    required
                    value={hostelName}
                    onChange={(e) => setHostelName(e.target.value)}
                    placeholder="e.g. Tagore Boys Hostel"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Hostel Code *</label>
                  <input
                    type="text"
                    required
                    value={hostelCode}
                    onChange={(e) => setHostelCode(e.target.value)}
                    placeholder="e.g. HSTL-BOYS-01"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={hostelType}
                    onChange={(e) => setHostelType(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    <option value="Boys Hostel">Boys Hostel</option>
                    <option value="Girls Hostel">Girls Hostel</option>
                    <option value="Junior Hostel">Junior Hostel</option>
                    <option value="Senior Hostel">Senior Hostel</option>
                    <option value="Staff Residence">Staff Residence</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    <option value="MALE">Male Only</option>
                    <option value="FEMALE">Female Only</option>
                    <option value="COED">Co-Ed (Separate wings)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Campus Location / Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. North Campus Residential Area"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Warden Office Contact</label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="e.g. +91 98350 22110"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </>
          )}

          {activeMode === 'block' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Parent Hostel *</label>
                <select
                  required
                  value={selectedHostelId}
                  onChange={(e) => setSelectedHostelId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  {hostels.map(h => (
                    <option key={h.id} value={h.id}>{h.name} ({h.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Block / Wing Name *</label>
                  <input
                    type="text"
                    required
                    value={blockName}
                    onChange={(e) => setBlockName(e.target.value)}
                    placeholder="e.g. Tagore Wing (Block A)"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Block Code *</label>
                  <input
                    type="text"
                    required
                    value={blockCode}
                    onChange={(e) => setBlockCode(e.target.value)}
                    placeholder="e.g. BLK-A"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={blockDesc}
                  onChange={(e) => setBlockDesc(e.target.value)}
                  placeholder="e.g. Senior Secondary Science Cohort"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </>
          )}

          {activeMode === 'floor' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Hostel *</label>
                  <select
                    required
                    value={selectedHostelId}
                    onChange={(e) => {
                      setSelectedHostelId(e.target.value);
                      const matchingBlocks = blocks.filter(b => b.hostel_id === e.target.value);
                      if (matchingBlocks[0]) setSelectedBlockId(matchingBlocks[0].id);
                    }}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    {hostels.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Block / Wing *</label>
                  <select
                    required
                    value={selectedBlockId}
                    onChange={(e) => setSelectedBlockId(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    {blocks.filter(b => !selectedHostelId || b.hostel_id === selectedHostelId).map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Floor Name *</label>
                  <input
                    type="text"
                    required
                    value={floorName}
                    onChange={(e) => setFloorName(e.target.value)}
                    placeholder="e.g. First Floor"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Floor Number *</label>
                  <input
                    type="number"
                    required
                    value={floorNumber}
                    onChange={(e) => setFloorNumber(e.target.value)}
                    placeholder="0 for Ground, 1 for First"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </>
          )}

          {activeMode === 'room' && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Hostel</label>
                  <select
                    value={selectedHostelId}
                    onChange={(e) => setSelectedHostelId(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    {hostels.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Block</label>
                  <select
                    value={selectedBlockId}
                    onChange={(e) => setSelectedBlockId(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    {blocks.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Floor</label>
                  <select
                    value={selectedFloorId}
                    onChange={(e) => setSelectedFloorId(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    {floors.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Room Number / Name *</label>
                  <input
                    type="text"
                    required
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="e.g. Room 204"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Room Type</label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Standard">Standard (Double)</option>
                    <option value="Single">Single Occupancy</option>
                    <option value="Dormitory">Dormitory (4-6 beds)</option>
                    <option value="Shared">Triple Sharing</option>
                    <option value="Sick Room">Medical Sick Bay</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Bed Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={roomCapacity}
                    onChange={(e) => setRoomCapacity(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Resident Gender</label>
                  <select
                    value={roomGender}
                    onChange={(e) => setRoomGender(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="MALE">Boys</option>
                    <option value="FEMALE">Girls</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autoBeds"
                  checked={autoCreateBeds}
                  onChange={(e) => setAutoCreateBeds(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="autoBeds" className="text-xs text-slate-600 select-none">
                  Automatically generate physical bed records (Bed A, Bed B...)
                </label>
              </div>
            </>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="text-xs font-medium px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : `Create ${activeMode === 'hostel' ? 'Hostel' : activeMode === 'block' ? 'Block' : activeMode === 'floor' ? 'Floor' : 'Room'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
