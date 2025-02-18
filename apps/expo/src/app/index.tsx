import { Redirect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

export default function Index() {
  const { isLoaded } = useUser();

  if (!isLoaded) {
    return null;
  }

  return <Redirect href="/(tabs)/feed" />;
}
