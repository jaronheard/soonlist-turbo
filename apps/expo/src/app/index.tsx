import React, { useEffect } from "react";
import { Image, Linking, SafeAreaView, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import { SignedIn, SignedOut } from "@clerk/clerk-expo";

import SignInWithOAuth from "~/components/SignInWithOAuth";
import { SignOut } from "~/components/SignOut";

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
          <Image
            className="h-24 w-24"
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            source={require("../../assets/icon.png")}
          />
          <Text>Share a screenshot or image to Soonlist...</Text>
          <Link href="/events">View Events</Link>
        </View>
        <SignOut />
      </SignedIn>
    </SafeAreaView>
  );
}
