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

  const shouldEnable = isTargetPage(pathname) && !!currentUser;

  useImagePasteHandler({
    enabled: shouldEnable,
    onError: (error) => {
      toast.error(`Failed to process images: ${error.message}`, {
        duration: 6000, // Increased duration for error toasts
      });
    },
  });

  return <>{children}</>;
}
