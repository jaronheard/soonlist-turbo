import React, { useEffect } from "react";
import { Linking, SafeAreaView, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import { SignedIn, SignedOut } from "@clerk/clerk-expo";

import SignInWithOAuth from "~/components/SignInWithOAuth";
import { SignOut } from "~/components/SignOut";
import { Logo } from "./Logo";

export default function Home() {
  const router = useRouter();

  const { hasShareIntent } = useShareIntentContext();

  useEffect(() => {
    if (hasShareIntent) {
      // we want to handle share intent event in a specific page
      router.replace({
        pathname: "new",
      });
    }
  }, [hasShareIntent]);

  return (
    <SafeAreaView className="flex h-full w-full items-center justify-center">
      <SignedOut>
        <SignInWithOAuth />
      </SignedOut>
      <SignedIn>
        <View className="flex items-center gap-4">
          <Text onPress={() => Linking.openURL("https://www.soonlist.com")}>
            soonlist.com
          </Text>
          <Logo />
          <Text>Share a screenshot or image to Soonlist...</Text>
          <Link href="/events">View Events</Link>
        </View>
        <SignOut />
      </SignedIn>
    </SafeAreaView>
  );
}
