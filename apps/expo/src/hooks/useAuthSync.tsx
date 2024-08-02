import { useEffect, useState } from "react";
import * as FileSystem from "expo-file-system";
import { useAuth, useUser } from "@clerk/clerk-expo";

const saveAuthData = async (authData: {
  username: string | null;
  authToken: string | null;
  expoPushToken: string | null;
}) => {
  try {
    const groupIdentifier = "group.soonlist.soonlist";
    const directory = `${FileSystem.documentDirectory}../Groups/${groupIdentifier}/`;
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    const filePath = `${directory}authData.json`;
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(authData));
    console.log("Auth data saved successfully");
  } catch (error) {
    console.error("Error saving auth data:", error);
  }
};

const deleteAuthData = async () => {
  const directory = FileSystem.documentDirectory + "SharedContainer/";
  await FileSystem.deleteAsync(directory + "authData.json");
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
