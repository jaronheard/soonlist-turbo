import Config from "~/utils/config";

export function getKeyChainAccessGroup() {
  return Config.env === "development"
    ? "group.com.soonlist.dev"
    : "group.com.soonlist";
}
