# End-to-End Testing Guide for HyperKanban MVP

## Test Environment Setup

### Prerequisites
- Backend API running (local or Azure)
- Frontend UI running (local or Azure)
- MySQL database initialized with container configs seeded
- Docker available for local container testing (optional)

---

## Test Suite

### Test 1: System Health Check

**Objective**: Verify all services are running and accessible

**Steps**:
1. Open backend health endpoint: `GET /api/boards`
   - Expected: Returns empty array `[]` or list of boards
2. Open frontend in browser
   - Expected: Loads without errors, shows "No Boards Yet" or board list
3. Open container configs endpoint: `GET /api/v1/containerconfigs`
   - Expected: Returns 2 container configs (idea-analyzer, requirements-generator)

**Pass Criteria**: All endpoints respond with 200 OK

---

### Test 2: Create New Board (UC-01)

**Objective**: Create a complete AI workflow board

**Steps**:
1. Click "+ New Board" or "+ Create Your First Board"
2. Fill in board details:
   - Name: "Test Pipeline"
   - Description: "Test board for E2E verification"
3. Click "+ Add Column" and create these columns in order:
   - Column 1:
     - Name: "Idea Intake"
     - Type: 👤 Human Action
   - Column 2:
     - Name: "Initial Analysis"
     - Type: 🤖 AI Agent
     - Container: Idea Analyzer (v1.0)
   - Column 3:
     - Name: "Analysis Review"
     - Type: 👤 Human Action
   - Column 4:
     - Name: "Requirements Generation"
     - Type: 🤖 AI Agent
     - Container: Requirements Generator (v1.0)
   - Column 5:
     - Name: "Final Review"
     - Type: 👤 Human Action
   - Column 6:
     - Name: "Done"
     - Type: 👤 Human Action
4. Click "Create Board"

**Expected Results**:
- ✅ Board appears in board dropdown
- ✅ All 6 columns visible in order
- ✅ AI columns show container badge
- ✅ Board state is "Active"

**Pass Criteria**: Board created successfully with all columns

---

### Test 3: Create Work Item (UC-03)

**Objective**: Submit a new work item to the intake column

**Steps**:
1. Ensure "Test Pipeline" board is selected
2. Click "+ New Work Item" button
3. Fill in work item details:
   - Title: "Add real-time collaboration feature"
   - Description: "Users should be able to collaborate in real-time on project boards with presence indicators and live cursors"
   - Priority: High
   - Tags: "collaboration, real-time, enterprise"
4. Click "Create Work Item"

**Expected Results**:
- ✅ Modal closes
- ✅ Work item appears in "Idea Intake" column
- ✅ Work item shows title, description preview, priority badge (High)
- ✅ State badge shows "Pending"
- ✅ Tags are visible (first 3)

**Pass Criteria**: Work item created and visible in first column

---

### Test 4: View Work Item Details (UC-02)

**Objective**: Inspect work item full details

**Steps**:
1. Click on the work item card created in Test 3
2. Review all tabs:
   - **Details tab**: Shows full description, tags, created/modified dates
   - **AI Processing History tab**: Should show "No AI processing history yet"
   - **Audit Trail tab**: Shows creation event

**Expected Results**:
- ✅ Modal opens with work item details
- ✅ All information displayed correctly
- ✅ Can switch between tabs
- ✅ Close button works

**Pass Criteria**: Work item details are complete and accessible

---

### Test 5: Manual Work Item Movement

**Objective**: Move work item to AI agent column to trigger processing

**Steps**:
1. Close the work item detail modal
2. Manually move work item from "Idea Intake" to "Initial Analysis" column
   - **Option A** (if drag-drop implemented): Drag the work item card
   - **Option B** (via API): Use API endpoint `PATCH /api/boards/{boardId}/workitems/{workItemId}/move`
     ```json
     {
       "targetColumnId": "initial-analysis-column-id"
     }
     ```

**Expected Results**:
- ✅ Work item disappears from "Idea Intake"
- ✅ Work item appears in "Initial Analysis" column
- ✅ State changes to "Processing" (after a moment)
- ✅ Processing spinner appears on card

**Pass Criteria**: Work item moved and state updated

---

### Test 6: Automated AI Processing (UC-04)

**Objective**: Verify container execution and automatic progression

**Prerequisites**:
- Azure Container Instances available (if deployed) OR
- Mock implementation returns success (for local testing without ACI)

**Steps**:
1. Wait for work item in "Initial Analysis" column to process
   - Expected duration: 30-60 seconds for cold start, 10-20s warm
2. Refresh board if auto-polling doesn't update (it should every 5s)
3. Observe state changes:
   - State: "Processing" → "WaitingForApproval"
   - Position: "Initial Analysis" → "Analysis Review"

**Expected Results**:
- ✅ Work item automatically moves to "Analysis Review" column
- ✅ State changes to "WaitingForApproval"
- ✅ No errors displayed
- ✅ AI Processing History shows 1 entry when viewing work item details

**Troubleshooting**:
- If stuck in "Processing" for >5 minutes, check backend logs
- If state = "Error", check container logs in Azure Portal
- Verify Azure OpenAI credentials are configured
- Check ACR credentials if container pull fails

**Pass Criteria**: AI processing completes and work item advances automatically

---

### Test 7: Review AI Output (UC-05)

**Objective**: Inspect AI-generated analysis

