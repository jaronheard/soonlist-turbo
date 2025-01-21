import React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

interface QuestionContainerProps {
  question: string;
  children: React.ReactNode;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function QuestionContainer({
  question,
  children,
  onBack,
  showBackButton = true,
}: QuestionContainerProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center px-4 py-3">
        {showBackButton && (
          <Pressable
            onPress={handleBack}
            className="rounded-full p-2 hover:bg-gray-100 active:bg-gray-200"
          >
            <ChevronLeft size={24} className="text-gray-900" />
          </Pressable>
        )}
      </View>
      <View className="flex-1 px-6">
        <Text className="mb-8 text-2xl font-bold text-gray-900">
          {question}
        </Text>
        {children}
      </View>
    </View>
  );
}
