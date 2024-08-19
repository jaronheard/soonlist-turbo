import type { OAuthStrategy } from "@clerk/types";
import React from "react";
import { View } from "react-native";
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

  if (!signIn || !signUp) return null;

  const handleOAuthFlow = async (strategy: OAuthStrategy) => {
    try {
      const startOAuthFlow =
        strategy === "oauth_google"
          ? startGoogleOAuthFlow
          : startAppleOAuthFlow;

      // If the user has an account but needs to sign in
      const userExistsButNeedsToSignIn =
        signUp.verifications.externalAccount.status === "transferable" &&
        signUp.verifications.externalAccount.error?.code ===
          "external_account_exists";

      if (userExistsButNeedsToSignIn) {
        const res = await signIn.create({ transfer: true });
        if (res.status === "complete" && setActiveSignIn) {
          await setActiveSignIn({ session: res.createdSessionId });
        }
        return;
      }

      // If the user needs to be created
      const userNeedsToBeCreated =
        signIn.firstFactorVerification.status === "transferable";

      if (userNeedsToBeCreated) {
        const res = await signUp.create({ transfer: true });
        if (res.status === "complete" && setActiveSignUp) {
          await setActiveSignUp({ session: res.createdSessionId });
        }
        return;
      }

      // Normal sign-in flow
      const result = await startOAuthFlow();
      if (result.createdSessionId && setActiveSignIn) {
        await setActiveSignIn({ session: result.createdSessionId });
      }
    } catch (err) {
      console.error("OAuth error", err);
    }
  };

  return (
    <View className="flex-1 items-center justify-center gap-2">
      <Stack.Screen options={{ title: "Soonlist" }} />
      <GoogleSignInButton
        onPress={() => void handleOAuthFlow("oauth_google")}
      />
      <AppleSignInButton onPress={() => void handleOAuthFlow("oauth_apple")} />
    </View>
  );
};

export default SignInWithOAuth;
