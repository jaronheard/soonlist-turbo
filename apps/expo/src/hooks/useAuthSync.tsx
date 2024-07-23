import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
        await AsyncStorage.setItem("authData", JSON.stringify(newAuthData));

        // Update state
        setAuthData(newAuthData);
      } else {
        // Clear data when signed out
        await AsyncStorage.removeItem("authData");
        setAuthData(null);
      }
    };

    void syncAuthData();
  }, [expoPushToken, getToken, isSignedIn, user]);

  return authData;
};

export default useAuthSync;
