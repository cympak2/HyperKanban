'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import CreateBoardModal from '@/components/CreateBoardModal';
import type { Board, Project, BoardType } from '@/types';
import { BoardState } from '@/types';

interface EditFormState {
  name: string;
  description: string;
  projectId: string;
  type: string;
}

const STATE_COLORS: Record<BoardState, string> = {
  [BoardState.Draft]: 'bg-gray-100 text-gray-600',
  [BoardState.Active]: 'bg-green-100 text-green-700',
  [BoardState.Inactive]: 'bg-red-100 text-red-600',
};

const BOARD_TYPES = [
  'ProductOwner',
  'BusinessAnalytics',
  'Development',
  'QA',
  'DevOps',
  'Custom',
];

export default function BoardsAdminPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({ name: '', description: '', projectId: '', type: '' });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [fetchedBoards, fetchedProjects] = await Promise.all([
        apiService.getBoards(),
        apiService.getProjects(),
      ]);
      setBoards(fetchedBoards);
      setProjects(fetchedProjects);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load boards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (board: Board) => {
    setEditingBoard(board);
    setEditForm({
      name: board.name,
      description: board.description,
      projectId: board.projectId ?? '',
      type: board.type ?? '',
    });
    setEditError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBoard) return;
    try {
      setSaving(true);
      setEditError(null);
      await apiService.updateBoard(editingBoard.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        projectId: editForm.projectId || undefined,
        type: (editForm.type as BoardType) || undefined,
      });
      setEditingBoard(null);
      await load();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Failed to save board');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (board: Board) => {
    if (!confirm(`Delete board "${board.name}"? This cannot be undone.`)) return;
    try {
      setDeletingId(board.id);
      setActionError(null);
      await apiService.deleteBoard(board.id);
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to delete board');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleState = async (board: Board) => {
    try {
      setTogglingId(board.id);
      setActionError(null);
      if (board.state === BoardState.Active) {
        await apiService.deactivateBoard(board.id);
      } else {
        await apiService.activateBoard(board.id);
      }
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to update board state');
    } finally {
      setTogglingId(null);
    }
  };

  // Group boards by project
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const grouped: { project: Project | null; boards: Board[] }[] = [];

  const assigned = boards.filter((b) => b.projectId);
  const unassigned = boards.filter((b) => !b.projectId);

  const byProject = new Map<string, Board[]>();
  for (const board of assigned) {
    const pid = board.projectId!;
    if (!byProject.has(pid)) byProject.set(pid, []);
    byProject.get(pid)!.push(board);
  }

  // Keep project order consistent with projects list
  for (const project of projects) {
    const pBoards = byProject.get(project.id);
    if (pBoards) grouped.push({ project, boards: pBoards });
  }
  if (unassigned.length > 0) grouped.push({ project: null, boards: unassigned });

  return (
    <div className="max-w-5xl px-8 py-8 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-600">
              <path fillRule="evenodd" d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Zm4.5 7.5a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0v-2.25a.75.75 0 0 1 .75-.75Zm3.75-1.5a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 0 1.5 0V12Zm2.25-3a.75.75 0 0 1 .75.75v6.75a.75.75 0 0 1-1.5 0V9.75A.75.75 0 0 1 13.5 9Zm3.75-1.5a.75.75 0 0 0-1.5 0v9a.75.75 0 0 0 1.5 0v-9Z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Boards</h2>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          New Board
        </button>
      </div>

      {actionError && (
        <div className="px-4 py-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">{actionError}</div>
      )}

      {loading && (
        <div className="text-center py-12 text-sm text-gray-500">Loading boards…</div>
      )}
      {error && !loading && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {!loading && !error && boards.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-12 text-center text-sm text-gray-400">
          No boards yet. Create one using the button above.
        </div>
      )}

      {!loading && !error && grouped.map(({ project, boards: groupBoards }) => (
        <div key={project?.id ?? '__unassigned'} className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* Group header */}
          <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2">
            {project ? (
              <>
                <span className="inline-block bg-gray-100 text-gray-700 text-xs font-mono font-semibold px-2 py-0.5 rounded">{project.code}</span>
                <span className="text-sm font-semibold text-gray-700">{project.name}</span>
              </>
            ) : (
              <span className="text-sm font-semibold text-gray-400 italic">Unassigned</span>
            )}
            <span className="ml-auto text-xs text-gray-400">{groupBoards.length} board{groupBoards.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Board rows */}
          <div className="divide-y divide-gray-100">
            {groupBoards.map((board) => (
              <div key={board.id} className="px-6 py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{board.name}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATE_COLORS[board.state]}`}>
                      {board.state}
                    </span>
                    {board.type && (
                      <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
                        {board.type}
                      </span>
                    )}
                  </div>
                  {board.description && (
                    <p className="text-sm text-gray-500 mt-0.5 truncate">{board.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">{board.columns.length} column{board.columns.length !== 1 ? 's' : ''}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Activate / Deactivate toggle */}
                  <button
                    onClick={() => handleToggleState(board)}
                    disabled={togglingId === board.id}
                    title={board.state === BoardState.Active ? 'Deactivate' : 'Activate'}
                    className={`p-1.5 rounded-lg transition disabled:opacity-50 ${
                      board.state === BoardState.Active
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {board.state === BoardState.Active ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM6.75 9.25a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => openEdit(board)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Edit"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                      <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                    </svg>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(board)}
                    disabled={deletingId === board.id}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Create modal */}
      <CreateBoardModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => { setIsCreateOpen(false); load(); }}
      />

      {/* Edit modal */}
      {editingBoard && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Edit Board</h3>
              <button onClick={() => setEditingBoard(null)} className="text-gray-400 hover:text-gray-600 transition">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name <span className="text-red-400">*</span></label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  maxLength={200}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  maxLength={2000}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
                <select
                  value={editForm.projectId}
                  onChange={(e) => setEditForm((f) => ({ ...f, projectId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">— Unassigned —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select
                  value={editForm.type}
                  onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">— None —</option>
                  {BOARD_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditingBoard(null)} className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
