import React, { useCallback, useMemo } from "react";
import { Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";

import { ChevronDown } from "~/components/icons";
import { usePickerResult } from "~/store";

interface PlatformSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  twitter: "Twitter",
  unknown: "Unknown",
};

export function PlatformSelect({
  value,
  onValueChange,
  placeholder = "Select platform",
  error,
  className = "",
}: PlatformSelectProps) {
  const selectedLabel = useMemo(
    () => (value ? PLATFORM_LABELS[value] : undefined),
    [value],
  );

  const handleResult = useCallback(
    (result: string) => {
      onValueChange?.(result);
    },
    [onValueChange],
  );
  usePickerResult("platform", handleResult);

  const openPicker = useCallback(() => {
    router.push({
      pathname: "/pickers/platform",
      params: value ? { value } : undefined,
    });
  }, [value]);

  return (
    <TouchableOpacity
      className={`flex-row items-center justify-between rounded-md border px-3 py-2 ${
        error ? "border-red-500" : "border-neutral-300"
      } ${className}`}
      onPress={openPicker}
    >
      <Text className={selectedLabel ? "text-gray-900" : "text-gray-500"}>
        {selectedLabel ?? placeholder}
      </Text>
      <ChevronDown size={20} color="#666" />
    </TouchableOpacity>
  );
}
