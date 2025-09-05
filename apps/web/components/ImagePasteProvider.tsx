"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { useImagePasteHandler } from "~/hooks/useImagePasteHandler";
import { getPageContext, isTargetPage } from "~/lib/pasteEventUtils";

interface ImagePasteProviderProps {
  children: React.ReactNode;
}

export function ImagePasteProvider({ children }: ImagePasteProviderProps) {
  const pathname = usePathname();
  const currentUser = useQuery(api.users.getCurrentUser);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "loading">(
    "loading",
  );

  // Only enable the paste handler on target pages and when user is authenticated
  const shouldEnable = isTargetPage(pathname) && !!currentUser;
  const pageContext = getPageContext(pathname);

  const { isProcessing, error } = useImagePasteHandler({
    enabled: shouldEnable,
    onSuccess: (workflowId) => {
      setToastType("success");
      setToastMessage("🎉 Image processed! Creating your event...");
      setShowToast(true);

      // Hide success toast after 3 seconds
      setTimeout(() => setShowToast(false), 3000);
    },
    onError: (error) => {
      setToastType("error");
      setToastMessage(`❌ Failed to process image: ${error.message}`);
      setShowToast(true);

      // Hide error toast after 5 seconds
      setTimeout(() => setShowToast(false), 5000);
    },
  });

  // Show loading toast when processing starts
  useEffect(() => {
    if (isProcessing) {
      setToastType("loading");
      setToastMessage("📸 Processing your image...");
      setShowToast(true);
    }
  }, [isProcessing]);

  // Hide toast when error clears
  useEffect(() => {
    if (!error && !isProcessing && toastType === "error") {
      setShowToast(false);
    }
  }, [error, isProcessing, toastType]);

  return (
    <>
      {children}

      {/* Toast notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
          <div
            className={`rounded-lg px-4 py-3 shadow-lg transition-all duration-300 ${
              toastType === "success"
                ? "bg-green-500 text-white"
                : toastType === "error"
                  ? "bg-red-500 text-white"
                  : "bg-blue-500 text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              {toastType === "loading" && (
                <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              <span className="text-sm font-medium">{toastMessage}</span>
            </div>
          </div>
        </div>
      )}

      {/* Debug info in development */}
      {process.env.NODE_ENV === "development" && shouldEnable && (
        <div className="fixed bottom-4 left-4 z-40 rounded bg-black/80 px-2 py-1 text-xs text-white">
          📋 Image paste enabled ({pageContext})
        </div>
      )}
    </>
  );
}