**Steps**:
1. Click on work item in "Analysis Review" column
2. Go to "AI Processing History" tab
3. Review the AI output:
   - Should contain JSON with analysis results
   - Check for fields like: summary, objectives, similar features, recommendations

**Expected Results**:
- ✅ AI processing record visible
- ✅ Status shows "Success"
- ✅ Execution time displayed
- ✅ Input shows work item data
- ✅ Output shows AI-generated analysis
- ✅ Container image name correct

**Pass Criteria**: AI output is present and structured correctly

---

### Test 8: Approve at Human Checkpoint (UC-05)

**Objective**: Approve AI output and advance work item

**Steps**:
1. With work item detail modal still open (from Test 7)
2. Note the "Approve & Advance" button is visible (since state = WaitingForApproval)
3. Add optional approval notes: "Analysis looks good, proceeding to requirements"
4. Click "✓ Approve & Advance"

**Expected Results**:
- ✅ Modal closes
- ✅ Work item moves to "Requirements Generation" column
- ✅ State changes to "Processing" again
- ✅ Audit trail records approval action

**Pass Criteria**: Work item approved and moved to next column

---

### Test 9: Second AI Processing

**Objective**: Verify second AI agent processes work item

**Steps**:
1. Wait for work item in "Requirements Generation" column to process
2. Refresh board if needed
3. Verify work item moves to "Final Review" column automatically

**Expected Results**:
- ✅ Work item in "Final Review" column
- ✅ State = "WaitingForApproval"
- ✅ AI Processing History shows 2 entries (Initial Analysis + Requirements Generation)
- ✅ Second AI output contains requirements data

**Pass Criteria**: Second AI processing completes successfully

---

### Test 10: Complete Workflow

**Objective**: Move work item to final column

**Steps**:
1. Click work item in "Final Review"
2. Click "✓ Approve & Advance"
3. Verify work item moves to "Done" column
4. Check state changes to "Completed"

**Expected Results**:
- ✅ Work item in "Done" column
- ✅ State = "Completed"
- ✅ Audit trail shows complete workflow history
- ✅ Both AI processing results preserved

**Pass Criteria**: Work item completes full workflow end-to-end

---

### Test 11: Create Multiple Work Items

**Objective**: Verify concurrent processing

**Steps**:
1. Create 3 more work items with different titles
2. Move all 3 to "Initial Analysis" column quickly
3. Observe processing:
   - Should process sequentially (MVP = synchronous execution)
   - Each should complete and advance automatically

**Expected Results**:
- ✅ All work items process successfully
- ✅ No race conditions or state corruption
- ✅ Each work item has complete AI history

**Pass Criteria**: Multiple work items can flow through system without issues

---

### Test 12: Error Handling

**Objective**: Verify graceful failure handling

**Steps**:
1. Create a work item with very long description (>5000 characters)
   - Expected: Validation error on create
2. Try to create board with consecutive AI columns (no Human checkpoint)
   - Expected: Validation error "AI columns must be followed by Human column"
3. Try to create AI column without selecting container
   - Expected: Validation error "Container required"

**Expected Results**:
- ✅ Validation errors displayed clearly
- ✅ Forms don't submit with invalid data
- ✅ Error messages are user-friendly

**Pass Criteria**: All validation errors handled properly

---

## Test Results Template

```markdown
## E2E Test Results - [Date]

**Environment**: [Local / Azure Dev / Azure Prod]
**Tester**: [Name]

| Test | Status | Notes |
|------|--------|-------|
| 1. System Health Check | ✅ Pass / ❌ Fail | |
| 2. Create New Board | ✅ Pass / ❌ Fail | |
| 3. Create Work Item | ✅ Pass / ❌ Fail | |
| 4. View Work Item Details | ✅ Pass / ❌ Fail | |
| 5. Manual Work Item Movement | ✅ Pass / ❌ Fail | |
| 6. Automated AI Processing | ✅ Pass / ❌ Fail | |
| 7. Review AI Output | ✅ Pass / ❌ Fail | |
| 8. Approve at Checkpoint | ✅ Pass / ❌ Fail | |
| 9. Second AI Processing | ✅ Pass / ❌ Fail | |
| 10. Complete Workflow | ✅ Pass / ❌ Fail | |
| 11. Multiple Work Items | ✅ Pass / ❌ Fail | |
| 12. Error Handling | ✅ Pass / ❌ Fail | |

**Overall Status**: [Pass / Fail]

**Issues Found**:
- [List any bugs or issues encountered]

**Performance Notes**:
- Average AI processing time: [X seconds]
- Board load time: [X seconds]
- Work item creation response: [X ms]
```

---

## Known Limitations (MVP)

Document these as expected behavior, not bugs:

- ❌ No drag-and-drop for work items (manual movement via modal only)
- ❌ No real-time updates (5-second polling only)
- ❌ No authentication (all users have full access)
- ❌ No edit work item functionality after creation
- ❌ No delete board/work item functionality
- ❌ Containers execute synchronously (one at a time per column)
- ❌ No container warm-start pool (cold start every time)
- ❌ No retry logic for failed containers (manual intervention required)

---

## Success Criteria

MVP is ready for demo if:
- ✅ All 12 tests pass
- ✅ End-to-end workflow completes without manual intervention (except approvals)
- ✅ AI processing produces valid JSON output
- ✅ No data loss during workflow
- ✅ Error states are recoverable
- ✅ Performance is acceptable (<60s for AI processing including cold start)
