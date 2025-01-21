import React, { useState } from "react";
import { Alert, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";

import { Button } from "~/components/Button";
import { QuestionContainer } from "~/components/QuestionContainer";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

export default function PhotosScreen() {
  const [showRealPrompt, setShowRealPrompt] = useState(false);

  const handlePhotoPermission = async () => {
    if (showRealPrompt) {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== ImagePicker.PermissionStatus.GRANTED) {
        Alert.alert(
          "Permission required",
          "Please enable photo access in your device settings to save screenshots and photos to Soonlist.",
        );
      }

      router.push("/feed");
    } else {
      setShowRealPrompt(true);
    }
  };

  return (
    <QuestionContainer
      question="Enable Photo Access"
      currentStep={7}
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <View className="flex-1 items-center justify-center px-4">
        <View className="w-full max-w-sm rounded-lg bg-gray-100 p-4 shadow-sm">
          <Text className="mb-2 text-base font-medium">
            "Soonlist" Would Like to Access Your Photos
          </Text>
          <Text className="mb-4 text-sm text-gray-600">
            This allows you to save screenshots and photos of events directly to
            Soonlist for easy access later.
          </Text>
          <View className="flex-row justify-end space-x-4">
            <Button
              variant="ghost"
              onPress={() => handlePhotoPermission()}
              className="flex-1"
            >
              Allow
            </Button>
          </View>
        </View>
      </View>
    </QuestionContainer>
  );
}
