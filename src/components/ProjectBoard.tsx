'use client';

import Link from 'next/link';
import { MouseEvent as ReactMouseEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import BoardColumn, { DEFAULT_LIST_COLOR } from './BoardColumn';
import { BoardDragProvider, DraggableTask } from './BoardDragContext';
import { moveTask, updateTask } from '@/app/actions/taskActions';
import {
  createBoardList,
  deleteBoardList,
  getBoardLists,
  getProjects,
  renameBoardList,
  reorderBoardLists,
  updateBoardListColor,
} from '@/app/actions/projectActions';
import { getAllUsers, addMemberToProject, removeMemberFromProject, addUserByEmail, getAuthUser, setMemberRole } from '@/app/actions/userActions';
import { Plus, ChevronLeft, BarChart2, X, ChevronDown, Check, Trash2 } from 'lucide-react';

type UserProfile = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  email: string;
};

type ProjectRole = 'ADMIN' | 'MEMBER';

type ProjectMembership = {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  user: UserProfile;
};

type Project = {
  id: string;
  name: string;
  color: string;
  userId: string;
  members: ProjectMembership[];
  createdAt: Date;
};

type BoardList = {
  id: string;
  name: string;
  color: string;
  userId: string;
  projectId: string;
  position: number;
  createdAt: Date;
};

const AVATAR_PALETTE = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#06b6d4', '#a855f7'];
function avatarBgFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

