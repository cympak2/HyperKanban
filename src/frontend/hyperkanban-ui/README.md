# HyperKanban Frontend

Next.js frontend for the HyperKanban AI workflow orchestration platform.

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Hooks** - State management and polling

## Project Structure

```
src/frontend/hyperkanban-ui/
├── app/                 # Next.js App Router pages
│   ├── page.tsx        # Main board view page
│   └── layout.tsx      # Root layout
├── components/          # React components
│   ├── BoardView.tsx   # Full board visualization with polling
│   ├── Column.tsx      # Kanban column with work items
│   └── WorkItemCard.tsx # Individual work item card
├── hooks/               # Custom React hooks
│   ├── useBoard.ts     # Board fetching and polling
│   └── useWorkItems.ts # Work items fetching and polling
├── services/            # API service layer
│   └── api.ts          # Backend API client
└── types/               # TypeScript type definitions
    └── index.ts        # Board, WorkItem, Column types
```

## Features

### Real-time Polling
- Board state refreshes every 5 seconds
- Work items in each column refresh independently
- Processing indicators for AI-running items

### Visual Indicators
- Color-coded column types (Human: blue, AI: purple)
- Work item states (Pending, Processing, WaitingForApproval, Completed, Error)
- Priority badges (Low, Medium, High, Critical)
- Container configuration display

### Components

**BoardView**: Main board visualization
- Auto-polling every 5 seconds
- Displays board name, description, state
- Renders columns in order
- Error handling and retry logic

**Column**: Kanban column component
- Shows column name, type, and item count
- Displays container configuration if AI column
- Auto-scrolling for long lists
- Polls for work items every 5 seconds

**WorkItemCard**: Individual work item
- Shows title, description, priority, state
- Tags display (first 3 + count)
- Processing indicator with spinner
- Clickable for future detail view

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

For production (Azure Static Web App):

```
NEXT_PUBLIC_API_URL=https://hyperkanban-api-dev.azurewebsites.net
```

## API Integration

The frontend connects to the .NET backend API via the `apiService`:

```typescript
import { apiService } from '@/services/api';

// Fetch boards
const boards = await apiService.getBoards();

// Create work item
const workItem = await apiService.createWorkItem(boardId, {
  title: 'New feature request',
  description: 'Details here...',
  priority: 'High',
  tags: ['feature'],
  assignees: []
});

// Approve work item
await apiService.approveWorkItem(boardId, workItemId, {
  approved: true,
  notes: 'LGTM'
});
```

## Build for Production

```bash
npm run build
npm start
```

## Deployment

Deployed to Azure Static Web Apps via GitHub Actions. See [/.github/workflows/frontend-deploy.yml](/.github/workflows/frontend-deploy.yml).

## Future Enhancements (Phase 2)

- WorkItem detail modal (view AI processing history, audit trail)
- Drag-and-drop between columns
- Create board UI
- Create work item UI
- User authentication with Azure AD
- Real-time updates (SignalR/WebSockets)
- Advanced filtering and search
- Board templates
- Analytics dashboard

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
