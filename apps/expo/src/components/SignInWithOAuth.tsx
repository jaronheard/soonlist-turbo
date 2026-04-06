import type { ClerkAPIError, OAuthStrategy } from "@clerk/types";
import type { ImageSourcePropType } from "react-native";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { router, Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  Clerk,
  useOAuth,
  useSignIn,
  useSignUp,
  useUser,
} from "@clerk/clerk-expo";
import Intercom from "@intercom/intercom-react-native";
import { useAction, useConvex, useMutation } from "convex/react";
import { usePostHog } from "posthog-react-native";

import { api } from "@soonlist/backend/convex/_generated/api";

import { X } from "~/components/icons";
import { useGuestUser } from "~/hooks/useGuestUser";
import { useAppStore } from "~/store";
import { useWarmUpBrowser } from "../hooks/useWarmUpBrowser";
import { AF_EVENTS, trackAFEvent } from "../utils/appsflyerEvents";
import { logError } from "../utils/errorLogging";
import { transferGuestData } from "../utils/guestDataTransfer";
import { redeemStoredDiscoverCode } from "../utils/redeemStoredDiscoverCode";
import { AppleSignInButton } from "./AppleSignInButton";
import { EmailSignInButton } from "./EmailSignInButton"; // You'll need to create this component
import { GoogleSignInButton } from "./GoogleSignInButton";
import { Logo } from "./Logo";
import { ProgressBar } from "./ProgressBar";

const AnimatedView = Animated.createAnimatedComponent(View);

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-require-imports
const DEFAULT_HERO_IMAGE = require("../assets/feed.png") as ImageSourcePropType;

WebBrowser.maybeCompleteAuthSession();

interface SignInWithOAuthProps {
  banner?: React.ReactNode;
  headline?: React.ReactNode;
  subtitle?: string;
  hideImage?: boolean;
  imageSource?: ImageSourcePropType;
  imageSlot?: React.ReactNode;
  /** Use the dark purple onboarding treatment (interactive-1 bg, white text). */
  dark?: boolean;
  /** Shows an onboarding progress bar at the top. Pass the step out of total. */
  progress?: { current: number; total: number };
}

