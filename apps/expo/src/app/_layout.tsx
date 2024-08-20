import { Text, View } from "react-native";
import { MenuProvider } from "react-native-popup-menu";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Redirect, Slot, Stack, useNavigationContainerRef } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import {
  ClerkLoaded,
  ClerkProvider,
  SignedIn,
  SignedOut,
} from "@clerk/clerk-expo";
import * as Sentry from "@sentry/react-native";
import { useColorScheme } from "nativewind";

import { useAppStateRefresh } from "~/hooks/useAppStateRefresh";
import {
  NotificationProvider,
  useNotification,
} from "~/providers/NotificationProvider";
import { TRPCProvider } from "~/utils/api";

import "../styles.css";

import type { ErrorBoundaryProps } from "expo-router";
import { useEffect } from "react";
import Constants, { AppOwnership } from "expo-constants";

import AuthAndTokenSync from "~/components/AuthAndTokenSync";
import BottomBar from "~/components/BottomBar";
import { Toast } from "~/components/Toast";

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, backgroundColor: "red" }}>
      <Text>{error.message}</Text>
      <Text onPress={retry}>Try Again?</Text>
    </View>
  );
}

const tokenCache = {
  getToken: async (key: string) => {
    return await SecureStore.getItemAsync(key, {
      keychainAccessGroup: "group.com.soonlist",
    });
  },
  saveToken: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value, {
      keychainAccessGroup: "group.com.soonlist",
    });
  },
};

const routingInstrumentation = new Sentry.ReactNavigationInstrumentation({
  enableTimeToInitialDisplay: Constants.appOwnership !== AppOwnership.Expo, // Only in native builds, not in Expo Go.
});

Sentry.init({
  dsn: "https://35d541c34f3a87134429ac75e6513a16@o4503934125998080.ingest.us.sentry.io/4506458761396224",
  integrations: [
    new Sentry.ReactNativeTracing({
      routingInstrumentation,
      enableUserInteractionTracing: true,
      enableNativeFramesTracking: Constants.appOwnership !== AppOwnership.Expo, // Only in native builds, not in Expo Go.
    }),
  ],
  attachStacktrace: true,
  debug: process.env.NODE_ENV !== "production",
});

function RootLayout() {
  const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!clerkPublishableKey) {
    return (
      <Text>
        No Clerk Publishable Key found. Please check your environment.
      </Text>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <TRPCProvider>
          <NotificationProvider>
            <SafeAreaProvider>
              <MenuProvider>
                <RootLayoutContent />
              </MenuProvider>
            </SafeAreaProvider>
          </NotificationProvider>
        </TRPCProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

export default Sentry.wrap(RootLayout);

function RootLayoutContent() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const { expoPushToken } = useNotification();
  useAppStateRefresh();
  const ref = useNavigationContainerRef();

  useEffect(() => {
    routingInstrumentation.registerNavigationContainer(ref);
  }, [ref]);

  return (
    <View style={{ flex: 1 }}>
      <AuthAndTokenSync expoPushToken={expoPushToken} />
      <SignedOut>
        <Slot />
      </SignedOut>
      <SignedIn>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: "#E0D9FF",
            },
            headerTintColor: "#5A32FB",
            contentStyle: {
              backgroundColor: colorScheme == "dark" ? "#09090B" : "#FFFFFF",
            },
            headerTitleStyle: {
              fontWeight: "bold",
            },
            headerBackTitleVisible: false,
          }}
        />
        <View style={{ paddingBottom: insets.bottom + 36 }} />
        <BottomBar expoPushToken={expoPushToken} />
      </SignedIn>
      <Toast />
      <StatusBar />
    </View>
  );
}