export default function ProjectBoard({ projectId }: { projectId: string }) {
  const { data: projects = [], mutate: mutateProjects, isLoading: projectsLoading } = useSWR<Project[]>(
    'projects',
    getProjects,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );
  const { data: allUsers = [] } = useSWR('users', getAllUsers, { revalidateOnFocus: false, dedupingInterval: 60000 });
  const { data: me } = useSWR('auth-user', getAuthUser, { revalidateOnFocus: false, dedupingInterval: 60000 });
  
  const { data: lists = [], mutate, isLoading: listsLoading } = useSWR<BoardList[]>(
    `board:${projectId}`,
    () => getBoardLists(projectId),
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );
  const [draft, setDraft] = useState<{ id: string; color: string; index: number } | null>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [shareInput, setShareInput] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [roleMenuFor, setRoleMenuFor] = useState<string | null>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const [draggingListId, setDraggingListId] = useState<string | null>(null);
  const [listDropIndex, setListDropIndex] = useState<number | null>(null);
  const [listDragGhost, setListDragGhost] = useState<{
    pos: { x: number; y: number };
    pointerOffset: { x: number; y: number };
    width: number;
    title: string;
    color: string;
    taskCount: number;
  } | null>(null);
  const listsContainerRef = useRef<HTMLDivElement>(null);
  const lastDropIndexRef = useRef<number | null>(null);
  const LIST_DRAG_THRESHOLD_PX = 6;

  const project = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId],
  );
  const memberUsers = useMemo<UserProfile[]>(
    () => (project?.members ?? []).map((m) => m.user),
    [project?.members],
  );
  const myMembership = useMemo(
    () => project?.members.find((m) => m.userId === me?.id) ?? null,
    [project?.members, me?.id],
  );
  const iAmAdmin = !!project && (project.userId === me?.id || myMembership?.role === 'ADMIN');

  const startDraft = (index: number) => {
    if (draft) return;
    setDraft({
      id: `draft-${Date.now()}`,
      color: DEFAULT_LIST_COLOR,
      index: Math.max(0, Math.min(index, lists.length)),
    });
  };

  const cancelDraft = () => setDraft(null);

  const commitDraft = async (name: string) => {
    if (!draft) return;
    const { color, index } = draft;
    setDraft(null);

    const optimistic: BoardList = {
      id: `temp-${Date.now()}`,
      name,
      color,
      userId: 'temp',
      projectId,
      position: index,
      createdAt: new Date(),
    };
    const next = [
      ...lists.slice(0, index),
      optimistic,
      ...lists.slice(index),
    ].map((l, i) => ({ ...l, position: i }));
    mutate(next, false);

    await createBoardList(projectId, name, color, index);
    mutate();
  };

  const handleAddMember = async (userId: string, role: 'ADMIN' | 'MEMBER' = 'MEMBER') => {
    try {
      await addMemberToProject(projectId, userId, role);
      await mutateProjects();
    } catch (err) {
      console.error('Failed to add member:', err);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeMemberFromProject(projectId, userId);
      await mutateProjects();
      console.log('Member removed successfully:', userId);
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleSetMemberRole = async (userId: string, role: 'ADMIN' | 'MEMBER') => {
    try {
      await setMemberRole(projectId, userId, role);
      await mutateProjects();
    } catch (err) {
      console.error('Failed to set role:', err);
    } finally {
      setRoleMenuFor(null);
    }
  };

  // Close the per-member role popup when clicking outside.
  useEffect(() => {
    if (!roleMenuFor) return;
    const onDown = (e: PointerEvent) => {
      if (!roleMenuRef.current?.contains(e.target as Node)) setRoleMenuFor(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [roleMenuFor]);

  const handleShareInvite = async () => {
    const q = shareInput.trim();
    if (!q || !project) return;
    setShareError(null);
    setShareBusy(true);
    try {
      const qLower = q.toLowerCase();
      // Try existing users first: exact email, then name contains.
      const match =
        allUsers.find((u) => u.email.toLowerCase() === qLower) ??
        allUsers.find((u) => (u.name ?? '').toLowerCase().includes(qLower));
      const role = inviteRole === 'admin' ? 'ADMIN' : 'MEMBER';
      if (match) {
        if (project.members.some((m) => m.userId === match.id)) {
          setShareError('Already a member');
          return;
        }
        await handleAddMember(match.id, role);
        setShareInput('');
        return;
      }
      // No match — invite by email.
      if (!q.includes('@')) {
        setShareError('No user found. Enter an email to invite.');
        return;
      }
      const result = await addUserByEmail(q);
      if (!result.ok) {
        setShareError(result.error);
        return;
      }
      await handleAddMember(result.user.id, role);
      setShareInput('');
    } finally {
      setShareBusy(false);
    }
  };

  const handleRemoveList = async (id: string) => {
    mutate(lists.filter((l) => l.id !== id), false);
    await deleteBoardList(id);
    mutate();
  };

  const handleRenameList = async (id: string, newName: string) => {
    mutate(
      lists.map((l) => (l.id === id ? { ...l, name: newName } : l)),
      false,
    );
    await renameBoardList(id, newName);
    mutate();
  };

  const handleChangeListColor = async (id: string, color: string) => {
    mutate(
      lists.map((l) => (l.id === id ? { ...l, color } : l)),
      false,
    );
    await updateBoardListColor(id, color);
    mutate();
  };

  const handleListDragStart = (listId: string, e: React.PointerEvent<HTMLDivElement>) => {
    if (draft) return;
    const startX = e.clientX;
    const startY = e.clientY;
    let started = false;

    // Cache the column wrapper rect so the ghost follows the cursor with the
    // same grab offset the user started with.
    const columnEl = listsContainerRef.current?.querySelector(
      `[data-list-id="${listId}"]`,
    ) as HTMLElement | null;
    const rect = columnEl?.getBoundingClientRect();
    const ghostBase = rect
      ? {
          pointerOffset: { x: startX - rect.left, y: startY - rect.top },
          width: rect.width,
        }
      : null;
    const list = lists.find((l) => l.id === listId);

    // Returns the slot where the dragged list should land, expressed as an index
    // in `lists.filter(l => l.id !== listId)`. commitListReorder consumes that.
    const computeDropIndex = (clientX: number): number => {
      const container = listsContainerRef.current;
      if (!container) return 0;
      const items = Array.from(container.children) as HTMLElement[];
      const midpoints: number[] = [];
      for (const el of items) {
        if (!el?.dataset?.listId) continue;
        if (el.dataset.listId === listId) continue;
        const r = el.getBoundingClientRect();
        midpoints.push(r.left + r.width / 2);
      }
      for (let i = 0; i < midpoints.length; i++) {
        if (clientX < midpoints[i]) return i;
      }
      return midpoints.length;
    };

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!started) {
        if (dx * dx + dy * dy < LIST_DRAG_THRESHOLD_PX * LIST_DRAG_THRESHOLD_PX) return;
        started = true;
        setDraggingListId(listId);
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
        if (ghostBase && list) {
          setListDragGhost({
            pos: { x: ev.clientX, y: ev.clientY },
            pointerOffset: ghostBase.pointerOffset,
            width: ghostBase.width,
            title: list.name,
            color: list.color,
            taskCount: 0,
          });
        }
      } else if (ghostBase) {
        setListDragGhost((prev) =>
          prev ? { ...prev, pos: { x: ev.clientX, y: ev.clientY } } : prev,
        );
      }
      const idx = computeDropIndex(ev.clientX);
      lastDropIndexRef.current = idx;
      setListDropIndex(idx);
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', cleanup);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      setDraggingListId(null);
      setListDropIndex(null);
      setListDragGhost(null);
      lastDropIndexRef.current = null;
    };

    const onUp = () => {
      const dropAt = lastDropIndexRef.current;
      const wasDragging = started;
      cleanup();
      if (wasDragging && dropAt !== null) {
        void commitListReorder(listId, dropAt);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', cleanup);
  };

  const commitListReorder = async (listId: string, toIndex: number) => {
    const fromIndex = lists.findIndex((l) => l.id === listId);
    if (fromIndex === -1) return;
    // Clamp: when removing the source first, the target index shifts.
    const without = lists.filter((l) => l.id !== listId);
    const clamped = Math.max(0, Math.min(toIndex, without.length));
    if (clamped === fromIndex) return; // no-op
    const reordered = [
      ...without.slice(0, clamped),
      lists[fromIndex],
      ...without.slice(clamped),
    ].map((l, i) => ({ ...l, position: i }));
    mutate(reordered, false);
    try {
      await reorderBoardLists(projectId, reordered.map((l) => l.id));
    } finally {
      mutate();
    }
  };

  const handleBoardDoubleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (draft) return;
    const container = listsContainerRef.current;
    if (!container) return;

    const listEls = Array.from(container.children).slice(0, lists.length);
    const x = e.clientX;
    let insertAt = listEls.length;
    for (let i = 0; i < listEls.length; i++) {
      const r = (listEls[i] as HTMLElement).getBoundingClientRect();
      const mid = r.left + r.width / 2;
      if (x < mid) {
        insertAt = i;
        break;
      }
    }
    startDraft(insertAt);
  };

  // Map column name → task status for automatic status update on drag
  const getStatusFromListName = (listName: string): 'TODO' | 'IN_PROGRESS' | 'DONE' | null => {
    const n = listName.toLowerCase().trim();
    if (n === 'to do' || n === 'todo') return 'TODO';
    if (n === 'in progress') return 'IN_PROGRESS';
    if (n === 'done' || n === 'completed') return 'DONE';
    return null;
  };

  const handleDrop = useCallback(
    async (
      task: DraggableTask,
      sourceListId: string,
      targetListId: string,
      targetIndex: number,
    ) => {
      // Determine new status from target column name
      const targetList = lists.find((l) => l.id === targetListId);
      const newStatus = targetList ? getStatusFromListName(targetList.name) : null;

      if (sourceListId === targetListId) {
        globalMutate(
          targetListId,
          (cur: DraggableTask[] = []) => {
            const without = cur.filter((t) => t.id !== task.id);
            const clamped = Math.max(0, Math.min(targetIndex, without.length));
            const next = [
              ...without.slice(0, clamped),
              task,
              ...without.slice(clamped),
            ];
            return next.map((t, i) => ({ ...t, position: i }));
          },
          false,
        );
      } else {
        globalMutate(
          sourceListId,
          (cur: DraggableTask[] = []) =>
            cur
              .filter((t) => t.id !== task.id)
              .map((t, i) => ({ ...t, position: i })),
          false,
        );
        globalMutate(
          targetListId,
          (cur: DraggableTask[] = []) => {
            const clamped = Math.max(0, Math.min(targetIndex, cur.length));
            const updatedTask = newStatus
              ? { ...task, listId: targetListId, status: newStatus }
              : { ...task, listId: targetListId };
            const next = [
              ...cur.slice(0, clamped),
              updatedTask,
              ...cur.slice(clamped),
            ];
            return next.map((t, i) => ({ ...t, position: i }));
          },
          false,
        );
      }

      try {
        await moveTask(task.id, targetListId, targetIndex);
        // Auto-update status based on which column the task was dropped into
        if (newStatus && sourceListId !== targetListId) {
          await updateTask(task.id, { status: newStatus });
        }
      } finally {
        globalMutate(sourceListId);
        if (sourceListId !== targetListId) globalMutate(targetListId);
      }
    },
    [lists],
  );

  if (projectsLoading) {
    return (
      <div className="flex h-full animate-in fade-in duration-500">
        <div className="w-72 flex-shrink-0 bg-white/40 border-r border-white/40" />
        <div className="flex-1 p-6 space-y-4">
          <div className="h-8 w-48 bg-white/40 rounded animate-pulse" />
          <div className="flex gap-4">
            <div className="w-72 h-96 bg-white/40 rounded-2xl animate-pulse" />
            <div className="w-72 h-96 bg-white/40 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 space-y-4 max-w-2xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
        <div className="glass rounded-3xl p-12 text-center border border-white/40">
          <h2 className="text-2xl font-bold text-foreground mb-2">Project Not Found</h2>
          <p className="text-muted-foreground mb-6">
            This project doesn&apos;t exist or you don&apos;t have permission to view it.
          </p>
          <Link href="/dashboard" className="px-6 py-2 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-all">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <BoardDragProvider onDrop={handleDrop}>
      <div className="flex h-full w-full overflow-hidden bg-white/60">
        {/* Main board area */}
        <div
          className="flex-1 flex flex-col overflow-hidden relative"
          style={{
            background: `radial-gradient(circle at top right, ${project.color}33, transparent), linear-gradient(180deg, rgba(0,0,0,0.4) 0%, #0a0a0a 100%)`,
          }}
        >
          {/* Header */}
          <header className="flex items-center justify-between px-8 py-5 border-b border-white/40 backdrop-blur-md bg-white/40 z-10">
            <div className="flex items-center gap-6 min-w-0">
              <Link href="/dashboard" className="p-2 hover:bg-white/40 rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-extrabold text-foreground tracking-tight truncate">
                  {project.name}
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Project</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Member Avatars */}
              <div className="flex -space-x-2 overflow-hidden mr-2">
                {project.members.map(({ user: m }) => (
                  <div key={m.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-black bg-gray-800 flex items-center justify-center text-[10px] font-bold text-foreground border border-white/50" title={m.name || m.email}>
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt={m.name || ''} className="h-full w-full object-cover" />
                    ) : (
                      (m.name || m.email).charAt(0).toUpperCase()
                    )}
                  </div>
                ))}
                <button 
                  onClick={() => setShowMemberModal(true)}
                  className="inline-flex h-8 w-8 rounded-full ring-2 ring-black bg-white/40 items-center justify-center text-muted-foreground hover:bg-white/50 hover:text-foreground transition-all border border-white/50 border-dashed"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="h-8 w-px bg-white/50 mx-2" />

              <Link 
                href="/dashboard/stats" 
                className="flex items-center gap-2 px-4 py-2 bg-white/40 hover:bg-white/50 text-foreground rounded-xl text-sm font-bold transition-all border border-white/40"
              >
                <BarChart2 className="w-4 h-4" />
                Stats
              </Link>
            </div>
          </header>

          {/* Board Content */}
          <div
            className="flex-1 overflow-x-auto custom-scrollbar p-8"
            onDoubleClick={handleBoardDoubleClick}
          >
            <div
              ref={listsContainerRef}
              className="flex gap-6 items-start min-h-full"
              onDoubleClick={handleBoardDoubleClick}
            >
              {listsLoading && lists.length === 0 && (
                <div className="flex gap-6">
                  <div className="w-72 h-96 bg-white/40 rounded-3xl animate-pulse" />
                  <div className="w-72 h-96 bg-white/40 rounded-3xl animate-pulse" />
                </div>
              )}

              {(() => {
                const visibleLists = draggingListId
                  ? lists.filter((l) => l.id !== draggingListId)
                  : lists;
                const draftIndex = draft?.index ?? -1;
                const items: ReactNode[] = [];
                for (let i = 0; i <= visibleLists.length; i++) {
                  if (draft && i === draftIndex) {
                    items.push(
                      <BoardColumn
                        key={draft.id}
                        listId={draft.id}
                        title=""
                        color={draft.color}
                        isDraft
                        onDraftCommit={commitDraft}
                        onDraftCancel={cancelDraft}
                        members={memberUsers}
                      />,
                    );
                  }
                  if (!draft && draggingListId && listDropIndex === i) {
                    items.push(
                      <div
                        key={`list-drop-${i}`}
                        aria-hidden
                        className="w-1 h-72 rounded-full bg-white/40 self-stretch flex-shrink-0"
                      />,
                    );
                  }
                  if (i < visibleLists.length) {
                    const l = visibleLists[i];
                    items.push(
                      <div
                        key={l.id}
                        data-list-id={l.id}
                        className="flex-shrink-0"
                      >
                        <BoardColumn
                          listId={l.id}
                          title={l.name}
                          color={l.color}
                          members={memberUsers}
                          onRemoveList={() => handleRemoveList(l.id)}
                          onRename={(name) => handleRenameList(l.id, name)}
                          onChangeColor={(c) => handleChangeListColor(l.id, c)}
                          onHeaderPointerDown={(e) => handleListDragStart(l.id, e)}
                        />
                      </div>,
                    );
                  }
                }
                return items;
              })()}

              <button
                type="button"
                onClick={() => startDraft(lists.length)}
                className="w-72 flex-shrink-0 rounded-2xl border-2 border-dashed border-white/40 bg-white/40 hover:bg-white/40 hover:border-white/50 transition-all px-4 py-4 flex items-center justify-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground group"
              >
                <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                {lists.length === 0 ? 'Add First List' : 'Add New Column'}
              </button>
            </div>
          </div>

          {listDragGhost && (
            <div
              className="pointer-events-none fixed z-[200] rounded-2xl border border-white/60 shadow-2xl backdrop-blur-md"
              style={{
                left: listDragGhost.pos.x - listDragGhost.pointerOffset.x,
                top: listDragGhost.pos.y - listDragGhost.pointerOffset.y,
                width: listDragGhost.width,
                background: listDragGhost.color,
                transform: 'rotate(3deg)',
                transformOrigin: 'top left',
              }}
            >
              <div className="px-4 pt-4 pb-3 flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground truncate">{listDragGhost.title}</span>
              </div>
            </div>
          )}
        </div>

        {/* Share Board Modal */}
        {showMemberModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-white/60 backdrop-blur-md"
              onClick={() => setShowMemberModal(false)}
            />
            <div className="relative glass w-full max-w-xl rounded-3xl border border-white/50 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="px-6 pt-5 pb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Share board</h3>
                <button
                  onClick={() => setShowMemberModal(false)}
                  aria-label="Close"
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/40 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Invite row */}
              <div className="px-6 pb-3">
                <div className="flex items-stretch gap-2">
                  <input
                    type="text"
                    value={shareInput}
                    onChange={(e) => {
                      setShareInput(e.target.value);
                      if (shareError) setShareError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleShareInvite();
                      }
                    }}
                    placeholder="Email address or name"
                    className="flex-1 bg-white/50 border border-white/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-white/30"
                  />
                  <div className="relative">
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
                      className="appearance-none bg-white/50 border border-white/50 rounded-lg pl-3 pr-8 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-white/30 cursor-pointer"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                  <button
                    onClick={handleShareInvite}
                    disabled={shareBusy || !shareInput.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/50 disabled:text-foreground/40 text-foreground rounded-lg text-sm font-bold transition-all"
                  >
                    Share
                  </button>
                </div>
                {shareError && (
                  <p className="text-xs text-red-400 mt-2">{shareError}</p>
                )}
              </div>

              {/* Tabs */}
              <div className="px-6 border-b border-white/40 flex items-center gap-6">
                <div className="relative pb-3 text-sm font-bold text-foreground flex items-center gap-2">
                  Board members
                  <span className="text-[10px] font-bold bg-white/50 text-foreground px-1.5 py-0.5 rounded">
                    {project.members.length}
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                </div>
                <div className="pb-3 text-sm font-medium text-muted-foreground" title="Coming soon">
                  Join requests
                </div>
              </div>

              {/* Members list */}
              <div className="px-6 py-4 max-h-[360px] overflow-y-auto custom-scrollbar space-y-3">
                {project.members.map((membership) => {
                  const m = membership.user;
                  const isCreator = m.id === project.userId;
                  const isYou = me?.id === m.id;
                  const displayName = m.name || m.email.split('@')[0];
                  const handle = m.email.split('@')[0];
                  const initial = displayName.charAt(0).toUpperCase();
                  const role = membership.role; // ADMIN | MEMBER
                  const roleLabel = role === 'ADMIN' ? 'Admin' : 'Member';
                  const canManage = iAmAdmin && !isCreator;
                  const menuOpen = roleMenuFor === m.id;
                  return (
                    <div key={m.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-foreground flex-shrink-0 overflow-hidden"
                          style={{ background: avatarBgFor(m.id) }}
                        >
                          {m.avatarUrl ? (
                            <img src={m.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                          ) : (
                            initial
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {displayName}
                            {isYou && <span className="ml-1 text-muted-foreground font-normal">(you)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            @{handle} · {isCreator ? 'Workspace admin' : roleLabel}
                          </p>
                        </div>
                      </div>

                      <div className="relative" ref={menuOpen ? roleMenuRef : undefined}>
                        {!canManage ? (
                          <span
                            className={`px-3 py-1.5 border rounded-lg text-sm font-bold flex items-center gap-1 select-none ${
                              role === 'ADMIN'
                                ? 'border-blue-500/40 text-blue-400'
                                : 'border-white/50 text-foreground'
                            }`}
                          >
                            {roleLabel}
                            <ChevronDown className="w-3.5 h-3.5 opacity-40" />
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setRoleMenuFor(menuOpen ? null : m.id)}
                            className={`px-3 py-1.5 border rounded-lg text-sm font-bold flex items-center gap-1 transition-all ${
                              role === 'ADMIN'
                                ? 'border-blue-500/40 text-blue-400 hover:bg-blue-500/10'
                                : 'border-white/50 text-foreground hover:bg-white/40'
                            }`}
                          >
                            {roleLabel}
                            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                          </button>
                        )}

                        {menuOpen && canManage && (
                          <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-white/80 border border-white/50 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
                            <button
                              type="button"
                              onClick={() => handleSetMemberRole(m.id, 'ADMIN')}
                              className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-white/40 text-foreground"
                            >
                              <span>Admin</span>
                              {role === 'ADMIN' && <Check className="w-4 h-4 text-blue-400" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetMemberRole(m.id, 'MEMBER')}
                              className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-white/40 text-foreground"
                            >
                              <span>Member</span>
                              {role === 'MEMBER' && <Check className="w-4 h-4 text-blue-400" />}
                            </button>
                            <div className="h-px bg-white/40" />
                            <button
                              type="button"
                              onClick={() => {
                                setRoleMenuFor(null);
                                handleRemoveMember(m.id);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Remove from board
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </BoardDragProvider>
  );
}
