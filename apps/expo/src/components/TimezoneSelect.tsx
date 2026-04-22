import React, { useCallback, useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import moment from "moment-timezone";

import { ChevronDown } from "~/components/icons";
import { usePickerResult } from "~/store";
import { logError } from "~/utils/errorLogging";

interface TimezoneSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}

function getTimezoneOffset(timezone: string): number {
  try {
    return moment().tz(timezone).utcOffset();
  } catch (error) {
    logError(`Error calculating offset for ${timezone}`, error);
    return 0;
  }
}

function getTimezoneAbbreviation(timezone: string): string {
  try {
    return moment().tz(timezone).zoneAbbr();
  } catch (error) {
    logError(`Error getting abbreviation for ${timezone}`, error);
    return "";
  }
}

function formatGMTOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  return `GMT${sign}${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
}

function formatTimezoneLabel(tz: string): string {
  if (!tz) return "";
  const offset = getTimezoneOffset(tz);
  const abbr = getTimezoneAbbreviation(tz);
  const formattedOffset = formatGMTOffset(offset);
  return `(${formattedOffset}) ${tz}${abbr ? ` (${abbr})` : ""}`;
}

export function TimezoneSelect({
  value,
  onValueChange,
  placeholder = "Select a timezone",
  error,
}: TimezoneSelectProps) {
  const displayLabel = useMemo(
    () => (value ? formatTimezoneLabel(value) : ""),
    [value],
  );

  const handleResult = useCallback(
    (result: string) => {
      onValueChange(result);
    },
    [onValueChange],
  );
  usePickerResult("timezone", handleResult);

  const openPicker = useCallback(() => {
    router.push({
      pathname: "/pickers/timezone",
      params: value ? { value } : undefined,
    });
  }, [value]);

  return (
    <View>
      <TouchableOpacity
        onPress={openPicker}
        className={`h-10 flex-row items-center justify-between rounded-md border px-3 ${
          error ? "border-red-500" : "border-gray-300"
        } bg-white`}
        activeOpacity={0.5}
      >
        <Text
          className={`mr-1 flex-1 text-base ${
            !value ? "text-gray-400" : "text-black"
          }`}
          numberOfLines={1}
        >
          {displayLabel || placeholder}
        </Text>
        <ChevronDown size={20} color="#444" />
      </TouchableOpacity>

      {error ? (
        <Text className="mt-1 text-xs text-red-500">{error}</Text>
      ) : null}
    </View>
  );
}
