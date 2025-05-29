# PRD: Workflow Failure Notifications

## 1. Introduction/Overview

This document outlines the requirements for implementing user-facing notifications when an event creation workflow (initially focusing on the `eventFromImageBase64Workflow`) fails. Currently, users receive a notification upon successful event creation, but there is no corresponding notification if a step within the workflow encounters an error, leaving the user uninformed about the status of their request.

The goal is to ensure users are promptly notified if their attempt to create an event via image upload (and subsequently via URL or text) does not succeed due to a backend processing error.

## 2. Goals

- Implement a system to send a push notification to the user if any critical step in the `eventFromImageBase64Workflow` fails.
- Ensure the failure notification clearly indicates that the event creation process was unsuccessful.
- Design the solution to be adaptable for other event creation workflows (e.g., from URL, from text) in the future.
- Leverage the existing notification infrastructure (`internal.notifications.push`) for sending these failure notifications.

## 3. User Stories

- **As a user who submitted an image to create an event, if the process fails for any reason (e.g., AI extraction error, image upload error, database error), I want to receive a push notification informing me that the event creation was unsuccessful, so I know what happened and am not left wondering.**
- As a user, if I receive a failure notification, I want it to be distinct from a success notification, so I can immediately understand the outcome.

## 4. Functional Requirements

1.  **Failure Detection:** The `eventFromImageBase64Workflow` in `packages/backend/convex/workflows/eventIngestion.ts` must be able to detect failures in its critical steps, including:
    - AI data extraction (`internal.ai.extractEventFromBase64Image`)
    - Image upload (`internal.files.uploadImage`)
    - Event validation (`internal.ai.validateFirstEvent`)
    - Database insertion (`internal.events.insertEvent`)
2.  **Failure Notification Trigger:** If any of the aforementioned critical steps fail, the workflow must trigger a user notification.
    - This notification should be sent to the user who initiated the workflow (identified by `args.userId`).
3.  **Notification Content:** The failure notification should:
    - Clearly state that the event creation failed.
    - Optionally, provide a very brief, user-friendly reason or direct the user to check the app for more details if appropriate (details to be decided during implementation, simplicity is key).
    - Be distinguishable from success notifications.
4.  **Leverage Existing Notification System:** The failure notifications should be sent using the existing `internal.notifications.push` action.
5.  **Workflow Integrity:** The workflow should be structured (e.g., using try/catch blocks around steps) such that it can proceed to a "send failure notification" step even if a primary processing step fails.
6.  **Extensibility (Consideration):** The pattern for failure notification implemented for the image workflow should be considered for future application to:
    - `eventFromUrlThenCreateThenNotification`
    - `eventFromRawTextThenCreateThenNotification`

## 5. Non-Goals (Out of Scope for this specific PRD)

- Implementing complex retry mechanisms within the workflow for failed steps.
- Providing detailed technical error codes or debugging information directly in the user-facing notification. (The primary goal is to inform the user of the failure, not to provide a debugging tool for the user).
- Significant changes to the client-side UI to display detailed error messages beyond what's conveyed in the notification.
- Automatic issue creation or alerting for developers (though logs should still exist).

## 6. Design Considerations (Optional)

- The failure notification should ideally be a new type of notification or use a distinct template/wording to differentiate from success notifications.
- Consider if the existing `getWorkflowStatus` query needs to be updated to reflect a "failed with notification sent" state, if that's useful for the client.

## 7. Technical Considerations (Optional)

- The workflow manager (`@convex-dev/workflow`) might have built-in mechanisms or patterns for error handling and finalization steps that could be leveraged.
- Ensure that the `args.userId` and `args.username` (or necessary identifiers) are available/passed to the failure notification step.
- The existing `internal.notifications.push` action might need slight modifications or a new wrapper to handle "failure" type notifications if content needs to be significantly different.

## 8. Success Metrics

- Users reliably receive a push notification within a reasonable timeframe (e.g., < 1 minute) after a failure occurs in the `eventFromImageBase64Workflow`.
- Logs confirm that failure notifications are triggered and attempted for relevant workflow failures.
- Reduction in user uncertainty or potential support queries related to "silent failures" of event creation.

## 9. Open Questions

- What should be the exact wording of the failure notification to the user? (To be determined during implementation, aiming for clarity and brevity).
- Should a generic "Event creation failed. Please try again." message be used, or can we provide slightly more context without being too technical (e.g., "Event creation from image failed.")?
