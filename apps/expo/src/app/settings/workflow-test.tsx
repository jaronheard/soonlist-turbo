import React, { useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Stack } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { toast } from "sonner-native";

import { api } from "@soonlist/backend/convex/_generated/api";

import { Button } from "~/components/Button";

interface TestResult {
  workflowId: string;
  testName: string;
  timestamp: number;
  status: "running" | "completed" | "failed" | "unknown";
  error?: string;
}

export default function WorkflowTestScreen() {
  const { user } = useUser();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());

  // Mutations for testing
  const testAIFailure = useMutation(
    api.workflows.testFailures.testAIExtractionFailure,
  );
  const testUploadFailure = useMutation(
    api.workflows.testFailures.testImageUploadFailure,
  );
  const testValidationFailure = useMutation(
    api.workflows.testFailures.testValidationFailure,
  );
  const testNotificationDirect = useMutation(
    api.workflows.testFailures.testNotificationSystemDirectly,
  );

  // Mutations for testing URL workflows
  const testUrlFetchFailure = useMutation(
    api.workflows.testFailures.simulateUrlFetchFailure,
  );
  const testUrlContentParsingFailure = useMutation(
    api.workflows.testFailures.simulateUrlContentParsingFailure,
  );
  const testUrlAiProcessingFailure = useMutation(
    api.workflows.testFailures.simulateUrlAiProcessingFailure,
  );
  const testUrlValidationFailure = useMutation(
    api.workflows.testFailures.simulateUrlValidationFailure,
  );
  const testUrlWorkflowSuccess = useMutation(
    api.workflows.testFailures.testUrlWorkflowSuccess,
  );

  const userId = user?.id;
  const username = user?.username;

  if (!userId || !username) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-4">
        <Text className="text-lg text-gray-600">
          Please sign in to use workflow tests
        </Text>
      </View>
    );
  }

  const runTest = async (
    testName: string,
    testFunction: () => Promise<{ success: boolean; workflowId: string }>,
  ) => {
    setRunningTests((prev) => new Set(prev).add(testName));

    try {
      const result = await testFunction();

      if (result.success) {
        const testResult: TestResult = {
          workflowId: result.workflowId,
          testName,
          timestamp: Date.now(),
          status: "running",
        };

        setTestResults((prev) => [...prev, testResult]);
        toast.success(
          `${testName} started - Workflow ID: ${result.workflowId.slice(0, 8)}...`,
        );

        // Mark as completed after a short delay (workflows should fail quickly)
        setTimeout(() => {
          setTestResults((prev) =>
            prev.map((tr) =>
              tr.workflowId === result.workflowId
                ? { ...tr, status: "completed" }
                : tr,
            ),
          );
          toast.success(
            `${testName} completed - check for failure notification!`,
          );
        }, 3000);
      } else {
        toast.error(`${testName} failed to start`);
      }
    } catch (error) {
      toast.error(
        `${testName} error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setRunningTests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(testName);
        return newSet;
      });
    }
  };

  const testAI = () =>
    runTest("AI Extraction Failure", () => testAIFailure({ userId, username }));

  const testUpload = () =>
    runTest("Image Upload Failure", () =>
      testUploadFailure({ userId, username }),
    );

  const testValidation = () =>
    runTest("Validation Failure", () =>
      testValidationFailure({ userId, username }),
    );

  // URL workflow test functions
  const testUrlFetch = () =>
    runTest("URL Fetch Failure", () =>
      testUrlFetchFailure({ userId, username }),
    );

  const testUrlContentParsing = () =>
    runTest("URL Content Parsing Failure", () =>
      testUrlContentParsingFailure({ userId, username }),
    );

  const testUrlAiProcessing = () =>
    runTest("URL AI Processing Failure", () =>
      testUrlAiProcessingFailure({ userId, username }),
    );

  const testUrlValidation = () =>
    runTest("URL Validation Failure", () =>
      testUrlValidationFailure({ userId, username }),
    );

  const testUrlSuccess = () =>
    runTest("URL Workflow Success", () =>
      testUrlWorkflowSuccess({ userId, username }),
    );

  const testNotification = async () => {
    setRunningTests((prev) => new Set(prev).add("Direct Notification"));

    try {
      const result = await testNotificationDirect({
        userId,
        username,
        failureReason: "Test notification from workflow test screen",
      });

      if (result.success && result.notificationScheduled) {
        toast.success(
          "Direct notification test completed - check your device!",
        );
      } else {
        toast.error("Direct notification test failed");
      }
    } catch (error) {
      toast.error(
        `Notification test error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setRunningTests((prev) => {
        const newSet = new Set(prev);
        newSet.delete("Direct Notification");
        return newSet;
      });
    }
  };

  const clearResults = () => {
    Alert.alert(
      "Clear Results",
      "Are you sure you want to clear all test results?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => setTestResults([]),
        },
      ],
    );
  };

  const getStatusColor = (status: TestResult["status"]) => {
    switch (status) {
      case "running":
        return "text-blue-600";
      case "completed":
        return "text-green-600";
      case "failed":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "running":
        return "🔄";
      case "completed":
        return "✅";
      case "failed":
        return "❌";
      default:
        return "❓";
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Workflow Failure Tests",
          headerBackTitle: "Settings",
        }}
      />

      <ScrollView className="flex-1 bg-gray-50">
        <View className="p-4">
          {/* Header */}
          <View className="mb-6 rounded-lg bg-white p-4 shadow-sm">
            <Text className="mb-2 text-lg font-semibold text-gray-900">
              Workflow Failure Notification Tests
            </Text>
            <Text className="text-sm text-gray-600">
              Test each failure scenario to validate that users receive proper
              notifications when workflows fail.
            </Text>
            <Text className="mt-2 text-xs text-gray-500">
              User: {username} ({userId.slice(0, 8)}...)
            </Text>
          </View>

          {/* Test Buttons */}
          <View className="mb-6 space-y-3">
            <Button
              onPress={testAI}
              disabled={runningTests.has("AI Extraction Failure")}
              loading={runningTests.has("AI Extraction Failure")}
              className="flex-row items-center justify-center"
            >
              Test AI Extraction Failure
            </Button>

            <Button
              onPress={testUpload}
              disabled={runningTests.has("Image Upload Failure")}
              loading={runningTests.has("Image Upload Failure")}
              className="flex-row items-center justify-center"
            >
              Test Image Upload Failure
            </Button>

            <Button
              onPress={testValidation}
              disabled={runningTests.has("Validation Failure")}
              loading={runningTests.has("Validation Failure")}
              className="flex-row items-center justify-center"
            >
              Test Validation Failure
            </Button>

            <Button
              onPress={testNotification}
              disabled={runningTests.has("Direct Notification")}
              loading={runningTests.has("Direct Notification")}
              className="flex-row items-center justify-center bg-purple-600"
            >
              Test Direct Notification
            </Button>
          </View>

          {/* Image Workflow Test Buttons */}
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-gray-900">
              Image Workflow Tests
            </Text>
            <View className="space-y-3">
              <Button
                onPress={testAI}
                disabled={runningTests.has("AI Extraction Failure")}
                loading={runningTests.has("AI Extraction Failure")}
                className="flex-row items-center justify-center"
              >
                Test AI Extraction Failure
              </Button>

              <Button
                onPress={testUpload}
                disabled={runningTests.has("Image Upload Failure")}
                loading={runningTests.has("Image Upload Failure")}
                className="flex-row items-center justify-center"
              >
                Test Image Upload Failure
              </Button>

              <Button
                onPress={testValidation}
                disabled={runningTests.has("Validation Failure")}
                loading={runningTests.has("Validation Failure")}
                className="flex-row items-center justify-center"
              >
                Test Validation Failure
              </Button>
            </View>
          </View>

          {/* URL Workflow Test Buttons */}
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-gray-900">
              URL Workflow Tests
            </Text>
            <View className="space-y-3">
              <Button
                onPress={testUrlFetch}
                disabled={runningTests.has("URL Fetch Failure")}
                loading={runningTests.has("URL Fetch Failure")}
                className="flex-row items-center justify-center bg-blue-600"
              >
                Test URL Fetch Failure
              </Button>

              <Button
                onPress={testUrlContentParsing}
                disabled={runningTests.has("URL Content Parsing Failure")}
                loading={runningTests.has("URL Content Parsing Failure")}
                className="flex-row items-center justify-center bg-blue-600"
              >
                Test URL Content Parsing Failure
              </Button>

              <Button
                onPress={testUrlAiProcessing}
                disabled={runningTests.has("URL AI Processing Failure")}
                loading={runningTests.has("URL AI Processing Failure")}
                className="flex-row items-center justify-center bg-blue-600"
              >
                Test URL AI Processing Failure
              </Button>

              <Button
                onPress={testUrlValidation}
                disabled={runningTests.has("URL Validation Failure")}
                loading={runningTests.has("URL Validation Failure")}
                className="flex-row items-center justify-center bg-blue-600"
              >
                Test URL Validation Failure
              </Button>

              <Button
                onPress={testUrlSuccess}
                disabled={runningTests.has("URL Workflow Success")}
                loading={runningTests.has("URL Workflow Success")}
                className="flex-row items-center justify-center bg-green-600"
              >
                Test URL Workflow Success
              </Button>
            </View>
          </View>

          {/* Direct Notification Test */}
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-gray-900">
              Direct Notification Test
            </Text>
            <Button
              onPress={testNotification}
              disabled={runningTests.has("Direct Notification")}
              loading={runningTests.has("Direct Notification")}
              className="flex-row items-center justify-center bg-purple-600"
            >
              Test Direct Notification
            </Button>
          </View>

          {/* Results */}
          {testResults.length > 0 && (
            <View className="mb-6 rounded-lg bg-white p-4 shadow-sm">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-gray-900">
                  Test Results
                </Text>
                <TouchableOpacity onPress={clearResults}>
                  <Text className="text-sm text-red-600">Clear All</Text>
                </TouchableOpacity>
              </View>

              {testResults
                .slice()
                .reverse()
                .map((result, index) => (
                  <View
                    key={`${result.workflowId}-${index}`}
                    className="mb-3 rounded border border-gray-200 p-3"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="font-medium text-gray-900">
                        {result.testName}
                      </Text>
                      <Text
                        className={`text-sm ${getStatusColor(result.status)}`}
                      >
                        {getStatusIcon(result.status)}{" "}
                        {result.status.toUpperCase()}
                      </Text>
                    </View>

                    <Text className="mt-1 text-xs text-gray-500">
                      Workflow: {result.workflowId.slice(0, 16)}...
                    </Text>

                    <Text className="text-xs text-gray-500">
                      Started: {new Date(result.timestamp).toLocaleTimeString()}
                    </Text>

                    {result.error && (
                      <Text className="mt-1 text-xs text-red-600">
                        Error: {result.error}
                      </Text>
                    )}
                  </View>
                ))}
            </View>
          )}

          {/* Instructions */}
          <View className="mb-6 rounded-lg bg-white p-4 shadow-sm">
            <Text className="mb-2 font-semibold text-gray-900">
              Instructions
            </Text>
            <View className="space-y-2">
              <Text className="text-sm text-gray-600">
                1. Ensure you have notifications enabled for this app
              </Text>
              <Text className="text-sm text-gray-600">
                2. Run each test and wait for the notification on your device
              </Text>
              <Text className="text-sm text-gray-600">
                3. Check that failure notifications are received (not success)
              </Text>
              <Text className="text-sm text-gray-600">
                4. Look for notification with title "Event creation failed"
              </Text>
            </View>
          </View>

          {/* Expected Results */}
          <View className="mb-6 rounded-lg bg-blue-50 p-4 shadow-sm">
            <Text className="mb-2 font-semibold text-blue-900">
              Expected Results
            </Text>
            <Text className="mb-2 text-sm font-medium text-blue-800">
              Image Workflow Tests:
            </Text>
            <View className="mb-3 space-y-1">
              <Text className="text-sm text-blue-700">
                • AI Extraction: Fails due to invalid base64 data
              </Text>
              <Text className="text-sm text-blue-700">
                • Image Upload: Fails due to empty image data
              </Text>
              <Text className="text-sm text-blue-700">
                • Validation: Fails due to no extractable events (1x1 pixel)
              </Text>
            </View>
            <Text className="mb-2 text-sm font-medium text-blue-800">
              URL Workflow Tests:
            </Text>
            <View className="mb-3 space-y-1">
              <Text className="text-sm text-blue-700">
                • URL Fetch: Fails due to invalid domain
              </Text>
              <Text className="text-sm text-blue-700">
                • Content Parsing: Fails due to HTTP 500 error
              </Text>
              <Text className="text-sm text-blue-700">
                • AI Processing: Fails due to non-event content (robots.txt)
              </Text>
              <Text className="text-sm text-blue-700">
                • Validation: Fails due to no extractable events
              </Text>
              <Text className="text-sm text-blue-700">
                • Success Test: Should complete successfully (no failure
                notification)
              </Text>
            </View>
            <Text className="text-sm text-blue-700">
              • Direct Notification: Tests notification system directly
            </Text>
          </View>

          {/* Development Notes */}
          <View className="rounded-lg bg-yellow-50 p-4 shadow-sm">
            <Text className="mb-2 font-semibold text-yellow-800">
              Development Notes
            </Text>
            <Text className="text-sm text-yellow-700">
              This test screen is temporary for validating workflow failure
              notifications. Remove after testing is complete.
            </Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
