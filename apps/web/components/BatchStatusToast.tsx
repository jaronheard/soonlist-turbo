"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@soonlist/backend/convex/_generated/api";

import { useBatchStore } from "~/hooks/useBatchStore";

interface BatchStatusToastProps {
  batchId: string;
}

function BatchStatusToast({ batchId }: BatchStatusToastProps) {
  const router = useRouter();
  const removeBatchId = useBatchStore((state) => state.removeBatchId);
  const toastIdRef = useRef<string | number | null>(null);
  const hasShownCompletionRef = useRef(false);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const batchStatus = useQuery(api.eventBatches.getBatchStatus, { batchId });

  useEffect(() => {
    if (!batchStatus) return;

    if (batchStatus.status === "processing" && !toastIdRef.current) {
      toastIdRef.current = toast.loading(
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="font-medium">
            Capturing {batchStatus.totalCount}{" "}
            {batchStatus.totalCount === 1 ? "event" : "events"}...
          </span>
        </div>,
        { duration: Infinity },
      );
      return;
    }

    if (
      (batchStatus.status === "completed" || batchStatus.status === "failed") &&
      !hasShownCompletionRef.current
    ) {
      hasShownCompletionRef.current = true;

      const hasErrors = batchStatus.failureCount > 0;

      if (hasErrors) {
        toast.error(
          `${batchStatus.successCount} out of ${batchStatus.totalCount} ${
            batchStatus.totalCount === 1 ? "event" : "events"
          } captured successfully`,
          {
            id: toastIdRef.current ?? undefined,
            duration: 6000,
          },
        );
      } else {
        const isSingleEvent = batchStatus.successCount === 1;
        const message = isSingleEvent
          ? "Event captured successfully"
          : `${batchStatus.successCount} events captured successfully`;

        toast.success(message, {
          id: toastIdRef.current ?? undefined,
          duration: 4000,
          action:
            isSingleEvent && batchStatus.firstEventId
              ? {
                  label: "View event",
                  onClick: () =>
                    router.push(`/event/${batchStatus.firstEventId}`),
                }
              : undefined,
        });
      }

      toastIdRef.current = null;

      cleanupTimeoutRef.current = setTimeout(
        () => {
          cleanupTimeoutRef.current = null;
          removeBatchId(batchId);
        },
        hasErrors ? 6000 : 4000,
      );
    }
  }, [batchStatus, batchId, router, removeBatchId]);

  useEffect(() => {
    return () => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
        removeBatchId(batchId);
      }
    };
  }, [batchId, removeBatchId]);

  return null;
}

export function BatchStatusToastContainer() {
  const batchIds = useBatchStore((state) => state.batchIds);

  return (
    <>
      {batchIds.map((batchId) => (
        <BatchStatusToast key={batchId} batchId={batchId} />
      ))}
    </>
  );
}
