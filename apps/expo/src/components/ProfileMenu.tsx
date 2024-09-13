import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
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

import { getKeyChainAccessGroup } from "~/utils/getKeyChainAccessGroup";

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
      // You might want to add some user-facing error handling here
    }
  };

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
            backgroundColor: "white",
            borderRadius: 8,
            padding: 8,
          },
        }}
      >
        <MenuOption onSelect={showOnboarding}>
          <View className="flex-row items-center py-2">
            <HelpCircle size={20} color="#5A32FB" />
            <Text className="ml-3 text-base font-medium text-neutral-1">
              How to Use
            </Text>
          </View>
        </MenuOption>
        <MenuOption onSelect={presentIntercom}>
          <View className="flex-row items-center py-2">
            <MessageCircle size={20} color="#5A32FB" />
            <Text className="ml-3 text-base font-medium text-neutral-1">
              Support
            </Text>
          </View>
        </MenuOption>
        <MenuOption onSelect={handleSignOut}>
          <View className="flex-row items-center py-2">
            <LogOut size={20} color="#BA2727" />
            <Text className="ml-3 font-medium text-[#BA2727]">Sign Out</Text>
          </View>
        </MenuOption>
      </MenuOptions>
    </Menu>
  );
}
