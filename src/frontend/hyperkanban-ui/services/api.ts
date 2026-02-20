import type {
  Board,
  WorkItem,
  ContainerConfig,
  CreateBoardRequest,
  CreateWorkItemRequest,
  MoveWorkItemRequest,
  ApproveWorkItemRequest,
  EditWorkItemRequest,
  UpdateWorkItemRequest,
  Comment,
  CreateColumnRequest,
  UpdateBoardRequest,
  UpdateColumnRequest,
  UpdateColumnTypeRequest,
  Swimlane,
  CompletionStatus
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    console.log(`API ${options.method || 'GET'} ${url}`, options.body ? JSON.parse(options.body as string) : '');

    // Add timeout to detect hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error('Request timed out after 30 seconds');
    }, 30000);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(`API Response ${response.status}:`, url);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        console.error('API Error:', error);
        throw new Error(error.message || `API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('Request aborted (timeout)');
          throw new Error('Request timed out after 30 seconds');
        }
        console.error('Fetch error:', error.message);
        throw error;
      }
      console.error('Unknown error:', error);
      throw new Error('An unknown error occurred');
    }
  }

  // Board APIs
  async getBoards(): Promise<Board[]> {
    return this.request<Board[]>('/api/boards');
  }

  async getBoard(id: string): Promise<Board> {
    return this.request<Board>(`/api/boards/${id}`);
  }

  async createBoard(data: CreateBoardRequest): Promise<Board> {
    return this.request<Board>('/api/boards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async activateBoard(id: string): Promise<void> {
    await this.request(`/api/boards/${id}/activate`, {
      method: 'POST',
    });
  }

  async deactivateBoard(id: string): Promise<void> {
    await this.request(`/api/boards/${id}/deactivate`, {
      method: 'POST',
    });
  }

  async addColumn(boardId: string, column: CreateColumnRequest): Promise<void> {
    await this.request(`/api/boards/${boardId}/columns`, {
      method: 'POST',
      body: JSON.stringify(column),
    });
  }

  async validateBoard(id: string): Promise<{ isValid: boolean; errors: string[] }> {
    return this.request(`/api/boards/${id}/validate`, {
      method: 'POST',
    });
  }

  async updateBoard(id: string, data: UpdateBoardRequest): Promise<Board> {
    return this.request<Board>(`/api/boards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateColumn(boardId: string, columnId: string, data: UpdateColumnRequest): Promise<Board> {
    return this.request<Board>(`/api/boards/${boardId}/columns/${columnId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateColumnType(boardId: string, columnId: string, data: UpdateColumnTypeRequest): Promise<Board> {
    return this.request<Board>(`/api/boards/${boardId}/columns/${columnId}/type`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteColumn(boardId: string, columnId: string): Promise<Board> {
    return this.request<Board>(`/api/boards/${boardId}/columns/${columnId}`, {
      method: 'DELETE',
    });
  }

  // Work Item APIs
  async getWorkItems(boardId: string, columnId?: string): Promise<WorkItem[]> {
    const queryParams = columnId ? `?columnId=${encodeURIComponent(columnId)}` : '';
    return this.request<WorkItem[]>(`/api/boards/${boardId}/workitems${queryParams}`);
  }

  async getWorkItem(boardId: string, workItemId: string): Promise<WorkItem> {
    console.log('api.getWorkItem: Fetching', { boardId, workItemId });
    const result = await this.request<WorkItem>(`/api/boards/${boardId}/workitems/${workItemId}`);
    console.log('api.getWorkItem: Got result', {
      id: result.id,
      commentsCount: result.comments?.length || 0,
      comments: result.comments
    });
    return result;
  }

  async createWorkItem(boardId: string, data: CreateWorkItemRequest): Promise<WorkItem> {
    return this.request<WorkItem>(`/api/boards/${boardId}/workitems`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async moveWorkItem(
    boardId: string,
    workItemId: string,
    data: MoveWorkItemRequest
  ): Promise<void> {
    await this.request(`/api/boards/${boardId}/workitems/${workItemId}/move`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async approveWorkItem(
    boardId: string,
    workItemId: string,
    data: ApproveWorkItemRequest
  ): Promise<void> {
    await this.request(`/api/boards/${boardId}/workitems/${workItemId}/approve`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async editWorkItem(
    boardId: string,
    workItemId: string,
    data: EditWorkItemRequest
  ): Promise<void> {
    await this.request(`/api/boards/${boardId}/workitems/${workItemId}/edit`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateWorkItem(
    boardId: string,
    workItemId: string,
    data: UpdateWorkItemRequest
  ): Promise<WorkItem> {
    return this.request<WorkItem>(`/api/boards/${boardId}/workitems/${workItemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async addComment(
    boardId: string,
    workItemId: string,
    text: string
  ): Promise<Comment> {
    console.log('api.addComment: Calling API', { boardId, workItemId, text });
    const result = await this.request<Comment>(`/api/boards/${boardId}/workitems/${workItemId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    console.log('api.addComment: Got result', result);
    return result;
  }

  // Parent-child workflow (Swimlane) APIs
  async getSwimlanes(boardId: string): Promise<Swimlane[]> {
    return this.request<Swimlane[]>(`/api/boards/${boardId}/swimlanes`);
  }

  async createChildTicket(
    boardId: string,
    parentWorkItemId: string,
    data: CreateWorkItemRequest
  ): Promise<WorkItem> {
    return this.request<WorkItem>(
      `/api/boards/${boardId}/workitems/${parentWorkItemId}/children`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async getChildTickets(boardId: string, parentWorkItemId: string): Promise<WorkItem[]> {
    return this.request<WorkItem[]>(
      `/api/boards/${boardId}/workitems/${parentWorkItemId}/children`
    );
  }

  async getCompletionStatus(
    boardId: string,
    parentWorkItemId: string
  ): Promise<CompletionStatus> {
    return this.request<CompletionStatus>(
      `/api/boards/${boardId}/workitems/${parentWorkItemId}/completion-status`
    );
  }

  // Container Config APIs
  async getContainerConfigs(): Promise<ContainerConfig[]> {
    return this.request<ContainerConfig[]>('/api/v1/containerconfigs');
  }

  async getContainerConfig(id: string): Promise<ContainerConfig> {
    return this.request<ContainerConfig>(`/api/v1/containerconfigs/${id}`);
  }
}

export const apiService = new ApiService();
