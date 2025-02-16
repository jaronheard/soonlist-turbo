import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Redirect, Stack } from "expo-router";
import { useAuth, useSignUp } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePostHog } from "posthog-react-native";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useAppStore } from "~/store";
import { Logo } from "../../components/Logo";

const verifyEmailSchema = z.object({
  code: z
    .string()
    .min(1, "Verification code is required")
    .regex(/^\d{6}$/, "Invalid code format. Please enter 6 digits."),
});

type VerifyEmailFormData = z.infer<typeof verifyEmailSchema>;

const VerifyEmail = () => {
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [generalError, setGeneralError] = React.useState("");
  const { signUp, setActive } = useSignUp();
  const posthog = usePostHog();
  const { isSignedIn } = useAuth();
  const hasCompletedOnboarding = useAppStore(
    (state) => state.hasCompletedOnboarding,
  );
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyEmailFormData>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      code: "",
    },
  });

  if (isSignedIn && hasCompletedOnboarding) {
    return <Redirect href="/feed" />;
  } else if (isSignedIn && !hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  const handleVerification = async (data: VerifyEmailFormData) => {
    if (!signUp) return;

    try {
      setIsVerifying(true);
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: data.code,
      });

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        posthog.identify(completeSignUp.emailAddress ?? "", {
          email: completeSignUp.emailAddress,
          username: completeSignUp.username,
        });
      } else {
        console.error(JSON.stringify(completeSignUp, null, 2));
        setGeneralError("Verification failed. Please try again.");
      }
    } catch (err: unknown) {
      console.error("Error during verification:", err);
      setGeneralError(
        err instanceof Error
          ? err.message
          : "An error occurred during verification",
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      extraKeyboardSpace={150}
      enabled
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Verify Email",
          headerBackButtonDisplayMode: "minimal",
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
            <Controller
              control={control}
              name="code"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  defaultValue={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Verification Code"
                  keyboardType="number-pad"
                  className="mb-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit(handleVerification)}
                />
              )}
            />
            {errors.code && (
              <Text className="mb-4 text-red-500">{errors.code.message}</Text>
            )}
          </View>

          <Pressable
            onPress={handleSubmit(handleVerification)}
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
