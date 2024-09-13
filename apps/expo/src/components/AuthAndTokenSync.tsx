"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-expo";

import useAuthSync from "~/hooks/useAuthSync";
import useEnvSync from "~/hooks/useEnvSync";
import { api } from "~/utils/api";

export default function AuthAndTokenSync({
  expoPushToken,
}: {
  expoPushToken: string;
}) {
  const { user } = useUser();
  const authData = useAuthSync({ expoPushToken });
  const envData = useEnvSync();
  const createTokenMutation = api.pushToken.create.useMutation({});

  const lastSavedTokenRef = useRef<string | null>(null);

  console.log("authData", authData);
  console.log("envData", envData);

  useEffect(() => {
    if (user && expoPushToken && expoPushToken !== lastSavedTokenRef.current) {
      createTokenMutation.mutate({
        userId: user.id,
        expoPushToken: expoPushToken,
      });
      lastSavedTokenRef.current = expoPushToken;
    }
  }, [user, expoPushToken, createTokenMutation]);

  return null; // This component doesn't render anything
}
