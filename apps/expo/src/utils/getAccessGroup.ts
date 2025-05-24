import Config from "~/utils/config";

export function getAccessGroup() {
  return Config.env === "development"
    ? "group.com.soonlist.dev"
    : "group.com.soonlist";
}
