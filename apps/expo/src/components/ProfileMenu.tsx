import React from "react";
import { Share, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import Intercom from "@intercom/intercom-react-native";
import { useConvexAuth } from "convex/react";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemIcon,
  DropdownMenuItemTitle,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu-primitives";

import { LogOut, MessageSquare, ShareIcon, User } from "~/components/icons";
import { useSignOut } from "~/hooks/useSignOut";
import { toast } from "~/utils/feedback";
import { logError } from "../utils/errorLogging";
import { UserProfileFlair } from "./UserProfileFlair";

export function ProfileMenu() {
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const signOut = useSignOut();

  const handleSignOut = () => {
    signOut().catch((error) => {
      // Ignore "You are signed out" errors as these are expected
      // when third-party services try to logout after Clerk has already signed out
      if (
        error instanceof Error &&
        !error.message?.includes("You are signed out")
      ) {
        logError("Error during sign out process", error);
        toast.error("Failed to sign out. Please try again.");
      }
    });
    // No manual navigation needed - Convex auth components will handle the transition
  };

  const handleEditProfile = () => {
    router.navigate("/settings/account");
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
    <DropdownMenuRoot>
      <DropdownMenuTrigger>
        {user?.username && isAuthenticated ? (
          <UserProfileFlair username={user.username} size="sm">
            {profileImage}
          </UserProfileFlair>
        ) : (
          profileImage
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuItem key="share-app" onSelect={handleShareApp}>
          <DropdownMenuItemIcon ios={{ name: "square.and.arrow.up" }}>
            <ShareIcon />
          </DropdownMenuItemIcon>
          <DropdownMenuItemTitle>Share App</DropdownMenuItemTitle>
        </DropdownMenuItem>

        <DropdownMenuItem key="profile" onSelect={handleEditProfile}>
          <DropdownMenuItemIcon ios={{ name: "person.circle" }}>
            <User />
          </DropdownMenuItemIcon>
          <DropdownMenuItemTitle>Account</DropdownMenuItemTitle>
        </DropdownMenuItem>

        <DropdownMenuItem key="feedback" onSelect={presentIntercom}>
          <DropdownMenuItemIcon ios={{ name: "message" }}>
            <MessageSquare />
          </DropdownMenuItemIcon>
          <DropdownMenuItemTitle>Feedback</DropdownMenuItemTitle>
        </DropdownMenuItem>

        <DropdownMenuItem key="sign-out" onSelect={handleSignOut} destructive>
          <DropdownMenuItemIcon
            ios={{
              name: "rectangle.portrait.and.arrow.right",
              hierarchicalColor: {
                light: "#FF3B30",
                dark: "#FF3B30",
              },
            }}
          >
            <LogOut />
          </DropdownMenuItemIcon>
          <DropdownMenuItemTitle>Sign out</DropdownMenuItemTitle>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuRoot>
  );
}
