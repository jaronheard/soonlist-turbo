import React, { useState } from "react";
import {
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Menu,
  MenuOption,
  MenuOptions,
  MenuTrigger,
  renderers,
} from "react-native-popup-menu";
import { router } from "expo-router";
import { Check, ChevronDown } from "lucide-react-native";

type RouteType = "upcoming" | "past" | "discover";

interface NavigationMenuProps {
  active?: RouteType;
}

const routes = [
  { label: "Upcoming", path: "/feed" },
  { label: "Past", path: "/past" },
  { label: "Discover", path: "/discover" },
] as const;

function isRouteActive(routePath: string, active?: RouteType) {
  if (!active) return routePath === "/feed"; // default to upcoming
  return routePath === (active === "upcoming" ? "/feed" : `/${active}`);
}

export function NavigationMenu({ active }: NavigationMenuProps) {
  const { width: screenWidth } = useWindowDimensions();
  const menuMinWidth = screenWidth * 0.5;
  const [visible, setVisible] = useState(false);

  const currentRoute =
    routes.find((r) => isRouteActive(r.path, active))?.label ?? "Upcoming";

  const handleNavigation = (path: (typeof routes)[number]["path"]) => {
    setVisible(false);
    router.replace(path);
  };

  return (
    <Menu
      opened={visible}
      onBackdropPress={() => setVisible(false)}
      renderer={renderers.Popover}
      rendererProps={{
        placement: "bottom",
        preferredPlacement: "bottom",
        anchorStyle: { backgroundColor: "transparent" },
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
          const isActive = isRouteActive(route.path, active);
          return (
            <MenuOption
              key={route.path}
              onSelect={() => {
                setVisible(false);
                if (!isActive) handleNavigation(route.path);
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
