import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import type { ClassItem, SectionItem } from '../../types/erp.js';
import { Modal } from '../common/Modal.js';
import { ConfirmDialog } from '../common/ConfirmDialog.js';
import { useToast } from '../common/Toast.js';
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  Users,
  Search,
  School as SchoolIcon,
  DoorOpen,
  UserCheck
} from 'lucide-react';

export const ClassesView: React.FC = () => {
  const { activeSchool, activeSession, hasPermission, availableSchools, switchSchool } = useAuth();
  const toast = useToast();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [streamFilter, setStreamFilter] = useState('ALL');

  // Modals
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [deletingClass, setDeletingClass] = useState<ClassItem | null>(null);

  const [addingSectionForClass, setAddingSectionForClass] = useState<ClassItem | null>(null);
  const [editingSection, setEditingSection] = useState<SectionItem | null>(null);
  const [deletingSection, setDeletingSection] = useState<SectionItem | null>(null);

  // Forms
  const [classForm, setClassForm] = useState({
    name: '',
    numericGrade: 1,
    stream: 'Primary',
    displayOrder: 1,
    initialSectionNames: 'A, B'
  });

  const [sectionForm, setSectionForm] = useState({
    name: '',
    roomNumber: '',
    capacity: 40,
    classTeacherName: ''
  });

  const [actionLoading, setActionLoading] = useState(false);

  const fetchClasses = useCallback(async () => {
    if (!activeSchool) {
      setClasses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await api.classes.list(activeSchool.id, activeSession?.id);
      setClasses(res.classes);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch classes.');
    } finally {
      setLoading(false);
    }
  }, [activeSchool, activeSession, toast]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // Handle Add Class
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSchool || !activeSession) {
      toast.error('Active school and session required.');
      return;
    }

    setActionLoading(true);
    try {
      const initialSections = classForm.initialSectionNames
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean)
        .map(letter => ({ name: letter, capacity: 40 }));

      await api.classes.create({
        schoolId: activeSchool.id,
        sessionId: activeSession.id,
        name: classForm.name,
        numericGrade: classForm.numericGrade,
        stream: classForm.stream,
        displayOrder: classForm.displayOrder,
        initialSections
      });

      toast.success(`Class '${classForm.name}' created with ${initialSections.length} sections.`);
      setIsAddClassModalOpen(false);
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create class.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Update Class
  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;

    setActionLoading(true);
    try {
      await api.classes.update(editingClass.id, {
        name: classForm.name,
        numeric_grade: classForm.numericGrade,
        stream: classForm.stream,
        display_order: classForm.displayOrder
      });

      toast.success('Class updated successfully.');
      setEditingClass(null);
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update class.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Class
  const handleDeleteClass = async () => {
    if (!deletingClass) return;

    setActionLoading(true);
    try {
      await api.classes.delete(deletingClass.id);
      toast.success(`Class '${deletingClass.name}' deactivated.`);
      setDeletingClass(null);
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete class.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Add Section
  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingSectionForClass) return;

    setActionLoading(true);
    try {
      await api.sections.create({
        classId: addingSectionForClass.id,
        name: sectionForm.name.toUpperCase(),
        roomNumber: sectionForm.roomNumber,
        capacity: sectionForm.capacity,
        classTeacherName: sectionForm.classTeacherName
      });

      toast.success(`Section ${sectionForm.name.toUpperCase()} added to ${addingSectionForClass.name}.`);
      setAddingSectionForClass(null);
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create section.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Update Section
  const handleUpdateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;

    setActionLoading(true);
    try {
      await api.sections.update(editingSection.id, {
        name: sectionForm.name.toUpperCase(),
        room_number: sectionForm.roomNumber,
        capacity: sectionForm.capacity,
        class_teacher_name: sectionForm.classTeacherName
      });

      toast.success('Section updated.');
      setEditingSection(null);
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update section.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Section
  const handleDeleteSection = async () => {
    if (!deletingSection) return;

    setActionLoading(true);
    try {
      await api.sections.delete(deletingSection.id);
      toast.success(`Section ${deletingSection.name} removed.`);
      setDeletingSection(null);
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove section.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredClasses = classes.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.stream.toLowerCase().includes(search.toLowerCase());
    const matchesStream = streamFilter === 'ALL' || c.stream.toUpperCase() === streamFilter;
    return matchesSearch && matchesStream;
  });

  const streams = ['ALL', 'EARLY YEARS', 'PRIMARY', 'MIDDLE', 'SECONDARY', 'SCIENCE', 'COMMERCE'];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Classes & Sections
            </h1>
            {activeSchool && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono">
                {activeSchool.name}
              </span>
            )}
            {activeSession && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono">
                {activeSession.name}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Class hierarchy, section allotments, classroom venues, and teacher assignments
          </p>
        </div>

        {hasPermission('classes.create') && (
          <button
            onClick={() => {
              setClassForm({
                name: '',
                numericGrade: 1,
                stream: 'Primary',
                displayOrder: classes.length + 1,
                initialSectionNames: 'A, B'
              });
              setIsAddClassModalOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add New Class
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search class name or stream..."
            className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Stream Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {streams.map((s) => (
            <button
              key={s}
              onClick={() => setStreamFilter(s)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors whitespace-nowrap ${
                streamFilter === s
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Classes Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">No classes found</h3>
          <p className="text-xs text-slate-400 mt-1">Add a new class or adjust the stream filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClasses.map((cls) => (
            <div
              key={cls.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Class Title Strip */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 leading-tight">
                      {cls.name}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span>Stream: {cls.stream}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[11px]">Grade {cls.numeric_grade}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {hasPermission('classes.edit') && (
                      <button
                        onClick={() => {
                          setEditingClass(cls);
                          setClassForm({
                            name: cls.name,
                            numericGrade: cls.numeric_grade,
                            stream: cls.stream,
                            displayOrder: cls.display_order,
                            initialSectionNames: ''
                          });
                        }}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title="Edit Class"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {hasPermission('classes.delete') && (
                      <button
                        onClick={() => setDeletingClass(cls)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Class"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sections List */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <span>Active Sections ({cls.sections?.length || 0})</span>
                    <span className="font-mono">Capacity: {cls.total_capacity || 0}</span>
                  </div>

                  {cls.sections && cls.sections.length > 0 ? (
                    <div className="space-y-1.5">
                      {cls.sections.map((sec) => (
                        <div
                          key={sec.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-slate-900 text-white font-bold text-xs flex items-center justify-center font-mono">
                              {sec.name}
                            </span>
                            <div>
                              <div className="font-medium text-slate-800 flex items-center gap-1.5">
                                <DoorOpen className="w-3 h-3 text-slate-400" />
                                <span>{sec.room_number || 'Room TBD'}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                <UserCheck className="w-3 h-3 text-slate-400" />
                                <span>{sec.class_teacher_name || 'Teacher not assigned'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-mono">
                              Cap: {sec.capacity}
                            </span>
                            {hasPermission('sections.edit') && (
                              <button
                                onClick={() => {
                                  setEditingSection(sec);
                                  setSectionForm({
                                    name: sec.name,
                                    roomNumber: sec.room_number || '',
                                    capacity: sec.capacity,
                                    classTeacherName: sec.class_teacher_name || ''
                                  });
                                }}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                            )}
                            {hasPermission('sections.delete') && (
                              <button
                                onClick={() => setDeletingSection(sec)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-100 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                      No sections configured.
                    </div>
                  )}
                </div>
              </div>

              {/* Add Section Action Button */}
              {hasPermission('sections.create') && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setAddingSectionForClass(cls);
                      setSectionForm({
                        name: String.fromCharCode(65 + (cls.sections?.length || 0)),
                        roomNumber: `R-${100 + cls.numeric_grade * 2 + (cls.sections?.length || 0)}`,
                        capacity: 40,
                        classTeacherName: ''
                      });
                    }}
                    className="w-full py-1.5 px-3 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Section to {cls.name}</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Class Modal */}
      <Modal
        isOpen={isAddClassModalOpen}
        onClose={() => setIsAddClassModalOpen(false)}
        title="Add New Academic Class"
        description={`Define a class grade in ${activeSchool?.name || 'campus'}`}
        maxWidth="md"
      >
        <form onSubmit={handleCreateClass} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Class Name *
            </label>
            <input
              type="text"
              required
              value={classForm.name}
              onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
              placeholder="e.g. Class 10, Class 11 - Science"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Numeric Grade *
              </label>
              <input
                type="number"
                required
                min={0}
                max={12}
                value={classForm.numericGrade}
                onChange={(e) => setClassForm({ ...classForm, numericGrade: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Curriculum Stream
              </label>
              <select
                value={classForm.stream}
                onChange={(e) => setClassForm({ ...classForm, stream: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
              >
                <option value="Early Years">Early Years (Pre-Primary)</option>
                <option value="Primary">Primary (Grades 1-5)</option>
                <option value="Middle">Middle (Grades 6-8)</option>
                <option value="Secondary">Secondary (Grades 9-10)</option>
                <option value="Science">Senior Secondary - Science</option>
                <option value="Commerce">Senior Secondary - Commerce</option>
                <option value="Arts">Senior Secondary - Arts / Humanities</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Display Order
              </label>
              <input
                type="number"
                value={classForm.displayOrder}
                onChange={(e) => setClassForm({ ...classForm, displayOrder: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Sections (comma separated)
              </label>
              <input
                type="text"
                value={classForm.initialSectionNames}
                onChange={(e) => setClassForm({ ...classForm, initialSectionNames: e.target.value })}
                placeholder="A, B, C"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none uppercase font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddClassModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors"
            >
              {actionLoading ? 'Creating...' : 'Create Class'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Class Modal */}
      <Modal
        isOpen={!!editingClass}
        onClose={() => setEditingClass(null)}
        title="Edit Class"
        description="Update class configuration"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateClass} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Class Name
            </label>
            <input
              type="text"
              required
              value={classForm.name}
              onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Numeric Grade
              </label>
              <input
                type="number"
                value={classForm.numericGrade}
                onChange={(e) => setClassForm({ ...classForm, numericGrade: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stream
              </label>
              <select
                value={classForm.stream}
                onChange={(e) => setClassForm({ ...classForm, stream: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
              >
                <option value="Early Years">Early Years</option>
                <option value="Primary">Primary</option>
                <option value="Middle">Middle</option>
                <option value="Secondary">Secondary</option>
                <option value="Science">Science</option>
                <option value="Commerce">Commerce</option>
                <option value="Arts">Arts</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Display Order
            </label>
            <input
              type="number"
              value={classForm.displayOrder}
              onChange={(e) => setClassForm({ ...classForm, displayOrder: parseInt(e.target.value, 10) })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditingClass(null)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors"
            >
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Section Modal */}
      <Modal
        isOpen={!!addingSectionForClass}
        onClose={() => setAddingSectionForClass(null)}
        title={`Add Section to ${addingSectionForClass?.name || 'Class'}`}
        description="Allocate section code, venue room, and seat capacity"
        maxWidth="md"
      >
        <form onSubmit={handleCreateSection} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Section Name *
              </label>
              <input
                type="text"
                required
                value={sectionForm.name}
                onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value.toUpperCase() })}
                placeholder="e.g. A, B, C"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none uppercase font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Room Number
              </label>
              <input
                type="text"
                value={sectionForm.roomNumber}
                onChange={(e) => setSectionForm({ ...sectionForm, roomNumber: e.target.value })}
                placeholder="e.g. R-204"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Student Capacity
              </label>
              <input
                type="number"
                min={1}
                value={sectionForm.capacity}
                onChange={(e) => setSectionForm({ ...sectionForm, capacity: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Class Teacher
              </label>
              <input
                type="text"
                value={sectionForm.classTeacherName}
                onChange={(e) => setSectionForm({ ...sectionForm, classTeacherName: e.target.value })}
                placeholder="e.g. Priya Pandey"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAddingSectionForClass(null)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors"
            >
              {actionLoading ? 'Adding...' : 'Add Section'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Section Modal */}
      <Modal
        isOpen={!!editingSection}
        onClose={() => setEditingSection(null)}
        title="Edit Section Details"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateSection} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
              <input
                type="text"
                required
                value={sectionForm.name}
                onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none uppercase font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Room Number</label>
              <input
                type="text"
                value={sectionForm.roomNumber}
                onChange={(e) => setSectionForm({ ...sectionForm, roomNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Capacity</label>
              <input
                type="number"
                min={1}
                value={sectionForm.capacity}
                onChange={(e) => setSectionForm({ ...sectionForm, capacity: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Class Teacher</label>
              <input
                type="text"
                value={sectionForm.classTeacherName}
                onChange={(e) => setSectionForm({ ...sectionForm, classTeacherName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditingSection(null)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors"
            >
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={!!deletingClass}
        onClose={() => setDeletingClass(null)}
        onConfirm={handleDeleteClass}
        title="Deactivate Class"
        message={`Are you sure you want to deactivate ${deletingClass?.name}? All associated section rosters will remain in historical database records.`}
        confirmLabel="Deactivate Class"
        isDestructive
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={!!deletingSection}
        onClose={() => setDeletingSection(null)}
        onConfirm={handleDeleteSection}
        title="Deactivate Section"
        message={`Are you sure you want to deactivate section ${deletingSection?.name}?`}
        confirmLabel="Deactivate Section"
        isDestructive
        loading={actionLoading}
      />
    </div>
  );
};
