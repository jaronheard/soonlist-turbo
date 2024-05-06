import React from "react";
import { Image, View } from "react-native";
import * as Bytescale from "@bytescale/sdk";

function buildDefaultUrl(filePath: string) {
  return Bytescale.UrlBuilder.url({
    accountId: "12a1yek",
    filePath: filePath,
    options: {},
  });
}

// TODO: Add crop and image picker

export default function ImagePickerSmall({
  uri,
  filePath,
}: {
  uri?: string;
  filePath?: string;
}) {
  if (uri) {
    return (
      <View className="flex-1 items-center justify-center">
        <Image source={{ uri }} className="h-48 w-48" />
      </View>
    );
  }

  const imageUrl = buildDefaultUrl(filePath);

  return (
    <View className="flex-1 items-center justify-center">
      <Image source={{ uri: imageUrl }} className="h-48 w-48" />
    </View>
  );
}
