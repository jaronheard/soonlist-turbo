import type { OAuthStrategy } from "@clerk/types";
import type { ImageSourcePropType } from "react-native";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { router, Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Clerk, useOAuth, useSignIn, useSignUp } from "@clerk/clerk-expo";
import Intercom from "@intercom/intercom-react-native";
import { useMutation } from "convex/react";
import { usePostHog } from "posthog-react-native";

import { api } from "@soonlist/backend/convex/_generated/api";

import { X } from "~/components/icons";
import { useWarmUpBrowser } from "../hooks/useWarmUpBrowser";
import { logError } from "../utils/errorLogging";
import { transferGuestData } from "../utils/guestDataTransfer";
import { AppleSignInButton } from "./AppleSignInButton";
import { EmailSignInButton } from "./EmailSignInButton"; // You'll need to create this component
import { GoogleSignInButton } from "./GoogleSignInButton";
import { Logo } from "./Logo";

const AnimatedView = Animated.createAnimatedComponent(View);

WebBrowser.maybeCompleteAuthSession();

interface SignInWithOAuthProps {
  banner?: React.ReactNode;
}

const SignInWithOAuth = ({ banner }: SignInWithOAuthProps) => {
  useWarmUpBrowser();
  const posthog = usePostHog();
  const transferGuestOnboardingData = useMutation(
    api.guestOnboarding.transferGuestOnboardingData,
  );

  const { signIn, setActive: setActiveSignIn } = useSignIn();
  const { signUp } = useSignUp();
  const { startOAuthFlow: startGoogleOAuthFlow } = useOAuth({
    strategy: "oauth_google",
  });
  const { startOAuthFlow: startAppleOAuthFlow } = useOAuth({
    strategy: "oauth_apple",
  });

  const [showOtherOptions, setShowOtherOptions] = useState(false);

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

              // Transfer guest data after successful sign in
              await transferGuestData({
                userId,
                transferGuestOnboardingData,
              });
            }
          }
        }
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

  const navigateToEmailSignUp = () => {
    router.push("/sign-up-email");
  };

  const Container = banner ? SafeAreaView : View;

  return (
    <Container className="flex-1 bg-interactive-3">
      <Stack.Screen options={{ headerShown: false }} />
      {banner}
      <View className={`flex-1 px-4 pb-8 ${banner ? "pt-0" : "pt-24"}`}>
        <View className="flex-1">
          <View className="shrink-0">
            <View className="mb-4 items-center">
              <Logo className="h-10 w-40" variant="hidePreview" />
            </View>
            <View className="items-center">
              <Text className="mb-2 text-center font-heading text-4xl font-bold text-gray-700">
                Turn screenshots into{" "}
                <Text className="text-interactive-1">plans</Text>
              </Text>
              <Text className="mb-4 text-center text-lg text-gray-500">
                Save events in one tap. All in one place.
              </Text>
            </View>
          </View>

          <View className="flex-1 justify-center">
            <ExpoImage
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-require-imports
              source={require("../assets/feed.png") as ImageSourcePropType}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
              cachePolicy="disk"
              transition={100}
            />
          </View>

          <View className="relative w-full shrink-0">
            <AppleSignInButton
              onPress={() => void handleOAuthFlow("oauth_apple")}
            />
            <View className="h-3" />
            <Pressable
              onPress={toggleOtherOptions}
              className="relative flex-row items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 active:opacity-70"
            >
              <Text className="text-base font-medium text-gray-700">
                Other Options
              </Text>
              {showOtherOptions && (
                <View className="absolute right-6">
                  <X size={20} color="#374151" />
                </View>
              )}
            </Pressable>
            {showOtherOptions && (
              <AnimatedView
                entering={FadeIn.duration(400)}
                exiting={FadeOut.duration(300)}
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
          </View>
        </View>
      </View>
    </Container>
  );
};

export default SignInWithOAuth;
