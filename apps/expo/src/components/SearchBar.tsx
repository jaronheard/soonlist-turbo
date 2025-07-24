import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { X } from "lucide-react-native";

import { cn } from "@soonlist/ui";

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  placeholder?: string;
  isLoading?: boolean;
  className?: string;
}

export default function SearchBar({
  onSearch,
  onClear,
  placeholder = "Search events...",
  isLoading = false,
  className,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = useCallback(
    (text: string) => {
      setQuery(text);
      if (text.trim()) {
        onSearch(text.trim());
      } else {
        onClear();
      }
    },
    [onSearch, onClear],
  );

  const handleClear = useCallback(() => {
    setQuery("");
    onClear();
  }, [onClear]);

  return (
    <View
      className={cn(
        "mx-4 mb-3 flex-row items-center rounded-xl bg-neutral-100 px-4 py-3",
        isFocused && "border border-purple-500",
        className,
      )}
    >
      <TextInput
        value={query}
        onChangeText={handleSearch}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        className="flex-1 text-base text-neutral-900"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
      {isLoading && (
        <ActivityIndicator size="small" color="#9333EA" className="ml-2" />
      )}
      {query.length > 0 && !isLoading && (
        <TouchableOpacity onPress={handleClear} className="ml-2">
          <X size={20} color="#6B7280" />
        </TouchableOpacity>
      )}
    </View>
  );
}
