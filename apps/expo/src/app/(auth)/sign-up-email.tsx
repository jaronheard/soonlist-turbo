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
import { useSignUp } from "@clerk/clerk-expo";

import { Logo } from "../../components/Logo";

export default function SignUpScreen() {
  const { isLoaded, signUp } = useSignUp();
  const router = useRouter();

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [username, setUsername] = React.useState("");

  const scrollViewRef = React.useRef<ScrollView>(null);
  const lastNameRef = React.useRef<TextInput>(null);
  const usernameRef = React.useRef<TextInput>(null);
  const emailRef = React.useRef<TextInput>(null);
  const passwordRef = React.useRef<TextInput>(null);

  const focusNextField = (nextField: React.RefObject<TextInput>) => {
    nextField.current?.focus();
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

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
      router.push("/verify-email");
    } catch (err) {
      console.error("Error during sign up:", err);
    }
  };

  const navigateToSignIn = () => {
    router.push("/sign-in-email");
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
          headerTitle: "Sign Up",
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
              Create Account
            </Text>
            <Text className="mb-8 text-center text-lg text-gray-500">
              Sign up for your Soonlist account
            </Text>
            <View className="mb-4 w-full flex-row gap-4">
              <View className="flex-1">
                <Text className="mb-1 text-sm font-medium text-gray-700">
                  First Name
                </Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
                  returnKeyType="next"
                  onSubmitEditing={() => focusNextField(lastNameRef)}
                  blurOnSubmit={false}
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-sm font-medium text-gray-700">
                  Last Name
                </Text>
                <TextInput
                  ref={lastNameRef}
                  value={lastName}
                  onChangeText={setLastName}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
                  returnKeyType="next"
                  onSubmitEditing={() => focusNextField(usernameRef)}
                  blurOnSubmit={false}
                />
              </View>
            </View>
            <View className="mb-4 w-full">
              <Text className="mb-1 text-sm font-medium text-gray-700">
                Username
              </Text>
              <TextInput
                ref={usernameRef}
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
                returnKeyType="next"
                onSubmitEditing={() => focusNextField(emailRef)}
                blurOnSubmit={false}
              />
              <Text className="mt-1 text-sm text-gray-500">
                On Instagram? Consider using the same username
              </Text>
            </View>
            <View className="mb-4 w-full">
              <Text className="mb-1 text-sm font-medium text-gray-700">
                Email
              </Text>
              <TextInput
                ref={emailRef}
                autoCapitalize="none"
                value={emailAddress}
                onChangeText={setEmailAddress}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
                returnKeyType="next"
                onSubmitEditing={() => focusNextField(passwordRef)}
                blurOnSubmit={false}
                keyboardType="email-address"
              />
            </View>
            <View className="mb-6 w-full">
              <Text className="mb-1 text-sm font-medium text-gray-700">
                Password
              </Text>
              <TextInput
                ref={passwordRef}
                value={password}
                secureTextEntry={true}
                onChangeText={setPassword}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
                returnKeyType="done"
                onSubmitEditing={onSignUpPress}
              />
            </View>
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
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
