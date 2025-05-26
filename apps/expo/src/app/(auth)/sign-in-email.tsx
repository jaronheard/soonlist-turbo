import React from "react";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Redirect, router, Stack } from "expo-router";
import { useSignIn } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { useConvexAuth } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useAppStore } from "~/store";
import { Logo } from "../../components/Logo";
import { logError } from "../../utils/errorLogging";

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type SignInFormData = z.infer<typeof signInSchema>;

const SignInEmail = () => {
  const [isSigningIn, setIsSigningIn] = React.useState(false);
  const [generalError, setGeneralError] = React.useState("");
  const { signIn, setActive } = useSignIn();
  const posthog = usePostHog();
  const { isAuthenticated } = useConvexAuth();
  const hasCompletedOnboarding = useAppStore(
    (state) => state.hasCompletedOnboarding,
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
          posthog.identify(data.email, {
            email: data.email,
          });
          await setActive({ session: completeSignIn.createdSessionId });
        } else {
          setGeneralError("Additional verification required");
        }
      } catch (err: unknown) {
        logError("Error during sign in", err, {
          name: err instanceof Error ? err.name : "Unknown",
          message: err instanceof Error ? err.message : "Unknown error",
          stack: err instanceof Error ? err.stack : undefined,
        });

        if (err instanceof Error) {
          const clerkError = err as {
            errors?: { message: string; code: string }[];
          };
          if (clerkError.errors?.[0]) {
            const errorDetails = clerkError.errors[0];
            logError("Clerk error details", new Error(errorDetails.message), {
              code: errorDetails.code,
              message: errorDetails.message,
            });

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
            disabled={isSigningIn || !errors.email || !errors.password}
            className={`w-full rounded-full px-6 py-3 ${
              isSigningIn || !errors.email || !errors.password
                ? "bg-gray-400"
                : "bg-interactive-1"
            }`}
          >
            <Text className="text-center text-lg font-bold text-white">
              {isSigningIn ? "Signing in..." : "Sign in"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/sign-up-email")}
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
