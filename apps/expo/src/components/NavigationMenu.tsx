import React, { useState } from "react";
import { Dimensions, Text, TouchableOpacity, View } from "react-native";
import {
  Menu,
  MenuOption,
  MenuOptions,
  MenuTrigger,
} from "react-native-popup-menu";
import { useRouter } from "expo-router";

// You may need to match your actual "ProfileMenu" styling imports
// e.g. from "react-native-popup-menu" or a custom styling approach

interface NavigationMenuProps {
  active?: "upcoming" | "past" | "discover";
}

const routes = [
  { label: "Upcoming", path: "/feed" },
  { label: "Past", path: "/past" },
  { label: "Discover", path: "/discover" },
];

const screenWidth = Dimensions.get("window").width;
const menuMinWidth = screenWidth * 0.6; // match ProfileMenu's 60% width

export function NavigationMenu({ active }: NavigationMenuProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const currentRoute =
    routes.find((r) => r.path.includes(active ?? ""))?.label ?? "Select Route";

  return (
    <Menu opened={visible} onBackdropPress={() => setVisible(false)}>
      <MenuTrigger
        customStyles={{
          TriggerTouchableComponent: TouchableOpacity,
          triggerTouchable: {
            activeOpacity: 0.6,
          },
        }}
        onPress={() => setVisible(!visible)}
      >
        {/* Trigger styled similarly to ProfileMenu */}
        <View className="flex-row items-center">
          <Text className="font-base text-xl">{currentRoute}</Text>
        </View>
      </MenuTrigger>
      <MenuOptions
        customStyles={{
          optionsContainer: {
            overflow: "hidden",
            marginTop: 8,
            marginHorizontal: 8,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "#C7C7C7",
            minWidth: menuMinWidth,
          },
        }}
      >
        {routes.map((route, index) => (
          <MenuOption
            key={route.path}
            onSelect={() => {
              setVisible(false);
              router.push(route.path as never);
            }}
            customStyles={{
              optionWrapper: {
                padding: 0,
                borderBottomWidth: index < routes.length - 1 ? 0.5 : 0,
                borderBottomColor: "#C7C7C7",
              },
            }}
          >
            <View className="flex-row items-center justify-between px-4 py-3">
              <Text
                className={`font-base text-xl ${
                  active === route.path.replace("/", "")
                    ? "font-bold"
                    : "text-black"
                }`}
              >
                {route.label}
              </Text>
              {/* You could add an icon or caret on the right if desired */}
            </View>
          </MenuOption>
        ))}
      </MenuOptions>
    </Menu>
  );
}
