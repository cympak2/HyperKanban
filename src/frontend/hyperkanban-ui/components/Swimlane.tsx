'use client';

import { useState, useEffect } from 'react';
import { WorkItemCard } from './WorkItemCard';
import CreateWorkItemModal from './CreateWorkItemModal';
import type { Swimlane as SwimlaneType, Column, WorkItem } from '@/types';
import { apiService } from '@/services/api';

interface SwimlaneProps {
  swimlane: SwimlaneType;
  colorIndex: number;
  columns: Column[];
  boardId: string;
  childWorkItems: WorkItem[];
  onWorkItemClick?: (workItemId: string) => void;
  onDrop?: (workItemId: string, targetColumnId: string) => void;
  onDragStart?: (workItem: WorkItem) => void;
  onDragEnd?: () => void;
  onRefresh?: () => void;
  isSidebarExpanded?: boolean;
  onToggleSidebar?: () => void;
  getLinkedBoardName?: (columnId: string) => string | null;
}

// Color palette for swimlanes
const COLOR_SCHEMES = [
  {
    gradient: 'from-blue-50 to-transparent',
    header: 'bg-blue-50',
    button: 'bg-blue-600 hover:bg-blue-700',
    tag: 'bg-blue-100 text-blue-700',
    dragOver: 'bg-blue-100 ring-blue-400',
    complete: 'bg-green-500',
    progress: 'bg-blue-500'
  },
  {
    gradient: 'from-purple-50 to-transparent',
    header: 'bg-purple-50',
    button: 'bg-purple-600 hover:bg-purple-700',
    tag: 'bg-purple-100 text-purple-700',
    dragOver: 'bg-purple-100 ring-purple-400',
    complete: 'bg-green-500',
    progress: 'bg-purple-500'
  },
  {
    gradient: 'from-amber-50 to-transparent',
    header: 'bg-amber-50',
    button: 'bg-amber-600 hover:bg-amber-700',
    tag: 'bg-amber-100 text-amber-700',
    dragOver: 'bg-amber-100 ring-amber-400',
    complete: 'bg-green-500',
    progress: 'bg-amber-500'
  },
  {
    gradient: 'from-rose-50 to-transparent',
    header: 'bg-rose-50',
    button: 'bg-rose-600 hover:bg-rose-700',
    tag: 'bg-rose-100 text-rose-700',
    dragOver: 'bg-rose-100 ring-rose-400',
    complete: 'bg-green-500',
    progress: 'bg-rose-500'
  },
  {
    gradient: 'from-teal-50 to-transparent',
    header: 'bg-teal-50',
    button: 'bg-teal-600 hover:bg-teal-700',
    tag: 'bg-teal-100 text-teal-700',
    dragOver: 'bg-teal-100 ring-teal-400',
    complete: 'bg-green-500',
    progress: 'bg-teal-500'
  },
  {
    gradient: 'from-indigo-50 to-transparent',
    header: 'bg-indigo-50',
    button: 'bg-indigo-600 hover:bg-indigo-700',
    tag: 'bg-indigo-100 text-indigo-700',
    dragOver: 'bg-indigo-100 ring-indigo-400',
    complete: 'bg-green-500',
    progress: 'bg-indigo-500'
  }
];

