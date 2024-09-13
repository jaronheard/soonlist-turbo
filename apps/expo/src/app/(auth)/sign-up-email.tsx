import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";

const SignUpEmail = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const { signUp } = useSignUp();
  const router = useRouter();

  const handleEmailSignUp = async () => {
    if (!signUp) return;
    try {
      setIsSigningUp(true);
      const result = await signUp.create({
        emailAddress: email,
        password,
      });

      await result.prepareEmailAddressVerification({ strategy: "email_code" });

      // Navigate to verification screen
      router.push("/verify-email");
    } catch (err) {
      console.error("Email sign-up error:", err);
      // Handle error (show error message to user)
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <View className="flex-1 bg-white p-4">
      <Stack.Screen options={{ title: "Sign Up with Email" }} />
      <Text className="mb-4 text-2xl font-bold">Create your account</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        className="mb-4 rounded-lg border border-gray-300 bg-white px-4 py-3"
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        className="mb-6 rounded-lg border border-gray-300 bg-white px-4 py-3"
      />
      <Pressable
        onPress={handleEmailSignUp}
        disabled={isSigningUp}
        className="rounded-full bg-interactive-1 px-6 py-3"
      >
        <Text className="text-center text-lg font-bold text-white">
          {isSigningUp ? "Signing Up..." : "Sign Up"}
        </Text>
      </Pressable>
    </View>
  );
};

export default SignUpEmail;
