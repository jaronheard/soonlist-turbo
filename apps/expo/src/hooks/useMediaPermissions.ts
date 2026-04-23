import { useEffect } from "react";
import * as MediaLibrary from "expo-media-library";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAppStore } from "~/store";

export const mediaPermissionsQueryKey = ["mediaPermissions"];

async function fetchMediaPermissions() {
  const { status, accessPrivileges } = await MediaLibrary.getPermissionsAsync();
  const isGranted =
    status === MediaLibrary.PermissionStatus.GRANTED ||
    accessPrivileges === "limited";
  const hasFullAccess = accessPrivileges === "all";
  return { isGranted, hasFullAccess };
}

export function useMediaPermissions() {
  const queryClient = useQueryClient();

  const { data, isSuccess } = useQuery({
    queryKey: mediaPermissionsQueryKey,
    queryFn: fetchMediaPermissions,
    // Keep data fresh based on standard Tanstack Query settings,
    // but rely on the listener for immediate updates.
  });

  useEffect(() => {
    if (isSuccess && data) {
      useAppStore.setState({
        hasMediaPermission: data.isGranted,
        hasFullPhotoAccess: data.hasFullAccess,
      });
    }
  }, [data, isSuccess]);

  useEffect(() => {
    let subscription: MediaLibrary.Subscription | undefined;

    if (isSuccess && data.isGranted) {
      subscription = MediaLibrary.addListener(({ hasIncrementalChanges }) => {
        if (hasIncrementalChanges) {
          void queryClient.invalidateQueries({
            queryKey: mediaPermissionsQueryKey,
          });
        }
      });
    }

    return () => {
      subscription?.remove();
    };
    // Depend on the query's success status, the granted status, and the queryClient.
  }, [isSuccess, data?.isGranted, queryClient]);

  // This hook primarily manages global state via side effects,
  // so it doesn't need to return anything directly.
}
