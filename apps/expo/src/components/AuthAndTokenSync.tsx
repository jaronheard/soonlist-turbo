"use client";

import { useEffect, useRef } from "react";

import useAuthSync from "~/hooks/useAuthSync";
import { api } from "~/utils/api";

export default function AuthAndTokenSync({
  expoPushToken,
}: {
  expoPushToken: string;
}) {
  const authData = useAuthSync({ expoPushToken });
  const createTokenMutation = api.pushToken.create.useMutation({});

  const lastSavedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      authData &&
      expoPushToken &&
      expoPushToken !== lastSavedTokenRef.current
    ) {
      createTokenMutation.mutate({
        userId: authData.userId,
        expoPushToken: expoPushToken,
      });
      lastSavedTokenRef.current = expoPushToken;
    }
  }, [expoPushToken, createTokenMutation, authData]);

  return null; // This component doesn't render anything
}
