import { useCallback, useState } from "react";
import * as Location from "expo-location";

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationPermissionState {
  status: Location.PermissionStatus | null;
  isGranted: boolean;
  isLoading: boolean;
}

export function useLocationPermission() {
  const [permissionState, setPermissionState] =
    useState<LocationPermissionState>({
      status: null,
      isGranted: false,
      isLoading: false,
    });

  const [currentLocation, setCurrentLocation] =
    useState<LocationCoordinates | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const checkPermission = useCallback(async () => {
    setPermissionState((prev) => ({ ...prev, isLoading: true }));
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      const isGranted = status === Location.PermissionStatus.GRANTED;
      setPermissionState({ status, isGranted, isLoading: false });
      return { status, isGranted };
    } catch {
      setPermissionState((prev) => ({ ...prev, isLoading: false }));
      return { status: null, isGranted: false };
    }
  }, []);

  const requestPermission = useCallback(async () => {
    setPermissionState((prev) => ({ ...prev, isLoading: true }));
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const isGranted = status === Location.PermissionStatus.GRANTED;
      setPermissionState({ status, isGranted, isLoading: false });
      return { status, isGranted };
    } catch {
      setPermissionState((prev) => ({ ...prev, isLoading: false }));
      return { status: null, isGranted: false };
    }
  }, []);

  const getCurrentLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    setLocationError(null);

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setLocationError("Location permission not granted");
        setIsLoadingLocation(false);
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords: LocationCoordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentLocation(coords);
      setIsLoadingLocation(false);
      return coords;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get location";
      setLocationError(message);
      setIsLoadingLocation(false);
      return null;
    }
  }, []);

  const reverseGeocode = useCallback(
    async (coords: LocationCoordinates): Promise<string | null> => {
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });

        if (results.length === 0) {
          return null;
        }

        const result = results[0];
        if (!result) {
          return null;
        }
        const parts: string[] = [];
        if (result.city) parts.push(result.city);
        if (result.region) parts.push(result.region);
        if (result.country && !result.region) parts.push(result.country);

        return parts.length > 0 ? parts.join(", ") : null;
      } catch {
        return null;
      }
    },
    [],
  );

  const forwardGeocode = useCallback(
    async (
      address: string,
    ): Promise<{
      coords: LocationCoordinates;
      formattedAddress: string;
    } | null> => {
      try {
        const results = await Location.geocodeAsync(address);

        if (results.length === 0) {
          return null;
        }

        const result = results[0];
        if (!result) {
          return null;
        }

        const coords: LocationCoordinates = {
          latitude: result.latitude,
          longitude: result.longitude,
        };

        const formattedAddress = await reverseGeocode(coords);
        return {
          coords,
          formattedAddress: formattedAddress || address,
        };
      } catch {
        return null;
      }
    },
    [reverseGeocode],
  );

  return {
    permissionState,
    checkPermission,
    requestPermission,
    currentLocation,
    isLoadingLocation,
    locationError,
    getCurrentLocation,
    reverseGeocode,
    forwardGeocode,
  };
}
