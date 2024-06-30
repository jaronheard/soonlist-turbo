import { useEffect } from "react";
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

  useEffect(() => {
    if (user) {
      const saveExpoToken = async () => {
        createTokenMutation.mutate({
          userId: user.id,
          expoPushToken: expoPushToken,
        });
      };

      void saveExpoToken();
    }
  }, [expoPushToken, user, createTokenMutation]);

  return null; // This component doesn't render anything
}
