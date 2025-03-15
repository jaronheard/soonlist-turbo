import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Check, ChevronDown, Search, X } from "lucide-react-native";
import { toast } from "sonner-native";

// Get the current timezone using the built-in JavaScript API
const getCurrentTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error("Error getting timezone:", error);
    return "America/Los_Angeles"; // Fallback to a default
  }
};

// Define timezone data instead of importing from react-timezone-select
// This provides a comprehensive list of common timezones with their labels
const timezoneData = {
  "Africa/Abidjan": "GMT+0 (Abidjan)",
  "Africa/Accra": "GMT+0 (Accra)",
  "Africa/Addis_Ababa": "EAT+3 (Addis Ababa)",
  "Africa/Algiers": "CET+1 (Algiers)",
  "Africa/Cairo": "EET+2 (Cairo)",
  "Africa/Casablanca": "GMT+0 (Casablanca)",
  "Africa/Johannesburg": "SAST+2 (Johannesburg)",
  "Africa/Lagos": "WAT+1 (Lagos)",
  "Africa/Nairobi": "EAT+3 (Nairobi)",
  "Africa/Tunis": "CET+1 (Tunis)",
  "America/Anchorage": "AKST-9 (Anchorage)",
  "America/Bogota": "COT-5 (Bogota)",
  "America/Buenos_Aires": "ART-3 (Buenos Aires)",
  "America/Caracas": "VET-4 (Caracas)",
  "America/Chicago": "CST-6 (Chicago)",
  "America/Denver": "MST-7 (Denver)",
  "America/Halifax": "AST-4 (Halifax)",
  "America/Los_Angeles": "PST-8 (Los Angeles)",
  "America/Mexico_City": "CST-6 (Mexico City)",
  "America/New_York": "EST-5 (New York)",
  "America/Phoenix": "MST-7 (Phoenix)",
  "America/Regina": "CST-6 (Regina)",
  "America/Santiago": "CLST-3 (Santiago)",
  "America/Sao_Paulo": "BRT-3 (Sao Paulo)",
  "America/St_Johns": "NST-3:30 (St. John's)",
  "America/Toronto": "EST-5 (Toronto)",
  "America/Vancouver": "PST-8 (Vancouver)",
  "Asia/Bangkok": "ICT+7 (Bangkok)",
  "Asia/Dubai": "GST+4 (Dubai)",
  "Asia/Hong_Kong": "HKT+8 (Hong Kong)",
  "Asia/Istanbul": "TRT+3 (Istanbul)",
  "Asia/Jakarta": "WIB+7 (Jakarta)",
  "Asia/Jerusalem": "IST+2 (Jerusalem)",
  "Asia/Kolkata": "IST+5:30 (Kolkata)",
  "Asia/Kuala_Lumpur": "MYT+8 (Kuala Lumpur)",
  "Asia/Manila": "PHT+8 (Manila)",
  "Asia/Seoul": "KST+9 (Seoul)",
  "Asia/Shanghai": "CST+8 (Shanghai)",
  "Asia/Singapore": "SGT+8 (Singapore)",
  "Asia/Taipei": "CST+8 (Taipei)",
  "Asia/Tehran": "IRST+3:30 (Tehran)",
  "Asia/Tokyo": "JST+9 (Tokyo)",
  "Atlantic/Azores": "AZOT-1 (Azores)",
  "Atlantic/Reykjavik": "GMT+0 (Reykjavik)",
  "Australia/Adelaide": "ACDT+10:30 (Adelaide)",
  "Australia/Brisbane": "AEST+10 (Brisbane)",
  "Australia/Darwin": "ACST+9:30 (Darwin)",
  "Australia/Hobart": "AEDT+11 (Hobart)",
  "Australia/Melbourne": "AEDT+11 (Melbourne)",
  "Australia/Perth": "AWST+8 (Perth)",
  "Australia/Sydney": "AEDT+11 (Sydney)",
  "Europe/Amsterdam": "CET+1 (Amsterdam)",
  "Europe/Athens": "EET+2 (Athens)",
  "Europe/Belgrade": "CET+1 (Belgrade)",
  "Europe/Berlin": "CET+1 (Berlin)",
  "Europe/Brussels": "CET+1 (Brussels)",
  "Europe/Bucharest": "EET+2 (Bucharest)",
  "Europe/Copenhagen": "CET+1 (Copenhagen)",
  "Europe/Dublin": "GMT+0 (Dublin)",
  "Europe/Helsinki": "EET+2 (Helsinki)",
  "Europe/Lisbon": "WET+0 (Lisbon)",
  "Europe/London": "GMT+0 (London)",
  "Europe/Madrid": "CET+1 (Madrid)",
  "Europe/Moscow": "MSK+3 (Moscow)",
  "Europe/Oslo": "CET+1 (Oslo)",
  "Europe/Paris": "CET+1 (Paris)",
  "Europe/Prague": "CET+1 (Prague)",
  "Europe/Rome": "CET+1 (Rome)",
  "Europe/Stockholm": "CET+1 (Stockholm)",
  "Europe/Vienna": "CET+1 (Vienna)",
  "Europe/Warsaw": "CET+1 (Warsaw)",
  "Europe/Zurich": "CET+1 (Zurich)",
  "Pacific/Auckland": "NZDT+13 (Auckland)",
  "Pacific/Fiji": "FJST+13 (Fiji)",
  "Pacific/Guam": "ChST+10 (Guam)",
  "Pacific/Honolulu": "HST-10 (Honolulu)",
  "Pacific/Midway": "SST-11 (Midway)",
  "Pacific/Noumea": "NCT+11 (Noumea)",
  "Pacific/Pago_Pago": "SST-11 (Pago Pago)",
  "Pacific/Port_Moresby": "PGT+10 (Port Moresby)",
  "Pacific/Tongatapu": "TOT+13 (Tongatapu)",
};

