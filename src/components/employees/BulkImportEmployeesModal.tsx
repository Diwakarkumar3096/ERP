import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { X, Upload, FileText, Download, CheckCircle2, AlertCircle } from 'lucide-react';

interface BulkImportEmployeesModalProps {
  schoolId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkImportEmployeesModal: React.FC<BulkImportEmployeesModalProps> = ({
  schoolId,
  onClose,
  onSuccess
}) => {
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ insertedCount: number; errorsCount: number } | null>(null);

  const sampleCSV = `first_name,last_name,employee_type,gender,date_of_birth,mobile_number,email,date_of_joining,qualification,experience_years,city,state,pin_code
Ravi,Verma,Teaching,MALE,1985-05-12,9876543210,ravi.verma@example.com,2022-04-01,M.Sc Maths,8,Deoghar,Jharkhand,814112
Pooja,Sharma,Teaching,FEMALE,1992-09-18,9876543211,pooja.sharma@example.com,2023-06-15,B.A B.Ed,4,Deoghar,Jharkhand,814112
Amit,Mandal,Non-Teaching,MALE,1990-11-04,9876543212,amit.mandal@example.com,2021-08-10,B.Com,5,Deoghar,Jharkhand,814112`;

  const handleDownloadTemplate = () => {
    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Employee_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (content: string) => {
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      setValidationErrors(['CSV must contain a header line and at least one data row.']);
      setParsedRows([]);
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows: any[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      const obj: any = {};
      headers.forEach((h, idx) => {
        obj[h] = cols[idx] || '';
      });

      if (!obj.first_name || !obj.last_name || !obj.mobile_number || !obj.date_of_birth || !obj.date_of_joining) {
        errors.push(`Row ${i}: Missing mandatory field (first_name, last_name, mobile_number, date_of_birth, date_of_joining)`);
      }
      rows.push(obj);
    }

    setValidationErrors(errors);
    setParsedRows(rows);
  };

  const handleImportSubmit = async () => {
    if (parsedRows.length === 0 || validationErrors.length > 0) return;

    try {
      setImporting(true);
      const res = await api.employees.import(schoolId, parsedRows);
      setResult({
        insertedCount: res.insertedCount,
        errorsCount: res.errorsCount
      });
      if (res.insertedCount > 0) {
        setTimeout(() => {
          onSuccess();
        }, 1200);
      }
    } catch (err: any) {
      setValidationErrors([err?.message || 'Import failed']);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Bulk Import Employees (CSV)</h3>
              <p className="text-xs text-slate-500 font-medium">Batch onboard faculty and staff roster</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {result ? (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Import Processing Completed</h4>
              <p className="text-xs text-slate-600">
                Successfully registered <strong>{result.insertedCount}</strong> employees into the database.
                {result.errorsCount > 0 && ` (${result.errorsCount} skipped due to validation errors)`}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors mt-2"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl">
                <div>
                  <div className="text-xs font-bold text-indigo-950">Standard CSV Format</div>
                  <div className="text-[11px] text-indigo-700">Download formatted spreadsheet template with sample staff rows</div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 shadow-sm transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Or Paste CSV Data Directly
                </label>
                <textarea
                  rows={5}
                  value={csvText}
                  onChange={(e) => {
                    setCsvText(e.target.value);
                    parseCSV(e.target.value);
                  }}
                  placeholder="Paste CSV rows here..."
                  className="w-full text-xs font-mono p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {validationErrors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-800">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Validation Issues Detected ({validationErrors.length})</span>
                  </div>
                  <ul className="text-[11px] text-red-700 list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto">
                    {validationErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {parsedRows.length > 0 && validationErrors.length === 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900">
                      Preview Parsed Records ({parsedRows.length} valid rows)
                    </span>
                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ready to insert
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="p-2">Name</th>
                          <th className="p-2">Type</th>
                          <th className="p-2">Mobile</th>
                          <th className="p-2">Joining Date</th>
                          <th className="p-2">Qualification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRows.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-medium text-slate-900">{row.first_name} {row.last_name}</td>
                            <td className="p-2 text-slate-600">{row.employee_type}</td>
                            <td className="p-2 text-slate-600 font-mono">{row.mobile_number}</td>
                            <td className="p-2 text-slate-600">{row.date_of_joining}</td>
                            <td className="p-2 text-slate-600">{row.qualification || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  disabled={importing || parsedRows.length === 0 || validationErrors.length > 0}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{importing ? 'Importing Rows...' : `Import ${parsedRows.length} Employees`}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
