import React, { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system";
import { Image as ExpoImage } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner-native";
import { z } from "zod";

import { api } from "@soonlist/backend/convex/_generated/api";

import { Button } from "~/components/Button";
import { DatePickerField, TimePickerField } from "~/components/date-picker";
import { EyeOff, Globe2, Image as ImageIcon } from "~/components/icons";
import ImageUploadSpinner from "~/components/ImageUploadSpinner";
import LoadingSpinner from "~/components/LoadingSpinner";
import { TimezoneSelectNative } from "~/components/TimezoneSelectNative";
import { getPlanStatusFromUser } from "~/utils/plan";
import { logError } from "../../../utils/errorLogging";

const formSchema = z.object({
  event: z.object({
    name: z.string().min(1, "Event name is required"),
    description: z.string().optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    timeZone: z.string().optional(),
    location: z.string().optional(),
    images: z.array(z.string()).optional(),
  }),
  eventMetadata: z.object({
    type: z.string().optional(),
    category: z.string().optional(),
    priceType: z.string().optional(),
    ageRestriction: z.string().optional(),
    performers: z.string().optional(),
    accessibility: z.string().optional(),
  }),
  comment: z.string().optional(),
  lists: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
  visibility: z.enum(["public", "private"]).optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const showDiscover = user ? getPlanStatusFromUser(user).showDiscover : false;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const eventQuery = useQuery(api.events.get, id ? { eventId: id } : "skip");

  const updateEventMutation = useMutation(api.events.update);

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty, isValid },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      event: {
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        startTime: "",
        endTime: "",
        timeZone: "",
        location: "",
        images: [],
      },
      eventMetadata: {
        type: "",
        category: "",
        priceType: "",
        ageRestriction: "",
        performers: "",
        accessibility: "",
      },
      comment: "",
      lists: [],
      visibility: "private" as const,
    },
  });

  useEffect(() => {
    if (eventQuery) {
      // Use the properly typed event data
      const eventData = eventQuery.event as {
        name?: string;
        description?: string;
        startDate?: string;
        endDate?: string;
        startTime?: string;
        endTime?: string;
        timeZone?: string;
        location?: string;
        images?: string[];
      };

      const eventMetadata = eventQuery.eventMetadata as {
        type?: string;
        category?: string;
        priceType?: string;
        price?: string;
        ageRestriction?: string;
        performers?: string | string[];
        accessibility?: string | string[];
      };

      reset({
        event: {
          name: eventData?.name || "",
          description: eventData?.description || "",
          startDate: eventData?.startDate || "",
          endDate: eventData?.endDate || "",
          startTime: eventData?.startTime || "",
          endTime: eventData?.endTime || "",
          timeZone: eventData?.timeZone || "",
          location: eventData?.location || "",
          images: eventData?.images || [],
        },
        eventMetadata: {
          type: eventMetadata?.type || "",
          category: eventMetadata?.category || "",
          priceType: eventMetadata?.priceType || "",
            ageRestriction: eventMetadata?.ageRestriction || "",
          performers: Array.isArray(eventMetadata?.performers)
            ? eventMetadata.performers.join(", ")
            : typeof eventMetadata?.performers === "string"
              ? eventMetadata.performers
              : "",
          accessibility: Array.isArray(eventMetadata?.accessibility)
            ? eventMetadata.accessibility.join(", ")
            : typeof eventMetadata?.accessibility === "string"
              ? eventMetadata.accessibility
              : "",
        },
        comment: "",
        lists: [],
        visibility:
          eventQuery.visibility === "public" ||
          eventQuery.visibility === "private"
            ? eventQuery.visibility
            : ("private" as const),
      });

      if (
        eventData?.images &&
        eventData.images.length > 0 &&
        eventData.images[0]
      ) {
        const initialImage = eventData.images[0];
        setSelectedImage(initialImage);
        setOriginalImage(initialImage);
      }
    }
  }, [eventQuery, reset, setSelectedImage]);

  const uploadImage = async (localUri: string): Promise<string> => {
    setIsUploadingImage(true);
    try {
      let fileUri = localUri;
      if (localUri.startsWith("ph://")) {
        const assetId = localUri.replace("ph://", "").split("/")[0];
        if (!assetId) {
          throw new Error("Invalid photo library asset ID");
        }
        const asset = await MediaLibrary.getAssetInfoAsync(assetId);
        if (!asset.localUri) {
          throw new Error("Could not get local URI for photo library asset");
        }
        fileUri = asset.localUri;
      }

      if (!fileUri.startsWith("file://")) {
        throw new Error("Invalid image URI format");
      }

      let manipulatedImage;
      try {
        manipulatedImage = await ImageManipulator.manipulateAsync(
          fileUri,
          [{ resize: { width: 1284, height: undefined } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
        );
      } catch (error) {
        throw new Error(
          `Failed to manipulate image: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }

      if (!manipulatedImage.uri) {
        throw new Error("Image manipulation failed - no URI returned");
      }

      let response;
      try {
        response = await FileSystem.uploadAsync(
          "https://api.bytescale.com/v2/accounts/12a1yek/uploads/binary",
          manipulatedImage.uri,
          {
            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
            httpMethod: "POST",
            headers: {
              "Content-Type": "image/jpeg",
              Authorization: "Bearer public_12a1yekATNiLj4VVnREZ8c7LM8V8",
            },
          },
        );
      } catch (error) {
        throw new Error(
          `Failed to upload image: ${error instanceof Error ? error.message : "Network error"}`,
        );
      }

      if (response.status !== 200) {
        throw new Error(
          `Upload failed with status ${response.status}: ${response.body}`,
        );
      }

      let fileUrl: string;
      try {
        if (!response.body) {
          throw new Error("Empty response from upload server");
        }
        const parsed = JSON.parse(response.body) as { fileUrl?: string };
        if (!parsed.fileUrl) {
          throw new Error("No file URL in response");
        }
        fileUrl = parsed.fileUrl;
      } catch (error) {
        throw new Error(
          `Failed to parse upload response: ${error instanceof Error ? error.message : "Invalid JSON"}`,
        );
      }

      return fileUrl;
    } catch (error) {
      logError("Error uploading image", error);
      throw error;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
      });

      if (
        !result.canceled &&
        result.assets &&
        result.assets.length > 0 &&
        result.assets[0]?.uri
      ) {
        const localUri = result.assets[0].uri;
        setSelectedImage(localUri);

        try {
          const loadingToastId = toast.loading("Uploading image...");

          const remoteUrl = await uploadImage(localUri);

          setUploadedImageUrl(remoteUrl);

          toast.dismiss(loadingToastId);
          toast.success("Image uploaded successfully");
        } catch (error) {
          logError("Error uploading image", error);
          toast.error("Failed to upload image", {
            description:
              error instanceof Error ? error.message : "Unknown error",
          });

          if (selectedImage !== originalImage) {
            setSelectedImage(originalImage);
          }
        }
      }
    } catch (error) {
      logError("Error picking image", error);
      toast.error("Failed to pick image");
    }
  };

  const onSubmit = useCallback(
    async (data: FormData) => {
      if (!id) return;

      const hasImageChanges =
        uploadedImageUrl !== null ||
        (selectedImage !== originalImage && selectedImage !== null);

      if (!isDirty && !hasImageChanges) {
        toast.error("No changes detected");
        return;
      }

      try {
        setIsSubmitting(true);
        const loadingToastId = toast.loading("Updating event...");

        const accessibilityArray = data.eventMetadata.accessibility
          ? data.eventMetadata.accessibility
              .split(",")
              .map((item) => item.trim())
          : [];

        const performersArray = data.eventMetadata.performers
          ? data.eventMetadata.performers.split(",").map((item) => item.trim())
          : [];

        let imageToUse = null;

        if (uploadedImageUrl) {
          imageToUse = uploadedImageUrl;
        } else if (selectedImage === originalImage && originalImage) {
          imageToUse = originalImage;
        } else if (selectedImage === null) {
          imageToUse = null;
        }

        const originalImagesCount = data.event.images?.length || 0;

        let imagesArray: string[] = [];
        if (imageToUse) {
          if (originalImagesCount > 1) {
            imagesArray = Array(originalImagesCount).fill(
              imageToUse,
            ) as string[];
          } else {
            imagesArray = [imageToUse];
          }
        }

        // Only include eventMetadata if it has actual values
        const hasEventMetadata = 
          accessibilityArray.length > 0 ||
          performersArray.length > 0 ||
          data.eventMetadata.type ||
          data.eventMetadata.category ||
          data.eventMetadata.priceType ||
          data.eventMetadata.ageRestriction;

        const updatedData = {
          id,
          event: {
            ...data.event,
            images: imagesArray,
          },
          ...(hasEventMetadata && {
            eventMetadata: {
              ...(data.eventMetadata.type && { type: data.eventMetadata.type }),
              ...(data.eventMetadata.category && { category: data.eventMetadata.category }),
              ...(data.eventMetadata.priceType && { priceType: data.eventMetadata.priceType }),
              ...(data.eventMetadata.ageRestriction && { ageRestriction: data.eventMetadata.ageRestriction }),
              ...(accessibilityArray.length > 0 && { accessibility: accessibilityArray }),
              ...(performersArray.length > 0 && { performers: performersArray }),
            },
          }),
          comment: data.comment || "",
          lists: (data.lists || []).map((list) => ({
            value: list.value,
          })),
          visibility: data.visibility,
        };

        await updateEventMutation(updatedData);

        toast.dismiss(loadingToastId);
        toast.success("Event updated successfully");
        router.back();
      } catch (error) {
        logError("Error updating event", error);
        toast.error("Failed to update event", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      id,
      updateEventMutation,
      selectedImage,
      originalImage,
      uploadedImageUrl,
      isDirty,
    ],
  );

  if (!id || typeof id !== "string") {
    return (
      <View className="flex-1 bg-white">
        <Text>Invalid or missing event id</Text>
      </View>
    );
  }

  if (eventQuery === undefined) {
    return (
      <View className="flex-1 bg-white">
        <LoadingSpinner />
      </View>
    );
  }

  if (!eventQuery) {
    return (
      <View className="flex-1 bg-white">
        <Text>Event not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity
              onPress={() => void handleSubmit(onSubmit)()}
              disabled={
                isSubmitting ||
                isUploadingImage ||
                (!isDirty &&
                  !uploadedImageUrl &&
                  selectedImage === originalImage) ||
                !isValid
              }
              style={{ marginRight: 8 }}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "600",
                  color:
                    isSubmitting ||
                    isUploadingImage ||
                    (!isDirty &&
                      !uploadedImageUrl &&
                      selectedImage === originalImage) ||
                    !isValid
                      ? "rgba(255, 255, 255, 0.5)"
                      : "#FFFFFF",
                }}
              >
                {isSubmitting ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          ),
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 8 }}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "600",
                  color: "#FFFFFF",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView
          className="flex-1 bg-white"
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 36,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-col gap-4 space-y-6">
            <Controller
              control={control}
              name="event.name"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Text className="mb-2 text-base font-semibold">
                    Event Name
                  </Text>
                  <TextInput
                    autoComplete="off"
                    autoCorrect={false}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter event name"
                    className={`h-10 rounded-md border px-3 py-2 ${errors.event?.name ? "border-red-500" : "border-neutral-300"}`}
                  />
                  {errors.event?.name && (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.event.name.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="event.location"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Text className="mb-2 text-base font-semibold">Location</Text>
                  <TextInput
                    autoComplete="off"
                    autoCorrect={false}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter event location"
                    className="h-10 rounded-md border border-neutral-300 px-3 py-2"
                  />
                  {errors.event?.location && (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.event.location.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="event.description"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Text className="mb-2 text-base font-semibold">
                    Description
                  </Text>
                  <TextInput
                    autoComplete="off"
                    autoCorrect={false}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter event description"
                    multiline
                    className="h-24 rounded-md border border-neutral-300 px-3 py-2"
                  />
                  {errors.event?.description && (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.event.description.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <View>
              <Text className="mb-2 text-base font-semibold">Starts</Text>
              <View className="rounded-md border border-neutral-300">
                <View className="flex-row">
                  <DatePickerField
                    control={control}
                    name="event.startDate"
                    label=""
                    error={errors.event?.startDate?.message}
                    className="flex-1"
                  />
                  <TimePickerField
                    control={control}
                    name="event.startTime"
                    label=""
                    error={errors.event?.startTime?.message}
                    className="flex-1"
                    minuteInterval={5}
                  />
                </View>
              </View>
              {(errors.event?.startDate || errors.event?.startTime) && (
                <Text className="mt-1 text-xs text-red-500">
                  {errors.event.startDate?.message ||
                    errors.event.startTime?.message}
                </Text>
              )}
            </View>

            <View>
              <Text className="mb-2 text-base font-semibold">Ends</Text>
              <View className="rounded-md border border-neutral-300">
                <View className="flex-row">
                  <DatePickerField
                    control={control}
                    name="event.endDate"
                    label=""
                    error={errors.event?.endDate?.message}
                    className="flex-1"
                  />
                  <TimePickerField
                    control={control}
                    name="event.endTime"
                    label=""
                    error={errors.event?.endTime?.message}
                    className="flex-1"
                    minuteInterval={5}
                  />
                </View>
              </View>
              {(errors.event?.endDate || errors.event?.endTime) && (
                <Text className="mt-1 text-xs text-red-500">
                  {errors.event.endDate?.message ||
                    errors.event.endTime?.message}
                </Text>
              )}
            </View>

            <Controller
              control={control}
              name="event.timeZone"
              render={({ field: { onChange, onBlur, value } }) => {
                const displayValue =
                  value || Intl.DateTimeFormat().resolvedOptions().timeZone;

                return (
                  <View>
                    <Text className="mb-2 text-base font-semibold">
                      Time Zone
                    </Text>
                    <TimezoneSelectNative
                      value={displayValue}
                      onValueChange={(newValue) => {
                        onChange(newValue);
                        onBlur();
                      }}
                      placeholder="Select a timezone"
                      error={errors.event?.timeZone?.message}
                    />
                  </View>
                );
              }}
            />

            <View>
              <Text className="mb-2 text-lg font-semibold">Event Image</Text>
              <View className="mt-2">
                {selectedImage ? (
                  <View className="rounded-md border border-neutral-300 p-2">
                    <ExpoImage
                      source={{ uri: selectedImage }}
                      style={{
                        width: "100%",
                        height: 300,
                        borderRadius: 6,
                      }}
                      contentFit="contain"
                    />
                    <View className="mt-2 flex-row justify-between">
                      <Button
                        onPress={pickImage}
                        variant="secondary"
                        className="mr-2 flex-1"
                        disabled={isUploadingImage}
                      >
                        {isUploadingImage ? "Uploading..." : "Replace"}
                      </Button>
                      <Button
                        onPress={() => {
                          setSelectedImage(null);
                          setUploadedImageUrl(null);
                          toast.success("Image removed");
                        }}
                        variant="destructive"
                        className="flex-1"
                        disabled={isUploadingImage}
                      >
                        Remove
                      </Button>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={pickImage}
                    className="flex-row items-center justify-center rounded-md border border-dashed border-neutral-300 p-6"
                    disabled={isUploadingImage}
                  >
                    <View className="items-center">
                      {isUploadingImage ? (
                        <>
                          <ImageUploadSpinner />
                          <Text className="mt-2 text-center text-neutral-600">
                            Uploading image...
                          </Text>
                        </>
                      ) : (
                        <>
                          <ImageIcon size={32} color="#666" />
                          <Text className="mt-2 text-center text-neutral-600">
                            Tap to add an image
                          </Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {showDiscover && (
              <Controller
                control={control}
                name="visibility"
                render={({ field: { onChange, value } }) => (
                  <View className="mt-4">
                    <Text className="mb-2 text-base font-semibold">
                      Discoverable
                    </Text>
                    <View className="flex-row items-center justify-between rounded-md border border-neutral-300 p-4">
                      <View className="flex-row items-center">
                        {value === "public" ? (
                          <Globe2 size={20} color="#34435F" className="mr-2" />
                        ) : (
                          <EyeOff size={20} color="#34435F" className="mr-2" />
                        )}
                        <Text className="ml-2 text-neutral-1">
                          {value === "public"
                            ? "Discoverable by others"
                            : "Not discoverable by others"}
                        </Text>
                      </View>
                      <Switch
                        value={value === "public"}
                        onValueChange={(isPublic) => {
                          onChange(isPublic ? "public" : "private");
                        }}
                        trackColor={{ false: "#767577", true: "#4F46E5" }}
                        thumbColor="#f4f3f4"
                      />
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
