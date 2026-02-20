'use client';

import { useState, useEffect } from 'react';
import type { WorkItem, Board, WorkItemPriority } from '@/types';
import { apiService } from '@/services/api';
import MarkdownRenderer from './MarkdownRenderer';
import MarkdownEditor from './MarkdownEditor';

interface WorkItemDetailModalProps {
  isOpen: boolean;
  workItem: WorkItem | null;
  boardId: string;
  board: Board | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WorkItemDetailModal({ isOpen, workItem, boardId, board, onClose, onSuccess }: WorkItemDetailModalProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'ai-history' | 'audit' | 'comments'>('details');
  const [isMoving, setIsMoving] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedPriority, setEditedPriority] = useState<WorkItemPriority>('Medium' as WorkItemPriority);
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Comments state
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Initialize edit fields when workItem changes
  useEffect(() => {
    if (workItem) {
      console.log('WorkItemDetailModal: workItem updated', {
        id: workItem.id,
        commentsCount: workItem.comments?.length || 0,
        comments: workItem.comments
      });
      setEditedTitle(workItem.title);
      setEditedDescription(workItem.description);
      setEditedPriority(workItem.priority);
      setEditedTags([...workItem.tags]);
      setSelectedColumnId(workItem.currentColumn);
    }
  }, [workItem]);

  if (!isOpen || !workItem) return null;

  const handleMoveToColumn = async (targetColumnId: string) => {
    if (!workItem || targetColumnId === workItem.currentColumn) return;

    setIsMoving(true);
    setError(null);

    try {
      await apiService.moveWorkItem(boardId, workItem.id, {
        targetColumnId,
      });
      setSelectedColumnId(targetColumnId);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move work item');
    } finally {
      setIsMoving(false);
    }
  };

  const handleApprove = async () => {
    if (!workItem) return;

    setIsApproving(true);
    setError(null);

    try {
      await apiService.approveWorkItem(workItem.boardId, workItem.id, {
        approved: true,
        notes: approvalNotes || 'Approved',
      });
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve work item');
    } finally {
      setIsApproving(false);
    }
  };

  const handleClose = () => {
    setApprovalNotes('');
    setError(null);
    setActiveTab('details');
    setIsEditMode(false);
    setNewComment('');
    onClose();
  };

