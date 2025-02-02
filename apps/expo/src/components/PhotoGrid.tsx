import React, { useMemo } from "react";
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

import type { ImageSource } from "~/components/demoData";
import type { RecentPhoto } from "~/store";
import { cn } from "~/utils/cn";

interface PhotoGridProps {
  hasMediaPermission: boolean;
  hasFullPhotoAccess: boolean;
  recentPhotos: RecentPhoto[];
  onPhotoSelect: (uri: string | ImageSource) => void;
  onCameraPress: () => void;
  onMorePhotos: () => void;
  selectedUri: string | ImageSource | null;
  containerClassName?: string;
}

// Helper function to compare image URIs
function compareImageUris(
  uri1: string | ImageSource | undefined | null,
  uri2: string | ImageSource | undefined | null,
): boolean {
  if (!uri1 || !uri2) return false;

  if (typeof uri1 === "number" && typeof uri2 === "number") {
    return uri1 === uri2;
  }

  if (typeof uri1 === "string" && typeof uri2 === "object" && "uri" in uri2) {
    return uri1 === uri2.uri;
  }

  if (typeof uri2 === "string" && typeof uri1 === "object" && "uri" in uri1) {
    return uri2 === uri1.uri;
  }

  if (typeof uri1 === "string" && typeof uri2 === "string") {
    return uri1 === uri2;
  }

  return false;
}

// Memoize the grid item component
const GridItem = React.memo(
  ({
    item,
    imageSize,
    onPhotoSelect,
    selectedUri,
    hasMediaPermission,
    hasFullPhotoAccess,
    onMorePhotos,
  }: {
    item: RecentPhoto & { id: string };
    imageSize: number;
    onPhotoSelect: (uri: string | ImageSource) => void;
    selectedUri: string | ImageSource | null;
    hasMediaPermission: boolean;
    hasFullPhotoAccess: boolean;
    onMorePhotos: () => void;
  }) => {
    if (item.id === "plus-button") {
      return (
        <Pressable
          onPress={() => {
            if (hasMediaPermission && !hasFullPhotoAccess) {
              ActionSheetIOS.showActionSheetWithOptions(
                {
                  options: ["Select More Photos", "Change Settings", "Cancel"],
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
          compareImageUris(selectedUri, item.uri) && "opacity-50",
        )}
        style={{
          width: imageSize,
          height: imageSize,
        }}
      >
        <ExpoImage
          source={typeof item.uri === "number" ? item.uri : { uri: item.uri }}
          style={{
            width: "100%",
            height: "100%",
          }}
          contentFit="cover"
          contentPosition="center"
          transition={200}
          cachePolicy="memory-disk"
          recyclingKey={item.id}
          placeholder={null}
          placeholderContentFit="cover"
          className="bg-muted/10"
        />
      </Pressable>
    );
  },
);

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
    const spacing = 2;
    const columns = 4;
    const containerPadding = 0;
    const availableWidth =
      windowWidth - spacing * (columns - 1) - containerPadding * 2;
    const imageSize = availableWidth / columns;

    const handleManagePress = () => {
      void Linking.openSettings();
    };

    // Only show the plus button if we have media permission
    const gridData = useMemo(
      () =>
        hasMediaPermission
          ? [...recentPhotos, { id: "plus-button", uri: "" }]
          : [],
      [hasMediaPermission, recentPhotos],
    );

    // Memoize the getItemLayout function
    const getItemLayout = useMemo(
      () =>
        (
          _data: ArrayLike<RecentPhoto & { id: string }> | null | undefined,
          index: number,
        ) => ({
          length: imageSize,
          offset: imageSize * Math.floor(index / columns),
          index,
        }),
      [imageSize, columns],
    );

    const renderItem = useMemo(
      () =>
        ({ item }: { item: RecentPhoto & { id: string } }) => (
          <GridItem
            item={item}
            imageSize={imageSize}
            onPhotoSelect={onPhotoSelect}
            selectedUri={selectedUri}
            hasMediaPermission={hasMediaPermission}
            hasFullPhotoAccess={hasFullPhotoAccess}
            onMorePhotos={onMorePhotos}
          />
        ),
      [
        imageSize,
        onPhotoSelect,
        selectedUri,
        hasMediaPermission,
        hasFullPhotoAccess,
        onMorePhotos,
      ],
    );

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

        <View className="-mx-4 flex-1">
          <FlatList
            data={gridData}
            renderItem={renderItem}
            numColumns={4}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            horizontal={false}
            windowSize={5}
            maxToRenderPerBatch={16}
            updateCellsBatchingPeriod={50}
            initialNumToRender={12}
            removeClippedSubviews={true}
            getItemLayout={getItemLayout}
            contentContainerStyle={{ paddingBottom: 140, gap: spacing }}
            columnWrapperStyle={{ gap: spacing }}
          />
        </View>
      </View>
    );
  },
);
