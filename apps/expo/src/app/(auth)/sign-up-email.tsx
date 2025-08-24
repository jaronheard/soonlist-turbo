import type { ClerkAPIError } from "@clerk/types";
import React from "react";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Redirect, router, Stack } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { useConvex, useConvexAuth } from "convex/react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { api } from "@soonlist/backend/convex/_generated/api";

import { useGuestUser } from "~/hooks/useGuestUser";
import { useAppStore } from "~/store";
import { Logo } from "../../components/Logo";
import { logError } from "../../utils/errorLogging";

const signUpSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  emailAddress: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignUpFormData = z.infer<typeof signUpSchema>;

export default function SignUpScreen() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [generalError, setGeneralError] = React.useState("");
  const { isLoaded, signUp } = useSignUp();
  const { isAuthenticated } = useConvexAuth();
  const convex = useConvex();
  const { guestUserId, isLoading: isGuestUserLoading } = useGuestUser();
  const hasCompletedOnboarding = useAppStore(
    (state) => state.hasCompletedOnboarding,
  );
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      emailAddress: "",
      password: "",
    },
    mode: "onChange",
  });

  if (isAuthenticated && hasCompletedOnboarding) {
    return <Redirect href="/feed" />;
  } else if (isAuthenticated && !hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  const onSignUpPress = async (data: SignUpFormData) => {
    if (!isLoaded || isGuestUserLoading || !guestUserId) return;
    setGeneralError("");
    setIsSubmitting(true);

    const MAX_RETRIES = 5;
    const BASE_DELAY = 1000; // 1 second base delay
    let retryCount = 0;

    // Retry function with exponential backoff
    const attemptSignupWithRetry = async (): Promise<void> => {
      try {
        // Generate username synchronously using convex.query()
        const username = await convex.query(api.users.generateUsername, {
          guestUserId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.emailAddress,
          retryAttempt: retryCount,
          maxRetries: MAX_RETRIES,
        });

        // Try to create user with the generated username
        await signUp.create({
          ...data,
          username,
        });
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });
        router.navigate("/verify-email");
      } catch (err: unknown) {
        const clerkError = err as {
          errors?: ClerkAPIError[];
          message?: string;
        };

        // Check if this is a username conflict error
        let isUsernameConflict = false;
        let errorMessage = "";

        if (
          clerkError.errors &&
          Array.isArray(clerkError.errors) &&
          clerkError.errors.length > 0 &&
          clerkError.errors[0]?.message
        ) {
          errorMessage = clerkError.errors[0].message;
          isUsernameConflict =
            errorMessage.toLowerCase().includes("username") &&
            errorMessage.toLowerCase().includes("taken");
        } else if (clerkError.message) {
          errorMessage = clerkError.message;
          isUsernameConflict =
            errorMessage.toLowerCase().includes("username") &&
            errorMessage.toLowerCase().includes("taken");
        }

        // If it's a username conflict and we haven't exceeded max retries, retry
        if (isUsernameConflict && retryCount < MAX_RETRIES) {
          // Exponential backoff delay
          const delay = BASE_DELAY * Math.pow(2, retryCount);
          await new Promise((resolve) => setTimeout(resolve, delay));

          retryCount++;
          return attemptSignupWithRetry(); // Recursive retry
        }

        // If it's not a username conflict or we've exceeded max retries, show error
        if (retryCount >= MAX_RETRIES) {
          setGeneralError(
            "Unable to create a unique username after multiple attempts. Please try again later.",
          );
        } else {
          // Handle other types of errors
          if (errorMessage.includes("username")) {
            setGeneralError("Username conflict. Please try again.");
          } else {
            logError("Error during signup", err);
            setGeneralError(
              errorMessage || "Failed to create account. Please try again.",
            );
          }
        }

        setIsSubmitting(false);
      }
    };

    // Start the retry process
    try {
      await attemptSignupWithRetry();
    } catch (err: unknown) {
      console.error(
        "[SIGNUP_EMAIL] Retry process failed with unexpected error",
        {
          error: err,
          guestUserId,
          totalAttempts: retryCount + 1,
        },
      );
      logError("Email signup retry process failed", err);
      setGeneralError("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (!isLoaded || isGuestUserLoading) {
    return <Text>Loading...</Text>;
  }

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
          headerTitle: "Sign Up",
          headerBackTitle: "Back",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <View className="flex-1 bg-interactive-3 px-6">
        <View className="items-center pt-8">
          <Logo className="h-12 w-48" variant="hidePreview" />
        </View>
        <View className="items-center justify-center py-8">
          <Text className="mb-4 text-center font-heading text-4xl font-bold text-gray-700">
            Create Account
          </Text>
          <Text className="mb-8 text-center text-lg text-gray-500">
            Sign up for your Soonlist account
          </Text>
          {generalError ? (
            <Text className="mb-4 text-center text-red-500">
              {generalError}
            </Text>
          ) : null}

          <View className="mb-4 w-full flex-row gap-4">
            <View className="flex-1">
              <Text className="mb-1 text-sm font-medium text-gray-700">
                First Name
              </Text>
              <Controller
                control={control}
                name="firstName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    autoComplete="given-name"
                    autoCorrect={false}
                    autoCapitalize="words"
                    defaultValue={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
                    returnKeyType="next"
                  />
                )}
              />
              {errors.firstName && (
                <Text className="mt-1 text-red-500">
                  {errors.firstName.message}
                </Text>
              )}
            </View>
            <View className="flex-1">
              <Text className="mb-1 text-sm font-medium text-gray-700">
                Last Name
              </Text>
              <Controller
                control={control}
                name="lastName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    autoComplete="family-name"
                    autoCorrect={false}
                    autoCapitalize="words"
                    defaultValue={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
                    returnKeyType="next"
                  />
                )}
              />
              {errors.lastName && (
                <Text className="mt-1 text-red-500">
                  {errors.lastName.message}
                </Text>
              )}
            </View>
          </View>

          <View className="mb-4 w-full">
            <Text className="mb-1 text-sm font-medium text-gray-700">
              Email
            </Text>
            <Controller
              control={control}
              name="emailAddress"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  defaultValue={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
                  returnKeyType="next"
                  keyboardType="email-address"
                />
              )}
            />
            {errors.emailAddress && (
              <Text className="mt-1 text-red-500">
                {errors.emailAddress.message}
              </Text>
            )}
          </View>

          <View className="mb-6 w-full">
            <Text className="mb-1 text-sm font-medium text-gray-700">
              Password
            </Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  defaultValue={value}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  autoCorrect={false}
                  secureTextEntry={true}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
                  returnKeyType="done"
                />
              )}
            />
            {errors.password && (
              <Text className="mt-1 text-red-500">
                {errors.password.message}
              </Text>
            )}
          </View>

          <Pressable
            onPress={handleSubmit(onSignUpPress)}
            className={`w-full rounded-full px-6 py-3 ${isSubmitting || !isValid || isGuestUserLoading || !guestUserId ? "bg-gray-400" : "bg-interactive-1"}`}
            disabled={
              isSubmitting || !isValid || isGuestUserLoading || !guestUserId
            }
          >
            <Text className="text-center text-lg font-bold text-white">
              {isSubmitting ? "Signing Up..." : "Sign Up"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.navigate("/sign-in-email")}
            className="mt-4"
          >
            <Text className="text-center text-gray-600">
              Already have an account?{" "}
              <Text className="font-bold text-interactive-1">Sign in</Text>
            </Text>
          </Pressable>

          <Text className="mt-6 text-center text-sm text-gray-500">
            Having trouble signing up?{" "}
            <Text
              className="text-interactive-1"
              onPress={() => Linking.openURL("mailto:jaron@soonlist.com")}
            >
              Email us
            </Text>{" "}
            for support.
          </Text>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
}
