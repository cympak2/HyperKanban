// Board Types
export interface Board {
  id: string;
  name: string;
  description: string;
  state: BoardState;
  type?: BoardType;
  columns: Column[];
  createdAt: string;
  modifiedAt: string;
  permissions?: BoardPermissions;
  nextBoardId?: string;
  columnTransitionMap?: Record<string, string>;
}

export enum BoardState {
  Draft = 'Draft',
  Active = 'Active',
  Inactive = 'Inactive'
}

export enum BoardType {
  ProductOwner = 'ProductOwner',
  BusinessAnalytics = 'BusinessAnalytics',
  Development = 'Development',
  QA = 'QA',
  DevOps = 'DevOps',
  Custom = 'Custom'
}

export interface Column {
  id: string;
  name: string;
  columnType: ColumnType;
  position: number;
  isDoneState?: boolean;
  allowedResolutions?: string[];
  containerConfig?: ContainerConfigReference;
  autoAdvanceParentOnChildCompletion?: boolean;
}

export enum ColumnType {
  Human = 'Human',
  AI = 'AI'
}

// Container Configuration (simplified reference in column)
export interface ContainerConfigReference {
  configId: string;
  image?: string;
  imageName?: string;
  imageTag?: string;
  registryUrl?: string;
  timeoutSeconds?: number;
  environmentVariables?: Record<string, string>;
}

// Full Container Configuration (from registry)
export interface ContainerConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  image: string;
  defaultTimeoutSeconds: number;
  capabilities: ContainerCapabilities;
  status: ContainerStatus;
  created: string;
  lastTested?: string;
  metrics: ContainerMetrics;
}

export interface ContainerCapabilities {
  category: string;
  supportedInputTypes: string[];
  supportedOutputTypes: string[];
  expectedInputSchema?: string;
  expectedOutputSchema?: string;
}

export enum ContainerStatus {
  Active = 'Active',
  Deprecated = 'Deprecated',
  Testing = 'Testing',
  Disabled = 'Disabled'
}

export interface ContainerMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTimeSeconds: number;
  successRate: number;
}

export interface BoardPermissions {
  viewers: string[];
  editors: string[];
  owners: string[];
}

// Work Item Types
export interface WorkItem {
  id: string;
  boardId: string;
  title: string;
  description: string;
  currentColumn: string;
  position: number;
  state: WorkItemState;
  priority: WorkItemPriority;
  tags: string[];
  aiProcessingHistory: AiProcessingRecord[];
  auditTrail: AuditEntry[];
  comments: Comment[];
  assignees: string[];
  createdAt: string;
  modifiedAt: string;
  // Parent-child workflow fields
  parentWorkItemId?: string;
  childWorkItemIds: string[];
  swimlaneBoardId?: string;
}

export enum WorkItemState {
  Pending = 'Pending',
  Processing = 'Processing',
  WaitingForApproval = 'WaitingForApproval',
  Completed = 'Completed',
  Error = 'Error'
}

export enum WorkItemPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical'
}

export interface AiProcessingRecord {
  columnId: string;
  startTime: string;
  endTime: string;
  executionTimeSeconds: number;
  containerImage: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  status: string;
  errorMessage?: string;
}

export interface AuditEntry {
  timestamp: string;
  action: string;
  actor: string;
  fromColumn?: string;
  toColumn?: string;
  notes: string;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  modifiedAt?: string;
}

// Swimlane Types
export interface Swimlane {
  id: string;
  parentWorkItemId: string;
  parentTitle: string;
  parentBoardId: string;
  parentBoardName: string;
  parentCurrentColumn: string;
  childCount: number;
  completedChildCount: number;
  isAllChildrenComplete: boolean;
  createdAt: string;
  priority: WorkItemPriority;
  tags: string[];
}

export interface CompletionStatus {
  totalChildren: number;
  completedChildren: number;
  allChildrenComplete: boolean;
  completionPercentage: number;
}

// API Request Types
export interface CreateBoardRequest {
  name: string;
  description: string;
  columns: CreateColumnRequest[];
}

export interface CreateColumnRequest {
  name: string;
  columnType: ColumnType;
  position: number;
  containerConfigId?: string;
}

export interface CreateWorkItemRequest {
  title: string;
  description: string;
  priority: WorkItemPriority;
  tags: string[];
}

export interface MoveWorkItemRequest {
  targetColumnId: string;
  targetPosition?: number;
}

export interface ApproveWorkItemRequest {
  approved: boolean;
  notes: string;
}

export interface AddCommentRequest {
  text: string;
}

export interface UpdateWorkItemRequest {
  title?: string;
  description?: string;
  priority?: WorkItemPriority;
  tags?: string[];
}

export interface EditWorkItemRequest {
  title?: string;
  description?: string;
  priority?: WorkItemPriority;
  tags?: string[];
}

export interface UpdateBoardRequest {
  name?: string;
  description?: string;
  type?: BoardType;
  nextBoardId?: string;
  columnTransitionMap?: Record<string, string>;
}

export interface UpdateColumnRequest {
  name?: string;
  isDoneState?: boolean;
  allowedResolutions?: string[];
  containerConfig?: ContainerConfigReference;
  autoAdvanceParentOnChildCompletion?: boolean;
}

export interface UpdateColumnTypeRequest {
  type: ColumnType;
  containerConfigId?: string | null;
}

// Utility functions
export function canColumnBeAI(position: number, totalColumns: number): boolean {
  return position > 0 && position < totalColumns - 1;
}
