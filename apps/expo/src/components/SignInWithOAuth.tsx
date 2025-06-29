import type { ClerkAPIError, OAuthStrategy } from "@clerk/types";
import type { ImageSourcePropType } from "react-native";
import React, { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { router, Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Clerk, useOAuth, useSignIn, useSignUp } from "@clerk/clerk-expo";
import Intercom from "@intercom/intercom-react-native";
import { usePostHog } from "posthog-react-native";

import { X } from "~/components/icons";
import { useWarmUpBrowser } from "../hooks/useWarmUpBrowser";
import { logError } from "../utils/errorLogging";
import { AppleSignInButton } from "./AppleSignInButton";
import { EmailSignInButton } from "./EmailSignInButton"; // You'll need to create this component
import { GoogleSignInButton } from "./GoogleSignInButton";
import { Logo } from "./Logo";

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

WebBrowser.maybeCompleteAuthSession();

interface SignInWithOAuthProps {
  banner?: React.ReactNode;
}

const SignInWithOAuth = ({ banner }: SignInWithOAuthProps) => {
  useWarmUpBrowser();
  const posthog = usePostHog();

  const { signIn, setActive: setActiveSignIn } = useSignIn();
  const { signUp, setActive: setActiveSignUp } = useSignUp();
  const { startOAuthFlow: startGoogleOAuthFlow } = useOAuth({
    strategy: "oauth_google",
  });
  const { startOAuthFlow: startAppleOAuthFlow } = useOAuth({
    strategy: "oauth_apple",
  });

  const [username, setUsername] = useState("");
  const [showUsernameInput, setShowUsernameInput] = useState(false);
  const [showOtherOptions, setShowOtherOptions] = useState(false);
  const [pendingSignUp, setPendingSignUp] = useState<
    ReturnType<typeof useSignUp>["signUp"] | null
  >(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const toggleOtherOptions = () => {
    setShowOtherOptions(!showOtherOptions);
  };

  if (!signIn || !signUp) {
    return null;
  }

  const handleOAuthFlow = async (strategy: OAuthStrategy) => {
    try {
      const startOAuthFlow =
        strategy === "oauth_google"
          ? startGoogleOAuthFlow
          : startAppleOAuthFlow;

      const result = await startOAuthFlow();

      // Add null check for result
      if (!result) {
        logError("OAuth flow returned null result", { strategy });
        return;
      }

      if (result.createdSessionId) {
        if (result.signIn?.status === "complete") {
          await setActiveSignIn({ session: result.createdSessionId });

          // Wait a bit for the session to be fully initialized
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Safely access session data
          const session = Clerk.session;
          if (session?.user) {
            const email = session.user.emailAddresses?.[0]?.emailAddress;
            const userId = session.user.id;

            if (email && userId) {
              try {
                await Intercom.loginUserWithUserAttributes({
                  email,
                  userId,
                });
                posthog.identify(email, {
                  email,
                });
              } catch (intercomError) {
                logError("Intercom login error", intercomError);
              }
            }
          }
        } else if (result.signUp?.status === "missing_requirements") {
          setPendingSignUp(result.signUp);
          setShowUsernameInput(true);
        }
      } else if (result.signUp?.status === "missing_requirements") {
        setPendingSignUp(result.signUp);
        setShowUsernameInput(true);
      }
    } catch (err) {
      // Handle error with more context
      console.error("OAuth flow error details:", err);
      logError("OAuth flow error", err);

      // Check if it's a JSON parse error
      if (err instanceof Error && err.message?.includes("JSON Parse error")) {
        console.error(
          "OAuth response might be HTML instead of JSON. This could indicate a configuration issue.",
        );
      }
    }
  };

  const handleUsernameSubmit = async () => {
    if (!pendingSignUp) {
      return;
    }
    setUsernameError(null);

    try {
      const res = await pendingSignUp.update({
        username: username,
      });

      if (res.status === "complete") {
        await setActiveSignUp({ session: res.createdSessionId });
        await Intercom.loginUnidentifiedUser();
        setShowUsernameInput(false);
        setPendingSignUp(null);
      } else if (res.status === "missing_requirements") {
        setUsernameError(
          "There are other pending requirements for your account.",
        );
      }
    } catch (err: unknown) {
      logError("Username submission error", err);
      const clerkError = err as {
        errors?: ClerkAPIError[];
        message?: string;
      };
      let specificErrorMessage: string | null = null;

      if (
        clerkError.errors &&
        Array.isArray(clerkError.errors) &&
        clerkError.errors.length > 0
      ) {
        const usernameSpecificError = clerkError.errors.find(
          (e: ClerkAPIError) => e.meta?.paramName === "username",
        );
        if (usernameSpecificError) {
          specificErrorMessage = usernameSpecificError.message;
        } else if (clerkError.errors[0]?.message) {
          specificErrorMessage = clerkError.errors[0].message;
        }
      } else if (clerkError.message) {
        specificErrorMessage = clerkError.message;
      }
      setUsernameError(
        specificErrorMessage ||
          "An unexpected error occurred. Please try again.",
      );
    }
  };

  const navigateToEmailSignUp = () => {
    router.push("/sign-up-email");
  };

  if (showUsernameInput) {
    return (
      <ScrollView className="flex-1 bg-white px-4 py-6">
        <View className="min-h-screen justify-center">
          <Text className="mb-4 text-center text-2xl font-bold">
            Choose Your Username
          </Text>

          <Text className="mb-4 text-center text-lg">
            Pick a unique username to represent you on Soonlist.
          </Text>
          <TextInput
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              if (usernameError) {
                setUsernameError(null);
              }
            }}
            placeholder="Enter your username"
            className="mb-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-lg"
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus={true}
            onSubmitEditing={handleUsernameSubmit}
            returnKeyType="done"
          />
          {usernameError && (
            <Text className="mb-4 ml-1 mt-1 text-sm text-red-500">
              {usernameError}
            </Text>
          )}

          <View className="mb-6 rounded-lg bg-accent-yellow p-4">
            <Text className="text-accent-yellow-contrast mb-2 text-base font-bold uppercase">
              Tips
            </Text>

            <View className="mb-2">
              <Text className="text-base">
                • Your username will be visible on shared events
              </Text>
            </View>

            <View>
              <Text className="text-base">
                • On Instagram? Consider using the same username
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleUsernameSubmit}
            className="rounded-full bg-interactive-1 px-6 py-3"
          >
            <Text className="text-center text-lg font-bold text-white">
              Continue
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const Container = banner ? SafeAreaView : View;

  return (
    <Container className="flex-1 bg-interactive-3">
      <Stack.Screen options={{ headerShown: false }} />
      {banner}
      <View className={`flex-1 px-4 pb-8 ${banner ? "pt-0" : "pt-24"}`}>
        <AnimatedView className="flex-1" layout={Layout.duration(400)}>
          <View className="shrink-0">
            <AnimatedView
              className="mb-4 items-center"
              layout={Layout.duration(400)}
            >
              <Logo className="h-10 w-40" variant="hidePreview" />
            </AnimatedView>
            <AnimatedView
              className="items-center"
              layout={Layout.duration(400)}
            >
              <Text className="mb-2 text-center font-heading text-4xl font-bold text-gray-700">
                Save events{" "}
                <Text className="text-interactive-1">instantly</Text>
              </Text>
              <Text className="mb-4 text-center text-lg text-gray-500">
                Screenshots → list of possibilities
              </Text>
            </AnimatedView>
          </View>

          <AnimatedView
            layout={Layout.duration(400)}
            className="flex-1 justify-center"
          >
            <ExpoImage
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-require-imports
              source={require("../assets/feed.png") as ImageSourcePropType}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
              cachePolicy="disk"
              transition={100}
            />
          </AnimatedView>

          <AnimatedView
            className="relative w-full shrink-0"
            layout={Layout.duration(400)}
          >
            <AppleSignInButton
              onPress={() => void handleOAuthFlow("oauth_apple")}
            />
            <View className="h-3" />
            <AnimatedPressable
              onPress={toggleOtherOptions}
              className="relative flex-row items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3"
            >
              <Text className="text-base font-medium text-gray-700">
                Other Options
              </Text>
              {showOtherOptions && (
                <View className="absolute right-6">
                  <X size={20} color="#374151" />
                </View>
              )}
            </AnimatedPressable>
            {showOtherOptions && (
              <AnimatedView
                entering={FadeIn.duration(400)}
                exiting={FadeOut.duration(300)}
                layout={Layout.duration(400)}
                className="absolute bottom-full w-full"
              >
                <View className="h-3" />
                <EmailSignInButton onPress={navigateToEmailSignUp} />
                <View className="h-3" />
                <GoogleSignInButton
                  onPress={() => void handleOAuthFlow("oauth_google")}
                />
                <View className="h-3" />
              </AnimatedView>
            )}
          </AnimatedView>
        </AnimatedView>
      </View>
    </Container>
  );
};

export default SignInWithOAuth;
