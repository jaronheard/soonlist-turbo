import React, { useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import Intercom from "@intercom/intercom-react-native";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import {
  Calendar,
  Check,
  ChevronDown,
  Heart,
  History,
  MessageSquare,
} from "~/components/icons";
import { logError } from "~/utils/errorLogging";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemIcon,
  DropdownMenuItemIndicator,
  DropdownMenuItemTitle,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu-primitives";

type RouteType = "upcoming" | "past" | "following";

interface NavigationMenuProps {
  active?: RouteType;
}

const routeIcons = {
  "/feed": { Icon: Calendar, iosIcon: "calendar" },
  "/following": { Icon: Heart, iosIcon: "heart" },
  "/past": { Icon: History, iosIcon: "clock.arrow.circlepath" },
} as const;

const baseRoutes = [
  { label: "Upcoming", path: "/feed" },
  { label: "Following", path: "/following" },
  { label: "Past", path: "/past" },
] as const;

function isRouteActive(routePath: string, active?: RouteType) {
  if (!active) return routePath === "/feed";
  return routePath === (active === "upcoming" ? "/feed" : `/${active}`);
}

export function NavigationMenu({ active }: NavigationMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Check if user is following anyone
  const followingUsers = useQuery(api.users.getFollowingUsers);
  const hasFollowings = (followingUsers?.length ?? 0) > 0;

  const { routes, currentRoute } = useMemo(() => {
    // Filter routes based on following status
    let filteredRoutes = [...baseRoutes];

    // Hide Following tab if user isn't following anyone
    if (!hasFollowings) {
      filteredRoutes = filteredRoutes.filter((r) => r.path !== "/following");
    }

    const currentRoute =
      filteredRoutes.find((r) => isRouteActive(r.path, active))?.label ??
      "Upcoming";

    return { routes: filteredRoutes, currentRoute };
  }, [hasFollowings, active]);

  const handleNavigation = (path: (typeof routes)[number]["path"]) => {
    setMenuOpen(false);
    router.replace(path);
  };

  const presentIntercom = async () => {
    try {
      setMenuOpen(false);
      await Intercom.present();
    } catch (error) {
      logError("Error presenting Intercom", error);
    }
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
            const iconConfig = routeIcons[route.path];
            const IconComponent = iconConfig.Icon;

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
                <DropdownMenuItemIcon ios={{ name: iconConfig.iosIcon }}>
                  <IconComponent size={20} color="#000000" />
                </DropdownMenuItemIcon>
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

          <DropdownMenuItem
            key="feedback"
            textValue="Feedback"
            onSelect={presentIntercom}
          >
            <DropdownMenuItemTitle>
              <Text className="text-xl text-black">Feedback</Text>
            </DropdownMenuItemTitle>
            <DropdownMenuItemIcon ios={{ name: "message" }}>
              <MessageSquare size={20} color="#000000" />
            </DropdownMenuItemIcon>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuRoot>
    </View>
  );
}
