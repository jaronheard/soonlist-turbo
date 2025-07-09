import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

export function useNetworkState() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true); // Assume connected initially
  const [isInternetReachable, setIsInternetReachable] = useState<
    boolean | null
  >(true);

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable);
    });

    // Fetch initial state
    void NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Consider offline if either no connection or internet not reachable
  const isOffline = isConnected === false || isInternetReachable === false;

  return {
    isConnected,
    isInternetReachable,
    isOffline,
  };
}
