import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../common/Toast.js';
import type { School, AcademicSession, ClassItem, FeeCategory, FeeStructure } from '../../types/erp.js';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface FeeStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  structure: FeeStructure | null;
  schools: School[];
  sessions: AcademicSession[];
  classes: ClassItem[];
  categories: FeeCategory[];
  onSaved: () => void;
}

export const FeeStructureModal: React.FC<FeeStructureModalProps> = ({
  isOpen,
  onClose,
  structure,
  schools,
  sessions,
  classes,
  categories,
  onSaved
}) => {
  const toast = useToast();
  const safeCategories = Array.isArray(categories) ? categories : [];

  const [schoolId, setSchoolId] = useState(structure?.school_id || schools[0]?.id || 'sch_vvps');
  const [sessionId, setSessionId] = useState(structure?.session_id || sessions[0]?.id || 'sess_vvps_2526');
  const [name, setName] = useState(structure?.name || '');
  const [code, setCode] = useState(structure?.code || '');
  const [description, setDescription] = useState(structure?.description || '');
  const [frequency, setFrequency] = useState<string>(structure?.frequency || 'QUARTERLY');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(
    structure?.class_ids
      ? typeof structure.class_ids === 'string'
        ? JSON.parse(structure.class_ids)
        : structure.class_ids
      : []
  );

  // Items
  const [items, setItems] = useState<
    Array<{ category_id: string; amount: number; is_mandatory: boolean; late_fee_amount: number; grace_period_days: number }>
  >(
    structure?.items?.map((it) => ({
      category_id: it.category_id,
      amount: it.amount,
      is_mandatory: it.is_mandatory,
      late_fee_amount: it.late_fee_amount || 100,
      grace_period_days: it.grace_period_days || 7
    })) || [
      { category_id: safeCategories[0]?.id || '', amount: 6000, is_mandatory: true, late_fee_amount: 100, grace_period_days: 7 }
    ]
  );

  // Installments
  const [installments, setInstallments] = useState<
    Array<{ installment_number: number; name: string; due_date: string; late_fee_date: string; percentage_share: number }>
  >(
    structure?.installments || [
      { installment_number: 1, name: 'Quarter 1 (April - June)', due_date: '2025-04-10', late_fee_date: '2025-04-20', percentage_share: 25 },
      { installment_number: 2, name: 'Quarter 2 (July - Sept)', due_date: '2025-07-10', late_fee_date: '2025-07-20', percentage_share: 25 },
      { installment_number: 3, name: 'Quarter 3 (Oct - Dec)', due_date: '2025-10-10', late_fee_date: '2025-10-20', percentage_share: 25 },
      { installment_number: 4, name: 'Quarter 4 (Jan - March)', due_date: '2026-01-10', late_fee_date: '2026-01-20', percentage_share: 25 }
    ]
  );

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (structure) {
      setSchoolId(structure.school_id);
      setSessionId(structure.session_id);
      setName(structure.name);
      setCode(structure.code);
      setDescription(structure.description || '');
      setFrequency(structure.frequency);
      setSelectedClassIds(
        structure.class_ids
          ? typeof structure.class_ids === 'string'
            ? JSON.parse(structure.class_ids)
            : structure.class_ids
          : []
      );
      if (structure.items && structure.items.length > 0) {
        setItems(
          structure.items.map((it) => ({
            category_id: it.category_id,
            amount: it.amount,
            is_mandatory: it.is_mandatory,
            late_fee_amount: it.late_fee_amount || 100,
            grace_period_days: it.grace_period_days || 7
          }))
        );
      }
      if (structure.installments && structure.installments.length > 0) {
        setInstallments(structure.installments);
      }
    }
  }, [structure]);

  const addItem = () => {
    setItems([
      ...items,
      {
        category_id: categories[0]?.id || '',
        amount: 1000,
        is_mandatory: true,
        late_fee_amount: 100,
        grace_period_days: 7
      }
    ]);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleClassToggle = (cid: string) => {
    if (selectedClassIds.includes(cid)) {
      setSelectedClassIds(selectedClassIds.filter((id) => id !== cid));
    } else {
      setSelectedClassIds([...selectedClassIds, cid]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast.error('Plan name and unique plan code are required');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one fee component head');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        schoolId,
        sessionId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim(),
        frequency,
        targetType: 'CLASS',
        classIds: selectedClassIds,
        items,
        installments
      };

      if (structure) {
        await api.fees.updateStructure(structure.id, payload);
        toast.success('Fee structure updated successfully');
      } else {
        await api.fees.createStructure(payload);
        toast.success('New fee structure created successfully');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save fee structure');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {structure ? 'Edit Fee Structure Plan' : 'Configure New Fee Structure'}
              </h3>
              <p className="text-xs text-slate-300">
                Setup academic fee components, class applicability, and installment schedules
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Basic Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                School <span className="text-rose-500">*</span>
              </label>
              <select
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                disabled={!!structure}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
              >
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Academic Session <span className="text-rose-500">*</span>
              </label>
              <select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                disabled={!!structure}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
              >
                {sessions.map((sess) => (
                  <option key={sess.id} value={sess.id}>
                    {sess.name} {sess.is_current ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Fee Structure Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Primary Section Quarterly Plan (Classes 1 - 5)"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Unique Plan Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. VVPS-PRI-2526"
                className="w-full px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Billing Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
              >
                <option value="QUARTERLY">Quarterly (4 Installments)</option>
                <option value="MONTHLY">Monthly (12 Installments)</option>
                <option value="HALF_YEARLY">Half Yearly (2 Installments)</option>
                <option value="ANNUAL">Annual (1 Installment)</option>
                <option value="ONE_TIME">One Time (Admission Intake)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Description / Notes</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Curricular scope, laboratory access, and transportation terms"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>
          </div>

          {/* Applicable Classes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Select Applicable Classes for this Plan:
            </label>
            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg max-h-32 overflow-y-auto">
              {classes.map((cls) => {
                const isSelected = selectedClassIds.includes(cls.id);
                return (
                  <button
                    type="button"
                    key={cls.id}
                    onClick={() => handleClassToggle(cls.id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {cls.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fee Components / Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Fee Heads / Components:
              </label>
              <button
                type="button"
                onClick={addItem}
                className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg flex items-center gap-1 border border-indigo-200"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Component
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
              {items.map((it, idx) => (
                <div key={idx} className="p-3 grid grid-cols-1 md:grid-cols-5 gap-3 items-center text-xs">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] text-slate-500 mb-0.5">Category Head</label>
                    <select
                      value={it.category_id}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx].category_id = e.target.value;
                        setItems(next);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 text-slate-900"
                    >
                      {safeCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} ({cat.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={it.amount}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx].amount = parseFloat(e.target.value) || 0;
                        setItems(next);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 text-slate-900"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-3">
                    <input
                      type="checkbox"
                      id={`mand_${idx}`}
                      checked={it.is_mandatory}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx].is_mandatory = e.target.checked;
                        setItems(next);
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor={`mand_${idx}`} className="text-xs text-slate-700 font-medium">
                      Mandatory
                    </label>
                  </div>

                  <div className="text-right pt-3">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                        title="Remove component"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-right mt-2 text-xs text-slate-600 font-bold">
              Base Components Total: ₹
              {items.reduce((acc, it) => acc + (it.amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saving ? 'Saving...' : structure ? 'Update Fee Plan' : 'Save & Publish Fee Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
