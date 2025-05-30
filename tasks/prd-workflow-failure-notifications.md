# PRD: Workflow Failure Notifications

## Implementation Status: ✅ COMPLETED (Phase 1)

**Completion Date**: 2025-05-29
**Implementation Scope**: `eventFromImageBase64Workflow` with full failure notification support

## 1. Introduction/Overview

This document outlines the requirements for implementing user-facing notifications when an event creation workflow (initially focusing on the `eventFromImageBase64Workflow`) fails. Currently, users receive a notification upon successful event creation, but there is no corresponding notification if a step within the workflow encounters an error, leaving the user uninformed about the status of their request.

The goal is to ensure users are promptly notified if their attempt to create an event via image upload (and subsequently via URL or text) does not succeed due to a backend processing error.

**✅ IMPLEMENTED**: Complete failure notification system for `eventFromImageBase64Workflow` using Convex's built-in workflow failure detection with `onComplete` callbacks.

## 2. Goals

- ✅ Implement a system to send a push notification to the user if any critical step in the `eventFromImageBase64Workflow` fails.
- ✅ Ensure the failure notification clearly indicates that the event creation process was unsuccessful.
- ✅ Design the solution to be adaptable for other event creation workflows (e.g., from URL, from text) in the future.
- ✅ Leverage the existing notification infrastructure (`internal.notifications.push`) for sending these failure notifications.

## 3. User Stories

- ✅ **As a user who submitted an image to create an event, if the process fails for any reason (e.g., AI extraction error, image upload error, database error), I want to receive a push notification informing me that the event creation was unsuccessful, so I know what happened and am not left wondering.**
- ✅ As a user, if I receive a failure notification, I want it to be distinct from a success notification, so I can immediately understand the outcome.

## 4. Functional Requirements

1.  ✅ **Failure Detection:** The `eventFromImageBase64Workflow` in `packages/backend/convex/workflows/eventIngestion.ts` automatically detects failures in all critical steps using Convex's built-in workflow failure detection, including:
    - AI data extraction (`internal.ai.extractEventFromBase64Image`)
    - Image upload (`internal.files.uploadImage`)
    - Event validation (`internal.ai.validateFirstEvent`)
    - Database insertion (`internal.events.insertEvent`)
2.  ✅ **Failure Notification Trigger:** Implemented via `onCompleteHandlerForEventFromImageBase64Workflow` that automatically triggers on workflow failure.
    - Notification is sent to the user who initiated the workflow (identified by `args.userId`).
3.  ✅ **Notification Content:** The failure notification:
    - Title: "Event creation failed"
    - Body: "We couldn't create your event from the image. Please try again."
    - Includes `isFailure: true` flag to distinguish from success notifications
4.  ✅ **Leverage Existing Notification System:** Uses `internal.notifications.pushFailure` action which integrates with existing notification infrastructure.
5.  ✅ **Workflow Integrity:** Uses Convex's built-in workflow failure detection rather than manual try/catch blocks, ensuring reliable failure handling.
6.  ✅ **Extensibility (Consideration):** Complete documentation and implementation pattern created for future application to:
    - `eventFromUrlThenCreateThenNotification`
    - `eventFromRawTextThenCreateThenNotification`

## 5. Non-Goals (Out of Scope for this specific PRD)

- Implementing complex retry mechanisms within the workflow for failed steps.
- Providing detailed technical error codes or debugging information directly in the user-facing notification. (The primary goal is to inform the user of the failure, not to provide a debugging tool for the user).
- Significant changes to the client-side UI to display detailed error messages beyond what's conveyed in the notification.
- Automatic issue creation or alerting for developers (though logs should still exist).

## 6. Design Considerations (Optional)

- ✅ The failure notification uses distinct content and includes `isFailure: true` flag to differentiate from success notifications.
- ✅ Workflow status automatically reflects failed state through Convex's workflow manager.

## 7. Technical Considerations (Optional)

- ✅ Leveraged Convex workflow manager's built-in `onComplete` callback mechanism for reliable error handling.
- ✅ User context (`args.userId` and `args.username`) is preserved and available for failure notifications.
- ✅ Created dedicated `internal.notifications.pushFailure` action for failure-specific notifications.

## 8. Success Metrics

- ✅ Users reliably receive a push notification within a reasonable timeframe after a failure occurs in the `eventFromImageBase64Workflow`.
- ✅ Comprehensive testing validates that failure notifications are triggered for all critical failure points.
- ✅ Implementation supports reduction in user uncertainty about "silent failures" of event creation.

## 9. Implementation Details

### ✅ Completed Components

1. **Workflow Configuration**: `eventFromImageBase64Workflow` configured with `onComplete` callback
2. **Failure Handler**: `onCompleteHandlerForEventFromImageBase64Workflow` detects and handles failures
3. **Notification Action**: `internal.notifications.pushFailure` sends failure-specific notifications
4. **Testing Infrastructure**: Comprehensive test functions for all failure scenarios
5. **Documentation**: Complete pattern documentation for extension to other workflows

### ✅ Resolved Questions

- **Notification Wording**: "Event creation failed" / "We couldn't create your event from the image. Please try again."
- **Context Level**: Generic failure message with actionable guidance, avoiding technical details
- **Implementation Pattern**: Uses Convex's native workflow failure detection for reliability

## 10. Extension to Other Workflows (Phase 2)

### Recommended Next Steps

The failure notification pattern has been successfully implemented for `eventFromImageBase64Workflow` and documented for extension to other workflows. The following follow-up work is recommended:

#### Phase 2A: URL Workflow Extension

- Convert `eventFromUrlThenCreateThenNotification` to workflow pattern
- Implement URL-specific failure notifications
- Add comprehensive testing for URL-specific failure scenarios

#### Phase 2B: Text Workflow Extension

- Convert `eventFromRawTextThenCreateThenNotification` to workflow pattern
- Implement text-specific failure notifications
- Add comprehensive testing for text-specific failure scenarios

#### Phase 2C: System-wide Optimization

- Monitor failure notification rates and patterns
- Optimize common failure scenarios
- Implement centralized failure analytics

### Documentation Reference

Complete implementation guidance is available in:

- `packages/backend/convex/workflows/README-failure-notifications.md`
- Contains detailed analysis of other workflows and implementation approaches
- Includes migration path and testing strategies

## 11. Success Metrics - Achieved

- ✅ **Reliable Notifications**: Automatic failure detection and notification delivery
- ✅ **Comprehensive Coverage**: All critical failure points identified and handled
- ✅ **User Experience**: Clear, actionable failure notifications
- ✅ **Extensibility**: Documented pattern ready for other workflows
- ✅ **Testing**: Full test coverage for failure scenarios
