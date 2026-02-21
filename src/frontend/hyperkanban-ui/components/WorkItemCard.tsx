'use client';

import type { WorkItem, WorkItemState, WorkItemPriority } from '@/types';

interface WorkItemCardProps {
  workItem: WorkItem;
  onClick?: () => void;
  onDragStart?: (workItem: WorkItem) => void;
  onDragEnd?: () => void;
  swimlaneCompletion?: {
    childCount: number;
    completedChildCount: number;
    isAllChildrenComplete: boolean;
  };
}

const stateColors: Record<WorkItemState, string> = {
  Pending: 'bg-gray-100 text-gray-700',
  Processing: 'bg-blue-100 text-blue-700',
  WaitingForApproval: 'bg-yellow-100 text-yellow-700',
  Completed: 'bg-green-100 text-green-700',
  Error: 'bg-red-100 text-red-700',
};

const stateLabels: Record<WorkItemState, string> = {
  Pending: 'Pending',
  Processing: 'Processing',
  WaitingForApproval: 'In Workflow',
  Completed: 'Completed',
  Error: 'Error',
};

const priorityColors: Record<WorkItemPriority, string> = {
  Low: 'bg-gray-200 text-gray-600',
  Medium: 'bg-blue-200 text-blue-600',
  High: 'bg-orange-200 text-orange-600',
  Critical: 'bg-red-200 text-red-600',
};

export function WorkItemCard({ workItem, onClick, onDragStart, onDragEnd, swimlaneCompletion }: WorkItemCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', workItem.id);
    onDragStart?.(workItem);
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  return (
    <div
      className={`bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-move border ${swimlaneCompletion?.isAllChildrenComplete ? 'border-green-400 border-2' : 'border-gray-200'}`}
      onClick={onClick}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-1">
            {workItem.parentWorkItemId && (
              <span className="text-xs" title="Child ticket">👶</span>
            )}
            {workItem.childWorkItemIds && workItem.childWorkItemIds.length > 0 && (
              <span className="text-xs" title={`Has ${workItem.childWorkItemIds.length} child ticket(s)`}>👨‍👩‍👧‍👦</span>
            )}
            <h3 className="font-medium text-gray-900 line-clamp-2">
              {workItem.title}
            </h3>
          </div>
          {workItem.swimlaneBoardId && (
            <div className="mt-1">
              {swimlaneCompletion ? (
                swimlaneCompletion.isAllChildrenComplete ? (
                  <div className="flex items-center gap-1 text-xs text-green-700 font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>All sub-items done ({swimlaneCompletion.completedChildCount}/{swimlaneCompletion.childCount})</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>{swimlaneCompletion.completedChildCount}/{swimlaneCompletion.childCount} sub-items done</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${swimlaneCompletion.childCount > 0 ? (swimlaneCompletion.completedChildCount / swimlaneCompletion.childCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Workflow in progress</span>
                </div>
              )}
            </div>
          )}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${priorityColors[workItem.priority]}`}>
          {workItem.priority}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {workItem.description}
      </p>

      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={`px-2 py-1 rounded-full ${stateColors[workItem.state]}`}>
          {stateLabels[workItem.state]}
        </span>

        {workItem.state === 'Processing' && (
          <div className="flex items-center gap-1 text-blue-600">
            <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Processing...</span>
          </div>
        )}

        <span className="text-gray-500">{workItem.id}</span>
      </div>

      {workItem.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {workItem.tags.slice(0, 3).map((tag, index) => (
            <span key={`${tag}-${index}`} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
              {tag}
            </span>
          ))}
          {workItem.tags.length > 3 && (
            <span className="text-xs text-gray-400">+{workItem.tags.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}
