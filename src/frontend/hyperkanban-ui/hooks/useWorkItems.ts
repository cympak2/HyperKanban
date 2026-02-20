'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import type { WorkItem } from '@/types';

export function useWorkItems(boardId: string | null, columnId?: string) {
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkItems = useCallback(async () => {
    if (!boardId) {
      setWorkItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await apiService.getWorkItems(boardId, columnId);
      setWorkItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch work items');
    } finally {
      setLoading(false);
    }
  }, [boardId, columnId]);

  useEffect(() => {
    fetchWorkItems();
  }, [fetchWorkItems]);

  return { workItems, loading, error, refetch: fetchWorkItems };
}

export function useWorkItemsPolling(
  boardId: string | null,
  columnId?: string,
  intervalMs: number = 5000
) {
  return useWorkItems(boardId, columnId);
}
