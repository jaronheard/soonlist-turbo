import type { OAuthStrategy } from "@clerk/types";
import type { ImageSourcePropType } from "react-native";
import React, { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import { Image as ExpoImage } from "expo-image";
import { router, Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Clerk, useOAuth, useSignIn, useSignUp } from "@clerk/clerk-expo";
import Intercom from "@intercom/intercom-react-native";
import { X } from "lucide-react-native";
import { usePostHog } from "posthog-react-native";

import { useWarmUpBrowser } from "../hooks/useWarmUpBrowser";
import { AppleSignInButton } from "./AppleSignInButton";
import { EmailSignInButton } from "./EmailSignInButton"; // You'll need to create this component
import { GoogleSignInButton } from "./GoogleSignInButton";
import { Logo } from "./Logo";

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

WebBrowser.maybeCompleteAuthSession();

const SignInWithOAuth = () => {
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
      if (result.createdSessionId) {
        if (result.signIn?.status === "complete") {
          await setActiveSignIn({ session: result.createdSessionId });
          const email = Clerk.session?.user.emailAddresses[0]?.emailAddress;
          const userId = Clerk.session?.user.id;
          const _ = await Intercom.loginUserWithUserAttributes({
            email,
            userId,
          });
          if (email) {
            posthog.identify(email, {
              email,
            });
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
      // Handle error
      console.error("OAuth flow error:", err);
    }
  };

  const handleUsernameSubmit = async () => {
    try {
      if (!pendingSignUp) {
        return;
      }

      const res = await pendingSignUp.update({
        username: username,
      });

      if (res.status === "complete") {
        await setActiveSignUp({ session: res.createdSessionId });
        // Register user with Intercom
        await Intercom.loginUnidentifiedUser();
        setShowUsernameInput(false);
        setPendingSignUp(null);
      } else if (res.status === "missing_requirements") {
        // Handle any other missing fields here
      }
    } catch (err) {
      // Handle error
      console.error("Username submission error:", err);
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
            onChangeText={setUsername}
            placeholder="Enter your username"
            className="mb-6 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-lg"
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus={true}
            onSubmitEditing={handleUsernameSubmit}
            returnKeyType="done"
          />

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

  return (
    <View className="flex-1 bg-interactive-3">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 px-4 pb-8 pt-24">
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
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-var-requires
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
    </View>
  );
};

export default SignInWithOAuth;
