import { useEffect } from "react";
import * as MediaLibrary from "expo-media-library";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAppStore } from "~/store";

export const mediaPermissionsQueryKey = ["mediaPermissions"];

async function fetchMediaPermissions() {
  const { status, accessPrivileges } = await MediaLibrary.getPermissionsAsync();
  const isGranted = status === MediaLibrary.PermissionStatus.GRANTED;
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

    // Subscribe only when the query is successful and indicates permissions are granted.
    if (isSuccess && data.isGranted) {
      subscription = MediaLibrary.addListener(({ hasIncrementalChanges }) => {
        if (hasIncrementalChanges) {
          // Invalidate the query to refetch permissions when changes occur
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
