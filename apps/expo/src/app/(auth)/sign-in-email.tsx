import * as React from "react";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Stack, useRouter } from "expo-router";
import { useSignIn } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePostHog } from "posthog-react-native";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Logo } from "../../components/Logo";

const signInSchema = z.object({
  emailAddress: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

type SignInFormData = z.infer<typeof signInSchema>;

export default function SignInScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const posthog = usePostHog();
  const [generalError, setGeneralError] = React.useState("");

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      emailAddress: "",
      password: "",
    },
  });

  const onSignInPress = async (data: SignInFormData) => {
    if (!isLoaded) return;

    try {
      const completeSignIn = await signIn.create({
        identifier: data.emailAddress,
        password: data.password,
      });
      posthog.identify(data.emailAddress, {
        email: data.emailAddress,
      });
      await setActive({ session: completeSignIn.createdSessionId });
    } catch (err: unknown) {
      console.error("Error during sign in:", err);
      setGeneralError(
        err instanceof Error ? err.message : "An error occurred during sign in",
      );
    }
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
          headerTitle: "Sign in",
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

          {generalError ? (
            <Text className="mb-4 text-center text-red-500">
              {generalError}
            </Text>
          ) : null}

          <View className="mb-4 w-full">
            <Controller
              control={control}
              name="emailAddress"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  defaultValue={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Email"
                  className="mb-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
                  returnKeyType="next"
                  keyboardType="email-address"
                />
              )}
            />
            {errors.emailAddress && (
              <Text className="text-red-500">
                {errors.emailAddress.message}
              </Text>
            )}
          </View>

          <View className="mb-6 w-full">
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  autoComplete="password"
                  autoCorrect={false}
                  autoCapitalize="none"
                  defaultValue={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Password"
                  secureTextEntry={true}
                  className="mb-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit(onSignInPress)}
                />
              )}
            />
            {errors.password && (
              <Text className="text-red-500">{errors.password.message}</Text>
            )}
          </View>

          <Pressable
            onPress={handleSubmit(onSignInPress)}
            className="w-full rounded-full bg-interactive-1 px-6 py-3"
          >
            <Text className="text-center text-lg font-bold text-white">
              Sign in
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/sign-up-email")}
            className="mt-4"
          >
            <Text className="text-center text-gray-600">
              Don't have an account?{" "}
              <Text className="font-bold text-interactive-1">Sign Up</Text>
            </Text>
          </Pressable>
        </View>
        <Text className="mt-6 text-center text-sm text-gray-500">
          Having trouble signing in?{" "}
          <Text
            className="text-interactive-1"
            onPress={() => Linking.openURL("mailto:jaron@soonlist.com")}
          >
            Email us
          </Text>{" "}
          for support.
        </Text>
      </View>
    </KeyboardAwareScrollView>
  );
}
