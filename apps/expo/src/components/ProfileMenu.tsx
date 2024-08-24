import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import {
  Menu,
  MenuOption,
  MenuOptions,
  MenuTrigger,
} from "react-native-popup-menu";
import { useRouter } from "expo-router";
import { SignedIn, useAuth, useUser } from "@clerk/clerk-expo";
import { HelpCircle, LogOut } from "lucide-react-native";

export function ProfileMenu() {
  const { signOut } = useAuth();
  const { user } = useUser();
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
          <View className="rounded-full p-1">
            {user?.imageUrl ? (
              <Image
                source={{ uri: user.imageUrl }}
                className="h-10 w-10 rounded-full border-2 border-accent-yellow"
              />
            ) : (
              <View className="h-8 w-8 rounded-full bg-gray-300" />
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
