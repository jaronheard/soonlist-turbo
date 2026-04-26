import React, { useCallback } from "react";
import {
  ActionSheetIOS,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import * as Application from "expo-application";
import { Redirect, router } from "expo-router";
import * as StoreReview from "expo-store-review";
import { useUser } from "@clerk/clerk-expo";
import Intercom from "@intercom/intercom-react-native";
import { useConvexAuth, useMutation, useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import {
  Bell,
  Calendar as CalendarIcon,
  Clock,
  Eye,
  HelpCircle,
  Instagram,
  Link as LinkIcon,
  Mail,
  PenSquare,
  Phone,
  ShareIcon,
  Sparkles,
  Star,
} from "~/components/icons";
import { SettingsGroup, SettingsRow } from "~/components/settings/SettingsList";
import { useCalendar } from "~/hooks/useCalendar";
import { useShareMyList } from "~/hooks/useShareMyList";
import { useSignOut } from "~/hooks/useSignOut";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import {
  useAppStore,
  usePreferredCalendarApp,
  useSetPreferredCalendarApp,
} from "~/store";
import { hapticSuccess, toast } from "~/utils/feedback";
import { logError } from "../../utils/errorLogging";
import { getPlanStatusFromUser } from "../../utils/plan";

const PURPLE = "#5A32FB";
const PURPLE_WASH = "#F4F1FF";
const PAGE_BG = "#F2F2F7";
const INK_0 = "#162135";
const INK_2 = "#627496";

const TILE_COLORS = {
  purple: "#5A32FB",
  instagram: "#E1306C",
  blue: "#7ACEFC",
  orange: "#FF9500",
  green: "#34C759",
  gray: "#8E8E93",
  red: "#FF3B30",
  yellow: "#FFCC00",
};

function Hero({
  avatarUrl,
  displayName,
  handle,
  emoji,
  onEdit,
}: {
  avatarUrl?: string;
  displayName: string;
  handle: string;
  emoji: string | null;
  onEdit: () => void;
}) {
  return (
    <View
      style={{
        backgroundColor: PURPLE_WASH,
        paddingTop: 4,
        paddingBottom: 28,
        paddingHorizontal: 20,
        alignItems: "center",
      }}
    >
      <View style={{ position: "relative" }}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{
              width: 86,
              height: 86,
              borderRadius: 999,
            }}
          />
        ) : (
          <View
            style={{
              width: 86,
              height: 86,
              borderRadius: 999,
              backgroundColor: "#D9CBB3",
            }}
          />
        )}
        {emoji ? (
          <View
            style={{
              position: "absolute",
              right: -4,
              bottom: -4,
              width: 30,
              height: 30,
              borderRadius: 999,
              backgroundColor: PURPLE,
              borderWidth: 3,
              borderColor: PURPLE_WASH,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 14, lineHeight: 16 }}>{emoji}</Text>
          </View>
        ) : null}
      </View>

      <Text
        style={{
          fontFamily: "Kalam_700Bold",
          fontSize: 28,
          lineHeight: 36,
          letterSpacing: -0.28,
          color: INK_0,
          textAlign: "center",
          marginTop: 10,
          includeFontPadding: false,
        }}
        numberOfLines={1}
      >
        {displayName}
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: INK_2,
          marginTop: -2,
        }}
      >
        {handle}
      </Text>

      <Pressable
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel="Edit profile"
        style={({ pressed }) => ({
          marginTop: 14,
          borderRadius: 999,
          backgroundColor: "#FFFFFF",
          shadowColor: "#162135",
          shadowOpacity: 0.06,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 1 },
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View
          style={{
            height: 34,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <PenSquare size={14} color={PURPLE} strokeWidth={2} />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: PURPLE,
              marginLeft: 6,
            }}
          >
            Edit profile
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

export default function AccountScreen() {
  const { isAuthenticated } = useConvexAuth();
  const { user } = useUser();
  const { customerInfo, showProPaywallIfNeeded } = useRevenueCat();
  const signOut = useSignOut();
  const { requestShare } = useShareMyList();

  const userData = useQuery(
    api.users.getByUsername,
    user?.username ? { userName: user.username } : "skip",
  );
  const resetOnboardingStore = useAppStore((s) => s.resetOnboarding);
  const userTimezone = useAppStore((s) => s.userTimezone);
  const preferredCalendarApp = usePreferredCalendarApp();
  const setPreferredCalendarApp = useSetPreferredCalendarApp();
  const { calendarApps } = useCalendar();

  const resetOnboardingMutation = useMutation(api.users.resetOnboarding);
  const updatePublicListSettings = useMutation(
    api.users.updatePublicListSettings,
  );

  const showDiscover = user ? getPlanStatusFromUser(user).showDiscover : false;
  const publicListEnabled = userData?.publicListEnabled ?? false;
  const publicListName = userData?.publicListName ?? "";
  const [isUpdatingList, setIsUpdatingList] = React.useState(false);

  const displayName =
    userData?.displayName || user?.username || user?.firstName || "Your name";
  const handle = user?.username ? `@${user.username}` : "";
  const emoji = userData?.emoji ?? null;

  const handleOpenEdit = useCallback(() => {
    router.navigate("/settings/profile-edit");
  }, []);

  const handleTogglePublicList = useCallback(
    async (next: boolean) => {
      if (!user?.id) return;
      setIsUpdatingList(true);
      try {
        const defaultName = `${userData?.displayName || user.username}'s events`;
        await updatePublicListSettings({
          userId: user.id,
          publicListEnabled: next,
          publicListName: next ? publicListName || defaultName : undefined,
        });
        void hapticSuccess();
      } catch (error) {
        logError("Error toggling public list", error);
        toast.error("Failed to update public list settings");
      } finally {
        setIsUpdatingList(false);
      }
    },
    [
      user?.id,
      user?.username,
      userData?.displayName,
      publicListName,
      updatePublicListSettings,
    ],
  );

  const handleShareMySoonlist = useCallback(() => {
    if (!publicListEnabled) {
      Alert.alert(
        "Turn on Public list first",
        "Your Soonlist needs to be public before you can share it.",
        [{ text: "OK" }],
      );
      return;
    }
    void requestShare();
  }, [publicListEnabled, requestShare]);

  const handleOpenCalendar = useCallback(() => {
    const googleInstalled =
      calendarApps.find((app) => app.id === "google")?.isInstalled === true;

    const options = googleInstalled
      ? ["Cancel", "Apple Calendar", "Google Calendar"]
      : ["Cancel", "Apple Calendar"];

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: "Choose calendar app",
          options,
          cancelButtonIndex: 0,
          userInterfaceStyle: "light",
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            setPreferredCalendarApp("apple");
            void hapticSuccess();
          } else if (buttonIndex === 2 && googleInstalled) {
            setPreferredCalendarApp("google");
            void hapticSuccess();
          }
        },
      );
    } else {
      const buttons: Parameters<typeof Alert.alert>[2] = [
        { text: "Cancel", style: "cancel" },
        {
          text: "Apple Calendar",
          onPress: () => setPreferredCalendarApp("apple"),
        },
      ];
      if (googleInstalled) {
        buttons.push({
          text: "Google Calendar",
          onPress: () => setPreferredCalendarApp("google"),
        });
      }
      Alert.alert("Choose calendar app", undefined, buttons);
    }
  }, [calendarApps, setPreferredCalendarApp]);

  const handleOpenNotifications = useCallback(() => {
    void Linking.openSettings();
  }, []);

  const handleOpenTimezone = useCallback(() => {
    router.navigate("/settings/timezone");
  }, []);

  const handleHelp = useCallback(async () => {
    try {
      await Intercom.present();
    } catch (error) {
      logError("Error presenting Intercom", error);
    }
  }, []);

  const handleRate = useCallback(async () => {
    try {
      if (await StoreReview.hasAction()) {
        await StoreReview.requestReview();
      }
    } catch (error) {
      logError("Error requesting review", error);
    }
  }, []);

  const handleProPlanPress = useCallback(() => {
    if (!user) return;
    const hasUnlimited =
      customerInfo?.entitlements.active.unlimited?.isActive ?? false;
    const isStripePlan =
      customerInfo?.originalPurchaseDate &&
      new Date(customerInfo.originalPurchaseDate) <= new Date(2025, 2, 7);

    if (hasUnlimited && !isStripePlan) {
      void Linking.openURL("itms-apps://apps.apple.com/account/subscriptions");
      return;
    }
    if (hasUnlimited && isStripePlan) {
      void Linking.openURL("https://www.soonlist.com/account/plans");
      return;
    }
    void showProPaywallIfNeeded();
  }, [user, customerInfo, showProPaywallIfNeeded]);

  const planValue = (() => {
    const hasUnlimited =
      customerInfo?.entitlements.active.unlimited?.isActive ?? false;
    return hasUnlimited ? "Pro" : "Free plan";
  })();

  const handleSignOut = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await signOut();
              void hapticSuccess();
            } catch (error) {
              logError("Error signing out", error);
              toast.error("Failed to sign out");
            }
          })();
        },
      },
    ]);
  }, [signOut]);

  const handleRestartOnboarding = useCallback(() => {
    Alert.alert(
      "Restart Onboarding",
      "This will reset your onboarding progress and sign you out. You'll need to go through the onboarding process again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restart",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                if (user?.id) {
                  await resetOnboardingMutation({ userId: user.id });
                }
                resetOnboardingStore();
                await signOut();
                void hapticSuccess();
              } catch (error) {
                logError("Error restarting onboarding", error);
                toast.error("Failed to restart onboarding");
              }
            })();
          },
        },
      ],
    );
  }, [resetOnboardingMutation, resetOnboardingStore, user?.id, signOut]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all associated data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await signOut({ shouldDeleteAccount: true });
                void hapticSuccess();
              } catch (error) {
                logError("Error deleting account", error);
                toast.error("Failed to delete account");
              }
            })();
          },
        },
      ],
    );
  }, [signOut]);

  if (!isAuthenticated) {
    return <Redirect href="/sign-in" />;
  }

  const version = Application.nativeApplicationVersion ?? "";

  const maybeValue = (v: string | null | undefined) =>
    v && v.trim().length > 0 ? v : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Hero
          avatarUrl={user?.imageUrl ?? undefined}
          displayName={displayName}
          handle={handle}
          emoji={emoji}
          onEdit={handleOpenEdit}
        />

        <View style={{ height: 14 }} />

        <SettingsGroup
          header="YOUR PUBLIC PROFILE"
          footer="This is what people see when you share an event."
        >
          <SettingsRow
            icon={PenSquare}
            iconBg={TILE_COLORS.purple}
            label="Display name"
            value={maybeValue(userData?.displayName)}
            onPress={handleOpenEdit}
          />
          <SettingsRow
            icon={Instagram}
            iconBg={TILE_COLORS.instagram}
            label="Instagram"
            value={maybeValue(userData?.publicInsta)}
            onPress={handleOpenEdit}
          />
          <SettingsRow
            icon={LinkIcon}
            iconBg={TILE_COLORS.blue}
            label="Website"
            value={maybeValue(userData?.publicWebsite)}
            onPress={handleOpenEdit}
          />
          <SettingsRow
            icon={Mail}
            iconBg={TILE_COLORS.orange}
            label="Email"
            value={maybeValue(userData?.publicEmail)}
            onPress={handleOpenEdit}
          />
          <SettingsRow
            icon={Phone}
            iconBg={TILE_COLORS.green}
            label="Phone"
            value={maybeValue(userData?.publicPhone)}
            onPress={handleOpenEdit}
          />
        </SettingsGroup>

        {!showDiscover ? (
          <SettingsGroup
            header="SHARING"
            footer="Share all your events with anyone via a public link."
          >
            <SettingsRow
              icon={Eye}
              iconBg={TILE_COLORS.green}
              label="Public list"
              accessory={{
                type: "toggle",
                value: publicListEnabled,
                onValueChange: (v) => void handleTogglePublicList(v),
                disabled: isUpdatingList,
              }}
              testID="public-list-switch"
            />
            <SettingsRow
              icon={ShareIcon}
              iconBg={TILE_COLORS.purple}
              label="Share your Soonlist"
              onPress={handleShareMySoonlist}
            />
          </SettingsGroup>
        ) : null}

        <SettingsGroup header="PREFERENCES">
          <SettingsRow
            icon={Clock}
            iconBg={TILE_COLORS.gray}
            label="Default timezone"
            value={userTimezone || "System default"}
            onPress={handleOpenTimezone}
          />
          <SettingsRow
            icon={CalendarIcon}
            iconBg={TILE_COLORS.red}
            label="Calendar"
            value={
              preferredCalendarApp === "google"
                ? "Google Calendar"
                : preferredCalendarApp === "apple"
                  ? "Apple Calendar"
                  : undefined
            }
            onPress={handleOpenCalendar}
          />
          <SettingsRow
            icon={Bell}
            iconBg={TILE_COLORS.orange}
            label="Notifications"
            onPress={handleOpenNotifications}
          />
        </SettingsGroup>

        <SettingsGroup header="SOONLIST">
          <SettingsRow
            icon={Sparkles}
            iconBg={TILE_COLORS.purple}
            label="Upgrade to Pro"
            value={planValue}
            onPress={handleProPlanPress}
          />
          <SettingsRow
            icon={HelpCircle}
            iconBg={TILE_COLORS.gray}
            label="Help & feedback"
            onPress={handleHelp}
          />
          <SettingsRow
            icon={Star}
            iconBg={TILE_COLORS.yellow}
            label="Rate Soonlist"
            onPress={handleRate}
          />
        </SettingsGroup>

        {__DEV__ ? (
          <SettingsGroup>
            <SettingsRow
              icon={PenSquare}
              iconBg={TILE_COLORS.gray}
              label="Workflow failure tests"
              onPress={() => router.navigate("/settings/workflow-test")}
            />
          </SettingsGroup>
        ) : null}

        <SettingsGroup>
          <SettingsRow
            label="Sign out"
            tint="purple"
            accessory={{ type: "none" }}
            onPress={handleSignOut}
          />
          <SettingsRow
            label="Restart onboarding"
            tint="ink-1"
            accessory={{ type: "none" }}
            onPress={handleRestartOnboarding}
          />
          <SettingsRow
            label="Delete account"
            tint="destructive"
            accessory={{ type: "none" }}
            onPress={handleDeleteAccount}
          />
        </SettingsGroup>

        <Text
          style={{
            textAlign: "center",
            fontSize: 13,
            color: "rgba(60,60,67,0.5)",
            paddingTop: 4,
            paddingBottom: 32,
          }}
        >
          {`Made with 💖 in Portland${version ? ` · v${version}` : ""}`}
        </Text>
      </ScrollView>
    </View>
  );
}