export function Swimlane({
  swimlane,
  colorIndex,
  columns,
  boardId,
  childWorkItems,
  onWorkItemClick,
  onDrop,
  onDragStart,
  onDragEnd,
  onRefresh,
  isSidebarExpanded = false,
  onToggleSidebar,
  getLinkedBoardName,
}: SwimlaneProps) {
  const colors = COLOR_SCHEMES[colorIndex % COLOR_SCHEMES.length];
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState<string | null>(null);
  // completion data for child items that themselves have sub-workflows
  const [childCompletionMap, setChildCompletionMap] = useState<Record<string, { childCount: number; completedChildCount: number; isAllChildrenComplete: boolean }>>({});

  useEffect(() => {
    const itemsWithWorkflow = childWorkItems.filter(i => i.swimlaneBoardId && i.childWorkItemIds && i.childWorkItemIds.length > 0);
    if (itemsWithWorkflow.length === 0) return;
    const completionMap: Record<string, { childCount: number; completedChildCount: number; isAllChildrenComplete: boolean }> = {};
    Promise.all(
      itemsWithWorkflow.map(async (item) => {
        try {
          const status = await apiService.getCompletionStatus(item.boardId, item.id);
          completionMap[item.id] = {
            childCount: status.totalChildren,
            completedChildCount: status.completedChildren,
            isAllChildrenComplete: status.allChildrenComplete,
          };
        } catch {
          // ignore per-item errors
        }
      })
    ).then(() => setChildCompletionMap({ ...completionMap }));
  }, [boardId, childWorkItems]);

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(columnId);
  };

  const handleDragLeave = () => {
    setIsDragOver(null);
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setIsDragOver(null);
    
    const workItemId = e.dataTransfer.getData('text/plain');
    if (workItemId) {
      onDrop?.(workItemId, columnId);
    }
  };

  const getWorkItemsForColumn = (columnId: string) => {
    return childWorkItems.filter(wi => wi.currentColumn === columnId);
  };

  const handleCreateChild = async (data: any) => {
    try {
      await apiService.createChildTicket(swimlane.parentBoardId, swimlane.parentWorkItemId, data);
      setIsCreateModalOpen(false);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to create child ticket:', error);
    }
  };

  const completionPercentage = swimlane.childCount > 0 
    ? (swimlane.completedChildCount / swimlane.childCount) * 100 
    : 0;

  return (
    <>
      <div className={`flex gap-0 border-b-2 border-gray-300 bg-gradient-to-r ${colors.gradient}`}>
        {/* Swimlane Header - spans the first column width */}
        <div
          className={`flex-shrink-0 border-r border-gray-300 ${colors.header} transition-all duration-300 ease-in-out overflow-hidden ${
            isSidebarExpanded ? 'w-80 p-4' : 'w-10 p-2 flex flex-col items-center justify-start cursor-pointer hover:brightness-95'
          }`}
          onClick={!isSidebarExpanded ? onToggleSidebar : undefined}
          title={!isSidebarExpanded ? 'Expand sidebar' : undefined}
        >
          {!isSidebarExpanded && (
            <div className="flex flex-col items-center gap-2 pt-1">
              <span className="text-base" title="Parent ticket">👨‍👩‍👧‍👦</span>
              <span
                className="text-xs text-gray-600 font-medium leading-tight"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', maxHeight: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}
                title={swimlane.parentTitle}
              >
                {swimlane.parentTitle}
              </span>
            </div>
          )}
          <div className={`transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none h-0 overflow-hidden'}`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg" title="Parent ticket">👨‍👩‍👧‍👦</span>
                <h3 className="font-semibold text-gray-900 text-sm">
                  {swimlane.parentTitle}
                </h3>
              </div>
              <p className="text-xs text-gray-600">
                From: <span className="font-medium">{swimlane.parentBoardName}</span>
              </p>
              <p className="text-xs text-gray-500">
                ID: {swimlane.parentWorkItemId}
              </p>
            </div>
          </div>

          {/* Completion Status */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-600">
                {swimlane.completedChildCount} / {swimlane.childCount} complete
              </span>
              <span className="text-gray-600 font-medium">
                {Math.round(completionPercentage)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  swimlane.isAllChildrenComplete
                    ? colors.complete
                    : colors.progress
                }`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* All Complete Badge */}
          {swimlane.isAllChildrenComplete && (
            <div className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              All children complete
            </div>
          )}

          {/* Add Child Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className={`w-full text-xs ${colors.button} text-white px-3 py-1.5 rounded transition-colors flex items-center justify-center gap-1`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Child Ticket
          </button>

          {/* Tags */}
          {swimlane.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {swimlane.tags.slice(0, 2).map((tag, index) => (
                <span key={`${tag}-${index}`} className={`text-xs ${colors.tag} px-2 py-0.5 rounded`}>
                  {tag}
                </span>
              ))}
            </div>
          )}
          </div>
        </div>

        {/* Column Cells - one for each board column */}
        {columns.map((column) => {
          const columnItems = getWorkItemsForColumn(column.id);
          const isDragOverColumn = isDragOver === column.id;
          const linkedBoard = getLinkedBoardName?.(column.id) ?? null;
          const cellBg = linkedBoard
            ? isDragOverColumn ? 'bg-amber-100 ring-amber-400 ring-2 ring-inset' : 'bg-amber-50/40'
            : column.columnType === 'AI'
              ? isDragOverColumn ? 'bg-purple-100 ring-purple-400 ring-2 ring-inset' : 'bg-purple-50/40'
              : isDragOverColumn ? 'bg-blue-100 ring-blue-400 ring-2 ring-inset' : 'bg-blue-50/40';

          return (
            <div
              key={column.id}
              className={`min-w-80 max-w-80 p-3 border-r border-gray-200 transition-all ${cellBg}`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="space-y-2 min-h-[80px]">
                {columnItems.length === 0 && (
                  <div className="text-center py-4 text-gray-300 text-xs">
                    Drop here
                  </div>
                )}
                {columnItems.map((item) => (
                  <WorkItemCard
                    key={item.id}
                    workItem={item}
                    onClick={() => onWorkItemClick?.(item.id)}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    swimlaneCompletion={childCompletionMap[item.id]}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Child Modal */}
      <CreateWorkItemModal
        boardId={boardId}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateChild}
      />
    </>
  );
}
