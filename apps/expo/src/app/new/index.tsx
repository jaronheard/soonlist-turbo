import { Text } from "react-native";
import { Link } from "expo-router";
import { SignedIn, SignedOut } from "@clerk/clerk-expo";

import SignInWithOAuth from "~/components/SignInWithOAuth";

export default function Page() {
  return (
    <>
      <SignedOut>
        <SignInWithOAuth />
      </SignedOut>
      <SignedIn>
        <Text>/new page</Text>
        <Link href="/new/preview">Preview</Link>
      </SignedIn>
    </>
  );
}
