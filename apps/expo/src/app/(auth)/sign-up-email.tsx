import * as React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";

import { Logo } from "../../components/Logo";

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [code, setCode] = React.useState("");

  const onSignUpPress = async () => {
    if (!isLoaded) return;

    try {
      await signUp.create({
        firstName,
        lastName,
        emailAddress,
        password,
        username,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      setPendingVerification(true);
    } catch (err) {
      console.error("Error during sign up:", err);
    }
  };

  const onPressVerify = async () => {
    if (!isLoaded) return;

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        router.replace("/feed");
      } else {
        console.error("Verification failed:", completeSignUp);
      }
    } catch (err) {
      console.error("Error during verification:", err);
    }
  };

  const navigateToSignIn = () => {
    router.push("/sign-in-email");
  };

  if (!isLoaded) {
    return <Text>Loading...</Text>;
  }

  return (
    <View className="flex-1 bg-interactive-3 px-6 pt-14">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="items-center pt-8">
        <Logo className="h-12 w-48" />
      </View>
      <View className="flex-1 items-center justify-center">
        <Text className="mb-4 text-center font-heading text-5xl font-bold text-gray-700">
          Join <Text className="text-interactive-1">Soonlist</Text>
        </Text>
        <Text className="mb-8 text-center text-xl text-gray-500">
          Create your account to start organizing events.
        </Text>
        {!pendingVerification ? (
          <>
            <TextInput
              value={firstName}
              placeholder="First Name"
              onChangeText={setFirstName}
              className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
            />
            <TextInput
              value={lastName}
              placeholder="Last Name"
              onChangeText={setLastName}
              className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
            />
            <TextInput
              autoCapitalize="none"
              value={emailAddress}
              placeholder="Email"
              onChangeText={setEmailAddress}
              className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
            />
            <TextInput
              value={password}
              placeholder="Password"
              secureTextEntry={true}
              onChangeText={setPassword}
              className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
            />
            <TextInput
              value={username}
              placeholder="Username"
              onChangeText={setUsername}
              autoCapitalize="none"
              className="mb-6 w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
            />
            <Pressable
              onPress={onSignUpPress}
              className="w-full rounded-full bg-interactive-1 px-6 py-3"
            >
              <Text className="text-center text-lg font-bold text-white">
                Sign Up
              </Text>
            </Pressable>
            <Pressable onPress={navigateToSignIn} className="mt-4">
              <Text className="text-center text-gray-600">
                Already have an account?{" "}
                <Text className="font-bold text-interactive-1">Sign In</Text>
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text className="mb-4 text-center text-2xl font-bold">
              Verify Your Email
            </Text>
            <Text className="mb-4 text-center text-gray-600">
              We've sent a verification code to your email. Please enter it
              below.
            </Text>
            <TextInput
              value={code}
              placeholder="Verification Code"
              onChangeText={setCode}
              className="mb-6 w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
            />
            <Pressable
              onPress={onPressVerify}
              className="w-full rounded-full bg-interactive-1 px-6 py-3"
            >
              <Text className="text-center text-lg font-bold text-white">
                Verify Email
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
