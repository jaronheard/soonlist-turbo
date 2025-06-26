import { Redirect } from "expo-router";

export default function OnboardingIndex() {

  // Everyone starts from the welcome screen
  return <Redirect href="/(onboarding)/onboarding/00-welcome" />;
}