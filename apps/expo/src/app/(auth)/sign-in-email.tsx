import React from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Redirect, router, Stack } from "expo-router";
import { Clerk, useSignIn } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { useConvexAuth, useMutation } from "convex/react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { api } from "@soonlist/backend/convex/_generated/api";

import { useAppStore } from "~/store";
import { Logo } from "../../components/Logo";
import { handleClerkError } from "../../utils/errorLogging";
import { transferGuestData } from "../../utils/guestDataTransfer";

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type SignInFormData = z.infer<typeof signInSchema>;

const SignInEmail = () => {
  const [isSigningIn, setIsSigningIn] = React.useState(false);
  const [generalError, setGeneralError] = React.useState("");
  const { signIn, setActive, isLoaded } = useSignIn();
  const { isAuthenticated } = useConvexAuth();
  const hasCompletedOnboarding = useAppStore(
    (state) => state.hasCompletedOnboarding,
  );
  const transferGuestOnboardingData = useMutation(
    api.guestOnboarding.transferGuestOnboardingData,
  );
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (isAuthenticated && hasCompletedOnboarding) {
    return <Redirect href="/feed" />;
  } else if (isAuthenticated && !hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  const onSignInPress = async (data: SignInFormData) => {
    if (!isSigningIn) {
      setIsSigningIn(true);
      setGeneralError("");

      try {
        const completeSignIn = await signIn.create({
          identifier: data.email.trim(),
          password: data.password,
        });

        if (completeSignIn.status === "complete") {
          await setActive({ session: completeSignIn.createdSessionId });

          // Wait a bit for the session to be fully initialized
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Transfer guest data after successful sign in
          // After setActive and delay, the session should be available via Clerk
          const activeSession = Clerk.session;
          if (activeSession?.user?.id) {
            await transferGuestData({
              userId: activeSession.user.id,
              transferGuestOnboardingData,
            });
          }
        } else {
          setGeneralError("Additional verification required");
        }
      } catch (err: unknown) {
        const isNetworkError = handleClerkError("sign in", err, {
          email: data.email,
        });

        // If it's a network error, show a user-friendly offline message
        if (isNetworkError) {
          setGeneralError(
            "Unable to sign in while offline. Please check your internet connection and try again.",
          );
          return;
        }

        if (err instanceof Error) {
          const clerkError = err as {
            errors?: { message: string; code: string }[];
          };
          if (clerkError.errors?.[0]) {
            const errorDetails = clerkError.errors[0];

            switch (errorDetails.code) {
              case "form_identifier_not_found":
                setGeneralError("No account found with this email address");
                break;
              case "form_password_incorrect":
                setGeneralError("Incorrect password");
                break;
              case "form_identifier_verification_failed":
                setGeneralError("Email verification required");
                break;
              case "rate_limit_exceeded":
                setGeneralError("Too many attempts. Please try again later");
                break;
              default:
                setGeneralError(
                  errorDetails.message || "An error occurred during sign in",
                );
            }
          } else {
            setGeneralError(err.message);
          }
        } else {
          setGeneralError("An unexpected error occurred. Please try again");
        }
      } finally {
        setIsSigningIn(false);
      }
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
          headerTitle: "Sign in",
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
            Welcome Back
          </Text>
          <Text className="mb-8 text-center text-lg text-gray-500">
            Sign in to your Soonlist account
          </Text>

          {generalError ? (
            <Text className="mb-4 px-4 text-center text-red-500">
              {generalError}
            </Text>
          ) : null}

          <View className="mb-4 w-full">
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  value={value}
                  onChangeText={(text) => onChange(text.trim())}
                  onBlur={onBlur}
                  placeholder="Email"
                  className={`mb-2 w-full rounded-lg border ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  } bg-white px-4 py-3`}
                  returnKeyType="next"
                  keyboardType="email-address"
                  editable={!isSigningIn}
                />
              )}
            />
            {errors.email && (
              <Text className="text-red-500">{errors.email.message}</Text>
            )}
          </View>

          <View className="mb-6 w-full">
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  autoComplete="password"
                  autoCorrect={false}
                  autoCapitalize="none"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Password"
                  secureTextEntry={true}
                  className={`mb-2 w-full rounded-lg border ${
                    errors.password ? "border-red-500" : "border-gray-300"
                  } bg-white px-4 py-3`}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit(onSignInPress)}
                  editable={!isSigningIn}
                />
              )}
            />
            {errors.password && (
              <Text className="text-red-500">{errors.password.message}</Text>
            )}
          </View>

          <Pressable
            onPress={handleSubmit(onSignInPress)}
            disabled={isSigningIn || !!errors.email || !!errors.password}
            className={`w-full rounded-full px-6 py-3 ${
              isSigningIn || !!errors.email || !!errors.password
                ? "bg-gray-400"
                : "bg-interactive-1"
            }`}
          >
            <Text className="text-center text-lg font-bold text-white">
              {isSigningIn ? "Signing in..." : "Sign in"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.navigate("/sign-up-email")}
            className="mt-4"
          >
            <Text className="text-center text-gray-600">
              Don't have an account?{" "}
              <Text className="font-bold text-interactive-1">Sign Up</Text>
            </Text>
          </Pressable>
        </View>
        <Text className="mt-6 text-center text-sm text-gray-500">
          Having trouble signing in?{" "}
          <Text
            className="text-interactive-1"
            onPress={() => Linking.openURL("mailto:jaron@soonlist.com")}
          >
            Email us
          </Text>{" "}
          for support.
        </Text>
      </View>
    </KeyboardAwareScrollView>
  );
};

export default SignInEmail;
