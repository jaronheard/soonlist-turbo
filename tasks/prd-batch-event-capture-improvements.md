# Product Requirements Document: Batch Event Capture Improvements

## 1. Introduction/Overview

This document outlines the requirements for improving the user experience when adding multiple events (batch capture) in the Soonlist application. Currently, adding multiple events triggers a separate notification for each event upon completion, and the information within these notifications (like total events added) can be inaccurate due to the asynchronous nature of the process. This can lead to a confusing and less-than-ideal user experience, especially for new users attempting to add many events at once.

The goal of this feature is to provide clearer, more accurate feedback to the user during and after batch event capture, instilling confidence in the application and encouraging continued use. This includes refining the notification strategy and introducing an in-app mechanism to view the progress of ongoing captures.

## 2. Goals

- Improve the clarity and accuracy of notifications for batch event captures.
- Provide users with real-time, in-app feedback on the status of their event captures.
- Increase user confidence in the event capture process, especially for new users.
- Encourage users to continue capturing events by providing a smooth and informative experience.
- Reduce user confusion caused by multiple, potentially out-of-order, notifications.

## 3. User Stories

- **As a new user,** I want to add multiple events (e.g., 5-10) at once and receive clear, consolidated feedback on their successful capture, so that I feel confident the app is working correctly and I understand what happened.
- **As a user capturing multiple events,** I want to see that the capture process has started immediately and be able to check the status of each event (e.g., uploading, processing, completed), so I'm not left wondering if it's working.
- **As a user who has just batch-added events,** I want to receive a notification that summarizes the outcome and, if successful, subtly prompts me to capture more, so I can easily continue using the app.
- **As a user,** I want the notification system to be intelligent, providing individual updates for a small number of events but a summary for a large batch, so I am not overwhelmed by notifications.

## 4. Functional Requirements

### 4.1. Notification System

1.  **FR1.1:** If a user adds 1 to 3 events simultaneously, the system MUST send a separate push notification for each successfully completed event.
    - Each notification SHOULD clearly identify the event it pertains to (e.g., event name or a piece of captured information if available).
    - Each notification SHOULD confirm success.
    - Each notification SHOULD include a call to action to "Capture more events."
    - **Failure Handling:** If any individual event fails during processing:
      - The system MUST send a separate error notification for each failed event, clearly indicating the failure and the specific event affected.
      - Error notifications SHOULD include a brief, user-friendly explanation of the failure reason when possible (e.g., "Image upload failed," "Processing error").
      - Error notifications MUST include a "Retry" call to action that allows the user to re-attempt capturing that specific event.
      - Failed events SHOULD NOT trigger automatic retry attempts; user intervention is required.
      - If multiple events fail, each failure generates its own individual error notification (maintaining the 1-3 event individual notification principle).
2.  **FR1.2:** If a user adds more than 3 events simultaneously, the system MUST send a single summary push notification once all events in that batch have finished processing (successfully or with failures).
    - The summary notification MUST state the total number of events successfully added (e.g., "5 events added successfully!").
    - If there were any failures, this could be mentioned generally (e.g., "5 of 7 events added successfully.") or detailed in the target screen.
    - The summary notification MUST include a call to action to "Capture more events."
3.  **FR1.3:** Tapping on any success notification (individual or summary) MUST navigate the user to the main event list screen.
    - The newly added events SHOULD be visible on this list.

### 4.2. In-App Capture Progress Indicator

1.  **FR2.1:** When one or more event captures are initiated, an in-app progress indicator MUST immediately become visible.
2.  **FR2.2:** This indicator SHOULD be located near the primary "Capture" button/area.
3.  **FR2.3:** The indicator SHOULD display the number of events currently being processed.
4.  **FR2.4:** Tapping the progress indicator MUST open a view/modal/screen (henceforth "Progress View") displaying the status of all currently processing events from the latest batch(es).
5.  **FR2.5:** For each event in the Progress View, the following information SHOULD be displayed:
    - An identifier for the event (e.g., a temporary name, a timestamp, or an initial image thumbnail if feasible).
    - The current status of the event (e.g., "Uploading Image," "Processing with AI," "Completing," "Failed - [Reason if simple]").
6.  **FR2.6:** Once all events in a batch are completed, the progress indicator associated with that batch SHOULD disappear, or the count should update if other batches are still in progress.
7.  **FR2.7:** The Progress View should clearly show when an event has "Completed" successfully or "Failed." Completed events could persist in this view for a short duration or until the view is dismissed.

## 5. Non-Goals (Out of Scope for this iteration)

- A detailed "Recently Captured List" screen specifically designed for sharing events. (This can be a follow-up feature).
- Modifying the notification call to action to "Share event(s)" instead of "Capture more events."
- Complex analytics or history of batch uploads beyond the immediate Progress View.
- Allowing users to cancel in-progress uploads from the Progress View (unless deemed trivial to implement).
- Displaying precise percentage progress for each step of an event capture (status name is sufficient).

## 6. Design Considerations (Optional)

- **Progress Indicator:**
  - Consider a small circular badge with a number count superimposed on it, placed near the capture button.
  - A subtle spinning animation could be part of the indicator when processing is active to draw attention without being distracting.
- **Progress View:**
  - A bottom sheet or modal might be appropriate for displaying the list of events and their statuses.
  - Each item in the list should be clearly delineated. Using icons for statuses (e.g., checkmark for completed, spinner for processing, 'x' for failed) can improve scannability.
- **Haptics:** Continue using haptics to provide feedback for key actions like capture initiation, as this is already in place and contributes to user confidence.

## 7. Technical Considerations (Optional)

- The system needs to accurately track events belonging to a "batch" to trigger the correct notification logic (individual vs. summary). This might involve a temporary batch identifier when events are submitted.
- The status updates for the in-app Progress View will require a way for the frontend to observe changes in the event processing pipeline (e.g., via Convex subscriptions or frequent polling if necessary, though subscriptions are preferred).
- Event processing statuses ("Uploading Image," "Processing with AI," "Completing") need to be clearly defined and propagated from the backend (Convex).
- The existing `apps/expo/src/components/ui/WorkflowStatus.tsx` component demonstrates a technical approach for fetching and displaying individual workflow/event statuses using `useQuery` from `convex/react` and mapping status types to display logic (text, emoji, color). This can serve as a technical reference for implementing the data retrieval and status representation logic for items within the new Progress View, though the UI presentation of the Progress View itself will be different (a consolidated list rather than separate dismissable items).

## 8. Success Metrics

- Reduction in user complaints or negative feedback related to event capture notifications.
- Increase in the average number of events captured per session, particularly for new users.
- Positive feedback regarding the new progress indicator and clarity of capture status.
- User survey data (if conducted) indicating increased confidence in the event capture process.
- Observing users successfully navigate from the summary notification to the event list.

## 9. Open Questions

- For FR1.2 (summary notification for >3 events), if some events fail, how much detail about the failures should the notification itself contain versus deferring details to the app? (Current thought: keep notification simple, details in-app).
- How long should "Completed" or "Failed" events remain in the Progress View before they are cleared?
- What is the exact visual design for the progress indicator and the Progress View? (To be determined by the design/dev team, the suggestions above are starting points).
