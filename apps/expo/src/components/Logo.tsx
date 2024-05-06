import React from "react";
import { Image } from "react-native";

export function Logo() {
  return (
    <Image
      className="h-24 w-24 rounded-2xl"
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      source={require("../../assets/icon.png")}
    />
  );
}
