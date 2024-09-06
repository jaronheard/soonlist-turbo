import React from "react";
import { Redirect, Stack } from "expo-router";
import { SignedIn, SignedOut } from "@clerk/clerk-expo";

const Index = () => {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SignedIn>
        <Redirect href="/feed" />
      </SignedIn>
      <SignedOut>
        <Redirect href="/sign-in" />
      </SignedOut>
    </>
  );
};

export default Index;
