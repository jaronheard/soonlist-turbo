import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { useAuth, useUser } from "@clerk/clerk-expo";

const saveAuthData = async (authData: {
  username: string | null;
  authToken: string | null;
  expoPushToken: string | null;
}) => {
  try {
    await SecureStore.setItemAsync("authData", JSON.stringify(authData), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
      keychainAccessGroup: "group.soonlist.soonlist",
    });
    console.log("Auth data saved successfully");
  } catch (error) {
    console.error(
      "Error saving auth data:",
      error instanceof Error ? error.message : String(error),
    );
  }
};

const deleteAuthData = async () => {
  try {
    await SecureStore.deleteItemAsync("authData", {
      keychainAccessGroup: "group.soonlist.soonlist",
    });
    console.log("Auth data deleted successfully");
  } catch (error: unknown) {
    console.error(
      "Error deleting auth data:",
      error instanceof Error ? error.message : String(error),
    );
  }
};

const useAuthSync = ({ expoPushToken }: { expoPushToken: string }) => {
  const { getToken } = useAuth();
  const { isSignedIn, user } = useUser();
  const [authData, setAuthData] = useState<{
    username: string | null;
    authToken: string | null;
    expoPushToken: string | null;
  } | null>(null);

  useEffect(() => {
    const syncAuthData = async () => {
      if (isSignedIn) {
        const username = user.username;
        const userId = user.id;
        const authToken = await getToken();

        const newAuthData = { userId, username, authToken, expoPushToken };
        // Store in SecureStore (all one entry)
        await saveAuthData(newAuthData);

        // Update state
        setAuthData(newAuthData);
      } else {
        // Clear data when signed out
        await deleteAuthData();
        setAuthData(null);
      }
    };

    void syncAuthData();
  }, [expoPushToken, getToken, isSignedIn, user]);

  return authData;
};

export default useAuthSync;
