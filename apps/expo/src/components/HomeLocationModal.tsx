import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation } from "convex/react";
import { toast } from "sonner-native";

import { api } from "@soonlist/backend/convex/_generated/api";

import { MapPin } from "~/components/icons";
import { useLocationPermission } from "~/hooks/useLocationPermission";
import { useSetHasCompletedLocationSetup } from "~/store";

interface HomeLocationModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export function HomeLocationModal({
  isVisible,
  onClose,
}: HomeLocationModalProps): React.ReactElement {
  const [manualLocation, setManualLocation] = useState("");
  const [isLoadingAuto, setIsLoadingAuto] = useState(false);
  const [isLoadingManual, setIsLoadingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const {
    requestPermission,
    getCurrentLocation,
    reverseGeocode,
    forwardGeocode,
  } = useLocationPermission();

  const saveUserLocation = useMutation(api.users.saveUserLocation);
  const setHasCompletedLocationSetup = useSetHasCompletedLocationSetup();

  // Reset state when modal opens
  useEffect(() => {
    if (isVisible) {
      setManualLocation("");
      setIsLoadingAuto(false);
      setIsLoadingManual(false);
      setManualError(null);
    }
  }, [isVisible]);

  const handleComplete = useCallback(() => {
    setHasCompletedLocationSetup(true);
    onClose();
  }, [setHasCompletedLocationSetup, onClose]);

  const handleUseMyLocation = useCallback(async () => {
    setIsLoadingAuto(true);
    setManualError(null);

    // Request permission
    const { isGranted } = await requestPermission();

    if (!isGranted) {
      toast.error("Location access denied", {
        description: "You can enter your location manually below.",
      });
      setIsLoadingAuto(false);
      return;
    }

    // Get current location
    const coords = await getCurrentLocation();

    if (!coords) {
      toast.error("Couldn't get location", {
        description: "Please try again or enter manually.",
      });
      setIsLoadingAuto(false);
      return;
    }

    // Reverse geocode to get address
    const address = await reverseGeocode(coords);

    try {
      await saveUserLocation({
        name: "Home",
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: address ?? undefined,
        isDefault: true,
      });

      handleComplete();
    } catch (error) {
      console.error("Failed to save location:", error);
      toast.error("Couldn't save location", {
        description: "Please try again.",
      });
    } finally {
      setIsLoadingAuto(false);
    }
  }, [
    requestPermission,
    getCurrentLocation,
    reverseGeocode,
    saveUserLocation,
    handleComplete,
  ]);

  const handleSaveManualLocation = useCallback(async () => {
    if (!manualLocation.trim()) return;

    setIsLoadingManual(true);
    setManualError(null);

    // Forward geocode the entered location
    const result = await forwardGeocode(manualLocation.trim());

    if (!result) {
      setManualError("Couldn't find that location. Try a different search.");
      setIsLoadingManual(false);
      return;
    }

    try {
      await saveUserLocation({
        name: "Home",
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
        address: result.formattedAddress,
        isDefault: true,
      });

      handleComplete();
    } catch (error) {
      console.error("Failed to save location:", error);
      setManualError("Couldn't save location. Please try again.");
    } finally {
      setIsLoadingManual(false);
    }
  }, [manualLocation, forwardGeocode, saveUserLocation, handleComplete]);

  const isLoading = isLoadingAuto || isLoadingManual;
  const hasManualInput = manualLocation.trim().length > 0;

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleComplete}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-4">
        <View className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
          {/* Header */}
          <View className="mb-4 items-center">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-violet-100">
              <MapPin size={28} color="#5A32FB" />
            </View>
          </View>

          <Text className="mb-2 text-center font-heading text-xl font-bold text-gray-900">
            Where are you based?
          </Text>
          <Text className="mb-6 text-center text-base text-gray-600">
            We&apos;ll use this to improve event detection &amp; show you events
            near you.
          </Text>

          {/* Use My Location Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use my location"
            onPress={() => void handleUseMyLocation()}
            disabled={isLoading}
            className={`mb-4 w-full flex-row items-center justify-center rounded-full py-4 ${
              isLoading ? "bg-gray-400" : "bg-interactive-1"
            }`}
          >
            {isLoadingAuto ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-center font-semibold text-white">
                Use My Location
              </Text>
            )}
          </Pressable>

          {/* Divider */}
          <View className="mb-4 flex-row items-center">
            <View className="h-px flex-1 bg-gray-200" />
            <Text className="mx-3 text-sm text-gray-400">or</Text>
            <View className="h-px flex-1 bg-gray-200" />
          </View>

          {/* Manual Entry */}
          <TextInput
            className="mb-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
            placeholder="Enter your city"
            placeholderTextColor="#9CA3AF"
            value={manualLocation}
            onChangeText={(text) => {
              setManualLocation(text);
              if (manualError) setManualError(null);
            }}
            editable={!isLoading}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (hasManualInput) void handleSaveManualLocation();
            }}
          />

          {/* Error message */}
          {manualError && (
            <Text className="mb-2 text-center text-sm text-red-500">
              {manualError}
            </Text>
          )}

          {/* Dynamic action - subtle skip link OR Save button */}
          {hasManualInput ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save location"
              onPress={() => void handleSaveManualLocation()}
              disabled={isLoading}
              className={`mt-4 w-full rounded-full py-4 ${
                isLoading ? "bg-gray-400" : "bg-interactive-1"
              }`}
            >
              {isLoadingManual ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-center font-semibold text-white">
                  Save
                </Text>
              )}
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Skip for now"
              onPress={handleComplete}
              disabled={isLoading}
              className="mt-4 py-2"
            >
              <Text className="text-center text-sm text-gray-400">
                skip for now
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}
