'use client';

import { useState } from 'react';
import GlassCard from './GlassCard';
import {
  getTasks,
  createTask,
  createMyTaskInProject,
  deleteTask,
  updateTask,
} from '@/app/actions/taskActions';
import { getProjects } from '@/app/actions/projectActions';
import useSWR from 'swr';
import { Plus, Trash2 } from 'lucide-react';

type Task = {
  id: string;
  title: string;
  listId: string;
  userId: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  createdAt: Date;
};

const PRIORITY_COLOR: Record<Task['priority'], string> = {
  LOW:    '#22c55e',
  MEDIUM: '#3b82f6',
  HIGH:   '#eab308',
  URGENT: '#ef4444',
};

const VIRTUAL_LISTS = new Set(['recent_assignments', 'all_tasks']);

export default function TaskList({ title, listId, placeholder, bgColor }: { title: string, listId: string, placeholder: string, bgColor?: string }) {
  const [inputValue, setInputValue] = useState('');
  const isVirtual = VIRTUAL_LISTS.has(listId);

  const { data: tasks = [], mutate, isLoading } = useSWR<Task[]>(listId, getTasks, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const { data: projects = [] } = useSWR(
    isVirtual ? 'projects' : null,
    getProjects,
    { revalidateOnFocus: false },
  );

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const effectiveProjectId = selectedProjectId || projects[0]?.id || '';

  const handleAddTask = async () => {
    const newTitle = inputValue.trim();
    if (!newTitle) return;
    if (isVirtual && !effectiveProjectId) return;

    setInputValue('');

    const optimistic: Task = {
      id: `temp-${Date.now()}`,
      title: newTitle,
      listId,
      userId: 'temp',
      status: 'TODO',
      priority: 'MEDIUM',
      createdAt: new Date(),
    };

    mutate([...tasks, optimistic], false);

    try {
      if (isVirtual) {
        await createMyTaskInProject(newTitle, effectiveProjectId);
      } else {
        await createTask(newTitle, listId);
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    }
    mutate();
  };

  const updateStatus = async (taskId: string, newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
    mutate(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t), false);
    await updateTask(taskId, { status: newStatus });
    mutate();
  };

  const handleRemoveTask = async (id: string) => {
    mutate(tasks.filter(task => task.id !== id), false);
    await deleteTask(id);
    mutate();
  };

  if (isLoading) {
    return (
      <GlassCard className="flex flex-col h-full min-h-[300px] animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div className="w-24 h-4 bg-white/40 rounded"></div>
          <div className="w-6 h-4 bg-white/40 rounded-full"></div>
        </div>
        <div className="space-y-3 flex-grow">
          <div className="w-full h-12 bg-white/40 rounded-lg"></div>
          <div className="w-full h-12 bg-white/40 rounded-lg"></div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="flex flex-col h-full transition-all duration-300 group/list" style={bgColor ? { background: bgColor } : undefined}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          {title}
        </h3>
        <span className="text-xs bg-white/60 text-foreground px-2 py-0.5 rounded-full font-bold border border-white/60">
          {tasks.length}
        </span>
      </div>

      <div className="flex-grow space-y-2 mb-6 overflow-y-auto max-h-[400px] custom-scrollbar pr-1">
        {tasks.map(task => {
          const priority = task.priority ?? 'MEDIUM';
          return (
            <div key={task.id} className={`bg-white/50 border border-white/60 p-3 rounded-xl flex items-center justify-between group transition-all hover:bg-white/70 ${task.status === 'DONE' ? 'opacity-50' : 'opacity-100'} ${task.id.startsWith('temp-') ? 'animate-pulse' : ''}`}>
              <div className="flex flex-col gap-2 min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    aria-label={`${priority.toLowerCase()} priority`}
                    title={`${priority.charAt(0) + priority.slice(1).toLowerCase()} priority`}
                    className="inline-block w-6 h-2.5 rounded-full border flex-shrink-0"
                    style={{
                      background: `${PRIORITY_COLOR[priority]}40`,
                      borderColor: `${PRIORITY_COLOR[priority]}99`,
                    }}
                  />
                  <span className={`text-sm truncate font-medium ${task.status === 'DONE' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={task.status}
                    onChange={(e) => updateStatus(task.id, e.target.value as 'TODO' | 'IN_PROGRESS' | 'DONE')}
                    className={`text-[9px] font-bold uppercase tracking-wider rounded-md px-1.5 py-0.5 border transition-all cursor-pointer outline-none ${
                      task.status === 'DONE' ? 'bg-green-100 border-green-300/60 text-green-700' :
                      task.status === 'IN_PROGRESS' ? 'bg-blue-100 border-blue-300/60 text-blue-700' :
                      'bg-white/60 border-white/60 text-muted-foreground'
                    }`}
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => handleRemoveTask(task.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
        {tasks.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12 italic bg-white/30 rounded-2xl border border-dashed border-white/50">
            No tasks found.
          </div>
        )}
      </div>

      <div className="mt-auto flex items-stretch gap-2">
        {isVirtual && (
          <select
            value={effectiveProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            disabled={projects.length === 0}
            className="bg-white border border-white/80 rounded-xl px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all min-w-[8rem] max-w-[12rem] truncate disabled:opacity-50 disabled:cursor-not-allowed"
            title="Project for new task (assigned to me)"
          >
            {projects.length === 0 && <option value="">No projects</option>}
            {projects.map((p: { id: string; name: string }) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        <div className="relative flex-1 group-focus-within/list:ring-2 ring-primary/20 rounded-xl transition-all">
          <input
            type="text"
            placeholder={isVirtual && projects.length === 0 ? 'Create a project first…' : placeholder}
            disabled={isVirtual && projects.length === 0}
            className="w-full bg-white border border-white/80 rounded-xl py-3 pl-4 pr-12 text-sm font-medium text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(); }}
          />
          <button
            onClick={handleAddTask}
            disabled={!inputValue.trim() || (isVirtual && !effectiveProjectId)}
            className="absolute right-2 top-2 p-1.5 bg-primary hover:bg-primary/90 disabled:bg-white/60 disabled:text-muted-foreground text-white rounded-lg transition-all shadow-md shadow-primary/30 disabled:shadow-none"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </GlassCard>
  );
}
