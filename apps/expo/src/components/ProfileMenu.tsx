import React from "react";
import { Dimensions, Text, TouchableOpacity, View } from "react-native";
import {
  Menu,
  MenuOption,
  MenuOptions,
  MenuTrigger,
} from "react-native-popup-menu";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import Intercom from "@intercom/intercom-react-native";
import {
  Globe,
  HelpCircle,
  LogOut,
  MessageCircle,
  User,
} from "lucide-react-native";

import { deleteAuthData } from "~/hooks/useAuthSync";
import { useAppStore } from "~/store";
import { cn } from "~/utils/cn";
import { UserProfileFlair } from "./UserProfileFlair";

const screenWidth = Dimensions.get("window").width;
const menuMinWidth = screenWidth * 0.6; // 60% of screen width

export function ProfileMenu() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const resetStore = useAppStore((state) => state.resetStore);

  const showOnboarding = () => {
    router.push("/onboarding");
  };

  const handleEditProfile = () => {
    router.push("/edit-profile");
  };

  const handleSignOut = async () => {
    await signOut();
    await Intercom.logout();
    await deleteAuthData();
    resetStore();
  };

  const presentIntercom = async () => {
    try {
      await Intercom.present();
    } catch (error) {
      console.error("Error presenting Intercom:", error);
    }
  };

  const menuItems = [
    { title: "Profile", icon: User, onSelect: handleEditProfile },
    {
      title: "Discover",
      icon: Globe,
      onSelect: () => router.push("/discover"),
    },
    { title: "How to use", icon: HelpCircle, onSelect: showOnboarding },
    { title: "Support", icon: MessageCircle, onSelect: presentIntercom },
    {
      title: "Sign out",
      icon: LogOut,
      onSelect: handleSignOut,
      destructive: true,
    },
  ];

  return (
    <Menu>
      <MenuTrigger
        customStyles={{
          TriggerTouchableComponent: TouchableOpacity,
          triggerTouchable: {
            activeOpacity: 0.6,
          },
        }}
      >
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
            />
          ) : (
            <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-200">
              <User size={20} color="#5A32FB" />
            </View>
          )}
        </UserProfileFlair>
      </MenuTrigger>
      <MenuOptions
        customStyles={{
          optionsContainer: {
            overflow: "hidden",
            marginTop: 8,
            marginHorizontal: 8,
            borderRadius: 14,
            minWidth: menuMinWidth,
            borderWidth: 1,
            borderColor: "#C7C7C7",
          },
        }}
      >
        {menuItems.map((item, index) => (
          <MenuOption
            key={index}
            onSelect={item.onSelect}
            customStyles={{
              optionWrapper: {
                padding: 0,
                borderBottomWidth: index < menuItems.length - 1 ? 0.5 : 0,
                borderBottomColor: "#C7C7C7",
              },
            }}
          >
            <View className="flex-row items-center justify-between px-4 py-3">
              <Text
                className={cn("font-base text-xl", {
                  "text-[#FF3B30]": item.destructive,
                  "text-black": !item.destructive,
                })}
              >
                {item.title}
              </Text>
              <item.icon
                size={20}
                color={item.destructive ? "#FF3B30" : "#000000"}
              />
            </View>
          </MenuOption>
        ))}
      </MenuOptions>
    </Menu>
  );
}
