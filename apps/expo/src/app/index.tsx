import { Redirect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

export { ErrorBoundary } from "expo-router";

export default function Index() {
  const { isLoaded } = useUser();

  if (!isLoaded) {
    return null;
  }

  return <Redirect href="/(tabs)/feed" />;
}
