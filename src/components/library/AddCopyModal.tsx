import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { BookTitle, BookLocation } from '../../types/erp.js';
import { X, Layers, Sparkles } from 'lucide-react';

interface AddCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
  book: BookTitle | null;
  locations: BookLocation[];
}

export const AddCopyModal: React.FC<AddCopyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  schoolId,
  book,
  locations
}) => {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [accessionNumber, setAccessionNumber] = useState(
    `VVPS-ACC-${Date.now().toString().slice(-4)}`
  );
  const [barcode, setBarcode] = useState('');
  const [purchasePrice, setPurchasePrice] = useState(book?.price?.toString() || '295.00');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [condition, setCondition] = useState<'GOOD' | 'FAIR' | 'DAMAGED'>('GOOD');
  const [locationId, setLocationId] = useState('');
  const [isReference, setIsReference] = useState(book?.reference_only || false);
  const [notes, setNotes] = useState('Newly accessioned copy');

  if (!isOpen || !book) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessionNumber.trim()) {
      showToast('Accession number is required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.library.addCopy({
        schoolId,
        bookId: book.id,
        accessionNumber: accessionNumber.trim().toUpperCase(),
        barcode: barcode.trim() || undefined,
        purchasePrice: parseFloat(purchasePrice) || 0,
        purchaseDate,
        condition,
        locationId: locationId || undefined,
        isReference,
        notes: notes.trim()
      });

      showToast(`Copy (${accessionNumber.trim().toUpperCase()}) registered successfully!`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to add physical copy.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl">
              <Layers className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add Physical Book Copy</h2>
              <p className="text-xs text-indigo-200 line-clamp-1">{book.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <p className="font-semibold text-slate-800">{book.title}</p>
            <p className="text-slate-500">Author: {book.author_name} • ISBN: {book.isbn || 'N/A'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Accession Number *</label>
              <input
                type="text"
                required
                value={accessionNumber}
                onChange={(e) => setAccessionNumber(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Barcode / QR</label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Auto (BC-ACC...)"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Purchase Price (₹)</label>
              <input
                type="number"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="DAMAGED">Damaged</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Shelving Location / Rack</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">Select Location...</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="refCopyCheck"
              checked={isReference}
              onChange={(e) => setIsReference(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="refCopyCheck" className="text-xs font-medium text-slate-700 cursor-pointer">
              Mark as Reference Only (In-library study only)
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5" />
                  <span>Add Copy</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
