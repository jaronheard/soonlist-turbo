import type { OAuthStrategy } from "@clerk/types";
import type { ImageSourcePropType } from "react-native";
import React, { useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useOAuth, useSignIn, useSignUp } from "@clerk/clerk-expo";

import { useWarmUpBrowser } from "../hooks/useWarmUpBrowser";
import { AppleSignInButton } from "./AppleSignInButton";
import { GoogleSignInButton } from "./GoogleSignInButton";

WebBrowser.maybeCompleteAuthSession();

const SignInWithOAuth = () => {
  useWarmUpBrowser();

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
  const [pendingSignUp, setPendingSignUp] = useState<
    ReturnType<typeof useSignUp>["signUp"] | null
  >(null);

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
        setShowUsernameInput(false);
        setPendingSignUp(null);
      } else if (res.status === "missing_requirements") {
        // Handle any other missing fields here
      }
    } catch (err) {
      // Handle error
    }
  };

  if (showUsernameInput) {
    return (
      <View className="flex-1 justify-center bg-white p-4 pb-80">
        <View className="flex-1 justify-center">
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
      </View>
    );
  }

  return (
    <View className="flex-1 bg-interactive-3 px-6 pt-14">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 items-center justify-center">
        <Text className="mb-4 text-center font-heading text-5xl font-bold text-gray-700">
          Organize <Text className="text-interactive-1">possibilities</Text>
        </Text>
        <Text className="mb-8 text-center text-xl text-gray-500">
          The best way to add, organize, and share events.
        </Text>
        <Image
          source={
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-var-requires
            require("../assets/onboarding-events-collage.png") as ImageSourcePropType
          }
          className="mb-6 h-80 w-full"
          resizeMode="contain"
        />
        <Text className="mb-8 text-center text-lg text-gray-600">
          Join Soonlist to start capturing and sharing events that inspire you.
        </Text>
        <GoogleSignInButton
          onPress={() => void handleOAuthFlow("oauth_google")}
        />
        <View className="h-4" />
        <AppleSignInButton
          onPress={() => void handleOAuthFlow("oauth_apple")}
        />
      </View>
    </View>
  );
};

export default SignInWithOAuth;
