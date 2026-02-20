'use client';

import { useState, useEffect, useRef } from 'react';
import { Board, BoardType, Column, ColumnType, UpdateBoardRequest } from '@/types';
import { apiService } from '@/services/api';

interface BoardSettingsModalProps {
  board: Board;
  boards: Board[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

interface NewColumnForm {
  name: string;
  columnType: ColumnType;
}

export default function BoardSettingsModal({
  board,
  boards,
  isOpen,
  onClose,
  onUpdate,
}: BoardSettingsModalProps) {
  const [formData, setFormData] = useState<UpdateBoardRequest>({
    name: board.name,
    description: board.description,
    type: board.type,
    nextBoardId: board.nextBoardId || '',
    columnTransitionMap: board.columnTransitionMap || {},
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Column management state
  const [editingColumn, setEditingColumn] = useState<{ id: string; value: string } | null>(null);
  const [colOpLoading, setColOpLoading] = useState<string | null>(null);
  const [colError, setColError] = useState<string | null>(null);
  const [newColumnForm, setNewColumnForm] = useState<NewColumnForm | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: board.name,
        description: board.description,
        type: board.type,
        nextBoardId: board.nextBoardId || '',
        columnTransitionMap: board.columnTransitionMap || {},
      });
      setError(null);
      setColError(null);
      setEditingColumn(null);
      setNewColumnForm(null);
      setConfirmDeleteId(null);
    }
  }, [isOpen, board]);

  useEffect(() => {
    if (editingColumn) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingColumn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Strip empty-string transitions (= "use default")
      const cleanedMap: Record<string, string> = {};
      for (const [colId, val] of Object.entries(formData.columnTransitionMap || {})) {
        if (val) cleanedMap[colId] = val;
      }
      await apiService.updateBoard(board.id, { ...formData, columnTransitionMap: cleanedMap });
      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update board');
    } finally {
      setLoading(false);
    }
  };

  const handleColumnTransitionChange = (columnId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      columnTransitionMap: {
        ...prev.columnTransitionMap,
        [columnId]: value,
      },
    }));
  };

  // ── Column rename ────────────────────────────────────────────────────────────
  const startEditColumn = (col: Column) => {
    setEditingColumn({ id: col.id, value: col.name });
    setColError(null);
  };

  const cancelEditColumn = () => setEditingColumn(null);

  const saveEditColumn = async () => {
    if (!editingColumn) return;
    const trimmed = editingColumn.value.trim();
    if (!trimmed) return;
    if (trimmed === board.columns.find(c => c.id === editingColumn.id)?.name) {
      setEditingColumn(null);
      return;
    }
    setColOpLoading(editingColumn.id);
    setColError(null);
    try {
      await apiService.updateColumn(board.id, editingColumn.id, { name: trimmed });
      setEditingColumn(null);
      onUpdate();
    } catch (err) {
      setColError(err instanceof Error ? err.message : 'Failed to rename column');
    } finally {
      setColOpLoading(null);
    }
  };

  // ── Column delete ────────────────────────────────────────────────────────────
  const handleDeleteColumn = async (columnId: string) => {
    setColOpLoading(columnId);
    setColError(null);
    try {
      await apiService.deleteColumn(board.id, columnId);
      setConfirmDeleteId(null);
      onUpdate();
    } catch (err) {
      setColError(err instanceof Error ? err.message : 'Failed to delete column');
    } finally {
      setColOpLoading(null);
    }
  };

  // ── Column add ───────────────────────────────────────────────────────────────
  const startAddColumn = () => {
    setNewColumnForm({ name: '', columnType: ColumnType.Human });
    setColError(null);
  };

  const cancelAddColumn = () => {
    setNewColumnForm(null);
    setAddingColumn(false);
  };

  const saveAddColumn = async () => {
    if (!newColumnForm) return;
    const trimmed = newColumnForm.name.trim();
    if (!trimmed) return;
    setAddingColumn(true);
    setColError(null);
    try {
      await apiService.addColumn(board.id, {
        name: trimmed,
        columnType: newColumnForm.columnType,
        position: board.columns.length,
      });
      setNewColumnForm(null);
      onUpdate();
    } catch (err) {
      setColError(err instanceof Error ? err.message : 'Failed to add column');
    } finally {
      setAddingColumn(false);
    }
  };

  // All boards except self (for transitions – show even non-Active so saved values render)
  const availableBoards = boards.filter(b => b.id !== board.id);

  const sortedColumns = [...board.columns].sort((a, b) => a.position - b.position);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Board Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Board Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Board Type
              </label>
              <select
                value={formData.type || 'Custom'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as BoardType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Custom">Custom</option>
                <option value="ProductOwner">Product Owner</option>
                <option value="BusinessAnalytics">Business Analytics</option>
                <option value="Development">Development</option>
                <option value="QA">QA</option>
                <option value="DevOps">DevOps</option>
              </select>
            </div>
          </div>

          {/* ── Columns ────────────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Columns</h3>
            {colError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                {colError}
              </div>
            )}

            <div className="divide-y divide-gray-100 border border-gray-200 rounded-md overflow-hidden">
              {sortedColumns.map((col) => (
                <div key={col.id} className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50">
                  {/* Position badge */}
                  <span className="text-xs text-gray-400 w-5 text-center select-none">
                    {col.position + 1}
                  </span>

                  {/* Column name / inline edit */}
                  {editingColumn?.id === col.id ? (
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingColumn.value}
                      onChange={(e) =>
                        setEditingColumn({ ...editingColumn, value: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); saveEditColumn(); }
                        if (e.key === 'Escape') cancelEditColumn();
                      }}
                      className="flex-1 px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <span className="flex-1 text-sm font-medium truncate" title={col.name}>
                      {col.name}
                    </span>
                  )}

                  {/* Column type badge */}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      col.columnType === ColumnType.AI || (col.columnType as string) === 'AIAgent'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {col.columnType === ColumnType.AI || (col.columnType as string) === 'AIAgent'
                      ? 'AI'
                      : 'Human'}
                  </span>

                  {/* Action buttons */}
                  {editingColumn?.id === col.id ? (
                    <>
                      <button
                        type="button"
                        onClick={saveEditColumn}
                        disabled={colOpLoading === col.id}
                        className="text-green-600 hover:text-green-800 text-sm px-1 disabled:opacity-50"
                        title="Save"
                      >
                        {colOpLoading === col.id ? '…' : '✓'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditColumn}
                        className="text-gray-400 hover:text-gray-600 text-sm px-1"
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </>
                  ) : confirmDeleteId === col.id ? (
                    <>
                      <span className="text-xs text-red-600 font-medium">Delete?</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteColumn(col.id)}
                        disabled={colOpLoading === col.id}
                        className="text-red-600 hover:text-red-800 text-xs font-medium px-1 disabled:opacity-50"
                      >
                        {colOpLoading === col.id ? '…' : 'Yes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-gray-500 hover:text-gray-700 text-xs px-1"
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEditColumn(col)}
                        disabled={!!colOpLoading}
                        className="text-gray-400 hover:text-blue-600 disabled:opacity-30"
                        title="Rename"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-2.828 1.172H7v-2a4 4 0 011.172-2.828z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(col.id)}
                        disabled={!!colOpLoading || board.columns.length <= 1}
                        className="text-gray-400 hover:text-red-600 disabled:opacity-30"
                        title={
                          board.columns.length <= 1
                            ? 'Cannot delete the last column'
                            : 'Delete column'
                        }
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              ))}

              {/* Add column inline form */}
              {newColumnForm ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50">
                  <span className="text-xs text-gray-400 w-5 text-center">
                    {board.columns.length + 1}
                  </span>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Column name"
                    value={newColumnForm.name}
                    onChange={(e) =>
                      setNewColumnForm({ ...newColumnForm, name: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); saveAddColumn(); }
                      if (e.key === 'Escape') cancelAddColumn();
                    }}
                    className="flex-1 px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={newColumnForm.columnType}
                    onChange={(e) =>
                      setNewColumnForm({
                        ...newColumnForm,
                        columnType: e.target.value as ColumnType,
                      })
                    }
                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={ColumnType.Human}>Human</option>
                    <option value={ColumnType.AI}>AI</option>
                  </select>
                  <button
                    type="button"
                    onClick={saveAddColumn}
                    disabled={addingColumn || !newColumnForm.name.trim()}
                    className="text-green-600 hover:text-green-800 text-sm px-1 disabled:opacity-50"
                    title="Add"
                  >
                    {addingColumn ? '…' : '✓'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelAddColumn}
                    className="text-gray-400 hover:text-gray-600 text-sm px-1"
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startAddColumn}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Column
                </button>
              )}
            </div>
          </div>

          {/* Cross-Board Workflow */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Cross-Board Workflow</h3>
            <p className="text-sm text-gray-600">
              Configure automatic work item transfers when items reach completion columns.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Next Board
                <span className="text-gray-500 font-normal ml-2">
                  (Applied when work items reach done columns)
                </span>
              </label>
              <select
                value={formData.nextBoardId || ''}
                onChange={(e) => setFormData({ ...formData, nextBoardId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None - No automatic transfer</option>
                {availableBoards.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.type}){b.state !== 'Active' ? ` – ${b.state}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Column-Specific Transitions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Column-Specific Transitions
                <span className="text-gray-500 font-normal ml-2">
                  (Override default for specific columns)
                </span>
              </label>
              <div className="space-y-2">
                {sortedColumns.map(column => (
                  <div key={column.id} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-40 truncate" title={column.name}>
                      {column.name}
                    </span>
                    <select
                      value={formData.columnTransitionMap?.[column.id] || ''}
                      onChange={(e) => handleColumnTransitionChange(column.id, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Use default next board</option>
                      {availableBoards.map(b => (
                        <optgroup
                          key={b.id}
                          label={`${b.name}${b.state !== 'Active' ? ` (${b.state})` : ''}`}
                        >
                          {b.columns.map(targetCol => (
                            <option
                              key={`${b.id}:${targetCol.id}`}
                              value={`${b.id}:${targetCol.id}`}
                            >
                              → {targetCol.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

