import React, { useState } from "react";
import {
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { router } from "expo-router";
import { Check, ChevronDown } from "lucide-react-native";
import * as DropdownMenu from "zeego/dropdown-menu";

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
  const [menuOpen, setMenuOpen] = useState(false);

  const currentRoute =
    routes.find((r) => isRouteActive(r.path, active))?.label ?? "Upcoming";

  const handleNavigation = (path: (typeof routes)[number]["path"]) => {
    setMenuOpen(false);
    router.replace(path);
  };

  return (
    <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenu.Trigger action="press" asChild>
        <TouchableOpacity activeOpacity={0.6}>
          <View className="flex-row items-center space-x-1">
            <Text className="text-xl font-bold text-white">{currentRoute}</Text>
            <ChevronDown size={24} color="white" />
          </View>
        </TouchableOpacity>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
        // Set alignment and offset to mimic a "native" feel
        side="bottom"
        align="center"
        style={{
          minWidth: screenWidth * 0.5,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "#C7C7C7",
          backgroundColor: "white",
        }}
      >
        {routes.map((route, index) => {
          const isActive = isRouteActive(route.path, active);

          return (
            <DropdownMenu.Item
              key={route.path}
              textValue={route.label}
              onSelect={() => {
                if (!isActive) {
                  handleNavigation(route.path);
                }
              }}
              style={{
                borderBottomWidth: index < routes.length - 1 ? 0.5 : 0,
                borderBottomColor: "#C7C7C7",
              }}
            >
              <View className="flex-row items-center justify-between px-4 py-3">
                <DropdownMenu.ItemTitle>
                  <Text
                    className={`text-xl ${
                      isActive ? "font-bold text-black" : "text-black"
                    }`}
                  >
                    {route.label}
                  </Text>
                </DropdownMenu.ItemTitle>
                {isActive && (
                  <DropdownMenu.ItemIndicator>
                    {/* Native checkmark on iOS/Android, fallback to this icon on web */}
                    <Check size={20} color="#000000" />
                  </DropdownMenu.ItemIndicator>
                )}
              </View>
            </DropdownMenu.Item>
          );
        })}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
