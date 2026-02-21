'use client';

import { useState, useEffect } from 'react';
import { useBoardPolling } from '@/hooks/useBoard';
import { Column } from './Column';
import { Swimlane } from './Swimlane';
import { WorkItemCard } from './WorkItemCard';
import CreateWorkItemModal from './CreateWorkItemModal';
import WorkItemDetailModal from './WorkItemDetailModal';
import BoardSettingsModal from './BoardSettingsModal';
import ColumnTypeEditor from './ColumnTypeEditor';
import { BoardState, type WorkItem, type Board, type Swimlane as SwimlaneType } from '@/types';
import { apiService } from '@/services/api';

interface BoardViewProps {
  boardId: string;
}

export function BoardView({ boardId }: BoardViewProps) {
  const { board, loading, error, refetch } = useBoardPolling(boardId);
  const [isCreateWorkItemModalOpen, setIsCreateWorkItemModalOpen] = useState(false);
  const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItem | null>(null);
  const [isWorkItemDetailModalOpen, setIsWorkItemDetailModalOpen] = useState(false);
  const [isBoardSettingsOpen, setIsBoardSettingsOpen] = useState(false);
  const [allBoards, setAllBoards] = useState<Board[]>([]);
  const [draggedItem, setDraggedItem] = useState<WorkItem | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  // Swimlane support
  const [swimlanes, setSwimlanes] = useState<SwimlaneType[]>([]);
  const [swimlaneChildren, setSwimlaneChildren] = useState<Record<string, WorkItem[]>>({});
  const [regularWorkItems, setRegularWorkItems] = useState<WorkItem[]>([]);
  // parentWorkItemId → completion info fetched from the linked child board
  const [swimlaneCompletionMap, setSwimlaneCompletionMap] = useState<Record<string, { childCount: number; completedChildCount: number; isAllChildrenComplete: boolean }>>({});
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  // Track which board & board object is active in the detail modal (may differ when navigating cross-board)
  const [selectedItemBoardId, setSelectedItemBoardId] = useState<string>(boardId);
  const [selectedItemBoard, setSelectedItemBoard] = useState<Board | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  // Determine which columns link to another board
  const getLinkedBoardName = (columnId: string): string | null => {
    if (!board) return null;
    const mapEntry = board.columnTransitionMap?.[columnId];
    if (mapEntry) {
      const targetBoardId = mapEntry.split(':')[0];
      const targetBoard = allBoards.find(b => b.id === targetBoardId);
      return targetBoard?.name ?? targetBoardId;
    }
    // Falls back to nextBoardId for done-state columns
    if (board.nextBoardId) {
      const col = board.columns.find(c => c.id === columnId);
      if (col?.isDoneState) {
        const targetBoard = allBoards.find(b => b.id === board.nextBoardId);
        return targetBoard?.name ?? board.nextBoardId;
      }
    }
    return null;
  };

  // Fetch all boards for board settings
  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const boards = await apiService.getBoards();
        setAllBoards(boards);
      } catch (err) {
        console.error('Failed to load boards:', err);
      }
    };
    fetchBoards();
  }, []);

  // Fetch swimlanes and child work items
  useEffect(() => {
    const fetchSwimlanes = async () => {
      try {
        const swimlanesData = await apiService.getSwimlanes(boardId);
        setSwimlanes(swimlanesData);

        // Fetch children for each swimlane
        const childrenMap: Record<string, WorkItem[]> = {};
        for (const swimlane of swimlanesData) {
          const children = await apiService.getChildTickets(
            swimlane.parentBoardId, 
            swimlane.parentWorkItemId
          );
          childrenMap[swimlane.parentWorkItemId] = children;
        }
        setSwimlaneChildren(childrenMap);
      } catch (err) {
        console.error('Failed to load swimlanes:', err);
      }
    };

    if (boardId) {
      fetchSwimlanes();
    }
  }, [boardId, board]); // Refetch when board changes

  // Build a parentWorkItemId → completion map by calling the completion-status endpoint
  // for each item that has a swimlaneBoardId (i.e. has children on a linked board)
  const fetchCompletionForItems = async (items: WorkItem[]) => {
    const itemsWithWorkflow = items.filter(i => i.swimlaneBoardId && i.childWorkItemIds && i.childWorkItemIds.length > 0);
    const completionMap: Record<string, { childCount: number; completedChildCount: number; isAllChildrenComplete: boolean }> = {};
    await Promise.all(
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
    );
    setSwimlaneCompletionMap(completionMap);
  };

  // Fetch regular work items (non-children) for the default swimlane
  useEffect(() => {
    const fetchRegularWorkItems = async () => {
      try {
        const allItems = await apiService.getWorkItems(boardId);
        // Filter out items that are children (have parentWorkItemId)
        const regular = allItems.filter(item => !item.parentWorkItemId);
        setRegularWorkItems(regular);
        // Fetch completion info from each linked child board
        await fetchCompletionForItems(regular);
      } catch (err) {
        console.error('Failed to load work items:', err);
      }
    };

    if (boardId) {
      fetchRegularWorkItems();
    }
  }, [boardId, board]); // Refetch when board changes

  const handleWorkItemClick = async (workItemId: string) => {
    try {
      const workItem = await apiService.getWorkItem(boardId, workItemId);
      setSelectedWorkItem(workItem);
      setSelectedItemBoardId(boardId);
      setSelectedItemBoard(board);
      setIsWorkItemDetailModalOpen(true);
    } catch (err) {
      console.error('Failed to load work item:', err);
    }
  };

  const handleNavigateToItem = async (targetBoardId: string, workItemId: string) => {
    try {
      const [item, targetBoard] = await Promise.all([
        apiService.getWorkItem(targetBoardId, workItemId),
        apiService.getBoard(targetBoardId),
      ]);
      setSelectedWorkItem(item);
      setSelectedItemBoardId(targetBoardId);
      setSelectedItemBoard(targetBoard);
      setIsWorkItemDetailModalOpen(true);
    } catch (err) {
      console.error('Failed to navigate to item:', err);
    }
  };

  const handleWorkItemSuccess = async () => {
    console.log('handleWorkItemSuccess: Starting', { selectedWorkItem: selectedWorkItem?.id });
    refetch();
    // Also refetch swimlanes and work items
    fetchAllData();
    
    // If a work item is currently selected, refetch it to show updated data
    if (selectedWorkItem) {
      try {
        console.log('handleWorkItemSuccess: Refetching work item', selectedWorkItem.id);
        const updatedWorkItem = await apiService.getWorkItem(boardId, selectedWorkItem.id);
        console.log('handleWorkItemSuccess: Got updated work item', {
          id: updatedWorkItem.id,
          commentsCount: updatedWorkItem.comments?.length || 0,
          comments: updatedWorkItem.comments
        });
        setSelectedWorkItem(updatedWorkItem);
      } catch (err) {
        console.error('Failed to refresh selected work item:', err);
      }
    }
  };

  const fetchAllData = async () => {
    try {
      // Fetch swimlanes
      const swimlanesData = await apiService.getSwimlanes(boardId);
      setSwimlanes(swimlanesData);

      // Fetch children for each swimlane
      const childrenMap: Record<string, WorkItem[]> = {};
      for (const swimlane of swimlanesData) {
        const children = await apiService.getChildTickets(
          swimlane.parentBoardId, 
          swimlane.parentWorkItemId
        );
        childrenMap[swimlane.parentWorkItemId] = children;
      }
      setSwimlaneChildren(childrenMap);

      // Fetch regular work items
      const allItems = await apiService.getWorkItems(boardId);
      const regular = allItems.filter(item => !item.parentWorkItemId);
      setRegularWorkItems(regular);
      await fetchCompletionForItems(regular);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  };

  const handleDragStart = (workItem: WorkItem) => {
    setDraggedItem(workItem);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDrop = async (workItemId: string, targetColumnId: string) => {
    if (!draggedItem || draggedItem.currentColumn === targetColumnId) {
      return; // Don't move if dropping in same column
    }

    setIsMoving(true);
    try {
      await apiService.moveWorkItem(boardId, workItemId, {
        targetColumnId,
      });
      refetch();
    } catch (err) {
      console.error('Failed to move work item:', err);
      alert(`Failed to move item: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsMoving(false);
      setDraggedItem(null);
    }
  };

  if (loading && !board) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Loading board...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-semibold mb-2">Error Loading Board</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">No board found</p>
      </div>
    );
  }

  const stateColors: Record<BoardState, string> = {
    [BoardState.Draft]: 'bg-gray-100 text-gray-700',
    [BoardState.Active]: 'bg-green-100 text-green-700',
    [BoardState.Inactive]: 'bg-red-100 text-red-700',
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{board.name}</h1>
              <p className="text-gray-600 mt-1">{board.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCreateWorkItemModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                + New Work Item
              </button>
              <button
                onClick={() => setIsBoardSettingsOpen(true)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                title="Board Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${stateColors[board.state]}`}>
                {board.state}
              </span>
              <button
                onClick={refetch}
                className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Refresh board"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        {isMoving && (
          <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
            Moving item...
          </div>
        )}
        
        <div className="p-6">
          {/* Column Headers */}
          <div className="flex gap-0 sticky top-0 bg-gray-100 z-10">
            <div
              className={`flex-shrink-0 transition-all duration-300 ease-in-out flex items-center justify-between font-semibold text-gray-700 border-r border-gray-200 cursor-pointer select-none hover:bg-gray-200 overflow-hidden ${
                isSidebarExpanded ? 'w-80 px-4 py-2' : 'w-10 px-2 py-2 justify-center'
              }`}
              onClick={() => setIsSidebarExpanded(v => !v)}
              title={isSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {isSidebarExpanded && <span className="whitespace-nowrap">Swimlane / Row</span>}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 text-gray-500 transition-transform duration-200 flex-shrink-0 ${isSidebarExpanded ? '' : 'rotate-180'}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
            {board.columns
              .sort((a, b) => a.position - b.position)
              .map((column, index) => {
                const linkedBoard = getLinkedBoardName(column.id);
                const headerColor = linkedBoard
                  ? 'border-amber-400 bg-amber-50'
                  : column.columnType === 'AI' ? 'border-purple-400 bg-purple-50' : 'border-blue-400 bg-blue-50';
                return (
                <div key={column.id} className={`min-w-80 max-w-80 px-4 py-2 relative rounded-t-lg border-t-4 ${headerColor}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-gray-900">{column.name}</div>
                      <div className="text-xs text-gray-500">{column.columnType}</div>
                      {column.isDoneState && (
                        <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Done State
                        </div>
                      )}
                      {linkedBoard && (
                        <div className="text-xs text-amber-700 flex items-center gap-1 mt-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          → {linkedBoard}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setEditingColumnId(column.id)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-white transition-colors"
                      title="Edit column type"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                  {editingColumnId === column.id && (
                    <div className="absolute top-full left-0 mt-1 z-20">
                      <ColumnTypeEditor
                        boardId={boardId}
                        columnId={column.id}
                        currentType={column.columnType}
                        currentContainerConfigId={column.containerConfig?.configId}
                        columnPosition={column.position}
                        totalColumns={board.columns.length}
                        onUpdate={() => {
                          setEditingColumnId(null);
                          refetch();
                          fetchAllData();
                        }}
                        onCancel={() => setEditingColumnId(null)}
                      />
                    </div>
                  )}
                </div>
                );
              })}
          </div>

          {/* Swimlanes for parent work items */}
          {swimlanes.map((swimlane, index) => (
            <Swimlane
              key={swimlane.id}
              swimlane={swimlane}
              colorIndex={index}
              columns={board.columns.sort((a, b) => a.position - b.position)}
              boardId={boardId}
              childWorkItems={swimlaneChildren[swimlane.parentWorkItemId] || []}
              onWorkItemClick={handleWorkItemClick}
              onDrop={handleDrop}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onRefresh={fetchAllData}
              isSidebarExpanded={isSidebarExpanded}
              onToggleSidebar={() => setIsSidebarExpanded(v => !v)}
              getLinkedBoardName={getLinkedBoardName}
            />
          ))}

          {/* Default Swimlane - Regular Work Items (non-children) */}
          <div className="flex gap-0 border-b border-gray-200">
            <div
              className={`flex-shrink-0 border-r border-gray-200 bg-gray-50 flex items-center justify-center transition-all duration-300 ease-in-out cursor-pointer hover:bg-gray-100 overflow-hidden ${
                isSidebarExpanded ? 'w-80 p-4' : 'w-10 p-2'
              }`}
              onClick={() => setIsSidebarExpanded(v => !v)}
              title={isSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {isSidebarExpanded
                ? <span className="text-gray-500 text-sm font-medium whitespace-nowrap">Regular Items</span>
                : <span className="text-gray-400 text-xs font-medium" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Regular</span>
              }
            </div>
            {board.columns
              .sort((a, b) => a.position - b.position)
              .map((column) => {
                const columnItems = regularWorkItems.filter(wi => wi.currentColumn === column.id);
                const isDragOver = dragOverColumn === column.id;
                const linkedBoard = getLinkedBoardName(column.id);

                return (
                  <div
                    key={column.id}
                    className={`min-w-80 max-w-80 p-3 border-r border-gray-200 transition-all ${
                      isDragOver
                        ? linkedBoard ? 'bg-amber-100 ring-2 ring-amber-400 ring-inset'
                          : column.columnType === 'AI' ? 'bg-purple-100 ring-2 ring-purple-400 ring-inset' : 'bg-blue-100 ring-2 ring-blue-400 ring-inset'
                        : linkedBoard ? 'bg-amber-50/40'
                          : column.columnType === 'AI' ? 'bg-purple-50/40' : 'bg-blue-50/40'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDragOverColumn(column.id);
                    }}
                    onDragLeave={() => setDragOverColumn(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverColumn(null);
                      const workItemId = e.dataTransfer.getData('text/plain');
                      if (workItemId) {
                        handleDrop(workItemId, column.id);
                      }
                    }}
                  >
                    <div className="space-y-2 min-h-[100px]">
                      {columnItems.length === 0 && (
                        <div className="text-center py-8 text-gray-300 text-sm">
                          No items
                        </div>
                      )}
                      {columnItems.map((item) => (
                        <WorkItemCard
                          key={item.id}
                          workItem={item}
                          onClick={() => handleWorkItemClick(item.id)}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          swimlaneCompletion={swimlaneCompletionMap[item.id]}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </main>

      <CreateWorkItemModal
        isOpen={isCreateWorkItemModalOpen}
        boardId={boardId}
        onClose={() => setIsCreateWorkItemModalOpen(false)}
        onSuccess={handleWorkItemSuccess}
      />

      <WorkItemDetailModal
        isOpen={isWorkItemDetailModalOpen}
        workItem={selectedWorkItem}
        boardId={selectedItemBoardId}
        board={selectedItemBoard || board}
        onClose={() => setIsWorkItemDetailModalOpen(false)}
        onSuccess={handleWorkItemSuccess}
        swimlanes={swimlanes}
        onNavigateToItem={handleNavigateToItem}
      />

      {board && (
        <BoardSettingsModal
          board={board}
          boards={allBoards}
          isOpen={isBoardSettingsOpen}
          onClose={() => setIsBoardSettingsOpen(false)}
          onUpdate={refetch}
        />
      )}
    </div>
  );
}
