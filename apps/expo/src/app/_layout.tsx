import { Text, View } from "react-native";
import { MenuProvider } from "react-native-popup-menu";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  Stack,
  useNavigationContainerRef,
  useRootNavigationState,
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
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Constants, { AppOwnership } from "expo-constants";
import { BottomSheetModalProvider } from "@discord/bottom-sheet";

import AuthAndTokenSync from "~/components/AuthAndTokenSync";
import { Toast } from "~/components/Toast";
import { useIntentHandler } from "~/hooks/useIntentHandler";
import Config from "~/utils/config";
import { getKeyChainAccessGroup } from "~/utils/getKeyChainAccessGroup";

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

const tokenCache = {
  getToken: async (key: string) => {
    return await SecureStore.getItemAsync(key, {
      keychainAccessGroup: getKeyChainAccessGroup(),
    });
  },
  saveToken: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value, {
      keychainAccessGroup: getKeyChainAccessGroup(),
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider
        publishableKey={clerkPublishableKey}
        tokenCache={tokenCache}
      >
        <ClerkLoaded>
          <TRPCProvider>
            <NotificationProvider>
              <SafeAreaProvider>
                <MenuProvider>
                  <BottomSheetModalProvider>
                    <RootLayoutContent />
                  </BottomSheetModalProvider>
                </MenuProvider>
              </SafeAreaProvider>
            </NotificationProvider>
          </TRPCProvider>
        </ClerkLoaded>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

const InitialLayout = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  useIntentHandler();

  useEffect(() => {
    if (!isLoaded || !rootNavigationState.key) return;

    const inAuthGroup = segments[0] === "(auth)";

    const checkAuthAndOnboarding = async () => {
      if (isSignedIn && inAuthGroup) {
        const hasCompletedOnboarding = await SecureStore.getItemAsync(
          "hasCompletedOnboarding",
          { keychainAccessGroup: getKeyChainAccessGroup() },
        );

        if (hasCompletedOnboarding === "true") {
          router.replace("/feed");
        } else {
          router.replace("/onboarding");
        }
      } else if (!isSignedIn && !inAuthGroup) {
        router.replace("/sign-in");
      }
    };

    const handleIntentRedirect = async () => {
      if (isSignedIn) {
        const intentType = await SecureStore.getItemAsync("intentType", {
          keychainAccessGroup: getKeyChainAccessGroup(),
        });
        if (intentType === "new") {
          //
          router.replace("/feed"); // Adjust this route as needed
        }
        // Clear the intent type after handling
        await SecureStore.deleteItemAsync("intentType", {
          keychainAccessGroup: getKeyChainAccessGroup(),
        });
      }
    };

    void checkAuthAndOnboarding();
    void handleIntentRedirect();
  }, [isSignedIn, rootNavigationState.key, router, segments, isLoaded]);

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#5A32FB",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
          headerRight: undefined,
        }}
      />
      <Stack.Screen
        name="event/[id]"
        options={{
          title: "Event Details",
          headerShown: true,
          headerBackTitle: "Back",
          headerBackVisible: true,
        }}
      />
      {/* Add this new Stack.Screen for the modal group */}
      <Stack.Screen
        name="(modals)/intent/new"
        options={{
          presentation: "modal",
          headerShown: false,
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
