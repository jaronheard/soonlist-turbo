import React, { useState } from "react";
import { Dimensions, Text, TouchableOpacity, View } from "react-native";
import {
  Menu,
  MenuOption,
  MenuOptions,
  MenuTrigger,
  renderers,
} from "react-native-popup-menu";
import { useRouter } from "expo-router";
import { Check, ChevronDown } from "lucide-react-native";

interface NavigationMenuProps {
  active?: "upcoming" | "past" | "discover";
}

const routes = [
  { label: "Upcoming", path: "/feed" },
  { label: "Past", path: "/past" },
  { label: "Discover", path: "/discover" },
];

const screenWidth = Dimensions.get("window").width;
const menuMinWidth = screenWidth * 0.5;

export function NavigationMenu({ active }: NavigationMenuProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  // Update current route logic to match active route more accurately
  const currentRoute =
    routes.find((r) => {
      if (active === "upcoming") return r.path === "/feed";
      return r.path.replace("/", "") === active;
    })?.label ?? "Upcoming";

  return (
    <Menu
      opened={visible}
      onBackdropPress={() => setVisible(false)}
      renderer={renderers.Popover}
      rendererProps={{
        placement: "bottom",
        preferredPlacement: "bottom",
        anchorStyle: { backgroundColor: "transparent" },
        // Center align the menu with the trigger
        anchorOrigin: { x: 0.5, y: 0 },
        popoverOrigin: { x: 0.5, y: 0 },
      }}
    >
      <MenuTrigger
        customStyles={{
          TriggerTouchableComponent: TouchableOpacity,
          triggerTouchable: {
            activeOpacity: 0.6,
          },
        }}
        onPress={() => setVisible(!visible)}
      >
        <View className="flex-row items-center space-x-1">
          <Text className="text-xl font-bold text-white">{currentRoute}</Text>
          <ChevronDown size={24} color="white" />
        </View>
      </MenuTrigger>
      <MenuOptions
        customStyles={{
          optionsContainer: {
            overflow: "hidden",
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "#C7C7C7",
            minWidth: menuMinWidth,
            backgroundColor: "white",
          },
        }}
      >
        {routes.map((route, index) => {
          const isActive =
            route.path === "/feed"
              ? active === "upcoming"
              : route.path.replace("/", "") === active;
          return (
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
                  className={`text-xl ${
                    isActive ? "font-bold text-black" : "text-black"
                  }`}
                >
                  {route.label}
                </Text>
                {isActive && <Check size={20} color="#000000" />}
              </View>
            </MenuOption>
          );
        })}
      </MenuOptions>
    </Menu>
  );
}
