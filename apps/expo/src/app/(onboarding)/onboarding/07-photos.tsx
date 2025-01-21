import React, { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";

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
        <View className="w-full max-w-sm space-y-5 rounded-[28px] bg-white p-6">
          <Text className="text-center text-xl font-semibold">
            Enable Full Photo Access to save events instantly
          </Text>
          <Text className="text-center text-base text-gray-500">
            Choose 'Allow access to all photos' in the next step.
          </Text>
          {/* Placeholder Image Grid */}
          <View className="-mx-6 mt-2 flex-row flex-wrap bg-white">
            {Array.from({ length: 8 }).map((_, i) => (
              <View
                key={i}
                className="h-20 w-1/4 bg-gray-100"
                style={{
                  borderRightWidth: i % 4 !== 3 ? 1 : 0,
                  borderBottomWidth: i < 4 ? 1 : 0,
                  borderColor: "white",
                }}
              />
            ))}
          </View>

          <View className="-mx-6 rounded-xl border-b border-gray-200 px-4 py-4">
            <Text className="text-center text-base text-gray-900">
              Full access is recommended
            </Text>
            <Text className="mt-2 text-center text-[15px] leading-5 text-gray-500">
              Full access makes it faster to save events. We only capture photos
              you select.
            </Text>
          </View>

          <View className="-mx-6 -mb-6">
            <Pressable
              onPress={() => handlePhotoPermission()}
              className="w-full border-b border-gray-200 py-3"
            >
              <Text className="text-center text-lg font-normal text-blue-500">
                Limit Access...
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handlePhotoPermission()}
              className="w-full border-b border-gray-200 py-3"
            >
              <Text className="text-center text-lg font-normal text-blue-500 ">
                Allow Full Access
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/feed")}
              className="w-full py-3"
            >
              <Text className="text-center text-lg font-normal text-blue-500">
                Don't Allow
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </QuestionContainer>
  );
}
