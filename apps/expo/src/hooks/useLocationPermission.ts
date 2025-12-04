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

  /**
   * Check the current permission status without requesting
   */
  const checkPermission = useCallback(async () => {
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

  /**
   * Request location permission from the user
   */
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

  /**
   * Get the current location (requires permission to be granted)
   */
  const getCurrentLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    setLocationError(null);

    try {
      // First check if we have permission
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

  /**
   * Reverse geocode coordinates to get a human-readable address
   */
  const reverseGeocode = useCallback(
    async (coords: LocationCoordinates): Promise<string | null> => {
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });

        if (results.length > 0) {
          const result = results[0];
          // Build a readable address from available parts
          const parts: string[] = [];
          if (result?.city) parts.push(result.city);
          if (result?.region) parts.push(result.region);
          if (result?.country && !result?.region) parts.push(result.country);

          return parts.length > 0 ? parts.join(", ") : null;
        }
        return null;
      } catch {
        return null;
      }
    },
    [],
  );

  return {
    // Permission state
    permissionState,
    checkPermission,
    requestPermission,

    // Location state
    currentLocation,
    isLoadingLocation,
    locationError,
    getCurrentLocation,

    // Geocoding
    reverseGeocode,
  };
}
