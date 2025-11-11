import React, { useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import Intercom from "@intercom/intercom-react-native";

import { Check, ChevronDown, MessageSquare } from "~/components/icons";
import { useAppStore } from "~/store";
import { logError } from "~/utils/errorLogging";
import { getPlanStatusFromUser } from "~/utils/plan";
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
  const discoverAccessOverride = useAppStore((s) => s.discoverAccessOverride);

  // Derive showDiscover explicitly so changes to discoverAccessOverride or user metadata trigger recompute
  const showDiscover =
    discoverAccessOverride ||
    (user ? getPlanStatusFromUser(user).showDiscover : false);

  const { routes, currentRoute } = useMemo(() => {
    const routes = showDiscover ? baseRoutes : baseRoutes.slice(0, 2);
    const currentRoute =
      routes.find((r) => isRouteActive(r.path, active))?.label ?? "Upcoming";

    return { routes, currentRoute };
  }, [showDiscover, active]);

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
