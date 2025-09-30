import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

/**
 * Custom hook to track network connectivity status
 * Returns true when online, false when offline
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Get initial network state
    void NetInfo.fetch()
      .then((state) => {
        setIsOnline(state.isConnected ?? true);
      })
      .catch(() => {
        // Assume online if we can't determine network state initially
        setIsOnline(true);
      });

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? true);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  return isOnline;
}
