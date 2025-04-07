import type { Control, FieldValues, Path } from "react-hook-form";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Controller } from "react-hook-form";

import { formatTimeForDisplay } from "./date-utils";

interface TimePickerFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  onPress: () => void;
  error?: string;
  className?: string;
}

export function TimePickerField<T extends FieldValues>({
  control,
  name,
  label,
  onPress,
  error,
  className,
}: TimePickerFieldProps<T>) {
  return (
    <View className={className}>
      {label && <Text className="mb-2 text-base font-semibold">{label}</Text>}
      <View>
        <Controller
          control={control}
          name={name}
          render={({ field: { value } }) => (
            <TouchableOpacity onPress={onPress} className="flex-1 px-3 py-3.5">
              <Text className={value ? "text-black" : "text-neutral-500"}>
                {formatTimeForDisplay(value as string) || "Select time"}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
      {error && <Text className="mt-1 text-xs text-red-500">{error}</Text>}
    </View>
  );
}