// Process timezones into a format that's easier to use
const processedTimezones = Object.entries(timezoneData).map(
  ([value, label]) => ({
    value,
    label,
    search: `${value} ${label}`.toLowerCase(),
  }),
);

// Sort timezones by label for better UX
processedTimezones.sort((a, b) => a.label.localeCompare(b.label));

interface TimezoneSelectNativeProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}

export function TimezoneSelectNative({
  value,
  onValueChange,
  placeholder = "Select a timezone",
  error,
}: TimezoneSelectNativeProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTimezone, setCurrentTimezone] = useState<string | null>(null);

  // Get current timezone when component mounts
  useEffect(() => {
    setCurrentTimezone(getCurrentTimezone());
  }, []);

  const selectedTimezone = useMemo(() => {
    return (
      processedTimezones.find((tz) => tz.value === value) || {
        label: placeholder,
        value: "",
      }
    );
  }, [value, placeholder]);

  // Prepare the list of timezones, including a special "current" option
  const displayTimezones = useMemo(() => {
    // Create complete list of timezones
    let timezones = [...processedTimezones];

    // If we have the current timezone and we're not searching, add it to the top
    if (currentTimezone && !searchQuery) {
      const currentTzInfo = processedTimezones.find(
        (tz) => tz.value === currentTimezone,
      );
      if (currentTzInfo) {
        // Move the current timezone to top with a special label
        const currentTzEntry = {
          ...currentTzInfo,
          label: `📍 ${currentTzInfo.label} (Current)`,
          isCurrentTimezone: true,
        };

        // Filter out the current tz from main list to avoid duplication
        timezones = timezones.filter((tz) => tz.value !== currentTimezone);

        // Add current timezone at the beginning
        timezones.unshift(currentTzEntry);
      }
    }

    return timezones;
  }, [processedTimezones, currentTimezone, searchQuery]);

  const filteredTimezones = useMemo(() => {
    if (!searchQuery) return displayTimezones;

    const query = searchQuery.toLowerCase();
    return displayTimezones.filter(
      (tz) =>
        tz.search.includes(query) || tz.value.toLowerCase().includes(query),
    );
  }, [displayTimezones, searchQuery]);

  const openModal = useCallback(() => {
    setModalVisible(true);
    // Add haptic feedback or other indicators here if needed
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setSearchQuery("");
  }, []);

  const selectTimezone = useCallback(
    (tz: string) => {
      onValueChange(tz);
      closeModal();
      // Show confirmation toast
      const selectedTz = processedTimezones.find((item) => item.value === tz);
      if (selectedTz) {
        toast.success(`Timezone set to ${selectedTz.label.split(" (")[0]}`, {
          duration: 2000,
        });
      }
    },
    [onValueChange, closeModal],
  );

  const renderItem = ({ item }: { item: (typeof processedTimezones)[0] }) => {
    const isSelected = item.value === value;

    return (
      <Pressable
        className={`flex-row items-center justify-between border-b border-gray-200 px-4 py-3.5 ${
          isSelected ? "bg-interactive-1" : ""
        }`}
        onPress={() => selectTimezone(item.value)}
      >
        <Text
          className={`mr-2 flex-1 text-base ${
            isSelected ? "font-medium text-interactive-3" : "text-gray-800"
          }`}
          numberOfLines={1}
        >
          {item.label}
        </Text>
        {isSelected && (
          <View>
            <Check size={20} color="#535D9E" />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View>
      <TouchableOpacity
        onPress={openModal}
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
          {selectedTimezone.label}
        </Text>
        <ChevronDown size={20} color="#444" />
      </TouchableOpacity>

      {error ? (
        <Text className="mt-1 text-xs text-red-500">{error}</Text>
      ) : null}

      {modalVisible && (
        <Modal
          visible={true}
          transparent={true}
          animationType="slide"
          statusBarTranslucent
          onRequestClose={closeModal}
          presentationStyle="overFullScreen"
        >
          <View className="z-10 flex-1 items-center justify-center bg-black/70 p-4">
            <View className="z-20 h-[70%] w-full overflow-hidden rounded-xl bg-white shadow-lg">
              <View className="flex-1 bg-white">
                <View className="flex-row items-center justify-between border-b border-gray-200 bg-gray-50 p-4">
                  <Text className="text-lg font-semibold text-gray-900">
                    Select Timezone
                  </Text>
                  <TouchableOpacity onPress={closeModal} hitSlop={12}>
                    <X size={22} color="#333" />
                  </TouchableOpacity>
                </View>

                <View className="flex-row items-center border-b border-gray-200 bg-white px-4 py-3">
                  <View className="mr-5">
                    <Search size={20} color="#444" />
                  </View>
                  <TextInput
                    className="flex-1 py-2 text-base leading-5 text-black"
                    placeholder="Search timezones"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    clearButtonMode="while-editing"
                    autoCapitalize="none"
                    returnKeyType="search"
                    autoCorrect={false}
                    placeholderTextColor="#999"
                  />
                </View>

                {filteredTimezones.length > 0 ? (
                  <FlatList
                    data={filteredTimezones}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.value}
                    className="flex-1"
                    showsVerticalScrollIndicator={true}
                    initialNumToRender={20}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    contentContainerClassName="pb-2"
                  />
                ) : (
                  <View className="flex-1 items-center justify-center p-5">
                    <Text className="text-base text-gray-500">
                      No timezones found
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
