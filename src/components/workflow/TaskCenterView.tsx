import React, { useState, useEffect } from 'react';
import {
  WorkflowTask,
  TaskComment,
  PriorityLevel,
  TaskStatus
} from './WorkflowCommon';

export const TaskCenterView: React.FC = () => {
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Selected Task for Detail & Comments Drawer
  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  // Create Task Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDept, setNewTaskDept] = useState('Academic');
  const [newTaskRole, setNewTaskRole] = useState('teacher');
  const [newTaskPriority, setNewTaskPriority] = useState<PriorityLevel>('MEDIUM');
  const [newTaskDueDays, setNewTaskDueDays] = useState(2);

  // Reassign Modal State
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignRole, setReassignRole] = useState('principal');
  const [reassignDept, setReassignDept] = useState('Academic');
  const [reassignName, setReassignName] = useState('');
  const [reassignReason, setReassignReason] = useState('');

  const fetchTasks = async () => {
    try {
      setLoading(true);
      let url = `/api/workflow/tasks?my_tasks=${activeTab === 'my'}`;
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
      if (deptFilter !== 'ALL') url += `&department=${deptFilter}`;
      if (priorityFilter !== 'ALL') url += `&priority=${priorityFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (taskId: string) => {
    try {
      setLoadingComments(true);
      const res = await fetch(`/api/workflow/tasks/${taskId}/comments`);
      const data = await res.json();
      if (data.success) {
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [activeTab, statusFilter, deptFilter, priorityFilter]);

  const handleSelectTask = (task: WorkflowTask) => {
    setSelectedTask(task);
    fetchComments(task.id);
  };

  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await fetch(`/api/workflow/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchTasks();
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newComment.trim()) return;

    try {
      await fetch(`/api/workflow/tasks/${selectedTask.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment })
      });
      setNewComment('');
      fetchComments(selectedTask.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + Number(newTaskDueDays));

      const res = await fetch('/api/workflow/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDesc,
          assigned_to_department: newTaskDept,
          assigned_to_role: newTaskRole,
          priority: newTaskPriority,
          due_date: dueDate.toISOString()
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewTaskTitle('');
        setNewTaskDesc('');
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReassignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    try {
      await fetch(`/api/workflow/tasks/${selectedTask.id}/reassign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assigned_to_role: reassignRole,
          assigned_to_department: reassignDept,
          assigned_to_user_name: reassignName || reassignRole,
          reason: reassignReason
        })
      });
      setShowReassignModal(false);
      fetchTasks();
      if (selectedTask) {
        setSelectedTask((prev) =>
          prev
            ? {
                ...prev,
                assigned_to_role: reassignRole,
                assigned_to_department: reassignDept,
                assigned_to_user_name: reassignName
              }
            : null
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getSlaBadge = (task: WorkflowTask) => {
    if (task.status === 'COMPLETED') {
      return <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Completed</span>;
    }
    const due = new Date(task.due_date).getTime();
    const now = Date.now();
    const diffHours = Math.round((due - now) / (1000 * 60 * 60));

    if (diffHours < 0) {
      const days = Math.abs(Math.floor(diffHours / 24));
      return (
        <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-200">
          ⚠️ Overdue by {days > 0 ? `${days}d` : `${Math.abs(diffHours)}h`}
        </span>
      );
    } else if (diffHours <= 24) {
      return (
        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
          Due in {diffHours}h
        </span>
      );
    } else {
      const days = Math.round(diffHours / 24);
      return (
        <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          Due in {days}d
        </span>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Task Trigger */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">Unified Smart Task Center</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
              Automated Queue Routing
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Centrally manages follow-up actions generated by automation rules, clearance checklists, and administrative delegations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-gray-100 p-1 rounded-xl flex items-center">
            <button
              onClick={() => setActiveTab('my')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'my' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Queue
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'all' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All School Queues
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Smart Task
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-medium text-gray-700 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING">Waiting on Response</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-medium text-gray-700 focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            <option value="Academic">Academic</option>
            <option value="Accounts">Accounts & Fees</option>
            <option value="Facilities">Facilities & Store</option>
            <option value="Transport">Transport</option>
            <option value="Hostel">Hostel</option>
            <option value="Safeguarding">Safeguarding</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-medium text-gray-700 focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical Priority</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search task title, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchTasks()}
            className="bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 w-52 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Main Layout: Task Cards List + Detail / Activity Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Task Cards List */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Loading smart tasks...
            </div>
          ) : tasks.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 text-sm">All Tasks Clear</h3>
              <p className="text-xs text-gray-500 mt-1">No open tasks matching your filter criteria.</p>
            </div>
          ) : (
            tasks.map((task) => {
              const isSelected = selectedTask?.id === task.id;

              return (
                <div
                  key={task.id}
                  onClick={() => handleSelectTask(task)}
                  className={`bg-white rounded-2xl border transition shadow-sm p-4 cursor-pointer ${
                    isSelected ? 'border-indigo-500 ring-2 ring-indigo-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                          task.priority === 'CRITICAL' ? 'bg-red-600 text-white' :
                          task.priority === 'HIGH' ? 'bg-amber-500 text-white' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {task.priority}
                        </span>

                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          {task.assigned_to_department}
                        </span>

                        <span className="text-[11px] text-gray-500">
                          Role: <span className="font-semibold text-gray-700">{task.assigned_to_role}</span>
                        </span>

                        {getSlaBadge(task)}
                      </div>

                      <h4 className="text-sm font-bold text-gray-900 leading-snug">{task.title}</h4>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{task.description}</p>

                      <div className="mt-3 flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-2">
                        <span>Assigned to: <strong className="text-gray-700">{task.assigned_to_user_name || task.assigned_to_role}</strong></span>
                        <span>Created by: {task.created_by_name || 'Workflow System'}</span>
                      </div>
                    </div>

                    {/* Quick Status Buttons */}
                    <div className="flex flex-col gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {task.status !== 'COMPLETED' ? (
                        <>
                          {task.status !== 'IN_PROGRESS' && (
                            <button
                              onClick={() => handleUpdateStatus(task.id, 'IN_PROGRESS')}
                              className="px-2.5 py-1 text-[10px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition"
                            >
                              Start
                            </button>
                          )}
                          <button
                            onClick={() => handleUpdateStatus(task.id, 'COMPLETED')}
                            className="px-2.5 py-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition shadow-sm"
                          >
                            Complete
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          ✓ Done
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right 1 Col: Task Detail & Comment Timeline */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          {selectedTask ? (
            <>
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Task Workspace</span>
                <button
                  onClick={() => setShowReassignModal(true)}
                  className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition"
                >
                  Reassign Task
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-900">{selectedTask.title}</h3>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                  {selectedTask.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-400 block text-[10px]">Department:</span>
                  <span className="font-semibold text-gray-800">{selectedTask.assigned_to_department}</span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-400 block text-[10px]">Current Status:</span>
                  <span className="font-bold text-indigo-700">{selectedTask.status}</span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-400 block text-[10px]">Due Date:</span>
                  <span className="font-medium text-gray-800">
                    {new Date(selectedTask.due_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-400 block text-[10px]">Entity Reference:</span>
                  <span className="font-mono text-gray-700">{selectedTask.entity_type} #{selectedTask.entity_id}</span>
                </div>
              </div>

              {/* Status Update Strip */}
              <div className="pt-2">
                <span className="text-xs font-semibold text-gray-700 block mb-1.5">Update Status:</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['OPEN', 'IN_PROGRESS', 'WAITING', 'COMPLETED'] as TaskStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(selectedTask.id, st)}
                      className={`py-1 text-[10px] font-bold rounded transition ${
                        selectedTask.status === st
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments Timeline */}
              <div className="pt-3 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">Activity & Notes</h4>
                <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1">
                  {loadingComments ? (
                    <p className="text-xs text-gray-400">Loading notes...</p>
                  ) : comments.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No notes logged yet.</p>
                  ) : (
                    comments.map((cm) => (
                      <div key={cm.id} className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 text-xs">
                        <div className="flex items-center justify-between font-semibold text-gray-800 text-[11px] mb-1">
                          <span>{cm.user_name}</span>
                          <span className="text-[10px] text-gray-400 font-normal">
                            {new Date(cm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-gray-700">{cm.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment Input */}
                <form onSubmit={handleAddComment} className="mt-3 flex gap-2">
                  <input
                    type="text"
                    placeholder="Log progress note or outreach result..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 text-xs p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                  >
                    Post
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-gray-400 text-xs">
              Select a task from the list to view full activity, notes, and reassignment controls.
            </div>
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 bg-indigo-600 text-white font-bold text-sm flex items-center justify-between">
              <span>Create Smart Workflow Task</span>
              <button onClick={() => setShowCreateModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateTask} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Follow up on fee installment or syllabus recovery"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Instructions / Description</label>
                <textarea
                  rows={3}
                  placeholder="Detailed instructions for the assigned role or staff member..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Department</label>
                  <select
                    value={newTaskDept}
                    onChange={(e) => setNewTaskDept(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg"
                  >
                    <option value="Academic">Academic</option>
                    <option value="Accounts">Accounts & Fees</option>
                    <option value="Facilities">Facilities & Store</option>
                    <option value="Transport">Transport</option>
                    <option value="Hostel">Hostel</option>
                    <option value="Administration">Administration</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Assigned Role</label>
                  <select
                    value={newTaskRole}
                    onChange={(e) => setNewTaskRole(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg"
                  >
                    <option value="teacher">Class / Subject Teacher</option>
                    <option value="principal">Principal</option>
                    <option value="school_admin">School Admin</option>
                    <option value="accountant">Accountant</option>
                    <option value="transport_manager">Transport Manager</option>
                    <option value="hostel_warden">Hostel Warden</option>
                    <option value="librarian">Librarian</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as PriorityLevel)}
                    className="w-full p-2 border border-gray-200 rounded-lg"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">SLA Due Duration</label>
                  <select
                    value={newTaskDueDays}
                    onChange={(e) => setNewTaskDueDays(Number(e.target.value))}
                    className="w-full p-2 border border-gray-200 rounded-lg"
                  >
                    <option value={1}>1 Day (Urgent)</option>
                    <option value={2}>2 Days (Standard)</option>
                    <option value={3}>3 Days</option>
                    <option value={7}>7 Days (1 Week)</option>
                    <option value={14}>14 Days (2 Weeks)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
                >
                  Dispatch Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {showReassignModal && selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-900 text-white font-bold text-sm flex items-center justify-between">
              <span>Reassign Task #{selectedTask.id}</span>
              <button onClick={() => setShowReassignModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleReassignTask} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Department</label>
                <select
                  value={reassignDept}
                  onChange={(e) => setReassignDept(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg"
                >
                  <option value="Academic">Academic</option>
                  <option value="Accounts">Accounts</option>
                  <option value="Facilities">Facilities</option>
                  <option value="Transport">Transport</option>
                  <option value="Hostel">Hostel</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Target Role</label>
                <select
                  value={reassignRole}
                  onChange={(e) => setReassignRole(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg"
                >
                  <option value="principal">Principal</option>
                  <option value="school_admin">School Admin</option>
                  <option value="teacher">Teacher</option>
                  <option value="accountant">Accountant</option>
                  <option value="transport_manager">Transport Manager</option>
                  <option value="hostel_warden">Hostel Warden</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Specific Staff Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Sunita Mishra"
                  value={reassignName}
                  onChange={(e) => setReassignName(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Reassignment Justification</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Escalating to supervisor or rebalancing teacher workload"
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowReassignModal(false)}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
                >
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
