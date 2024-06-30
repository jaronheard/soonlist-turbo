import { useCallback, useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";

import { api } from "~/utils/api";

export default function TokenSaver({
  expoPushToken,
}: {
  expoPushToken: string;
}) {
  const { user } = useUser();
  const utils = api.useUtils();
  const createTokenMutation = api.pushToken.create.useMutation({
    onSettled: () => void utils.pushToken.invalidate(),
  });

  const saveExpoToken = useCallback(() => {
    if (user) {
      createTokenMutation.mutate({
        userId: user.id,
        expoPushToken: expoPushToken,
      });
    }
  }, [user, expoPushToken, createTokenMutation]);

  useEffect(() => {
    saveExpoToken();
  }, [saveExpoToken]);

  return null; // This component doesn't render anything
}
