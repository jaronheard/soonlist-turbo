import React from "react";
import { Dimensions, Image, Text, TouchableOpacity, View } from "react-native";
import {
  Menu,
  MenuOption,
  MenuOptions,
  MenuTrigger,
} from "react-native-popup-menu";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useAuth, useUser } from "@clerk/clerk-expo";
import Intercom from "@intercom/intercom-react-native";
import { HelpCircle, LogOut, MessageCircle, User } from "lucide-react-native";

import { cn } from "~/utils/cn";
import { getKeyChainAccessGroup } from "~/utils/getKeyChainAccessGroup";

const screenWidth = Dimensions.get("window").width;
const menuMinWidth = screenWidth * 0.6; // 60% of screen width

export function ProfileMenu() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const showOnboarding = () => {
    router.push("/onboarding");
  };

  const handleSignOut = async () => {
    await SecureStore.deleteItemAsync("hasCompletedOnboarding", {
      keychainAccessGroup: getKeyChainAccessGroup(),
    });
    await signOut();
    await Intercom.logout();
  };

  const presentIntercom = async () => {
    try {
      await Intercom.present();
    } catch (error) {
      console.error("Error presenting Intercom:", error);
    }
  };

  const menuItems = [
    { title: "How to Use", icon: HelpCircle, onSelect: showOnboarding },
    { title: "Support", icon: MessageCircle, onSelect: presentIntercom },
    {
      title: "Sign Out",
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
        <View className="rounded-full p-1">
          {user?.imageUrl ? (
            <Image
              source={{ uri: user.imageUrl }}
              className="h-10 w-10 rounded-full border-2 border-accent-yellow"
              width={28}
              height={28}
            />
          ) : (
            <User size={20} color="#5A32FB" />
          )}
        </View>
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
