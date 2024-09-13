import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";

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

      if (completeSignUp.status !== "complete") {
        // Verification failed
        console.log(JSON.stringify(completeSignUp, null, 2));
      } else {
        // Verification successful
        if (completeSignUp.createdSessionId) {
          await setActive({ session: completeSignUp.createdSessionId });
        }
        router.push("/feed");
      }
    } catch (err) {
      console.error("Error during verification:", err);
      // Handle error (show error message to user)
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <View className="flex-1 bg-white p-4">
      <Stack.Screen options={{ title: "Verify Email" }} />
      <Text className="mb-4 text-2xl font-bold">Verify your email</Text>
      <Text className="mb-4">
        Please enter the verification code sent to your email.
      </Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="Verification Code"
        keyboardType="number-pad"
        className="mb-6 rounded-lg border border-gray-300 bg-white px-4 py-3"
      />
      <Pressable
        onPress={handleVerification}
        disabled={isVerifying}
        className="rounded-full bg-interactive-1 px-6 py-3"
      >
        <Text className="text-center text-lg font-bold text-white">
          {isVerifying ? "Verifying..." : "Verify Email"}
        </Text>
      </Pressable>
    </View>
  );
};

export default VerifyEmail;
