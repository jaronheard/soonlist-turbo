import { StyleSheet, Text, View } from "react-native";
import appsFlyer from "react-native-appsflyer";
import {
  Stack,
  useGlobalSearchParams,
  useNavigationContainerRef,
  usePathname,
} from "expo-router";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { resourceCache } from "@clerk/clerk-expo/resource-cache";
import * as Sentry from "@sentry/react-native";
import { useConvexAuth } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { PostHogProvider, usePostHog } from "posthog-react-native";

import { convex } from "~/lib/convex";
import { OneSignalProvider } from "~/providers/OneSignalProvider";
import { RevenueCatProvider } from "~/providers/RevenueCatProvider";

import "../styles.css";

import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { NotifierWrapper } from "react-native-notifier";
import Constants, { AppOwnership } from "expo-constants";
import { Kalam_700Bold, useFonts } from "@expo-google-fonts/kalam";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AuthAndTokenSync from "~/components/AuthAndTokenSync";
import { ForceUpdateScreen } from "~/components/ForceUpdateScreen";
import { PostHogIdentityTracker } from "~/components/PostHogIdentityTracker";
import { ToastProvider } from "~/components/Toast";
import { useAppsFlyerDeepLink } from "~/hooks/useAppsFlyerDeepLink";
import { useCaptureCompletionFeedback } from "~/hooks/useCaptureCompletionFeedback";
import { useForceUpdate } from "~/hooks/useForceUpdate";
import { useOTAUpdates } from "~/hooks/useOTAUpdates";
import { usePendingFollow } from "~/hooks/usePendingFollow";
import { useQuickActions } from "~/hooks/useQuickActions";
import { useTimezoneAlert } from "~/hooks/useTimezoneAlert";
import { useAppStore } from "~/store";
import Config from "~/utils/config";
import { getUserTimeZone } from "~/utils/dates";
import { logDebug, logError } from "~/utils/errorLogging";
import { getAccessGroup } from "~/utils/getAccessGroup";
import { HEADER_BLUR_EFFECT } from "~/utils/headerOptions";

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

// Anchor modals to tabs so deep links show the modal over the feed
// See: https://docs.expo.dev/router/advanced/modals/#handle-deep-linked-modals
export const unstable_settings = {
  anchor: "(tabs)",
};

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
  integrations: [
    routingInstrumentation,
    Sentry.httpClientIntegration(),
    // Mobile replay disabled - causes significant scroll jank on iOS
    // Sentry.mobileReplayIntegration(),
  ],
  attachStacktrace: true,
  debug: false,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  sendDefaultPii: true,
  // Session replay disabled since mobileReplayIntegration causes scroll jank
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
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
  (result: Record<string, unknown>) => {
    logDebug("AppsFlyerSDK initialization result", result);
  },
  (error: Error) => {
    logError("AppsFlyerSDK initialization error", error);
  },
);