  const handleSaveEdit = async () => {
    if (!workItem) return;

    setIsSaving(true);
    setError(null);

    try {
      await apiService.updateWorkItem(boardId, workItem.id, {
        title: editedTitle,
        description: editedDescription,
        priority: editedPriority,
        tags: editedTags,
      });
      setIsEditMode(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update work item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedTitle(workItem?.title || '');
    setEditedDescription(workItem?.description || '');
    setEditedPriority(workItem?.priority || ('Medium' as WorkItemPriority));
    setEditedTags([...(workItem?.tags || [])]);
    setIsEditMode(false);
    setError(null);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !editedTags.includes(newTag.trim())) {
      setEditedTags([...editedTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditedTags(editedTags.filter(tag => tag !== tagToRemove));
  };

  const handleAddComment = async () => {
    if (!workItem || !newComment.trim()) return;

    console.log('handleAddComment: Starting', { workItemId: workItem.id, commentText: newComment.trim() });
    setIsAddingComment(true);
    setError(null);

    try {
      const result = await apiService.addComment(boardId, workItem.id, newComment.trim());
      console.log('handleAddComment: Comment added successfully', result);
      setNewComment('');
      console.log('handleAddComment: Calling onSuccess');
      onSuccess();
    } catch (err) {
      console.error('handleAddComment: Error', err);
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setIsAddingComment(false);
    }
  };

  const getStateBadgeColor = (state: string) => {
    switch (state) {
      case 'Pending':
        return 'bg-gray-100 text-gray-800';
      case 'Processing':
        return 'bg-blue-100 text-blue-800';
      case 'WaitingForApproval':
        return 'bg-yellow-100 text-yellow-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-100 text-red-800';
      case 'High':
        return 'bg-orange-100 text-orange-800';
      case 'Medium':
        return 'bg-blue-100 text-blue-800';
      case 'Low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isWaitingForApproval = workItem.state === 'WaitingForApproval';
  const currentColumn = board?.columns.find(col => col.id === workItem.currentColumn);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isEditMode ? editedTitle : workItem.title}
              </h2>
              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-sm text-gray-500">ID: {workItem.id}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStateBadgeColor(workItem.state)}`}>
                  {workItem.state}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityBadgeColor(isEditMode ? editedPriority : workItem.priority)}`}>
                  {isEditMode ? editedPriority : workItem.priority}
                </span>
              </div>
              
              {/* Column Switcher */}
              {board && (
                <div className="mt-3 flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Column:</label>
                  <select
                    value={selectedColumnId}
                    onChange={(e) => handleMoveToColumn(e.target.value)}
                    disabled={isMoving}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {board.columns
                      .sort((a, b) => a.position - b.position)
                      .map((column) => (
                        <option key={column.id} value={column.id}>
                          {column.name} ({column.columnType})
                        </option>
                      ))}
                  </select>
                  {isMoving && (
                    <span className="text-sm text-blue-600">Moving...</span>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-4"
              type="button"
            >
              ×
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 -mb-px">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 border-b-2 transition ${
                activeTab === 'details'
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`px-4 py-2 border-b-2 transition ${
                activeTab === 'comments'
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Comments ({workItem.comments?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('ai-history')}
              className={`px-4 py-2 border-b-2 transition ${
                activeTab === 'ai-history'
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              AI Processing History ({workItem.aiProcessingHistory.length})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2 border-b-2 transition ${
                activeTab === 'audit'
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Audit Trail ({workItem.auditTrail.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {!isEditMode ? (
                // View Mode
                <>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                      <MarkdownRenderer content={workItem.description} />
                    </div>
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="ml-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      ✏️ Edit
                    </button>
                  </div>

                  {workItem.tags.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {workItem.tags.map((tag, idx) => (
                          <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Created</h3>
                      <p className="text-gray-900">{new Date(workItem.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Modified</h3>
                      <p className="text-gray-900">
                        {workItem.modifiedAt ? new Date(workItem.modifiedAt).toLocaleString() : 'Never'}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                // Edit Mode
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <MarkdownEditor
                      value={editedDescription}
                      onChange={setEditedDescription}
                      rows={5}
                      placeholder="Describe the work item... (Markdown supported)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={editedPriority}
                      onChange={(e) => setEditedPriority(e.target.value as WorkItemPriority)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {editedTags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm flex items-center gap-2"
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="text-blue-900 hover:text-blue-700"
                            type="button"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                        placeholder="Add new tag..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={handleAddTag}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                        type="button"
                      >
                        Add Tag
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      onClick={handleCancelEdit}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'ai-history' && (
            <div className="space-y-4">
              {workItem.aiProcessingHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No AI processing history yet</p>
              ) : (
                workItem.aiProcessingHistory.map((record, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">Column: {record.columnId}</h4>
                        <p className="text-sm text-gray-600">Container: {record.containerImage}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          record.status === 'Success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {record.status}
                        </span>
                        <p className="text-sm text-gray-500 mt-1">{record.executionTimeSeconds}s</p>
                      </div>
                    </div>

                    {record.errorMessage && (
                      <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                        <p className="text-sm text-red-800">{record.errorMessage}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Input</h5>
                        <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                          {JSON.stringify(record.input, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Output</h5>
                        <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                          {JSON.stringify(record.output, null, 2)}
                        </pre>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-3">
                      {new Date(record.startTime).toLocaleString()} - {new Date(record.endTime).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-3">
              {workItem.auditTrail.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No audit trail entries yet</p>
              ) : (
                workItem.auditTrail.map((entry, idx) => (
                  <div key={idx} className="border-l-4 border-blue-500 bg-gray-50 p-4 rounded-r">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-gray-900">{entry.action}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {entry.actor && <p className="text-sm text-gray-700">By: {entry.actor}</p>}
                    {(entry.fromColumn || entry.toColumn) && (
                      <p className="text-sm text-gray-600">
                        {entry.fromColumn && `From: ${entry.fromColumn}`}
                        {entry.fromColumn && entry.toColumn && ' → '}
                        {entry.toColumn && `To: ${entry.toColumn}`}
                      </p>
                    )}
                    {entry.notes && <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-4">
              {/* Add Comment Form */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add a comment
                </label>
                <MarkdownEditor
                  value={newComment}
                  onChange={setNewComment}
                  rows={3}
                  placeholder="Write your comment here... (Markdown supported)"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isAddingComment}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingComment ? 'Adding...' : 'Add Comment'}
                  </button>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-3">
                {!workItem.comments || workItem.comments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No comments yet</p>
                ) : (
                  workItem.comments
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((comment) => (
                      <div key={comment.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium text-gray-900">{comment.author}</span>
                            {comment.modifiedAt && (
                              <span className="text-xs text-gray-500 ml-2">(edited)</span>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <MarkdownRenderer content={comment.text} className="text-gray-700" />
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="p-6 border-t bg-gray-50">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {isWaitingForApproval ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approval Notes (Optional)
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Add notes about your approval..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleClose}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                  disabled={isApproving}
                >
                  Close
                </button>
                <button
                  onClick={handleApprove}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  disabled={isApproving}
                >
                  {isApproving ? 'Approving...' : '✓ Approve & Advance'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
