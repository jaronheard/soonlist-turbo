"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "@soonlist/backend/convex/_generated/api";

import { useWorkflowStore } from "~/hooks/useWorkflowStore";

interface WorkflowStatusToastProps {
  workflowId: string;
}

export function WorkflowStatusToast({ workflowId }: WorkflowStatusToastProps) {
  const router = useRouter();
  const { removeWorkflowId } = useWorkflowStore();
  const toastIdRef = useRef<string | number | undefined>(undefined);
  const lastStatusRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const status = useQuery(api.workflows.eventIngestion.getWorkflowStatus, {
    workflowId,
  });

  useEffect(() => {
    if (!status) return;

    // Only show toast if status has changed
    if (lastStatusRef.current === status.status) return;

    // If this is the first render and the workflow is already finished,
    // just remove it without showing a toast (it was likely shown before)
    if (
      lastStatusRef.current === null &&
      (status.status === "completed" ||
        status.status === "failed" ||
        status.status === "canceled")
    ) {
      lastStatusRef.current = status.status;
      removeWorkflowId(workflowId);
      return;
    }

    lastStatusRef.current = status.status;

    // Dismiss previous toast if exists
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    switch (status.status) {
      case "inProgress":
        toastIdRef.current = toast.loading("Processing event...", {
          duration: Infinity,
        });
        break;

      case "completed": {
        const eventId =
          typeof status.result === "string" ? status.result : undefined;
        if (eventId) {
          toastIdRef.current = toast.success("Event created!", {
            action: {
              label: "View",
              onClick: () => router.push(`/event/${eventId}`),
            },
            duration: 10000,
          });
          // Cleanup after toast duration expires
          timeoutRef.current = setTimeout(
            () => removeWorkflowId(workflowId),
            10000,
          );
        }
        break;
      }

      case "failed":
        toastIdRef.current = toast.error(
          status.error || "Failed to create event",
          {
            duration: 5000,
          },
        );
        // Cleanup after showing error
        timeoutRef.current = setTimeout(
          () => removeWorkflowId(workflowId),
          5000,
        );
        break;

      case "canceled":
        toastIdRef.current = toast.info("Event creation canceled", {
          duration: 3000,
        });
        timeoutRef.current = setTimeout(
          () => removeWorkflowId(workflowId),
          3000,
        );
        break;
    }
  }, [status, router, workflowId, removeWorkflowId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return null;
}

export function WorkflowStatusToastContainer() {
  const { workflowIds } = useWorkflowStore();

  if (workflowIds.length === 0) {
    return null;
  }

  return (
    <>
      {workflowIds
        .filter((workflowId) => workflowId && typeof workflowId === "string")
        .map((workflowId) => (
          <WorkflowStatusToast key={workflowId} workflowId={workflowId} />
        ))}
    </>
  );
}
