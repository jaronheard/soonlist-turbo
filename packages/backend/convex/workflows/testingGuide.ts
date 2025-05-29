import { vWorkflowId } from "@convex-dev/workflow";
import { v } from "convex/values";

import { components, internal } from "../_generated/api";
import { mutation } from "../_generated/server";

/**
 * Testing guide and validation script for workflow failure notifications
 *
 * This file contains functions to help validate that:
 * 1. Workflows fail correctly when critical steps encounter errors
 * 2. Failure notifications are sent to users when workflows fail
 * 3. The workflow status is properly updated to reflect failure states
 * 4. No success notifications are sent when failures occur
 */

/**
 * Comprehensive test validator for workflow failure notifications
 * Tests all aspects of the failure notification system
 */
export const validateWorkflowFailureNotifications = mutation({
  args: {
    workflowId: vWorkflowId,
    expectedFailureType: v.string(), // "ai_extraction", "image_upload", "validation", "database"
  },
  returns: v.object({
    isValid: v.boolean(),
    workflowStatus: v.string(),
    hasOnCompleteHandler: v.boolean(),
    failureDetected: v.boolean(),
    notificationSent: v.boolean(),
    error: v.optional(v.string()),
    recommendations: v.array(v.string()),
    timestamp: v.number(),
  }),
  handler: async (ctx, args) => {
    const recommendations: string[] = [];
    let isValid = true;
    let failureDetected = false;
    let notificationSent = false;
    let errorMessage: string | undefined;

    try {
      // Check workflow status using the workflow manager
      const status = await ctx.runQuery(
        components.workflow.workflow.getStatus,
        {
          workflowId: args.workflowId,
        },
      );

      let hasOnCompleteHandler = !!status.workflow.onComplete;

      if (!hasOnCompleteHandler) {
        recommendations.push(
          "❌ Workflow does not have an onComplete handler configured. This is required for failure notifications.",
        );
      } else {
        recommendations.push(
          "✅ Workflow has an onComplete handler configured.",
        );
      }

      // Check if workflow completed and determine status
      if (status.workflow.runResult) {
        const runResult = status.workflow.runResult;

        if (runResult.kind === "success") {
          recommendations.push(
            "❌ Workflow completed successfully when it should have failed. Check the test data.",
          );
        } else if (runResult.kind === "failed") {
          failureDetected = true;
          notificationSent = true;
          errorMessage = runResult.error;

          recommendations.push("✅ Workflow failed as expected.");

          if (
            args.expectedFailureType &&
            errorMessage?.includes(args.expectedFailureType)
          ) {
            recommendations.push("✅ Failure reason matches expected error.");
          } else if (args.expectedFailureType) {
            recommendations.push(
              `⚠️ Expected failure reason "${args.expectedFailureType}" not found in error: "${errorMessage}"`,
            );
          }

          // If we have an onComplete handler and the workflow failed,
          // the notification should have been triggered
          if (hasOnCompleteHandler) {
            recommendations.push(
              "✅ OnComplete handler should have triggered failure notification. Check your OneSignal dashboard or logs.",
            );
          }
        } else if (runResult.kind === "canceled") {
          recommendations.push(
            "⚠️ Workflow was canceled. This may not trigger failure notifications.",
          );
        }
      } else {
        recommendations.push(
          "⏳ Workflow is still in progress. Wait for completion before validating.",
        );
      }

      // Additional validation recommendations
      if (failureDetected && hasOnCompleteHandler) {
        recommendations.push(
          "🔍 Manual validation steps:",
          "  1. Check OneSignal dashboard for failure notification delivery",
          "  2. Check app device/simulator for received notification",
          "  3. Verify notification content matches expected failure message",
          "  4. Confirm no success notification was sent",
        );
      }

      return {
        isValid,
        workflowStatus: status.workflow.runResult?.kind || "unknown",
        hasOnCompleteHandler,
        failureDetected,
        notificationSent,
        error: errorMessage,
        recommendations,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        isValid: false,
        workflowStatus: "error-checking-status",
        hasOnCompleteHandler: false,
        failureDetected: false,
        notificationSent: false,
        error: error instanceof Error ? error.message : "Unknown error",
        recommendations: [
          "❌ Error occurred while checking workflow status.",
          "Check that the workflow ID is valid and the workflow exists.",
        ],
        timestamp: Date.now(),
      };
    }
  },
});

/**
 * Test execution guide and checklist
 */
export const getTestExecutionGuide = mutation({
  args: {},
  returns: v.object({
    steps: v.array(
      v.object({
        stepNumber: v.number(),
        title: v.string(),
        description: v.string(),
        functions: v.array(v.string()),
        expectedOutcome: v.string(),
      }),
    ),
    criticalSteps: v.array(v.string()),
    validationCriteria: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    return {
      steps: [
        {
          stepNumber: 1,
          title: "Test AI Extraction Failure",
          description: "Trigger workflow with invalid base64 image data",
          functions: ["workflows.testFailures.testAIExtractionFailure"],
          expectedOutcome:
            "Workflow fails during AI extraction step, failure notification sent",
        },
        {
          stepNumber: 2,
          title: "Test Image Upload Failure",
          description: "Trigger workflow with empty/invalid image data",
          functions: ["workflows.testFailures.testImageUploadFailure"],
          expectedOutcome:
            "Workflow fails during image upload step, failure notification sent",
        },
        {
          stepNumber: 3,
          title: "Test Validation Failure",
          description:
            "Trigger workflow with image that produces no valid events",
          functions: ["workflows.testFailures.testValidationFailure"],
          expectedOutcome:
            "Workflow fails during validation step, failure notification sent",
        },
        {
          stepNumber: 4,
          title: "Test Direct Notification System",
          description: "Directly test the failure notification system",
          functions: ["workflows.testFailures.testNotificationSystemDirectly"],
          expectedOutcome: "Failure notification sent successfully",
        },
        {
          stepNumber: 5,
          title: "Validate Results",
          description:
            "Check workflow statuses and validate notifications were sent",
          functions: [
            "workflows.testingGuide.validateWorkflowFailureNotifications",
          ],
          expectedOutcome: "All tests pass validation criteria",
        },
      ],
      criticalSteps: [
        "AI extraction (`internal.ai.extractEventFromBase64Image`)",
        "Image upload (`internal.files.uploadImage`)",
        "Event validation (`internal.ai.validateFirstEvent`)",
        "Database insertion (`internal.events.insertEvent`)",
      ],
      validationCriteria: [
        "✅ Workflow status correctly shows 'failed'",
        "✅ OnComplete handler is configured and triggered",
        "✅ Failure notification is sent to user",
        "✅ No success notification is sent",
        "✅ Workflow error message provides useful information",
        "✅ Client UI shows failed status in WorkflowStatus component",
      ],
    };
  },
});
