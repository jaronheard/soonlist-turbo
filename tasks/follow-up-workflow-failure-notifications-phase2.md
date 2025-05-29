# Follow-up Tasks: Workflow Failure Notifications - Phase 2

## Overview

This document outlines the follow-up tasks for extending the workflow failure notification pattern to the remaining event creation workflows. Phase 1 (image workflow) has been completed successfully.

## Prerequisites

- [x] Phase 1: `eventFromImageBase64Workflow` failure notifications implemented
- [x] Pattern documentation completed (`README-failure-notifications.md`)
- [x] Testing infrastructure established

## Phase 2A: URL Workflow Extension

### 2A.1 Convert URL Mutation to Workflow

- [x] 2A.1.1 Create `eventFromUrlWorkflow` workflow definition in `packages/backend/convex/workflows/eventIngestion.ts`
- [x] 2A.1.2 Implement `eventFromUrlWorkflowHandler` with proper step separation:
  - [x] URL content extraction step
  - [x] AI processing step
  - [x] Event validation step
  - [x] Database creation step
- [x] 2A.1.3 Create workflow argument validator based on existing mutation args
- [x] 2A.1.4 Test workflow execution with success scenarios

### 2A.2 Implement URL Failure Notifications

- [x] 2A.2.1 Create `onCompleteHandlerForEventFromUrl` in workflow file
- [x] 2A.2.2 Implement URL-specific failure notification action (`pushUrlFailure`)
- [x] 2A.2.3 Configure workflow with `onComplete` callback
- [x] 2A.2.4 Test failure notification delivery for URL-specific failures

### 2A.3 Create URL-Specific Test Infrastructure

- [x] 2A.3.1 Implement test functions for URL workflow failures:
  - [x] `simulateUrlFetchFailure`
  - [x] `simulateUrlContentParsingFailure`
  - [x] `simulateUrlAiProcessingFailure`
  - [x] `simulateUrlValidationFailure`
  - [x] `simulateUrlDatabaseFailure`
- [x] 2A.3.2 Create validation functions for URL workflow testing
- [x] 2A.3.3 Test all critical failure points with notification verification
  - [x] Backend test infrastructure implemented
  - [x] Client testing interface updated (workflow-test.tsx)
  - [x] URL workflow tests integrated into existing test screen

### 2A.4 Update Client Integration

- [ ] 2A.4.1 Update API router to call workflow instead of mutation
- [ ] 2A.4.2 Update client-side components to handle workflow response
- [ ] 2A.4.3 Test end-to-end URL workflow from client
- [ ] 2A.4.4 Verify failure notifications reach client properly

## Phase 2B: Text Workflow Extension

### 2B.1 Convert Text Mutation to Workflow

- [ ] 2B.1.1 Create `eventFromTextWorkflow` workflow definition
- [ ] 2B.1.2 Implement `eventFromTextWorkflowHandler` with proper step separation:
  - [ ] Text preprocessing step
  - [ ] AI extraction step
  - [ ] Event validation step
  - [ ] Database creation step
- [ ] 2B.1.3 Create workflow argument validator based on existing mutation args
- [ ] 2B.1.4 Test workflow execution with success scenarios

### 2B.2 Implement Text Failure Notifications

- [ ] 2B.2.1 Create `onCompleteHandlerForEventFromText` in workflow file
- [ ] 2B.2.2 Implement text-specific failure notification action (`pushTextFailure`)
- [ ] 2B.2.3 Configure workflow with `onComplete` callback
- [ ] 2B.2.4 Test failure notification delivery for text-specific failures

### 2B.3 Create Text-Specific Test Infrastructure

- [ ] 2B.3.1 Implement test functions for text workflow failures:
  - [ ] `simulateTextPreprocessingFailure`
  - [ ] `simulateTextAiExtractionFailure`
  - [ ] `simulateTextValidationFailure`
  - [ ] `simulateTextDatabaseFailure`
- [ ] 2B.3.2 Create validation functions for text workflow testing
- [ ] 2B.3.3 Test all critical failure points with notification verification

### 2B.4 Update Client Integration

- [ ] 2B.4.1 Update API router to call workflow instead of mutation
- [ ] 2B.4.2 Update client-side components to handle workflow response
- [ ] 2B.4.3 Test end-to-end text workflow from client
- [ ] 2B.4.4 Verify failure notifications reach client properly

## Phase 2C: System-wide Optimization

### 2C.1 Centralize Common Components

- [ ] 2C.1.1 Extract shared event validation logic into common action
- [ ] 2C.1.2 Create shared database operation actions for all workflows
- [ ] 2C.1.3 Standardize error logging across all workflows
- [ ] 2C.1.4 Create common notification content management system

### 2C.2 Monitoring and Analytics

- [ ] 2C.2.1 Implement failure rate tracking for each workflow type
- [ ] 2C.2.2 Add workflow performance monitoring
- [ ] 2C.2.3 Create dashboard for failure notification metrics
- [ ] 2C.2.4 Set up alerts for unusual failure patterns

### 2C.3 Documentation and Maintenance

- [ ] 2C.3.1 Update main documentation with all workflow patterns
- [ ] 2C.3.2 Create troubleshooting guide for common failure scenarios
- [ ] 2C.3.3 Document best practices for adding new workflows
- [ ] 2C.3.4 Create maintenance checklist for workflow health monitoring

## Success Criteria

### Phase 2A Success Metrics

- [ ] URL workflow reliably sends failure notifications for all critical failure points
- [ ] URL-specific failure notification content is appropriate and actionable
- [ ] End-to-end testing validates complete URL workflow functionality
- [ ] Client integration works seamlessly with workflow pattern

### Phase 2B Success Metrics

- [ ] Text workflow reliably sends failure notifications for all critical failure points
- [ ] Text-specific failure notification content is appropriate and actionable
- [ ] End-to-end testing validates complete text workflow functionality
- [ ] Client integration works seamlessly with workflow pattern

### Phase 2C Success Metrics

- [ ] All workflows use consistent patterns and shared components
- [ ] Monitoring system provides visibility into workflow health
- [ ] Documentation enables easy addition of new workflows
- [ ] System demonstrates improved reliability and user experience

## Timeline Estimation

- **Phase 2A**: 5-7 days (URL workflow extension)
- **Phase 2B**: 4-6 days (text workflow extension)
- **Phase 2C**: 3-5 days (optimization and monitoring)
- **Total**: 12-18 days for complete Phase 2 implementation

## Dependencies

- Phase 1 completion (✅ Done)
- Convex workflow infrastructure (✅ Available)
- Existing notification system (✅ Available)
- Testing infrastructure patterns (✅ Established)

## Relevant Files

### Implementation Files

- `packages/backend/convex/workflows/eventIngestion.ts`
- `packages/backend/convex/internal/notifications.ts`
- `packages/backend/convex/ai.ts`
- `packages/backend/convex/model/ai.ts`

### Documentation Files

- `packages/backend/convex/workflows/README-failure-notifications.md`
- `tasks/prd-workflow-failure-notifications.md`

### Testing Files

- `packages/backend/convex/workflows/testFailureNotifications.ts` (to be extended)
