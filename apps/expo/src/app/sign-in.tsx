import React from "react";
import { View } from "react-native";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";

import LoadingSpinner from "../components/LoadingSpinner";
import SignInWithOAuth from "../components/SignInWithOAuth";

export default function SignInScreen() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <LoadingSpinner />;
  }

  if (isSignedIn) {
    return <Redirect href="/" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <SignInWithOAuth />
    </View>
  );
}
