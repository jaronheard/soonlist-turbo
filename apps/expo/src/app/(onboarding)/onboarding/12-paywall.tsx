import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, X } from "~/components/icons";
import { useOnboarding } from "~/hooks/useOnboarding";
import { useAppStore } from "~/store";

const features = [
  "Unlimited event saves",
  "Extract from any screenshot",
  "Smart reminders",
  "Share with friends",
  "Calendar sync",
];

export default function PaywallScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const { completeOnboarding } = useOnboarding();
  const setHasSeenOnboarding = useAppStore((state) => state.setHasSeenOnboarding);

  const handleSubscribe = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // Mark onboarding as complete
      await completeOnboarding();
      
      // Navigate to sign-in
      router.replace("/(auth)/sign-in");
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    // Mark onboarding as seen for guest users
    setHasSeenOnboarding(true);
    
    // Navigate to sign-in
    router.replace("/(auth)/sign-in");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1">
        {/* Close button */}
        <View className="absolute top-12 right-6 z-10">
          <Pressable
            onPress={handleSkip}
            className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
          >
            <X size={20} color="#6b7280" strokeWidth={2} />
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-6">
          <View className="pt-20 pb-8">
            <Text className="text-4xl font-bold text-center text-black mb-4">
              Get Soonlist Pro
            </Text>
            
            <Text className="text-lg text-center text-gray-600 mb-8">
              Unlock all features and never miss an event
            </Text>

            {/* Features list */}
            <View className="mb-8">
              {features.map((feature, index) => (
                <View key={index} className="flex-row items-center mb-4">
                  <View className="w-6 h-6 bg-green-100 rounded-full items-center justify-center mr-3">
                    <Check size={16} color="#22c55e" strokeWidth={3} />
                  </View>
                  <Text className="text-base text-gray-800 flex-1">{feature}</Text>
                </View>
              ))}
            </View>

            {/* Pricing */}
            <View className="bg-purple-50 rounded-2xl p-6 mb-6">
              <Text className="text-2xl font-bold text-center text-purple-900 mb-2">
                $4.99/month
              </Text>
              <Text className="text-center text-purple-700">
                Cancel anytime
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom buttons */}
        <View className="px-6 pb-8">
          <Pressable
            onPress={handleSubscribe}
            disabled={isLoading}
            className={`py-4 rounded-full mb-3 ${
              isLoading ? "bg-purple-400" : "bg-purple-600"
            }`}
          >
            <Text className="text-white text-center font-semibold text-lg">
              {isLoading ? "Loading..." : "Start Free Trial"}
            </Text>
          </Pressable>

          <Pressable onPress={handleSkip} className="py-2 mb-2">
            <Text className="text-gray-500 text-center text-sm">
              Maybe later
            </Text>
          </Pressable>

          <Pressable onPress={handleSubscribe} className="py-2">
            <Text className="text-gray-500 text-center">
              Already have an account? <Text className="text-purple-600 font-medium">Sign in</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}