'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import { ColumnType, type ContainerConfig, type UpdateColumnTypeRequest } from '@/types';
import { canColumnBeAI } from '@/types';

interface ColumnTypeEditorProps {
  boardId: string;
  columnId: string;
  currentType: ColumnType;
  currentContainerConfigId?: string;
  columnPosition: number;
  totalColumns: number;
  onUpdate: () => void;
  onCancel: () => void;
}

export default function ColumnTypeEditor({
  boardId,
  columnId,
  currentType,
  currentContainerConfigId,
  columnPosition,
  totalColumns,
  onUpdate,
  onCancel,
}: ColumnTypeEditorProps) {
  const [selectedType, setSelectedType] = useState<ColumnType>(currentType);
  const [selectedContainerConfigId, setSelectedContainerConfigId] = useState<string | undefined>(
    currentContainerConfigId
  );
  const [containerConfigs, setContainerConfigs] = useState<ContainerConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canBeAI = canColumnBeAI(columnPosition, totalColumns);

  useEffect(() => {
    loadContainerConfigs();
  }, []);

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

  const handleTypeChange = (newType: ColumnType) => {
    setSelectedType(newType);
    if (newType === ColumnType.Human) {
      setSelectedContainerConfigId(undefined);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const request: UpdateColumnTypeRequest = {
        type: selectedType,
        ...(selectedContainerConfigId && { containerConfigId: selectedContainerConfigId }),
      };

      await apiService.updateColumnType(boardId, columnId, request);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update column type');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-4 mt-2 z-10">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Edit Column Type</h3>

      {!canBeAI && (
        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          ⚠️ First and last columns must remain Human type
        </div>
      )}

      <div className="space-y-3">
        {/* Type Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Column Type</label>
          <div className="space-y-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="columnType"
                value={ColumnType.Human}
                checked={selectedType === ColumnType.Human}
                onChange={() => handleTypeChange(ColumnType.Human)}
                className="mr-2"
              />
              <span className="text-sm">👤 Human Action</span>
            </label>
            <label className={`flex items-center ${canBeAI ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
              <input
                type="radio"
                name="columnType"
                value={ColumnType.AI}
                checked={selectedType === ColumnType.AI}
                onChange={() => handleTypeChange(ColumnType.AI)}
                disabled={!canBeAI}
                className="mr-2"
              />
              <span className="text-sm">🤖 AI Agent</span>
            </label>
          </div>
        </div>

        {/* Container Config Selection (only for AI) */}
        {selectedType === ColumnType.AI && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              AI Container (optional)
            </label>
            {isLoadingConfigs ? (
              <div className="text-xs text-gray-500">Loading containers...</div>
            ) : (
              <select
                value={selectedContainerConfigId || ''}
                onChange={(e) => setSelectedContainerConfigId(e.target.value || undefined)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
              >
                <option value="">Not selected</option>
                {containerConfigs.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.name} (v{config.version})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
