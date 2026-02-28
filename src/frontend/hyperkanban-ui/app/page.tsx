'use client';

import { BoardView } from '@/components/BoardView';
import CreateBoardModal from '@/components/CreateBoardModal';
import UserMenu from '@/components/UserMenu';
import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import type { Board, Project } from '@/types';

export default function Home() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoadingBoards, setIsLoadingBoards] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBoards();
  }, []);

  const loadBoards = async () => {
    try {
      setIsLoadingBoards(true);
      setError(null);
      const [fetchedBoards, fetchedProjects] = await Promise.all([
        apiService.getBoards(),
        apiService.getProjects(),
      ]);
      setBoards(fetchedBoards);
      setProjects(fetchedProjects);

      // Restore last used project
      const savedProjectId = localStorage.getItem('hyperkanban:lastProjectId');
      const resolvedProjectId =
        savedProjectId && fetchedProjects.find((p) => p.id === savedProjectId)
          ? savedProjectId
          : fetchedProjects[0]?.id ?? null;

      setSelectedProjectId(resolvedProjectId);

      // Restore last used board within that project
      const projectBoards = fetchedBoards.filter((b) => b.projectId === resolvedProjectId);
      const savedBoardId = localStorage.getItem('hyperkanban:lastBoardId');
      const resolvedBoardId =
        savedBoardId && projectBoards.find((b) => b.id === savedBoardId)
          ? savedBoardId
          : projectBoards[0]?.id ?? (fetchedBoards[0]?.id ?? null);

      setSelectedBoardId(resolvedBoardId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load boards');
    } finally {
      setIsLoadingBoards(false);
    }
  };

  const handleBoardCreateSuccess = () => {
    loadBoards();
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    localStorage.setItem('hyperkanban:lastProjectId', projectId);
    // Auto-select first board in the new project
    const projectBoards = boards.filter((b) => b.projectId === projectId);
    const newBoardId = projectBoards[0]?.id ?? null;
    setSelectedBoardId(newBoardId);
    if (newBoardId) localStorage.setItem('hyperkanban:lastBoardId', newBoardId);
  };

  if (isLoadingBoards) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading boards...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Boards</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadBoards}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (boards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Boards Yet</h2>
          <p className="text-gray-600 mb-6">
            Create your first board to start automating workflows with AI agents.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            + Create Your First Board
          </button>
        </div>
        
        <CreateBoardModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleBoardCreateSuccess}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">HyperKanban AI-DLC</h1>
              {projects.length > 0 && (
                <>
                  <span className="text-gray-300">|</span>
                  <select
                    value={selectedProjectId || ''}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-gray-700"
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        [{project.code}] {project.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
              {(() => {
                const projectBoards = selectedProjectId
                  ? boards.filter((b) => b.projectId === selectedProjectId)
                  : boards;
                return projectBoards.length > 0 ? (
                  <select
                    value={selectedBoardId || ''}
                    onChange={(e) => {
                      setSelectedBoardId(e.target.value);
                      localStorage.setItem('hyperkanban:lastBoardId', e.target.value);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {projectBoards.map((board) => (
                      <option key={board.id} value={board.id}>
                        {board.name} ({board.state})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm text-gray-400 italic">No boards in this project</span>
                );
              })()}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                + New Board
              </button>
              <UserMenu />
            </div>
          </div>
        </div>
      </div>

      {/* Board View */}
      <div className="max-w-full mx-auto px-4 py-6">
        {selectedBoardId && <BoardView boardId={selectedBoardId} />}
      </div>

      <CreateBoardModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleBoardCreateSuccess}
      />
    </div>
  );
}
