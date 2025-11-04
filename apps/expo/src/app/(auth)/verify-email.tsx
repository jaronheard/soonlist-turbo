import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Redirect, Stack } from "expo-router";
import { Clerk, useSignUp, useUser } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction, useConvexAuth, useMutation } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { api } from "@soonlist/backend/convex/_generated/api";

import { Logo } from "~/components/Logo";
import { useAppStore } from "~/store";
import { logError } from "~/utils/errorLogging";
import { transferGuestData } from "~/utils/guestDataTransfer";
import { redeemStoredDiscoverCode } from "~/utils/redeemStoredDiscoverCode";

const verifyEmailSchema = z.object({
  code: z
    .string()
    .min(1, "Verification code is required")
    .regex(/^\d{6}$/, "Invalid code format. Please enter 6 digits."),
});

type VerifyEmailFormData = z.infer<typeof verifyEmailSchema>;

const VerifyEmail = () => {
  const { user } = useUser();
  const setDiscoverAccessOverride = useAppStore(
    (s) => s.setDiscoverAccessOverride,
  );
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [generalError, setGeneralError] = React.useState("");
  const { signUp, setActive } = useSignUp();
  const posthog = usePostHog();
  const { isAuthenticated } = useConvexAuth();
  const hasCompletedOnboarding = useAppStore(
    (state) => state.hasCompletedOnboarding,
  );
  const transferGuestOnboardingData = useMutation(
    api.guestOnboarding.transferGuestOnboardingData,
  );
  const redeemDiscoverCode = useAction(api.codes.redeemCode);
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

  if (isAuthenticated && hasCompletedOnboarding) {
    return <Redirect href="/feed" />;
  } else if (isAuthenticated && !hasCompletedOnboarding) {
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
        
        // Wait a bit for the session to be fully initialized
        await new Promise((resolve) => setTimeout(resolve, 100));
        
        // Get the user ID from Clerk session (more reliable than createdUserId)
        const session = Clerk.session;
        const userId = session?.user?.id ?? completeSignUp.createdUserId;
        
        // Only proceed with PostHog and guest data transfer if we have a proper user ID
        if (userId) {
          // Get the anonymous PostHog ID before identifying
          const anonymousId = posthog.getDistinctId();
          
          // Alias the anonymous ID to the new user ID
          if (anonymousId && anonymousId !== userId) {
            posthog.alias(userId, anonymousId);
          }
          
          // Then identify the user
          posthog.identify(userId, {
            email: completeSignUp.emailAddress,
            username: completeSignUp.username,
          });

          // Transfer guest data after successful sign up
          await transferGuestData({
            userId,
            transferGuestOnboardingData,
          });
          await redeemStoredDiscoverCode(redeemDiscoverCode);
          // Refresh Clerk user to reflect updated publicMetadata immediately
          await user?.reload?.();
          if (user?.publicMetadata?.showDiscover) {
            setDiscoverAccessOverride(false);
          }
        }
      } else {
        logError("Verification failed", completeSignUp);
        setGeneralError("Verification failed. Please try again.");
      }
    } catch (err: unknown) {
      logError("Error during verification", err);
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
          <Logo className="h-12 w-48" variant="hidePreview" />
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
