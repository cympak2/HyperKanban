'use client';

import { useState } from 'react';
import { useWorkItemsPolling } from '@/hooks/useWorkItems';
import { WorkItemCard } from './WorkItemCard';
import ColumnSettingsModal from './ColumnSettingsModal';
import type { Column as ColumnType, ColumnType as ColType, WorkItem } from '@/types';

interface ColumnProps {
  boardId: string;
  column: ColumnType;
  onWorkItemClick?: (workItemId: string) => void;
  onDrop?: (workItemId: string, targetColumnId: string) => void;
  onDragStart?: (workItem: WorkItem) => void;
  onDragEnd?: () => void;
  onRefresh?: () => void;
}

const columnTypeColors: Record<ColType, string> = {
  Human: 'border-blue-500 bg-blue-50',
  AI: 'border-purple-500 bg-purple-50',
};

const columnTypeIcons: Record<ColType, string> = {
  Human: '👤',
  AI: '🤖',
};

export function Column({ boardId, column, onWorkItemClick, onDrop, onDragStart, onDragEnd, onRefresh }: ColumnProps) {
  const { workItems, loading, error } = useWorkItemsPolling(boardId, column.id);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const workItemId = e.dataTransfer.getData('text/plain');
    if (workItemId) {
      onDrop?.(workItemId, column.id);
    }
  };

  return (
    <div 
      className={`flex flex-col min-w-80 max-w-80 border-t-4 rounded-lg bg-gray-50 transition-all ${columnTypeColors[column.columnType]} ${
        isDragOver ? 'ring-4 ring-blue-400 ring-opacity-50' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{columnTypeIcons[column.columnType]}</span>
            <div>
              <h2 className="font-semibold text-gray-900">{column.name}</h2>
              <p className="text-xs text-gray-500">{column.columnType}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsColumnSettingsOpen(true)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-white transition-colors"
              title="Column Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded-full">
              {workItems.length}
            </span>
          </div>
        </div>

        {column.isDoneState && (
          <div className="mt-2 text-xs text-green-700 bg-green-50 px-2 py-1 rounded flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Done State (triggers board transfer)
          </div>
        )}

        {column.containerConfig && (
          <div className="mt-2 text-xs text-gray-600 bg-white px-2 py-1 rounded">
            <span className="font-mono">
              {column.containerConfig.image || 
               (column.containerConfig.imageName && column.containerConfig.imageTag 
                 ? `${column.containerConfig.imageName}:${column.containerConfig.imageTag}` 
                 : `Config: ${column.containerConfig.configId}`)}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-16rem)]">
        {loading && workItems.length === 0 && (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
            {error}
          </div>
        )}

        {!loading && workItems.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            No items
          </div>
        )}

        {workItems.map((item) => (
          <WorkItemCard
            key={item.id}
            workItem={item}
            onClick={() => onWorkItemClick?.(item.id)}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>

      <ColumnSettingsModal
        boardId={boardId}
        column={column}
        isOpen={isColumnSettingsOpen}
        onClose={() => setIsColumnSettingsOpen(false)}
        onUpdate={() => {
          setIsColumnSettingsOpen(false);
          onRefresh?.();
        }}
      />
    </div>
  );
}
