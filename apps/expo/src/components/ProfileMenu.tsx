import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import {
  Menu,
  MenuOption,
  MenuOptions,
  MenuTrigger,
} from "react-native-popup-menu";
import { useRouter } from "expo-router";
import { SignedIn, useAuth } from "@clerk/clerk-expo";
import { HelpCircle, LogOut, User } from "lucide-react-native";

export function ProfileMenu() {
  const { signOut } = useAuth();
  const router = useRouter();

  const showOnboarding = () => {
    router.push("/onboarding");
  };

  return (
    <SignedIn>
      <Menu>
        <MenuTrigger
          customStyles={{
            TriggerTouchableComponent: TouchableOpacity,
            triggerTouchable: {
              activeOpacity: 0.6,
            },
          }}
        >
          <View className="rounded-full p-2">
            <User size={24} color="#5A32FB" />
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
            <View className="flex-row items-center">
              <HelpCircle size={20} color="#5A32FB" />
              <Text className="ml-2 text-base font-medium text-neutral-1">
                How to Use
              </Text>
            </View>
          </MenuOption>
          <MenuOption onSelect={() => signOut()}>
            <View className="flex-row items-center">
              <LogOut size={20} color="#5A32FB" />
              <Text className="ml-2 text-base font-medium text-neutral-1">
                Sign Out
              </Text>
            </View>
          </MenuOption>
        </MenuOptions>
      </Menu>
    </SignedIn>
  );
}
