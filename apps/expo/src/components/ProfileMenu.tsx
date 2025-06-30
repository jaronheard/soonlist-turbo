import React from "react";
import { Share, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import Intercom from "@intercom/intercom-react-native";
import { useConvexAuth } from "convex/react";
import { toast } from "sonner-native";
import * as DropdownMenu from "zeego/dropdown-menu";

import {
  LogOut,
  MessageCircle,
  RefreshCw,
  ShareIcon,
  User,
} from "~/components/icons";
import { useSignOut } from "~/hooks/useSignOut";
import { useAppStore } from "~/store";
import { logError } from "../utils/errorLogging";
import { UserProfileFlair } from "./UserProfileFlair";

export function ProfileMenu() {
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const signOut = useSignOut();
  const { setHasSeenOnboarding, setHasCompletedOnboarding } = useAppStore();

  const handleSignOut = () => {
    signOut()
      .catch((error) => {
        // Ignore "You are signed out" errors as these are expected
        // when third-party services try to logout after Clerk has already signed out
        if (
          error instanceof Error &&
          !error.message?.includes("You are signed out")
        ) {
          logError("Error during sign out process", error);
          toast.error("Failed to sign out. Please try again.");
        }
      })
      .finally(() => {
        // Navigate to onboarding welcome after sign out attempt (success or expected error)
        router.replace("/(onboarding)/onboarding");
      });
  };

  const handleEditProfile = () => {
    router.push("/settings/account");
  };

  const presentIntercom = async () => {
    try {
      await Intercom.present();
    } catch (error) {
      logError("Error presenting Intercom", error);
    }
  };

  const handleShareApp = async () => {
    const url =
      "https://apps.apple.com/us/app/soonlist-save-events-instantly/id6670222216";
    await Share.share({
      message: "Check out Soonlist on the App Store!",
      url: url,
    });
  };

  const handleResetOnboarding = () => {
    // Reset onboarding state
    setHasSeenOnboarding(false);
    setHasCompletedOnboarding(false);

    // Navigate to onboarding
    router.replace("/(onboarding)/onboarding");
  };

  const profileImage = (
    <>
      {user?.imageUrl ? (
        <ExpoImage
          source={{ uri: user.imageUrl }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 9999,
            borderWidth: 2,
            borderColor: "#FEEA9F",
          }}
          contentFit="cover"
          contentPosition="center"
          cachePolicy="disk"
          transition={100}
        />
      ) : (
        <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-200">
          <User size={20} color="#5A32FB" />
        </View>
      )}
    </>
  );

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {user?.username && isAuthenticated ? (
          <UserProfileFlair username={user.username} size="sm">
            {profileImage}
          </UserProfileFlair>
        ) : (
          profileImage
        )}
      </DropdownMenu.Trigger>

      <DropdownMenu.Content>
        <DropdownMenu.Item key="share-app" onSelect={handleShareApp}>
          <DropdownMenu.ItemIcon ios={{ name: "square.and.arrow.up" }}>
            <ShareIcon />
          </DropdownMenu.ItemIcon>
          <DropdownMenu.ItemTitle>Share App</DropdownMenu.ItemTitle>
        </DropdownMenu.Item>

        <DropdownMenu.Item key="profile" onSelect={handleEditProfile}>
          <DropdownMenu.ItemIcon ios={{ name: "person.circle" }}>
            <User />
          </DropdownMenu.ItemIcon>
          <DropdownMenu.ItemTitle>Account</DropdownMenu.ItemTitle>
        </DropdownMenu.Item>

        <DropdownMenu.Item key="support" onSelect={presentIntercom}>
          <DropdownMenu.ItemIcon ios={{ name: "message.circle" }}>
            <MessageCircle />
          </DropdownMenu.ItemIcon>
          <DropdownMenu.ItemTitle>Support</DropdownMenu.ItemTitle>
        </DropdownMenu.Item>

        {__DEV__ && (
          <DropdownMenu.Item
            key="reset-onboarding"
            onSelect={handleResetOnboarding}
          >
            <DropdownMenu.ItemIcon ios={{ name: "arrow.counterclockwise" }}>
              <RefreshCw />
            </DropdownMenu.ItemIcon>
            <DropdownMenu.ItemTitle>
              Reset Onboarding (Dev)
            </DropdownMenu.ItemTitle>
          </DropdownMenu.Item>
        )}

        <DropdownMenu.Item key="sign-out" onSelect={handleSignOut} destructive>
          <DropdownMenu.ItemIcon
            ios={{
              name: "rectangle.portrait.and.arrow.right",
              hierarchicalColor: {
                light: "#FF3B30",
                dark: "#FF3B30",
              },
            }}
          >
            <LogOut />
          </DropdownMenu.ItemIcon>
          <DropdownMenu.ItemTitle>Sign out</DropdownMenu.ItemTitle>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
