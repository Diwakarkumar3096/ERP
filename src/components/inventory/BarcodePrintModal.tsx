import React, { useRef } from 'react';
import { X, Printer, QrCode, Tag, CheckCircle2 } from 'lucide-react';

interface BarcodePrintModalProps {
  itemOrAsset: {
    type: 'item' | 'asset';
    code: string;
    name: string;
    category?: string;
    barcode?: string;
    location?: string;
  };
  schoolName: string;
  onClose: () => void;
}

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({
  itemOrAsset,
  schoolName,
  onClose
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const codeDisplay = itemOrAsset.barcode || itemOrAsset.code;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-base">Print Asset / Inventory Tag</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Tag Preview Box */}
          <div
            ref={printAreaRef}
            className="border-2 border-dashed border-slate-300 rounded-xl p-5 bg-white shadow-xs text-center space-y-3"
          >
            <div className="text-[10px] font-bold tracking-wider uppercase text-slate-500 pb-1 border-b border-slate-100">
              {schoolName} • PROPERTY OF INSTITUTION
            </div>

            <div className="text-sm font-bold text-slate-900 leading-tight">
              {itemOrAsset.name}
            </div>

            {itemOrAsset.category && (
              <span className="inline-block text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-sm">
                {itemOrAsset.category}
              </span>
            )}

            {/* Stylized Barcode SVG Representation */}
            <div className="py-2 flex flex-col items-center justify-center bg-slate-50 rounded-lg p-3 border border-slate-200">
              <svg className="w-48 h-14" viewBox="0 0 200 60">
                {/* Simulated high-density barcode bars based on hash */}
                {Array.from({ length: 45 }).map((_, i) => {
                  const width = (i % 3 === 0 ? 3 : (i % 2 === 0 ? 1.5 : 2.5));
                  const x = i * 4.3 + 5;
                  return <rect key={i} x={x} y="5" width={width} height="45" fill="#0f172a" />;
                })}
              </svg>
              <span className="font-mono text-xs font-bold tracking-widest text-slate-800 mt-1">
                *{codeDisplay}*
              </span>
            </div>

            {itemOrAsset.location && (
              <div className="text-[11px] text-slate-600 font-medium">
                Loc: {itemOrAsset.location}
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Standard Avery 2.5&quot; x 1.5&quot; thermal label format. Compatible with Zebra, Brother, TSC, and standard desktop inkjet/laser label sheets.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              Print Label Tag
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
