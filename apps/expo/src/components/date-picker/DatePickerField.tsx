import type { Control, FieldValues, Path } from "react-hook-form";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Controller } from "react-hook-form";

import { formatDateForDisplay } from "./date-utils";

interface DatePickerFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  onPress: () => void;
  error?: string;
  className?: string;
}

export function DatePickerField<T extends FieldValues>({
  control,
  name,
  label,
  onPress,
  error,
  className,
}: DatePickerFieldProps<T>) {
  return (
    <View className={className}>
      {label && <Text className="mb-2 text-base font-semibold">{label}</Text>}
      <View className="border-r border-neutral-100">
        <Controller
          control={control}
          name={name}
          render={({ field: { value } }) => (
            <TouchableOpacity onPress={onPress} className="flex-1 px-3 py-3.5">
              <Text className={value ? "text-black" : "text-neutral-500"}>
                {formatDateForDisplay(value as string) || "Select date"}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
      {error && <Text className="mt-1 text-xs text-red-500">{error}</Text>}
    </View>
  );
}