const SignInWithOAuth = ({
  banner,
  headline,
  subtitle,
  hideImage,
  imageSource,
  imageSlot,
  dark,
  progress,
}: SignInWithOAuthProps) => {
  useWarmUpBrowser();
  const posthog = usePostHog();
  const convex = useConvex();
  const { user } = useUser();
  const { guestUserId, isLoading: isGuestUserLoading } = useGuestUser();
  const transferGuestOnboardingData = useMutation(
    api.guestOnboarding.transferGuestOnboardingData,
  );
  const redeemDiscoverCode = useAction(api.codes.redeemCode);

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
  const setDiscoverAccessOverride = useAppStore(
    (s) => s.setDiscoverAccessOverride,
  );

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

        const MAX_RETRIES = 5;
        const BASE_DELAY = 1000; // 1 second base delay
        let retryCount = 0;

        // Get user info for username generation
        const firstName = pendingSignUp.firstName;
        const lastName = pendingSignUp.lastName;
        const email = pendingSignUp.emailAddress;

        if (!email) {
          setOauthError("Email is required for account creation.");
          return;
        }

        if (!guestUserId || isGuestUserLoading) {
          setOauthError("Guest user initialization failed. Please try again.");
          return;
        }

        // Retry function with exponential backoff
        const attemptSignupWithRetry = async (): Promise<boolean> => {
          try {
            // Generate username with retry attempt info
            const username = await convex.query(api.users.generateUsername, {
              guestUserId,
              firstName: firstName || null,
              lastName: lastName || null,
              email: email,
              retryAttempt: retryCount,
              maxRetries: MAX_RETRIES,
            });

            // Try to update pending signup with the generated username
            const res = await pendingSignUp.update({ username });

            if (res.status === "complete") {
              await setActiveSignUp({ session: res.createdSessionId });
              await Intercom.loginUnidentifiedUser();
              setOauthError(null);
              trackAFEvent(AF_EVENTS.COMPLETE_REGISTRATION, {
                af_registration_method:
                  strategy === "oauth_google" ? "google" : "apple",
              });

              // Transfer guest data after successful sign up
              const session = Clerk.session;
              if (session?.user?.id) {
                await transferGuestData({
                  userId: session.user.id,
                  transferGuestOnboardingData,
                });
                await redeemStoredDiscoverCode(redeemDiscoverCode);
                await user?.reload?.();
                if (user?.publicMetadata?.showDiscover) {
                  setDiscoverAccessOverride(false);
                }
              }

              return true; // Success
            } else if (res.status === "missing_requirements") {
              setOauthError(
                "There are other pending requirements for your account.",
              );
              return false; // Different error, don't retry
            }

            return false; // Unknown status, don't retry
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
              setOauthError(
                "Unable to create a unique username after multiple attempts. Please try again later.",
              );
            } else {
              setOauthError(
                errorMessage ||
                  "An unexpected error occurred. Please try again.",
              );
            }

            return false; // Failed
          }
        };

        // Start the retry process
        try {
          await attemptSignupWithRetry();
        } catch (err: unknown) {
          logError("OAuth signup retry process failed", err);
          setOauthError("An unexpected error occurred. Please try again.");
        }
      };

      if (result.createdSessionId) {
        if (result.signIn?.status === "complete") {
          await setActiveSignIn({ session: result.createdSessionId });
          trackAFEvent(AF_EVENTS.LOGIN, {
            af_registration_method:
              strategy === "oauth_google" ? "google" : "apple",
          });

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
                // Redeem any stored discover code and refresh user metadata
                try {
                  await redeemStoredDiscoverCode(redeemDiscoverCode);
                } catch (redeemErr) {
                  logError("Redeem stored code error (sign-in)", redeemErr);
                }
                try {
                  await user?.reload?.();
                  if (user?.publicMetadata?.showDiscover) {
                    setDiscoverAccessOverride(false);
                  }
                } catch (reloadErr) {
                  logError("Clerk user reload error (sign-in)", reloadErr);
                }
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
    router.navigate("/sign-up-email");
  };

  // Progress bar must live inside the safe area so it clears the notch,
  // so switch to SafeAreaView whenever a banner or progress bar is shown.
  const Container = banner || progress ? SafeAreaView : View;

  return (
    <Container
      className={`flex-1 ${dark ? "bg-interactive-1" : "bg-interactive-3"}`}
    >
      <Stack.Screen options={{ headerShown: false }} />
      {progress && (
        <View className="pt-2">
          <ProgressBar
            currentStep={progress.current}
            totalSteps={progress.total}
            backgroundColor="bg-neutral-3"
            foregroundColor="bg-neutral-1"
          />
        </View>
      )}
      {banner}
      <View
        className={`flex-1 px-4 pb-8 ${
          banner ? "pt-0" : progress ? "pt-10" : "pt-24"
        }`}
      >
        <View className="flex-1">
          <View className="shrink-0">
            <View className="mb-4 items-center">
              <Logo
                className="h-10 w-40"
                variant={dark ? "white" : "hidePreview"}
              />
            </View>
            <View className="items-center">
              <Text
                className={`mb-2 text-center font-heading text-4xl font-bold ${dark ? "text-white" : "text-gray-700"}`}
              >
                {headline ?? (
                  <>
                    Turn screenshots into{" "}
                    <Text className="text-interactive-1">plans</Text>
                  </>
                )}
              </Text>
              <Text
                className={`mb-4 text-center text-lg ${dark ? "text-white/80" : "text-gray-500"}`}
              >
                {subtitle ??
                  "Save events in one tap, all in one shareable list"}
              </Text>
            </View>
          </View>

          {!hideImage && (
            <View className="flex-1 justify-center">
              {imageSlot ?? (
                <ExpoImage
                  source={imageSource ?? DEFAULT_HERO_IMAGE}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="contain"
                  cachePolicy="disk"
                  transition={100}
                />
              )}
            </View>
          )}
          {hideImage && <View className="flex-1" />}

          {oauthError && (
            <View className="mb-4 rounded-lg bg-red-100 p-4">
              <Text className="text-center text-sm text-red-600">
                {oauthError}
              </Text>
            </View>
          )}

          <View className="relative mt-4 w-full shrink-0">
            <AppleSignInButton
              onPress={() => void handleOAuthFlow("oauth_apple")}
            />
            <View className="h-3" />
            <Pressable
              onPress={toggleOtherOptions}
              className="relative flex-row items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 active:scale-[0.98] active:bg-neutral-100"
            >
              <Text className="text-base font-medium text-gray-700">
                More ways to sign up
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
