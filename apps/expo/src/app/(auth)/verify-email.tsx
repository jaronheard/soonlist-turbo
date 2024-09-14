import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";

import { Logo } from "../../components/Logo";

const VerifyEmail = () => {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const { signUp, setActive } = useSignUp();
  const router = useRouter();

  const handleVerification = async () => {
    if (!signUp) return;
    try {
      setIsVerifying(true);
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        router.replace("/feed");
      } else {
        console.log(JSON.stringify(completeSignUp, null, 2));
        // Handle the error (show error message to user)
      }
    } catch (err) {
      console.error("Error during verification:", err);
      // Handle error (show error message to user)
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <View className="flex-1 bg-interactive-3">
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Verify Email",
          headerBackTitle: "Back",
          headerBackTitleVisible: true,
        }}
      />
      <View className="flex-1 px-6">
        <View className="items-center pt-8">
          <Logo className="h-12 w-48" />
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="mb-4 text-center font-heading text-5xl font-bold text-gray-700">
            Verify Email
          </Text>
          <Text className="mb-8 text-center text-xl text-gray-500">
            Please enter the verification code sent to your email.
          </Text>
          <View className="w-full">
            <Text className="mb-2 text-sm font-medium text-gray-700">
              Verification Code
            </Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="Enter your 6-digit code"
              keyboardType="number-pad"
              className="mb-6 w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
            />
          </View>
          <Pressable
            onPress={handleVerification}
            disabled={isVerifying}
            className="w-full rounded-full bg-interactive-1 px-6 py-3"
          >
            <Text className="text-center text-lg font-bold text-white">
              {isVerifying ? "Verifying..." : "Verify Email"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default VerifyEmail;
