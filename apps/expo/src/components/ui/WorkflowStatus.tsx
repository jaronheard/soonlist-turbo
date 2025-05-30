import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { useAppStore } from "~/store";

interface WorkflowStatusProps {
  workflowId: string;
}

export function WorkflowStatus({ workflowId }: WorkflowStatusProps) {
  const { removeWorkflowId } = useAppStore();

  const status = useQuery(api.workflows.eventIngestion.getWorkflowStatus, {
    workflowId,
  });

  if (!status) {
    return (
      <View className="mx-4 mb-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 font-medium text-blue-800">
            Loading workflow status...
          </Text>
          <TouchableOpacity
            onPress={() => removeWorkflowId(workflowId)}
            className="ml-2 p-1"
          >
            <Text className="font-bold text-blue-600">✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const getStatusColor = () => {
    switch (status.status) {
      case "inProgress":
        return "bg-blue-50 border-blue-200 text-blue-800";
      case "completed":
        return "bg-green-50 border-green-200 text-green-800";
      case "failed":
        return "bg-red-50 border-red-200 text-red-800";
      case "canceled":
        return "bg-gray-50 border-gray-200 text-gray-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  const getStatusEmoji = () => {
    switch (status.status) {
      case "inProgress":
        return "⏳";
      case "completed":
        return "✅";
      case "failed":
        return "❌";
      case "canceled":
        return "⏹️";
      default:
        return "ℹ️";
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case "inProgress":
        return `Processing: ${status.currentStep || "Starting"}`;
      case "completed":
        return "Event created successfully!";
      case "failed":
        return `Failed: ${status.error || "Unknown error"}`;
      case "canceled":
        return "Process was canceled";
      default:
        return "Unknown status";
    }
  };

  const getDescription = () => {
    return "Creating event from image";
  };

  return (
    <View className={`mx-4 mb-2 rounded-lg border p-3 ${getStatusColor()}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center space-x-2">
          <Text className="text-lg">{getStatusEmoji()}</Text>
          <Text className="flex-1 font-medium">{getDescription()}</Text>
        </View>
        <TouchableOpacity
          onPress={() => removeWorkflowId(workflowId)}
          className="ml-2 p-1"
        >
          <Text className="font-bold opacity-60">✕</Text>
        </TouchableOpacity>
      </View>

      <Text className="mt-1 text-sm">{getStatusText()}</Text>

      {status.status === "inProgress" &&
        typeof status.progress === "number" &&
        status.progress > 0 && (
          <View className="mt-2">
            <View className="h-2 rounded-full bg-gray-200">
              <View
                className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${Math.round(status.progress)}%` }}
              />
            </View>
            <Text className="mt-1 text-center text-xs">
              {Math.round(status.progress)}%
            </Text>
          </View>
        )}
    </View>
  );
}

export function WorkflowStatusContainer() {
  const { workflowIds } = useAppStore();

  // if (workflowIds.length === 0) {
  //   return null;
  // }

  return (
    <View className="absolute bottom-4 right-4 z-50">
      {workflowIds
        .filter((workflowId) => workflowId && typeof workflowId === "string")
        .map((workflowId) => (
          <WorkflowStatus key={workflowId} workflowId={workflowId} />
        ))}
    </View>
  );
}
