import React from "react";
import { Text } from "react-native";
import {
  Menu,
  MenuOption,
  MenuOptions,
  MenuTrigger,
} from "react-native-popup-menu";
import { useAuth } from "@clerk/clerk-expo";
import { User } from "lucide-react-native";

export function ProfileMenu() {
  const { signOut } = useAuth();

  return (
    <Menu>
      <MenuTrigger>
        <User size={24} color="#5A32FB" className="ml-4" />
      </MenuTrigger>
      <MenuOptions>
        <MenuOption onSelect={() => signOut()}>
          <Text>Sign Out</Text>
        </MenuOption>
      </MenuOptions>
    </Menu>
  );
}
