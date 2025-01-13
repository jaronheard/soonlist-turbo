import React from "react";
import {
  ActionSheetIOS,
  Dimensions,
  FlatList,
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import { Camera, ChevronRight, ImagePlus } from "lucide-react-native";

import type { RecentPhoto } from "~/store";
import { cn } from "~/utils/cn";

interface PhotoGridProps {
  hasMediaPermission: boolean;
  hasFullPhotoAccess: boolean;
  recentPhotos: RecentPhoto[];
  onPhotoSelect: (uri: string) => void;
  onCameraPress: () => void;
  onMorePhotos: () => void;
  selectedUri: string | null;
  containerClassName?: string;
}

export const PhotoGrid = React.memo(
  ({
    hasMediaPermission,
    hasFullPhotoAccess,
    recentPhotos,
    onPhotoSelect,
    onCameraPress,
    onMorePhotos,
    selectedUri,
    containerClassName,
  }: PhotoGridProps) => {
    const windowWidth = Dimensions.get("window").width;
    const spacing = 1;
    const columns = 4;
    const imageSize = (windowWidth - (columns - 1) * spacing) / columns;

    const handleManagePress = () => {
      void Linking.openSettings();
    };

    // Only show the plus button if we have media permission
    const gridData = hasMediaPermission
      ? [...recentPhotos, { id: "plus-button", uri: "" }]
      : [];

    return (
      <View className={cn("flex-1", containerClassName)}>
        <View className="flex-row items-center justify-between py-2">
          <Pressable
            className="flex-row items-center gap-0.5"
            onPress={onMorePhotos}
          >
            <Text className="text-xl font-bold text-white">Recents</Text>
            <ChevronRight size={20} color="#fff" />
          </Pressable>
          <View className="flex-row gap-2">
            <Pressable
              onPress={onCameraPress}
              className="rounded-full bg-interactive-3 p-2"
            >
              <Camera size={20} color="#5A32FB" />
            </Pressable>
          </View>
        </View>

        {hasMediaPermission && !hasFullPhotoAccess && (
          <View className="px-4">
            <Pressable
              onPress={handleManagePress}
              className="my-2 flex-row items-center justify-between rounded-md py-1"
            >
              <Text className="flex-1 text-sm text-neutral-3">
                You've given Soonlist access to a select number of photos.
              </Text>
              <View className="ml-4 rounded-sm px-2 py-1">
                <Text className="text-base font-semibold text-white">
                  Manage
                </Text>
              </View>
            </Pressable>
          </View>
        )}

        <View className="flex-1">
          <FlatList
            data={gridData}
            renderItem={({ item }) => {
              if (item.id === "plus-button") {
                return (
                  <Pressable
                    onPress={() => {
                      if (hasMediaPermission && !hasFullPhotoAccess) {
                        // Show action sheet for partial access
                        ActionSheetIOS.showActionSheetWithOptions(
                          {
                            options: [
                              "Select More Photos",
                              "Change Settings",
                              "Cancel",
                            ],
                            cancelButtonIndex: 2,
                          },
                          (buttonIndex) => {
                            if (buttonIndex === 0) {
                              void MediaLibrary.presentPermissionsPickerAsync();
                            } else if (buttonIndex === 1) {
                              void Linking.openSettings();
                            }
                          },
                        );
                      } else {
                        onMorePhotos();
                      }
                    }}
                    style={{
                      width: imageSize,
                      height: imageSize,
                      marginVertical: spacing / 2,
                      marginHorizontal: spacing / 2,
                    }}
                    className="items-center justify-center bg-interactive-3"
                  >
                    <ImagePlus size={36} color="#5A32FB" />
                  </Pressable>
                );
              }

              return (
                <Pressable
                  onPress={() => onPhotoSelect(item.uri)}
                  className={cn(
                    "aspect-square bg-muted/20",
                    selectedUri === item.uri && "opacity-50",
                  )}
                  style={{
                    width: imageSize,
                    height: imageSize,
                    marginVertical: spacing / 2,
                    marginHorizontal: spacing / 2,
                  }}
                >
                  <ExpoImage
                    source={{ uri: item.uri }}
                    style={{
                      width: "100%",
                      height: "100%",
                    }}
                    contentFit="cover"
                    contentPosition="center"
                    transition={100}
                    cachePolicy="disk"
                  />
                </Pressable>
              );
            }}
            numColumns={4}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: 100,
            }}
            keyExtractor={(item) => item.id}
            horizontal={false}
          />
        </View>
      </View>
    );
  },
);
