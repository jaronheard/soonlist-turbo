import React from "react";
import { Share, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import Intercom from "@intercom/intercom-react-native";
import {
  CreditCard,
  HelpCircle,
  LogOut,
  MessageCircle,
  ShareIcon,
  User,
} from "lucide-react-native";
import * as DropdownMenu from "zeego/dropdown-menu";

import { useSignOut } from "~/hooks/useSignOut";
import Config from "~/utils/config";
import { UserProfileFlair } from "./UserProfileFlair";

interface ProfileMenuProps {
  showShare?: boolean;
}

export function ProfileMenu({ showShare }: ProfileMenuProps) {
  const { user } = useUser();
  const signOut = useSignOut();

  const showOnboarding = () => {
    router.push("/onboarding?demo=true");
  };

  const handleEditProfile = () => {
    router.push("/settings/profile");
  };

  const handleSubscription = () => {
    router.push("/settings/subscription");
  };

  const presentIntercom = async () => {
    try {
      await Intercom.present();
    } catch (error) {
      console.error("Error presenting Intercom:", error);
    }
  };

  const handleShare = async () => {
    if (!user?.username) return;
    const url = `${Config.apiBaseUrl}/${user.username}/upcoming`;
    await Share.share({ url });
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <UserProfileFlair username={user?.username ?? ""} size="sm">
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
        </UserProfileFlair>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content>
        {showShare && (
          <DropdownMenu.Item key="share" onSelect={handleShare}>
            <DropdownMenu.ItemIcon ios={{ name: "square.and.arrow.up" }}>
              <ShareIcon />
            </DropdownMenu.ItemIcon>
            <DropdownMenu.ItemTitle>Share</DropdownMenu.ItemTitle>
          </DropdownMenu.Item>
        )}

        <DropdownMenu.Item key="profile" onSelect={handleEditProfile}>
          <DropdownMenu.ItemIcon ios={{ name: "person.circle" }}>
            <User />
          </DropdownMenu.ItemIcon>
          <DropdownMenu.ItemTitle>Profile</DropdownMenu.ItemTitle>
        </DropdownMenu.Item>

        <DropdownMenu.Item key="subscription" onSelect={handleSubscription}>
          <DropdownMenu.ItemIcon ios={{ name: "creditcard" }}>
            <CreditCard />
          </DropdownMenu.ItemIcon>
          <DropdownMenu.ItemTitle>Subscription</DropdownMenu.ItemTitle>
        </DropdownMenu.Item>

        <DropdownMenu.Item key="how-to-use" onSelect={showOnboarding}>
          <DropdownMenu.ItemIcon ios={{ name: "questionmark.circle" }}>
            <HelpCircle />
          </DropdownMenu.ItemIcon>
          <DropdownMenu.ItemTitle>How to use</DropdownMenu.ItemTitle>
        </DropdownMenu.Item>

        <DropdownMenu.Item key="support" onSelect={presentIntercom}>
          <DropdownMenu.ItemIcon ios={{ name: "message.circle" }}>
            <MessageCircle />
          </DropdownMenu.ItemIcon>
          <DropdownMenu.ItemTitle>Support</DropdownMenu.ItemTitle>
        </DropdownMenu.Item>

        <DropdownMenu.Item key="sign-out" onSelect={signOut} destructive>
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
