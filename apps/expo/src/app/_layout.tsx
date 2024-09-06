import { Text, View } from "react-native";
import { MenuProvider } from "react-native-popup-menu";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  Slot,
  Stack,
  useNavigationContainerRef,
  useRouter,
  useSegments,
} from "expo-router";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/clerk-expo";
import * as Sentry from "@sentry/react-native";

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
import { Toast } from "~/components/Toast";
import Config from "~/utils/config";

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-red-500 px-4 py-6">
      <View style={{ paddingTop: insets.top }} />
      <Text className="mb-4 text-lg font-semibold text-white">
        {error.message}
      </Text>
      <Text className="text-base text-white underline" onPress={retry}>
        Try Again
      </Text>
      <Text className="mt-4 text-sm text-white">
        Shake your device to open JS debugger for more details.
      </Text>
      <View style={{ paddingBottom: insets.bottom }} />
    </View>
  );
}

const getKeychainAccessGroup = () => {
  return Config.env === "development"
    ? "group.com.soonlist.dev"
    : "group.com.soonlist";
};

const tokenCache = {
  getToken: async (key: string) => {
    return await SecureStore.getItemAsync(key, {
      keychainAccessGroup: getKeychainAccessGroup(),
    });
  },
  saveToken: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value, {
      keychainAccessGroup: getKeychainAccessGroup(),
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
  const clerkPublishableKey = Config.clerkPublishableKey;

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

const InitialLayout = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // If the user is signed in, redirect them to the home page
  // If the user is not signed in, redirect them to the login page
  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (isSignedIn && inAuthGroup) {
      router.replace("/feed");
    } else if (!isSignedIn) {
      router.replace("/sign-in");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: true }} />
      <Stack.Screen
        name="event/[id]"
        options={{
          headerShown: true,
          headerBackTitle: "Back",
          headerBackVisible: true,
        }}
      />
    </Stack>
  );
};

function RootLayoutContent() {
  const { expoPushToken } = useNotification();
  useAppStateRefresh();
  const ref = useNavigationContainerRef();

  useEffect(() => {
    routingInstrumentation.registerNavigationContainer(ref);
  }, [ref]);

  return (
    <View style={{ flex: 1 }}>
      <AuthAndTokenSync expoPushToken={expoPushToken} />
      <InitialLayout />
      <Toast />
      <StatusBar />
    </View>
  );
}
