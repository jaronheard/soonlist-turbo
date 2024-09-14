import * as React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Stack, useRouter } from "expo-router";
import { useSignIn } from "@clerk/clerk-expo";

import { Logo } from "../../components/Logo";

export default function SignInScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [emailError, setEmailError] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");
  const [generalError, setGeneralError] = React.useState("");

  const emailRef = React.useRef<TextInput>(null);
  const passwordRef = React.useRef<TextInput>(null);

  const focusNextField = (nextField: React.RefObject<TextInput>) => {
    nextField.current?.focus();
  };

  const validateForm = () => {
    let isValid = true;
    setEmailError("");
    setPasswordError("");
    setGeneralError("");

    if (!emailAddress) {
      setEmailError("Email is required");
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(emailAddress)) {
      setEmailError("Invalid email format");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    }

    return isValid;
  };

  const onSignInPress = async () => {
    if (!isLoaded) return;

    if (!validateForm()) return;

    try {
      const completeSignIn = await signIn.create({
        identifier: emailAddress,
        password,
      });

      await setActive({ session: completeSignIn.createdSessionId });
      router.replace("/feed");
    } catch (err: unknown) {
      console.error("Error during sign in:", err);
      if (err instanceof Error) {
        setGeneralError(err.message);
      } else {
        setGeneralError("An error occurred during sign in");
      }
    }
  };

  const navigateToSignUp = () => {
    router.push("/sign-up-email");
  };

  if (!isLoaded) {
    return <Text>Loading...</Text>;
  }

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      enableAutomaticScroll={true}
      extraScrollHeight={150}
      enableOnAndroid={true}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Sign In",
          headerBackTitle: "Back",
          headerBackTitleVisible: true,
        }}
      />
      <View className="flex-1 bg-interactive-3 px-6">
        <View className="items-center pt-8">
          <Logo className="h-12 w-48" />
        </View>
        <View className="items-center justify-center py-8">
          <Text className="mb-4 text-center font-heading text-4xl font-bold text-gray-700">
            Welcome Back
          </Text>
          <Text className="mb-8 text-center text-lg text-gray-500">
            Sign in to your Soonlist account
          </Text>
          <TextInput
            ref={emailRef}
            autoCapitalize="none"
            value={emailAddress}
            placeholder="Email"
            onChangeText={setEmailAddress}
            className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
            returnKeyType="next"
            onSubmitEditing={() => focusNextField(passwordRef)}
            blurOnSubmit={false}
            keyboardType="email-address"
          />
          {emailError ? (
            <Text className="mt-1 text-red-500">{emailError}</Text>
          ) : null}
          <TextInput
            ref={passwordRef}
            value={password}
            placeholder="Password"
            secureTextEntry={true}
            onChangeText={setPassword}
            className="mb-6 w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
            returnKeyType="done"
            onSubmitEditing={onSignInPress}
          />
          {passwordError ? (
            <Text className="mt-1 text-red-500">{passwordError}</Text>
          ) : null}
          <Pressable
            onPress={onSignInPress}
            className="w-full rounded-full bg-interactive-1 px-6 py-3"
          >
            <Text className="text-center text-lg font-bold text-white">
              Sign In
            </Text>
          </Pressable>
          <Pressable onPress={navigateToSignUp} className="mt-4">
            <Text className="text-center text-gray-600">
              Don't have an account?{" "}
              <Text className="font-bold text-interactive-1">Sign Up</Text>
            </Text>
          </Pressable>
          {generalError ? (
            <Text className="mb-4 text-center text-red-500">
              {generalError}
            </Text>
          ) : null}
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
}
