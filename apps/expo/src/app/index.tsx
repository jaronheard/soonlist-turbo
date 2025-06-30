import { Redirect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

export default function Index() {
  const { isLoaded } = useUser();

  if (!isLoaded) {
    return null;
  }

  // Always go to feed, which will handle auth check and redirect to onboarding if needed
  return <Redirect href="/(tabs)/feed" />;
}
