import type { ClerkAPIError } from "@clerk/types";
import React from "react";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Redirect, router, Stack } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { useConvexAuth, useQuery } from "convex/react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { api } from "@soonlist/backend/convex/_generated/api";

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
  const [usernameParams, setUsernameParams] = React.useState<{
    firstName: string;
    lastName: string;
    email: string;
  } | null>(null);
  const { isLoaded, signUp } = useSignUp();
  const { isAuthenticated } = useConvexAuth();
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

  // Generate username when params are set
  const generatedUsername = useQuery(
    api.users.generateUsername,
    usernameParams || "skip",
  );

  if (isAuthenticated && hasCompletedOnboarding) {
    return <Redirect href="/feed" />;
  } else if (isAuthenticated && !hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  const onSignUpPress = async (data: SignUpFormData) => {
    if (!isLoaded) return;
    setGeneralError("");
    setIsSubmitting(true);

    try {
      // Set params to trigger username generation
      setUsernameParams({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.emailAddress,
      });

      // Wait for username generation
      let username: string | undefined;
      const maxAttempts = 20; // 2 seconds max
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Check if we have a username
        if (generatedUsername !== undefined) {
          username = generatedUsername;
          break;
        }
      }

      if (!username) {
        throw new Error("Failed to generate username. Please try again.");
      }

      await signUp.create({
        ...data,
        username,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      router.push("/verify-email");
    } catch (err: unknown) {
      logError("Error during sign up", err);

      const clerkError = err as {
        errors?: ClerkAPIError[];
        message?: string;
      };
      if (
        clerkError.errors &&
        Array.isArray(clerkError.errors) &&
        clerkError.errors.length > 0
      ) {
        setGeneralError(
          clerkError.message ||
            "An error occurred during sign up. Please check your input.",
        );
      } else if (err instanceof Error) {
        setGeneralError(err.message);
      } else {
        setGeneralError("An error occurred during sign up.");
      }
    } finally {
      setIsSubmitting(false);
      setUsernameParams(null);
    }
  };

  if (!isLoaded) {
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
            className={`w-full rounded-full px-6 py-3 ${isSubmitting || !isValid ? "bg-gray-400" : "bg-interactive-1"}`}
            disabled={isSubmitting || !isValid}
          >
            <Text className="text-center text-lg font-bold text-white">
              {isSubmitting ? "Signing Up..." : "Sign Up"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/sign-in-email")}
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
