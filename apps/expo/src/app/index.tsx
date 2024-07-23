import { SafeAreaView, Text } from "react-native";
import { SignedIn, SignedOut } from "@clerk/clerk-expo";

import SignInWithOAuth from "../components/SignInWithOAuth";

import "../styles.css";

import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";

import Events from "../components/Events";

Sentry.init({
  dsn: "https://35d541c34f3a87134429ac75e6513a16@o4503934125998080.ingest.us.sentry.io/4506458761396224",
});

function App() {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const clerkPublishableKey = Constants.expoConfig?.extra
    ?.clerkPublishableKey as string | undefined;

  if (!clerkPublishableKey) {
    console.log(Constants.expoConfig);
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <Text className="mt-5 text-red-500">
          No Clerk Publishable Key found. Please check your environment.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SignedOut>
        <SignInWithOAuth />
      </SignedOut>
      <SignedIn>
        <Events />
      </SignedIn>
    </>
  );
}

export default Sentry.wrap(App);
