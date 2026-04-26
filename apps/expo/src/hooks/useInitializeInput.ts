import type { ImageSource } from "expo-image";
import { useCallback, useEffect, useState } from "react";

import { useAppStore } from "~/store";
import { logMessage } from "../utils/errorLogging";

const VALID_IMAGE_REGEX = /^[\w.:\-_/]+\|\d+(\.\d+)?\|\d+(\.\d+)?$/;

interface UseInitializeInputParams {
  text?: string;
  imageUri?: string;
  route: "add" | "new";
}

export function useInitializeInput(
  { text, imageUri, route }: UseInitializeInputParams,
  key?: string,
) {
  const [initialized, setInitialized] = useState(false);
  const {
    setInput,
    setImagePreview,
    setLinkPreview,
    setActiveInput,
    setIsOptionSelected,
  } = useAppStore();

  const handleImagePreview = useCallback(
    (uri: string | number | ImageSource) => {
      if (typeof uri === "string") {
        setImagePreview(uri, route);
        setInput(uri.split("/").pop() || "", route);
      } else if (typeof uri === "number") {
        // Handle ImageRequireSource (local image require)
        setImagePreview(String(uri), route);
        setInput(`local_image_${uri}`, route);
      } else if (uri.uri) {
        // Handle RemoteImageSource
        setImagePreview(uri.uri, route);
        setInput(uri.uri.split("/").pop() || "", route);
      }
    },
    [setImagePreview, setInput, route],
  );

  const handleLinkPreview = useCallback(
    (url: string) => {
      setLinkPreview(url, route);
      setInput(url, route);
    },
    [setLinkPreview, setInput, route],
  );

  const handleTextChange = useCallback(
    (text: string) => {
      setInput(text, route);
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = text.match(urlRegex);
      if (urls && urls.length > 0) {
        handleLinkPreview(urls[0]);
      } else {
        setLinkPreview(null, route);
      }
    },
    [handleLinkPreview, setInput, setLinkPreview, route],
  );

  useEffect(() => {
    // Reset initialized state when key changes
    setInitialized(false);
  }, [key]);

  useEffect(() => {
    if (initialized) return;

    setInput("", route);
    setImagePreview(null, route);
    setLinkPreview(null, route);

    if (text) {
      handleTextChange(text);
      if (route === "add") {
        setActiveInput("describe");
        setIsOptionSelected(true);
      }
    } else if (imageUri) {
      if (VALID_IMAGE_REGEX.test(imageUri)) {
        const [uri, width, height] = imageUri.split("|");
        if (uri) {
          if (uri.startsWith("http")) {
            handleLinkPreview(uri);
            if (route === "add") {
              setActiveInput("url");
            }
          } else {
            void handleImagePreview(uri);
            if (route === "add") {
              setActiveInput("upload");
            }
          }
        }
        setInput(`Image: ${width ?? "unknown"}x${height ?? "unknown"}`, route);
        if (route === "add") {
          setIsOptionSelected(true);
        }
      } else {
        logMessage(
          "Invalid image URI format",
          { imageUri },
          { type: "warning" },
        );
        if (route === "add") {
          setActiveInput("describe");
          setIsOptionSelected(false);
        }
      }
    } else {
      if (route === "add") {
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
    setActiveInput,
    setImagePreview,
    setInput,
    setIsOptionSelected,
    setLinkPreview,
    initialized,
    route,
  ]);

  useEffect(() => {
    if (!initialized) return;
  }, [initialized]);

  return { initialized };
}
