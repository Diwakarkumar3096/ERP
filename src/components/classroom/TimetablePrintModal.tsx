import React from 'react';
import type { School, Timetable, TimetableEntry, TimetablePeriod } from '../../types/erp.js';
import { X, Printer, Download, Building2, Calendar, FileSpreadsheet } from 'lucide-react';

interface TimetablePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School | null;
  timetable: Timetable | null;
  entries: TimetableEntry[];
  periods: TimetablePeriod[];
  viewModeLabel?: string;
}

export const TimetablePrintModal: React.FC<TimetablePrintModalProps> = ({
  isOpen,
  onClose,
  school,
  timetable,
  entries,
  periods,
  viewModeLabel = 'Class Weekly Schedule'
}) => {
  if (!isOpen || !timetable) return null;

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const sortedPeriods = [...periods].sort((a, b) => a.sort_order - b.sort_order);
    let csv = `Day,${sortedPeriods.map((p) => `"${p.name} (${p.start_time}-${p.end_time})"`).join(',')}\n`;

    days.forEach((day) => {
      const row = [day];
      sortedPeriods.forEach((p) => {
        const slot = entries.find((e) => e.day_of_week === day && e.period_id === p.id);
        if (slot) {
          row.push(`"${slot.subject_name} (${slot.teacher_first_name} ${slot.teacher_last_name}${slot.room_number ? ` - Rm ${slot.room_number}` : ''})"`);
        } else {
          row.push('""');
        }
      });
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Timetable_${timetable.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200 my-8 print:border-none print:shadow-none print:my-0">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Official Institutional Timetable Document</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Timetable</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="p-8 md:p-10 space-y-6 print:p-6" id="printable-timetable">
          {/* Institutional Header */}
          <div className="text-center border-b-2 border-slate-900 pb-5">
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider text-slate-950 font-serif">
              {school?.name || 'VIDYA VAHINI PUBLIC SCHOOL'}
            </h1>
            <p className="text-xs text-slate-600 font-medium mt-1">
              {school?.address || 'Main Campus, Knowledge City Road, Ward No. 4, Deoghar, Jharkhand - 814112'}
            </p>
            <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 mt-1.5 font-mono">
              <span>Affiliation No: {school?.affiliation_no || 'CBSE/AFF/2021/334201'}</span>
              <span>·</span>
              <span>School Code: {school?.code || 'VVPS'}</span>
              <span>·</span>
              <span>Academic Session: {timetable.session_name || '2025-26'}</span>
            </div>
            <div className="mt-3 inline-block px-4 py-1 bg-slate-100 rounded-full text-xs font-bold uppercase tracking-widest text-slate-800 border border-slate-200">
              {timetable.name} ({viewModeLabel})
            </div>
          </div>

          {/* Timetable Matrix Grid */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800">
                  <th className="border border-slate-300 px-3 py-2.5 text-left font-bold uppercase text-[10px] w-28">
                    Day / Time
                  </th>
                  {periods
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((p) => (
                      <th
                        key={p.id}
                        className={`border border-slate-300 px-2.5 py-2 text-center ${
                          p.period_type === 'BREAK' || p.period_type === 'LUNCH'
                            ? 'bg-amber-50 text-amber-900'
                            : ''
                        }`}
                      >
                        <div className="font-bold text-[11px]">{p.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono font-normal">
                          {p.start_time} - {p.end_time}
                        </div>
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day} className="hover:bg-slate-50/50">
                    <td className="border border-slate-300 px-3 py-2.5 font-bold text-slate-900 bg-slate-50/50">
                      {day}
                    </td>
                    {periods
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((p) => {
                        const slot = entries.find(
                          (e) => e.day_of_week === day && e.period_id === p.id
                        );

                        if (p.period_type === 'BREAK' || p.period_type === 'LUNCH') {
                          return (
                            <td
                              key={p.id}
                              className="border border-slate-300 px-2 py-2 text-center bg-amber-50/40 text-[10px] font-semibold text-amber-800 italic"
                            >
                              {p.period_type}
                            </td>
                          );
                        }

                        return (
                          <td
                            key={p.id}
                            className="border border-slate-300 px-2 py-2 text-center align-top min-w-[110px]"
                          >
                            {slot ? (
                              <div className="space-y-0.5">
                                <div className="font-bold text-slate-900 leading-tight">
                                  {slot.subject_name}
                                </div>
                                <div className="text-[10px] text-slate-600 font-medium">
                                  {slot.teacher_first_name} {slot.teacher_last_name}
                                </div>
                                {slot.room_number && (
                                  <div className="text-[9px] text-indigo-700 font-mono font-semibold">
                                    Rm {slot.room_number}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-300 font-mono">—</span>
                            )}
                          </td>
                        );
                      })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Official Signatures & Footer */}
          <div className="pt-10 grid grid-cols-3 gap-6 text-center text-xs text-slate-700">
            <div>
              <div className="h-12 border-b border-dashed border-slate-400 mx-auto w-3/4 mb-1" />
              <div className="font-bold text-slate-900">Class Teacher</div>
              <div className="text-[10px] text-slate-500">Prepared & Supervised</div>
            </div>

            <div>
              <div className="h-12 border-b border-dashed border-slate-400 mx-auto w-3/4 mb-1" />
              <div className="font-bold text-slate-900">Academic Coordinator</div>
              <div className="text-[10px] text-slate-500">Timetable Committee</div>
            </div>

            <div>
              <div className="h-12 border-b border-dashed border-slate-400 mx-auto w-3/4 mb-1" />
              <div className="font-bold text-slate-900">Principal</div>
              <div className="text-[10px] text-slate-500">Authorized Signatory / Seal</div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Generated: {new Date().toLocaleString()} · System Version: Phase 8 Enterprise</span>
            <span>Document ID: {timetable.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
