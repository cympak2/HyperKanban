'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import type { CreateBoardRequest, CreateColumnRequest, ColumnType, ContainerConfig } from '@/types';
import { canColumnBeAI } from '@/types';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateBoardModal({ isOpen, onClose, onSuccess }: CreateBoardModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [columns, setColumns] = useState<CreateColumnRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [containerConfigs, setContainerConfigs] = useState<ContainerConfig[]>([]);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true);

  // Fetch container configs when modal opens
  useEffect(() => {
    if (isOpen) {
      loadContainerConfigs();
    }
  }, [isOpen]);

  const loadContainerConfigs = async () => {
    try {
      setIsLoadingConfigs(true);
      const configs = await apiService.getContainerConfigs();
      setContainerConfigs(configs);
    } catch (err) {
      console.error('Failed to load container configs:', err);
      setError('Failed to load available AI containers');
    } finally {
      setIsLoadingConfigs(false);
    }
  };

  const addColumn = () => {
    const position = columns.length;
    setColumns([
      ...columns,
      {
        name: `Column ${position + 1}`,
        columnType: 'Human' as ColumnType,
        position,
        containerConfigId: undefined,
      },
    ]);
  };

  const updateColumn = (index: number, updates: Partial<CreateColumnRequest>) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], ...updates };
    setColumns(updated);
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const validateBoard = (): string | null => {
    if (!name.trim()) return 'Board name is required';
    if (!description.trim()) return 'Board description is required';
    if (columns.length === 0) return 'At least one column is required';

    // First column must be Human
    if (columns.length > 0 && columns[0].columnType === 'AI') {
      return 'First column must be Human type';
    }

    // Last column must be Human
    if (columns.length > 1 && columns[columns.length - 1].columnType === 'AI') {
      return 'Last column must be Human type';
    }

    // BR-02: AI columns must be followed by Human columns
    for (let i = 0; i < columns.length - 1; i++) {
      if (columns[i].columnType === 'AI' && columns[i + 1].columnType === 'AI') {
        return `Column "${columns[i].name}" (AI) cannot be followed by "${columns[i + 1].name}" (AI). Insert a Human checkpoint between them.`;
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateBoard();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const request: CreateBoardRequest = {
        name: name.trim(),
        description: description.trim(),
        columns,
      };

      await apiService.createBoard(request);
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create board');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setColumns([]);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create New Board</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              type="button"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Board Details */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Board Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Kanban Upstream - Idea Pipeline"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe the purpose of this board..."
                rows={3}
                required
              />
            </div>

            {/* Columns Section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Columns</h3>
                <button
                  type="button"
                  onClick={addColumn}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                >
                  + Add Column
                </button>
              </div>

              {columns.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No columns yet. Click "Add Column" to start building your workflow.</p>
                </div>
              )}

              <div className="space-y-4">
                {columns.map((column, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Column Name
                        </label>
                        <input
                          type="text"
                          value={column.name}
                          onChange={(e) => updateColumn(index, { name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g., Initial Analysis"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Type
                        </label>
                        <select
                          value={column.columnType}
                          onChange={(e) => updateColumn(index, { 
                            columnType: e.target.value as ColumnType,
                            containerConfigId: e.target.value === 'Human' ? undefined : column.containerConfigId
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          disabled={!canColumnBeAI(index, columns.length)}
                          title={!canColumnBeAI(index, columns.length) ? "First and last columns must be Human type" : ""}
                        >
                          <option value="Human">👤 Human Action</option>
                          <option value="AI">🤖 AI Agent</option>
                        </select>
                        {!canColumnBeAI(index, columns.length) && (
                          <p className="text-xs text-gray-500 mt-1">First and last columns must be Human</p>
                        )}
                      </div>
                    </div>

                    {column.columnType === 'AI' && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          AI Container (optional)
                        </label>
                        {isLoadingConfigs ? (
                          <div className="text-sm text-gray-500">Loading containers...</div>
                        ) : (
                          <select
                            value={column.containerConfigId || ''}
                            onChange={(e) => updateColumn(index, { containerConfigId: e.target.value || undefined })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="">Not selected</option>
                            {containerConfigs.map((config) => (
                              <option key={config.id} value={config.id}>
                                {config.name} (v{config.version}) - {config.description}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    <div className="mt-4 flex justify-between items-center">
                      <span className="text-sm text-gray-500">Position: {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeColumn(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove Column
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Board'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