function RootLayout() {
  const [fontsLoaded] = useFonts({ Kalam_700Bold });
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

  // Wait for fonts to load to avoid flash of unstyled text. The Kalam font
  // is used in the app shell so we block the initial render until it's ready.
  if (!fontsLoaded) {
    return <View style={{ flex: 1 }} />;
  }

  const isDev = Constants.expoConfig?.scheme === "soonlist.dev";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NotifierWrapper>
        <KeyboardProvider>
          <ClerkProvider
            publishableKey={clerkPublishableKey}
            tokenCache={tokenCache}
            __experimental_resourceCache={resourceCache}
          >
            {/* eslint-disable-next-line react-compiler/react-compiler */}
            <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
              <QueryClientProvider client={queryClient}>
                <PostHogProvider
                  apiKey={Config.posthogApiKey}
                  options={{
                    host: "https://us.i.posthog.com",
                    disabled: isDev,
                    // Session replay disabled — causes scroll jank on iOS
                    // list views (same symptom class as Sentry's
                    // mobileReplayIntegration, disabled above).
                    enableSessionReplay: false,
                  }}
                >
                  <PostHogIdentityTracker />
                  <OneSignalProvider>
                    <RevenueCatProvider>
                      <AuthAndTokenSync />
                      <ToastProvider>
                        <RootLayoutContent />
                      </ToastProvider>
                    </RevenueCatProvider>
                  </OneSignalProvider>
                </PostHogProvider>
              </QueryClientProvider>
            </ConvexProviderWithClerk>
          </ClerkProvider>
        </KeyboardProvider>
      </NotifierWrapper>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

const InitialLayout = () => {
  useOTAUpdates();
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  // Keep protected screens mounted during the auth hydration window so a
  // signed-in user on a cold-start deep link doesn't get bounced to the anchor
  // before Convex finishes validating the cached token.
  const isAuthAllowed = isAuthLoading || isAuthenticated;
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerBlurEffect: HEADER_BLUR_EFFECT,
        headerTintColor: "#5A32FB",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      {/* Tabs aren't protected: the feed tab's <Unauthenticated> owns the
          onboarding-vs-sign-in branching, which Stack.Protected's anchor
          redirect alone can't express. */}
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
        name="redirect"
        options={{
          headerShown: false,
          presentation: "containedModal",
        }}
      />
      {/* Content and create/settings routes: require auth. When the guard
          flips false, expo-router redirects to the anchor (tabs), whose feed
          screen in turn redirects to onboarding or sign-in. */}
      <Stack.Protected guard={isAuthAllowed}>
        <Stack.Screen
          name="event/[id]/index"
          options={{
            presentation: "modal",
            title: "Event Details",
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="list/[slug]"
          options={{
            presentation: "modal",
            title: "List Details",
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="[username]/index"
          options={{
            presentation: "modal",
            title: "",
            headerShown: true,
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
          name="event/[id]/saved-by"
          options={{
            presentation: "modal",
            title: "From these Soonlists",
            headerShown: true,
            headerStyle: { backgroundColor: "#FFFFFF" },
            headerTintColor: "#5A32FB",
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="lists/subscribed"
          options={{
            presentation: "modal",
            title: "Subscribed lists",
            headerShown: true,
            headerStyle: { backgroundColor: "#FFFFFF" },
            headerTintColor: "#5A32FB",
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="lists/discover"
          options={{
            presentation: "modal",
            title: "Discover Soonlists",
            headerShown: true,
            headerStyle: { backgroundColor: "#F4F1FF" },
            headerTintColor: "#5A32FB",
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="share-setup"
          options={{
            presentation: "formSheet",
            title: "",
            headerShown: false,
            sheetAllowedDetents: [0.4, 0.8],
            sheetGrabberVisible: true,
            sheetCornerRadius: 24,
          }}
        />
        <Stack.Screen
          name="event/[id]/edit"
          options={{
            presentation: "modal",
            title: "Edit Event",
            headerShown: true,
            headerTransparent: false,
            headerBackground: undefined,
            headerStyle: { backgroundColor: "#E0D9FF" }, // interactive-2
            headerTintColor: "#5A32FB", // interactive-1
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
        <Stack.Screen
          name="settings/account"
          options={{
            title: "Account",
            headerShown: true,
            headerTransparent: false,
            headerBackground: undefined,
            headerStyle: { backgroundColor: "#F4F1FF" },
            headerTintColor: "#5A32FB",
            headerBackTitle: "Back",
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="settings/profile-edit"
          options={{
            title: "Edit Profile",
            headerShown: true,
            headerTransparent: false,
            headerBackground: undefined,
            headerStyle: { backgroundColor: "#F4F1FF" },
            headerTintColor: "#5A32FB",
            headerBackTitle: "Account",
          }}
        />
        <Stack.Screen
          name="settings/timezone"
          options={{
            title: "Default Timezone",
            headerShown: true,
            headerTransparent: false,
            headerBackground: undefined,
            headerStyle: { backgroundColor: "#F4F1FF" },
            headerTintColor: "#5A32FB",
            headerBackTitle: "Account",
          }}
        />
      </Stack.Protected>
    </Stack>
  );
};

function RootLayoutContent() {
  useQuickActions();
  useAppsFlyerDeepLink();
  usePendingFollow();
  useCaptureCompletionFeedback();
  const ref = useNavigationContainerRef();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    routingInstrumentation.registerNavigationContainer(ref);
  }, [ref]);

  // Enable automatic PostHog screen tracking
  useEffect(() => {
    if (posthog) {
      void posthog.screen(pathname, params);
    }
  }, [pathname, params, posthog]);

  useTimezoneAlert();
  const { needsUpdate } = useForceUpdate();

  if (needsUpdate) {
    return <ForceUpdateScreen />;
  }

  return (
    <View style={{ flex: 1 }}>
      <InitialLayout />
      {/* App is light-only (app.config userInterfaceStyle: light); force dark status bar content */}
      <StatusBar style="dark" />
    </View>
  );
}
