import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Filter,
  Download,
  Play,
  Save,
  Trash2,
  Plus,
  CheckSquare,
  Square,
  ArrowUpDown,
  RefreshCw,
  Table as TableIcon
} from 'lucide-react';
import jsPDF from 'jspdf';

interface CustomReportBuilderProps {
  schoolId?: string;
  onRefreshSaved?: () => void;
}

export const CustomReportBuilderView: React.FC<CustomReportBuilderProps> = ({
  schoolId,
  onRefreshSaved
}) => {
  const [schemaModules, setSchemaModules] = useState<Record<string, any>>({});
  const [selectedModule, setSelectedModule] = useState<string>('students');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<Array<{ field: string; operator: string; value: string }>>([]);
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const [previewRecords, setPreviewRecords] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Save Template Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Fetch Safe Schema Whitelist
  useEffect(() => {
    fetch('/api/mis/custom-reports/schema')
      .then((res) => res.json())
      .then((data) => {
        if (data.modules) {
          setSchemaModules(data.modules);
          const firstMod = Object.keys(data.modules)[0];
          if (firstMod) {
            setSelectedModule(firstMod);
            const defaultFields = (data.modules[firstMod]?.fields || []).slice(0, 5).map((f: any) => f.key);
            setSelectedFields(defaultFields);
            setSortBy(defaultFields[0] || '');
          }
        }
      })
      .catch((err) => console.error('[SCHEMA LOAD ERROR]', err));
  }, []);

  // When module changes, reset fields
  const handleModuleChange = (modKey: string) => {
    setSelectedModule(modKey);
    const mod = schemaModules[modKey];
    if (mod) {
      const defaultFields = (mod.fields || []).slice(0, 5).map((f: any) => f.key);
      setSelectedFields(defaultFields);
      setSortBy(defaultFields[0] || '');
      setFilters([]);
      setPreviewRecords([]);
    }
  };

  const currentModule = schemaModules[selectedModule] || { fields: [] };
  const currentFields = currentModule.fields || [];

  const toggleField = (key: string) => {
    if (selectedFields.includes(key)) {
      if (selectedFields.length > 1) {
        setSelectedFields(selectedFields.filter((f) => f !== key));
      }
    } else {
      setSelectedFields([...selectedFields, key]);
    }
  };

  const selectAllFields = () => {
    setSelectedFields(currentFields.map((f: any) => f.key));
  };

  const addFilter = () => {
    if (currentFields.length > 0) {
      setFilters([...filters, { field: currentFields[0].key, operator: 'equals', value: '' }]);
    }
  };

  const updateFilter = (index: number, key: string, val: string) => {
    const updated = [...filters];
    updated[index] = { ...updated[index], [key]: val };
    setFilters(updated);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  // Run Query Preview
  const handleRunPreview = async () => {
    setLoadingPreview(true);
    setPreviewError(null);
    try {
      const res = await fetch('/api/mis/custom-reports/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          module: selectedModule,
          selectedFields,
          filters,
          sortBy: sortBy || selectedFields[0],
          sortOrder,
          limit: 100
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate preview');
      }

      setPreviewRecords(data.records || []);
    } catch (err: any) {
      setPreviewError(err.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Save Report Template
  const handleSaveTemplate = async () => {
    if (!saveTitle.trim()) return;
    setSavingTemplate(true);
    try {
      const res = await fetch('/api/mis/saved-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          title: saveTitle,
          description: saveDesc,
          module: selectedModule,
          selectedFields,
          filters,
          sortBy,
          sortOrder
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save template');
      }

      setIsSaveModalOpen(false);
      setSaveTitle('');
      setSaveDesc('');
      if (onRefreshSaved) onRefreshSaved();
      alert('Report template saved successfully!');
    } catch (err: any) {
      alert(`Error saving report template: ${err.message}`);
    } finally {
      setSavingTemplate(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (previewRecords.length === 0) return;
    const headers = Object.keys(previewRecords[0]);
    const csvRows = [
      headers.join(','),
      ...previewRecords.map((row) =>
        headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
      )
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedModule}_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (previewRecords.length === 0) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(`School ERP Management Report — ${currentModule.name || selectedModule}`, 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Total Records: ${previewRecords.length}`, 14, 22);

    let y = 32;
    const headers = Object.keys(previewRecords[0]).slice(0, 8); // Top 8 fields fit landscape
    const colWidth = 260 / headers.length;

    doc.setFillColor(241, 245, 249);
    doc.rect(14, y - 5, 260, 8, 'F');
    doc.setFont('helvetica', 'bold');
    headers.forEach((h, idx) => {
      doc.text(h.replace(/_/g, ' ').toUpperCase(), 15 + idx * colWidth, y);
    });

    doc.setFont('helvetica', 'normal');
    y += 8;

    previewRecords.slice(0, 35).forEach((row) => {
      if (y > 185) {
        doc.addPage();
        y = 20;
      }
      headers.forEach((h, idx) => {
        const val = String(row[h] ?? '');
        doc.text(val.length > 20 ? val.substring(0, 18) + '...' : val, 15 + idx * colWidth, y);
      });
      y += 6;
    });

    doc.save(`${selectedModule}_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* 1. BUILDER CONTROL PANEL */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            Safe Custom Query &amp; Report Builder
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Design parameterized custom reports with whitelisted columns, filters, and multi-format exports
          </p>
        </div>

        {/* Module Picker */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">1. Select Core Module</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(schemaModules).map(([modKey, mod]: [string, any]) => (
              <button
                key={modKey}
                type="button"
                onClick={() => handleModuleChange(modKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedModule === modKey
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {mod.name}
              </button>
            ))}
          </div>
        </div>

        {/* Fields Whitelist Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-700">2. Select Display Fields</label>
            <button
              type="button"
              onClick={selectAllFields}
              className="text-[11px] font-semibold text-indigo-600 hover:underline"
            >
              Select All Fields
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
            {currentFields.map((field: any) => {
              const isSelected = selectedFields.includes(field.key);
              return (
                <button
                  key={field.key}
                  type="button"
                  onClick={() => toggleField(field.key)}
                  className={`flex items-center gap-2 p-2 rounded-lg text-xs text-left transition-all ${
                    isSelected
                      ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-300 shrink-0" />
                  )}
                  <span className="truncate">{field.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Criteria Builder */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-700">3. Filter Criteria (Optional)</label>
            <button
              type="button"
              onClick={addFilter}
              className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add Filter Rule
            </button>
          </div>

          {filters.length === 0 ? (
            <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
              No filters applied. Click &quot;Add Filter Rule&quot; to narrow results.
            </div>
          ) : (
            <div className="space-y-2">
              {filters.map((flt, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <select
                    value={flt.field}
                    onChange={(e) => updateFilter(idx, 'field', e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-indigo-500"
                  >
                    {currentFields.map((f: any) => (
                      <option key={f.key} value={f.key}>{f.label}</option>
                    ))}
                  </select>

                  <select
                    value={flt.operator}
                    onChange={(e) => updateFilter(idx, 'operator', e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-indigo-500"
                  >
                    <option value="equals">Equals (=)</option>
                    <option value="contains">Contains (ILIKE)</option>
                    <option value="greater_than">Greater Than (&gt;)</option>
                    <option value="less_than">Less Than (&lt;)</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Filter value..."
                    value={flt.value}
                    onChange={(e) => updateFilter(idx, 'value', e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex-1 min-w-[120px] focus:outline-indigo-500"
                  />

                  <button
                    type="button"
                    onClick={() => removeFilter(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sort Order & Run Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-indigo-500"
            >
              {selectedFields.map((fKey) => {
                const fObj = currentFields.find((f: any) => f.key === fKey);
                return <option key={fKey} value={fKey}>{fObj?.label || fKey}</option>;
              })}
            </select>

            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-1 font-semibold"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              {sortOrder}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunPreview}
              disabled={loadingPreview}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {loadingPreview ? 'Executing...' : 'Run Query & Preview'}
            </button>

            <button
              type="button"
              onClick={() => setIsSaveModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Save Template
            </button>
          </div>
        </div>
      </div>

      {/* 2. PREVIEW RESULTS TABLE */}
      {previewError && (
        <div className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-medium">
          {previewError}
        </div>
      )}

      {previewRecords.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-emerald-600" />
                Query Preview Results ({previewRecords.length} records returned)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Authoritative data directly extracted from database</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                CSV Export
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                PDF Document
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-[400px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="text-slate-600 font-semibold border-b border-slate-200">
                  {Object.keys(previewRecords[0]).map((col) => (
                    <th key={col} className="py-2.5 px-3 capitalize">
                      {col.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewRecords.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    {Object.keys(previewRecords[0]).map((col) => (
                      <td key={col} className="py-2.5 px-3 text-slate-800 font-medium">
                        {String(row[col] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SAVE TEMPLATE MODAL */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900">Save Custom Report Template</h4>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Report Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Class 10 Attendance Roster"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Notes or purpose of this report..."
                  value={saveDesc}
                  onChange={(e) => setSaveDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500"
                ></textarea>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-slate-500 space-y-1">
                <p><strong>Module:</strong> {currentModule.name}</p>
                <p><strong>Fields:</strong> {selectedFields.length} selected</p>
                <p><strong>Filters:</strong> {filters.length} rules defined</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={savingTemplate || !saveTitle.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
              >
                {savingTemplate ? 'Saving...' : 'Save Template'}
              </button>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
