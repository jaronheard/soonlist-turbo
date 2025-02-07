import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { Check, ChevronDown } from "lucide-react-native";

import { getPlanStatusFromUser } from "~/utils/plan";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItemIndicator,
  DropdownMenuItemTitle,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu-primitives";

type RouteType = "upcoming" | "past" | "discover";

interface NavigationMenuProps {
  active?: RouteType;
}

const baseRoutes = [
  { label: "Upcoming", path: "/feed" },
  { label: "Past", path: "/past" },
  { label: "Discover", path: "/discover" },
] as const;

function isRouteActive(routePath: string, active?: RouteType) {
  if (!active) return routePath === "/feed";
  return routePath === (active === "upcoming" ? "/feed" : `/${active}`);
}

export function NavigationMenu({ active }: NavigationMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useUser();

  const showDiscover = user ? getPlanStatusFromUser(user).showDiscover : false;
  console.log("showDiscover", showDiscover);
  const routes = showDiscover ? baseRoutes : baseRoutes.slice(0, 2);

  const currentRoute =
    routes.find((r) => isRouteActive(r.path, active))?.label ?? "Upcoming";

  const handleNavigation = (path: (typeof routes)[number]["path"]) => {
    setMenuOpen(false);
    router.replace(path);
  };

  return (
    <View className="flex-1 items-center justify-center">
      <DropdownMenuRoot open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger>
          <TouchableOpacity activeOpacity={0.6}>
            <View className="flex-row items-center space-x-1">
              <Text className="text-xl font-bold text-white">
                {currentRoute}
              </Text>
              <ChevronDown size={24} color="white" />
            </View>
          </TouchableOpacity>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="bottom" align="center">
          {routes.map((route) => {
            const isActive = isRouteActive(route.path, active);

            return (
              <DropdownMenuCheckboxItem
                key={route.path}
                textValue={route.label}
                value={isActive}
                onValueChange={() => {
                  if (!isActive) {
                    handleNavigation(route.path);
                  }
                }}
              >
                <DropdownMenuItemTitle>
                  <Text
                    className={`text-xl ${
                      isActive ? "font-bold text-black" : "text-black"
                    }`}
                  >
                    {route.label}
                  </Text>
                </DropdownMenuItemTitle>
                <DropdownMenuItemIndicator>
                  <Check size={20} color="#000000" />
                </DropdownMenuItemIndicator>
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenuRoot>
    </View>
  );
}
