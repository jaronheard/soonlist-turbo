import { Text, View } from "react-native";
import { MenuProvider } from "react-native-popup-menu";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { ClerkProvider, SignedIn } from "@clerk/clerk-expo";
import { useColorScheme } from "nativewind";

import { useAppStateRefresh } from "~/hooks/useAppStateRefresh"; // Add this import
import {
  NotificationProvider,
  useNotification,
} from "~/providers/NotificationProvider";
import { TRPCProvider } from "~/utils/api";

import "../styles.css";

import type { ErrorBoundaryProps } from "expo-router";

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
      keychainAccessGroup: "group.soonlist.soonlist",
    });
  },
  saveToken: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value, {
      keychainAccessGroup: "group.soonlist.soonlist",
    });
  },
};

export default function RootLayout() {
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
      <TRPCProvider>
        <NotificationProvider>
          <SafeAreaProvider>
            <MenuProvider>
              <RootLayoutContent />
            </MenuProvider>
          </SafeAreaProvider>
        </NotificationProvider>
      </TRPCProvider>
    </ClerkProvider>
  );
}

function RootLayoutContent() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const { expoPushToken } = useNotification();
  useAppStateRefresh(); // Add this line

  return (
    <View style={{ flex: 1 }}>
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
      <AuthAndTokenSync expoPushToken={expoPushToken} />
      <SignedIn>
        <View style={{ paddingBottom: insets.bottom + 36 }} />
        <BottomBar expoPushToken={expoPushToken} />
      </SignedIn>
      <Toast />
      <StatusBar />
    </View>
  );
}
