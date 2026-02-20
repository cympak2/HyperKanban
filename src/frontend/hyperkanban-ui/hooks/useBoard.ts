'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import type { Board } from '@/types';

export function useBoard(boardId: string | null) {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBoard = useCallback(async () => {
    if (!boardId) {
      setBoard(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await apiService.getBoard(boardId);
      setBoard(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch board');
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  return { board, loading, error, refetch: fetchBoard };
}

export function useBoardPolling(boardId: string | null, intervalMs: number = 5000) {
  return useBoard(boardId);
}
