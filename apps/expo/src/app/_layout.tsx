import { Platform, StyleSheet, Text, View } from "react-native";
import appsFlyer from "react-native-appsflyer";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack, useNavigationContainerRef } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { resourceCache } from "@clerk/clerk-expo/resource-cache";
import * as Sentry from "@sentry/react-native";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { PostHogProvider } from "posthog-react-native";

import { convex } from "~/lib/convex";
import { OneSignalProvider } from "~/providers/OneSignalProvider";
import { RevenueCatProvider } from "~/providers/RevenueCatProvider";

import "../styles.css";

import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import Constants, { AppOwnership } from "expo-constants";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner-native";

import AuthAndTokenSync from "~/components/AuthAndTokenSync";
import { PostHogIdentityTracker } from "~/components/PostHogIdentityTracker";
import { useMediaPermissions } from "~/hooks/useMediaPermissions";
import { useOTAUpdates } from "~/hooks/useOTAUpdates";
import { useTimezoneAlert } from "~/hooks/useTimezoneAlert";
import { useAppStore } from "~/store";
import Config from "~/utils/config";
import { getUserTimeZone } from "~/utils/dates";
import { logDebug, logError } from "~/utils/errorLogging";
import { getAccessGroup } from "~/utils/getAccessGroup";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

const queryClient = new QueryClient();

// Export Expo Router's default error boundary
export { ErrorBoundary } from "expo-router";

// This adds accessGroup support to Clerk's token cache: https://github.com/clerk/javascript/blob/main/packages/expo/src/token-cache/index.ts
const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key, {
        accessGroup: getAccessGroup(),
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value, {
        accessGroup: getAccessGroup(),
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    } catch {
      return;
    }
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

appsFlyer.initSdk(
  {
    devKey: "iFvNVjfmj4DyJ6itc3KTkf",
    isDebug: __DEV__,
    appId: "6670222216",
    onInstallConversionDataListener: true, //Optional
    onDeepLinkListener: true, //Optional
    timeToWaitForATTUserAuthorization: 10,
  },
  (result) => {
    logDebug("AppsFlyerSDK initialization result", result);
  },
  (error) => {
    logError("AppsFlyerSDK initialization error", error);
  },
);

function RootLayout() {
  const clerkPublishableKey = Config.clerkPublishableKey;
  const { setUserTimezone } = useAppStore();

  useEffect(() => {
    // Initialize user timezone on app start
    setUserTimezone(getUserTimeZone());
  }, [setUserTimezone]);

  if (!clerkPublishableKey) {
    return (
      <View style={styles.container}>
        <Text>Missing Clerk Publishable Key</Text>
      </View>
    );
  }

  const isDev = Constants.expoConfig?.scheme === "soonlist.dev";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <ClerkProvider
          publishableKey={clerkPublishableKey}
          tokenCache={tokenCache}
          __experimental_resourceCache={resourceCache}
        >
          {/* eslint-disable-next-line react-compiler/react-compiler */}
          <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            <QueryClientProvider client={queryClient}>
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
                  <PostHogIdentityTracker />
                  <OneSignalProvider>
                    <RevenueCatProvider>
                      <AuthAndTokenSync />
                      <RootLayoutContent />
                    </RevenueCatProvider>
                  </OneSignalProvider>
                </PostHogProvider>
              </SafeAreaProvider>
            </QueryClientProvider>
          </ConvexProviderWithClerk>
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
          // Note: headerLeft is conditionally set in the component based on canGoBack
        }}
      />
      <Stack.Screen
        name="event/[id]/qr"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="event/[id]/edit"
        options={{
          presentation: "modal",
          title: "Edit Event",
        }}
      />
      <Stack.Screen
        name="batch/[batchId]/index"
        options={{
          title: "Recently Added",
          headerShown: true,
          headerBackTitle: "Back",
          headerBackVisible: true,
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
    </Stack>
  );
};

function RootLayoutContent() {
  useMediaPermissions();
  const ref = useNavigationContainerRef();

  useEffect(() => {
    routingInstrumentation.registerNavigationContainer(ref);
  }, [ref]);

  useTimezoneAlert();

  return (
    <View style={{ flex: 1 }}>
      <InitialLayout />
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
      <Toaster
        position="top-center"
        offset={100}
        visibleToasts={1}
        toastOptions={{
          style: {
            borderRadius: 16,
          },
        }}
      />
    </View>
  );
}
