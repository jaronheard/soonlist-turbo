import * as React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSignIn } from "@clerk/clerk-expo";

import { Logo } from "../../components/Logo";

export default function SignInScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");

  const scrollViewRef = React.useRef<ScrollView>(null);
  const emailRef = React.useRef<TextInput>(null);
  const passwordRef = React.useRef<TextInput>(null);

  const focusNextField = (nextField: React.RefObject<TextInput>) => {
    nextField.current?.focus();
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const onSignInPress = async () => {
    if (!isLoaded) return;

    try {
      const completeSignIn = await signIn.create({
        identifier: emailAddress,
        password,
      });

      await setActive({ session: completeSignIn.createdSessionId });
      router.replace("/feed");
    } catch (err) {
      console.error("Error during sign in:", err);
    }
  };

  const navigateToSignUp = () => {
    router.push("/sign-up-email");
  };

  if (!isLoaded) {
    return <Text>Loading...</Text>;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-interactive-3"
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Sign In",
          headerBackTitle: "Back",
          headerBackTitleVisible: true,
        }}
      />
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-between px-6">
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
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
