'use client';

import { useState, useEffect } from 'react';
import { Column, UpdateColumnRequest } from '@/types';
import { apiService } from '@/services/api';

interface ColumnSettingsModalProps {
  boardId: string;
  column: Column;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ColumnSettingsModal({
  boardId,
  column,
  isOpen,
  onClose,
  onUpdate,
}: ColumnSettingsModalProps) {
  const [formData, setFormData] = useState<UpdateColumnRequest>({
    name: column.name,
    isDoneState: column.isDoneState || false,
    allowedResolutions: column.allowedResolutions || [],
    autoAdvanceParentOnChildCompletion: column.autoAdvanceParentOnChildCompletion || false,
  });
  const [newResolution, setNewResolution] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: column.name,
        isDoneState: column.isDoneState || false,
        allowedResolutions: column.allowedResolutions || [],
        autoAdvanceParentOnChildCompletion: column.autoAdvanceParentOnChildCompletion || false,
      });
      setError(null);
      setNewResolution('');
    }
  }, [isOpen, column]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiService.updateColumn(boardId, column.id, formData);
      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update column');
    } finally {
      setLoading(false);
    }
  };

  const addResolution = () => {
    if (newResolution.trim() && !formData.allowedResolutions?.includes(newResolution.trim())) {
      setFormData(prev => ({
        ...prev,
        allowedResolutions: [...(prev.allowedResolutions || []), newResolution.trim()],
      }));
      setNewResolution('');
    }
  };

  const removeResolution = (resolution: string) => {
    setFormData(prev => ({
      ...prev,
      allowedResolutions: prev.allowedResolutions?.filter(r => r !== resolution) || [],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Column Settings: {column.name}</h2>
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

          {/* Column Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Column Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Done State Toggle */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isDoneState}
                onChange={(e) => setFormData({ ...formData, isDoneState: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Triggers cross-board transfers
              </span>
            </label>
            <p className="text-xs text-gray-500 ml-6">
              When enabled, work items moved to this column will automatically transfer to the next board if configured. Completion is always tracked by the last column on the board.
            </p>
          </div>

          {/* Auto-Advance Parent on Child Completion */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoAdvanceParentOnChildCompletion || false}
                onChange={(e) => setFormData({ ...formData, autoAdvanceParentOnChildCompletion: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Auto-advance parent when all children complete
              </span>
            </label>
            <p className="text-xs text-gray-500 ml-6">
              When enabled, parent work items will automatically move to the next column when all their child tickets are completed.
            </p>
          </div>

          {/* Allowed Resolutions (only if done state) */}
          {formData.isDoneState && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Allowed Resolutions
                <span className="text-gray-500 font-normal ml-2">(e.g., "In Prod", "Declined", "Completed")</span>
              </label>
              
              {/* Existing resolutions */}
              {formData.allowedResolutions && formData.allowedResolutions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.allowedResolutions.map(resolution => (
                    <div
                      key={resolution}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      <span>{resolution}</span>
                      <button
                        type="button"
                        onClick={() => removeResolution(resolution)}
                        className="text-blue-600 hover:text-blue-800 ml-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new resolution */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newResolution}
                  onChange={(e) => setNewResolution(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addResolution())}
                  placeholder="Add resolution..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addResolution}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  Add
                </button>
              </div>
            </div>
          )}

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
