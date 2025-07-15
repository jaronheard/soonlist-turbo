import type { ClerkAPIError, OAuthStrategy } from "@clerk/types";
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
import { useConvex, useMutation } from "convex/react";
import { usePostHog } from "posthog-react-native";

import { api } from "@soonlist/backend/convex/_generated/api";

import { X } from "~/components/icons";
import { useGuestUser } from "~/hooks/useGuestUser";
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
  const convex = useConvex();
  const { guestUserId, isLoading: isGuestUserLoading } = useGuestUser();
  const transferGuestOnboardingData = useMutation(
    api.guestOnboarding.transferGuestOnboardingData,
  );

  const { signIn, setActive: setActiveSignIn } = useSignIn();
  const { signUp, setActive: setActiveSignUp } = useSignUp();
  const { startOAuthFlow: startGoogleOAuthFlow } = useOAuth({
    strategy: "oauth_google",
  });
  const { startOAuthFlow: startAppleOAuthFlow } = useOAuth({
    strategy: "oauth_apple",
  });

  const [showOtherOptions, setShowOtherOptions] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const toggleOtherOptions = () => {
    setShowOtherOptions(!showOtherOptions);
  };

  if (!signIn || !signUp || isGuestUserLoading || !guestUserId) {
    return null;
  }

  const handleOAuthFlow = async (strategy: OAuthStrategy) => {
    setOauthError(null);
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

      const handleMissingRequirements = async (
        pendingSignUp: ReturnType<typeof useSignUp>["signUp"],
      ) => {
        if (!pendingSignUp) return;
        try {
          // Get user info for username generation
          const firstName = pendingSignUp.firstName;
          const lastName = pendingSignUp.lastName;
          const email = pendingSignUp.emailAddress;

          if (!email) {
            setOauthError("Email is required for account creation.");
            return;
          }

          if (!guestUserId || isGuestUserLoading) {
            setOauthError(
              "Guest user initialization failed. Please try again.",
            );
            return;
          }

          console.log("[OAUTH_SIGNUP] Attempting username generation", {
            guestUserId,
            firstName: firstName || null,
            lastName: lastName || null,
            email: email,
            timestamp: new Date().toISOString(),
          });

          // Generate username synchronously using convex.query()
          const username = await convex.query(api.users.generateUsername, {
            guestUserId,
            firstName: firstName || null,
            lastName: lastName || null,
            email: email,
          });

          console.log("[OAUTH_SIGNUP] Username generation successful", {
            generatedUsername: username,
            guestUserId,
          });

          // Username generated successfully

          const res = await pendingSignUp.update({ username });

          if (res.status === "complete") {
            await setActiveSignUp({ session: res.createdSessionId });
            await Intercom.loginUnidentifiedUser();
            setOauthError(null);

            // Transfer guest data after successful sign up
            const session = Clerk.session;
            if (session?.user?.id) {
              await transferGuestData({
                userId: session.user.id,
                transferGuestOnboardingData,
              });
            }
          } else if (res.status === "missing_requirements") {
            setOauthError(
              "There are other pending requirements for your account.",
            );
          }
        } catch (err: unknown) {
          console.error("[OAUTH_SIGNUP] OAuth sign up completion error", {
            error: err,
            guestUserId,
            firstName: firstName || null,
            lastName: lastName || null,
            email: email,
          });
          logError("OAuth sign up completion error", err);
          const clerkError = err as {
            errors?: ClerkAPIError[];
            message?: string;
          };
          let specificErrorMessage: string | null = null;

          if (
            clerkError.errors &&
            Array.isArray(clerkError.errors) &&
            clerkError.errors.length > 0 &&
            clerkError.errors[0]?.message
          ) {
            specificErrorMessage = clerkError.errors[0].message;
          } else if (clerkError.message) {
            specificErrorMessage = clerkError.message;
          }
          setOauthError(
            specificErrorMessage ||
              "An unexpected error occurred. Please try again.",
          );
        }
      };

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
              } catch (intercomError) {
                logError("Intercom login error", intercomError);
              }

              try {
                posthog.identify(email, {
                  email,
                });
              } catch (posthogError) {
                logError("PostHog identify error", posthogError);
              }

              try {
                await transferGuestData({
                  userId,
                  transferGuestOnboardingData,
                });
              } catch (transferError) {
                logError("Guest data transfer error", transferError);
              }
            }
          }
        } else if (result.signUp?.status === "missing_requirements") {
          await handleMissingRequirements(result.signUp);
        }
      } else if (result.signUp?.status === "missing_requirements") {
        await handleMissingRequirements(result.signUp);
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

          {oauthError && (
            <View className="mb-4 rounded-lg bg-red-100 p-4">
              <Text className="text-center text-sm text-red-600">
                {oauthError}
              </Text>
            </View>
          )}

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
