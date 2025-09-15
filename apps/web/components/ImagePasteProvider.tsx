"use client";

import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "@soonlist/backend/convex/_generated/api";

import { useImagePasteHandler } from "~/hooks/useImagePasteHandler";
import { isTargetPage } from "~/lib/pasteEventUtils";

interface ImagePasteProviderProps {
  children: React.ReactNode;
}

export function ImagePasteProvider({ children }: ImagePasteProviderProps) {
  const pathname = usePathname();
  const currentUser = useQuery(api.users.getCurrentUser);

  // Only enable the paste handler on target pages and when user is authenticated
  const shouldEnable = isTargetPage(pathname) && !!currentUser;

  useImagePasteHandler({
    enabled: shouldEnable,
    onSuccess: (_workflowId) => {
      toast.success("Image received! Creating your event...");
    },
    onError: (error) => {
      toast.error(`Failed to process image: ${error.message}`);
    },
  });

  return <>{children}</>;
}
