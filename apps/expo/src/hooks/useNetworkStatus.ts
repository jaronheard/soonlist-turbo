import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    void NetInfo.fetch()
      .then((state) => {
        setIsOnline(state.isConnected ?? true);
      })
      .catch(() => {
        setIsOnline(true);
      });

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? true);
    });

    return unsubscribe;
  }, []);

  return isOnline;
}
