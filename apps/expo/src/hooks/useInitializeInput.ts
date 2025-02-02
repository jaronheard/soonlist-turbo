import { useCallback, useEffect, useState } from "react";

import type { ImageSource } from "~/components/demoData";
import type { RecentPhoto } from "~/store";
import { useAppStore } from "~/store";

const VALID_IMAGE_REGEX = /^[\w.:\-_/]+\|\d+(\.\d+)?\|\d+(\.\d+)?$/;

interface UseInitializeInputParams {
  text?: string;
  imageUri?: string;
  recentPhotos: RecentPhoto[];
}

export function useInitializeInput({
  text,
  imageUri,
  recentPhotos,
}: UseInitializeInputParams) {
  const [initialized, setInitialized] = useState(false);
  const {
    setInput,
    setImagePreview,
    setLinkPreview,
    setActiveInput,
    setIsOptionSelected,
    hasMediaPermission,
  } = useAppStore();

  const handleImagePreview = useCallback(
    (uri: string | ImageSource) => {
      if (typeof uri === "string") {
        setImagePreview(uri);
        setInput(uri.split("/").pop() || "");
      } else if (typeof uri === "number") {
        // Handle ImageRequireSource (local image require)
        setImagePreview(String(uri));
        setInput(`local_image_${uri}`);
      } else {
        // Handle RemoteImageSource
        setImagePreview(uri.uri);
        setInput(uri.uri.split("/").pop() || "");
      }
    },
    [setImagePreview, setInput],
  );

  const handleLinkPreview = useCallback(
    (url: string) => {
      setLinkPreview(url);
      setInput(url);
    },
    [setLinkPreview, setInput],
  );

  const handleTextChange = useCallback(
    (text: string) => {
      setInput(text);
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = text.match(urlRegex);
      if (urls && urls.length > 0) {
        handleLinkPreview(urls[0]);
      } else {
        setLinkPreview(null);
      }
    },
    [handleLinkPreview, setInput, setLinkPreview],
  );

  useEffect(() => {
    if (initialized) return;

    setInput("");
    setImagePreview(null);
    setLinkPreview(null);

    if (text) {
      handleTextChange(text);
      setActiveInput("describe");
      setIsOptionSelected(true);
    } else if (imageUri) {
      if (VALID_IMAGE_REGEX.test(imageUri)) {
        const [uri, width, height] = imageUri.split("|");
        if (uri) {
          if (uri.startsWith("http")) {
            handleLinkPreview(uri);
            setActiveInput("url");
          } else {
            void handleImagePreview(uri);
            setActiveInput("upload");
          }
        }
        setInput(`Image: ${width ?? "unknown"}x${height ?? "unknown"}`);
        setIsOptionSelected(true);
      } else {
        console.warn("Invalid image URI format:", imageUri);
        setActiveInput("describe");
        setIsOptionSelected(false);
      }
    } else {
      if (hasMediaPermission) {
        setActiveInput("upload");
        setIsOptionSelected(true);
        const mostRecentPhoto = recentPhotos[0];
        if (mostRecentPhoto?.uri) {
          void handleImagePreview(mostRecentPhoto.uri);
        }
      } else {
        // setActiveInput("describe");
        setIsOptionSelected(false);
      }
    }

    setInitialized(true);
  }, [
    text,
    imageUri,
    handleImagePreview,
    handleLinkPreview,
    handleTextChange,
    recentPhotos,
    setActiveInput,
    setImagePreview,
    setInput,
    setIsOptionSelected,
    setLinkPreview,
    hasMediaPermission,
    initialized,
  ]);

  return { initialized };
}
