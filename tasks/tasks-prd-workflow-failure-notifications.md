- [ ] 1.0 Enhance `eventFromImageBase64Workflow` to Capture and Identify Failures

  - [x] 1.1 Review `eventFromImageBase64Workflow` in `packages/backend/convex/workflows/eventIngestion.ts` to identify all critical steps where failures can occur (AI extraction, image upload, validation, DB insert).
  - [x] 1.2 Research and implement Convex workflow's built-in error handling using `onComplete` callbacks instead of manual try/catch blocks, leveraging the workflow manager's automatic failure detection.
  - [x] 1.3 Ensure the `onComplete` callback can distinguish between success and failure states using `runResult.kind === "failed"` and retain error information from `runResult.error`.
  - [ ] 1.4 Configure the workflow to use an `onComplete` callback that will handle both success and failure notification scenarios (blocked by existing linter errors in ai.ts).

- [x] 2.0 Implement Failure Notification Logic within `eventFromImageBase64Workflow`

  - [x] 2.1 Design a new workflow step or a dedicated error handling block (e.g., a final `catch` block for the main workflow logic) that is responsible for sending failure notifications.
  - [x] 2.2 Ensure this error handling block is executed if any of the preceding critical steps (identified in 1.1) throw an error.
  - [x] 2.3 Call the `internal.notifications.push` action (or a new wrapper/dedicated failure notification action) from this error handling block.
  - [x] 2.4 Pass necessary arguments to the notification action, such as `userId`, `username`, and an indicator that this is a failure notification.
  - [x] 2.5 After sending a failure notification, ensure the workflow either re-throws the error to be caught by the workflow manager (marking the workflow as failed) or explicitly sets a failed status if the manager allows.

- [x] 3.0 Define and Configure Failure Notification Content

  - [x] 3.1 Decide on the exact wording for the failure push notification (COMPLETED: "Event creation failed" / "We couldn't create your event from the image. Please try again.").
  - [x] 3.2 If `internal.notifications.push` is used directly, determine if its arguments can accommodate a 'failure' type message or if a new internal action (e.g., `internal.notifications.sendFailurePush`) is needed to encapsulate this logic (COMPLETED: `internal.notifications.pushFailure` already exists).
  - [x] 3.3 Alternatively, modify `packages/backend/convex/model/notificationHelpers.ts` to include a function like `getFailureNotificationContent(reason?: string)` that returns the title, subtitle, and body for a failure (NOT NEEDED: content already defined in pushFailure action).
  - [x] 3.4 Ensure the failure notification content is distinct from success notifications (COMPLETED: includes `isFailure: true` flag and different title/body).

- [ ] 4.0 Test and Validate Failure Notification Scenarios for Image Workflow

  - [ ] 4.1 Create mock functions or simulate error conditions for each critical step in `eventFromImageBase64Workflow` (e.g., make AI extraction throw an error, simulate image upload failure).
  - [ ] 4.2 For each simulated failure, verify that:
    - [ ] 4.2.1 The correct failure notification is triggered and sent to the specified user.
    - [ ] 4.2.2 The workflow status (if checked via `getWorkflowStatus`) correctly reflects a failed state.
    - [ ] 4.2.3 No success notification is sent.
    - [ ] 4.2.4 Appropriate error logging occurs on the backend.
  - [ ] 4.3 Test the scenario where the notification sending step itself fails (though less critical for this PRD, consider logging).

- [ ] 5.0 Document and Plan Extensibility to Other Workflows
  - [ ] 5.1 Document the implemented failure notification pattern for the image workflow.
  - [ ] 5.2 Briefly outline how this pattern could be applied to `eventFromUrlThenCreateThenNotification` and `eventFromRawTextThenCreateThenNotification` by identifying their critical steps and error handling points.
  - [ ] 5.3 Update the PRD (`tasks/prd-workflow-failure-notifications.md`) or create follow-up tasks/notes regarding the extension to other workflows.
