import React from 'react';
import type { LibraryMember, School } from '../../types/erp.js';
import { X, Printer, BookOpen, ShieldCheck, Calendar, Hash } from 'lucide-react';

interface LibraryCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: LibraryMember | null;
  activeSchool: School | null;
}

export const LibraryCardModal: React.FC<LibraryCardModalProps> = ({
  isOpen,
  onClose,
  member,
  activeSchool
}) => {
  if (!isOpen || !member) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-300" />
            <h2 className="text-base font-bold text-white">Official Library Member Card</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Physical ID Card Container (CR80 Standard Style) */}
          <div
            id="printable-library-card"
            className="w-full rounded-2xl bg-linear-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-5 shadow-xl border border-indigo-500/30 relative overflow-hidden space-y-4"
          >
            {/* Background Decorative Rings */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />

            {/* School Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  {activeSchool?.name || 'Vidyavahini Public School'}
                </h3>
                <p className="text-[10px] text-indigo-300 font-medium tracking-wide">
                  Central Library & Learning Media Center
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                {member.member_type}
              </span>
            </div>

            {/* Member Details & Photo */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-slate-800 border-2 border-indigo-400/40 flex items-center justify-center text-xl font-bold text-indigo-300 uppercase shrink-0 shadow-inner">
                {member.name ? member.name.charAt(0) : 'M'}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white truncate">{member.name || 'Library Member'}</h4>
                <p className="text-xs text-indigo-200 mt-0.5 truncate">{member.subtext || member.details_summary}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-300 font-mono">
                  <span>ID: {member.identifier || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Barcode Strip */}
            <div className="p-2.5 rounded-xl bg-white/95 text-slate-900 text-center space-y-1">
              <div className="flex items-center justify-center gap-0.5 py-1">
                {/* Visual Barcode Pattern */}
                <div className="h-7 flex items-center gap-0.5">
                  {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2].map((w, i) => (
                    <div
                      key={i}
                      className="bg-slate-950 h-full"
                      style={{ width: `${w * 1.5}px` }}
                    />
                  ))}
                </div>
              </div>
              <p className="text-[11px] font-mono font-bold tracking-widest text-slate-800">
                {member.card_number}
              </p>
            </div>

            {/* Validity Footer */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/10 font-mono">
              <span className="flex items-center gap-1">
                <Hash className="w-3 h-3 text-indigo-400" />
                {member.membership_number}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-indigo-400" />
                Valid: {member.expiry_date}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">Standard CR80 Institutional Card Format</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Card</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
