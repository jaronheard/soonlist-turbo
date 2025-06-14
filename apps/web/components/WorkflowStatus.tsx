"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { X } from "lucide-react";

import { api } from "@soonlist/backend/convex/_generated/api";
import { Button } from "@soonlist/ui/button";

import { useWorkflowStore } from "~/hooks/useWorkflowStore";

interface WorkflowStatusProps {
  workflowId: string;
}

export function WorkflowStatus({ workflowId }: WorkflowStatusProps) {
  const router = useRouter();
  const { removeWorkflowId } = useWorkflowStore();

  const status = useQuery(api.workflows.eventIngestion.getWorkflowStatus, {
    workflowId,
  });

  // Navigate to event when workflow completes successfully
  useEffect(() => {
    if (status?.status === "completed" && (status.result as any)?.eventId) {
      router.push(`/event/${(status.result as any).eventId}`);
      // Remove workflow after a short delay to show success state
      setTimeout(() => removeWorkflowId(workflowId), 2000);
    }
  }, [status, router, workflowId, removeWorkflowId]);

  if (!status) {
    return (
      <div className="mb-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="flex items-center justify-between">
          <span className="flex-1 font-medium text-blue-800">
            Loading workflow status...
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => removeWorkflowId(workflowId)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
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

  return (
    <div className={`mb-2 rounded-lg border p-3 ${getStatusColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-2">
          <span className="text-lg">{getStatusEmoji()}</span>
          <span className="flex-1 font-medium">Creating event</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => removeWorkflowId(workflowId)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <p className="mt-1 text-sm">{getStatusText()}</p>

      {status.status === "inProgress" &&
        typeof status.progress === "number" &&
        status.progress > 0 && (
          <div className="mt-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${Math.round(status.progress)}%` }}
              />
            </div>
            <p className="mt-1 text-center text-xs">
              {Math.round(status.progress)}%
            </p>
          </div>
        )}
    </div>
  );
}

export function WorkflowStatusContainer() {
  const { workflowIds } = useWorkflowStore();

  if (workflowIds.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      {workflowIds
        .filter((workflowId) => workflowId && typeof workflowId === "string")
        .map((workflowId) => (
          <WorkflowStatus key={workflowId} workflowId={workflowId} />
        ))}
    </div>
  );
}
