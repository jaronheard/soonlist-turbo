import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Stack, useRouter } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";
import { usePostHog } from "posthog-react-native";

import { Logo } from "../../components/Logo";

const VerifyEmail = () => {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const { signUp, setActive } = useSignUp();
  const router = useRouter();
  const posthog = usePostHog();

  const validateCode = () => {
    setCodeError("");
    setGeneralError("");

    if (!code) {
      setCodeError("Verification code is required");
      return false;
    }

    if (!/^\d{6}$/.test(code)) {
      setCodeError("Invalid code format. Please enter 6 digits.");
      return false;
    }

    return true;
  };

  const handleVerification = async () => {
    if (!signUp) return;
    if (!validateCode()) return;

    try {
      setIsVerifying(true);
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        posthog.identify(completeSignUp.emailAddress, {
          email: completeSignUp.emailAddress,
          username: completeSignUp.username,
        });
        router.replace("/feed");
      } else {
        console.log(JSON.stringify(completeSignUp, null, 2));
        setGeneralError("Verification failed. Please try again.");
      }
    } catch (err: unknown) {
      console.error("Error during verification:", err);
      if (err instanceof Error) {
        setGeneralError(err.message);
      } else {
        setGeneralError("An error occurred during verification");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      enableAutomaticScroll={true}
      extraScrollHeight={150}
      enableOnAndroid={true}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Verify Email",
          headerBackTitle: "Back",
          headerBackTitleVisible: true,
        }}
      />
      <View className="flex-1 bg-interactive-3 px-6">
        <View className="items-center pt-8">
          <Logo className="h-12 w-48" />
        </View>
        <View className="items-center justify-center py-8">
          <Text className="mb-4 text-center font-heading text-4xl font-bold text-gray-700">
            Verify Email
          </Text>
          <Text className="mb-8 text-center text-lg text-gray-500">
            Please enter the verification code sent to your email.
          </Text>
          {generalError ? (
            <Text className="mb-4 text-center text-red-500">
              {generalError}
            </Text>
          ) : null}
          <View className="w-full">
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="Verification Code"
              keyboardType="number-pad"
              className="mb-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
            />
            {codeError ? (
              <Text className="mb-4 text-red-500">{codeError}</Text>
            ) : null}
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
    </KeyboardAwareScrollView>
  );
};

export default VerifyEmail;
