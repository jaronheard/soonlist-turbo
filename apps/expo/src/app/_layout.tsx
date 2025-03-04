import { Platform, Text, View } from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Stack, useNavigationContainerRef } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { ClerkLoaded, ClerkProvider } from "@clerk/clerk-expo";
import * as Sentry from "@sentry/react-native";
import { PostHogProvider } from "posthog-react-native";

import { useAppStateRefresh } from "~/hooks/useAppStateRefresh";
import { OneSignalProvider } from "~/providers/OneSignalProvider";
import { RevenueCatProvider } from "~/providers/RevenueCatProvider";
import { TRPCProvider } from "~/utils/api";

import "../styles.css";

import type { ErrorBoundaryProps } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import Constants, { AppOwnership } from "expo-constants";
import { Toaster } from "sonner-native";

import AuthAndTokenSync from "~/components/AuthAndTokenSync";
import { CalendarSelectionModal } from "~/components/CalendarSelectionModal";
import { useCalendar } from "~/hooks/useCalendar";
import { useIntentHandler } from "~/hooks/useIntentHandler";
import { useMediaPermissions } from "~/hooks/useMediaPermissions";
import { useOTAUpdates } from "~/hooks/useOTAUpdates";
import { useAppStore } from "~/store";
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

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

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
  clearToken: (key: string) => {
    return SecureStore.deleteItemAsync(key, {
      keychainAccessGroup: getKeyChainAccessGroup(),
    });
  },
};

const routingInstrumentation = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: Constants.appOwnership !== AppOwnership.Expo, // Only in native builds, not in Expo Go.
});

Sentry.init({
  dsn: "https://35d541c34f3a87134429ac75e6513a16@o4503934125998080.ingest.us.sentry.io/4506458761396224",
  integrations: [routingInstrumentation, Sentry.httpClientIntegration()],
  attachStacktrace: true,
  debug: false,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  sendDefaultPii: true,
  _experiments: {
    replaysSessionSampleRate: 1.0,
    replaysOnErrorSampleRate: 1.0,
  },
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

  const isDev = Constants.expoConfig?.scheme === "soonlist.dev";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <ClerkProvider
          publishableKey={clerkPublishableKey}
          tokenCache={tokenCache}
        >
          <ClerkLoaded>
            <TRPCProvider>
              <SafeAreaProvider>
                <PostHogProvider
                  apiKey={Config.posthogApiKey}
                  options={{
                    host: "https://us.i.posthog.com",
                    disabled: isDev,
                    enableSessionReplay: !isDev,
                    sessionReplayConfig: {
                      maskAllTextInputs: false,
                      maskAllImages: false,
                      captureLog: false,
                      captureNetworkTelemetry: true,
                      androidDebouncerDelayMs: 500,
                      iOSdebouncerDelayMs: 1000,
                    },
                  }}
                >
                  <OneSignalProvider>
                    <RevenueCatProvider>
                      <RootLayoutContent />
                    </RevenueCatProvider>
                  </OneSignalProvider>
                </PostHogProvider>
              </SafeAreaProvider>
            </TRPCProvider>
          </ClerkLoaded>
        </ClerkProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

const InitialLayout = () => {
  useOTAUpdates();
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
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(auth)"
        options={{
          headerShown: false,
          headerRight: undefined,
        }}
      />
      <Stack.Screen
        name="(onboarding)"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="event/[id]/index"
        options={{
          title: "Event Details",
          headerShown: true,
          headerBackTitle: "Back",
          headerBackVisible: true,
        }}
      />
      <Stack.Screen
        name="event/[id]/qr"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      {/* SHARE EXTENSION ROUTE */}
      <Stack.Screen
        name="new"
        options={{
          presentation: "modal",
          headerShown: true,
        }}
      />
      {/* REGULAR ADD ROUTE */}
      <Stack.Screen
        name="add"
        options={{
          presentation: "modal",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="redirect"
        options={{
          headerShown: false,
          presentation: "containedModal",
        }}
      />
      <Stack.Screen
        name="onboarding/demo-capture"
        options={{
          presentation: "modal",
          headerShown: true,
        }}
      />
    </Stack>
  );
};

function RootLayoutContent() {
  const { handleCalendarSelect, INITIAL_CALENDAR_LIMIT } = useCalendar();
  const { setIsCalendarModalVisible } = useAppStore();
  useAppStateRefresh();
  useMediaPermissions();
  const ref = useNavigationContainerRef();

  useEffect(() => {
    routingInstrumentation.registerNavigationContainer(ref);
  }, [ref]);

  // The share extension logic now specifically leads to /new
  useIntentHandler();

  return (
    <View style={{ flex: 1 }}>
      <AuthAndTokenSync />
      <InitialLayout />
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
      <CalendarSelectionModal
        onSelect={handleCalendarSelect}
        onDismiss={() => setIsCalendarModalVisible(false)}
        initialLimit={INITIAL_CALENDAR_LIMIT}
      />
      <Toaster position="top-center" offset={100} visibleToasts={1} />
    </View>
  );
}
