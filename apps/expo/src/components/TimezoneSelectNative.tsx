import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import moment from "moment-timezone";
import { toast } from "sonner-native";

// Type for timezone data
interface TimeZoneItem {
  value: string; // IANA timezone identifier
  label: string; // Formatted timezone label for display
  search: string; // Lowercase string for searching
  offset: number; // Offset in minutes
  abbreviation: string; // Timezone abbreviation (EST, PST, etc.)
  locationName: string; // Location name without offset
}

// Helper function to get timezone abbreviation
const getTimezoneAbbreviation = (timezone: string): string => {
  try {
    // Use moment-timezone to get the abbreviation
    return moment().tz(timezone).zoneAbbr();
  } catch (error) {
    console.error(`Error getting abbreviation for ${timezone}:`, error);
    return "";
  }
};

// Get timezone offset in minutes
const getTimezoneOffset = (timezone: string): number => {
  try {
    return moment().tz(timezone).utcOffset();
  } catch (error) {
    console.error(`Error calculating offset for ${timezone}:`, error);
    return 0;
  }
};

// Format offset for display in GMT format
const formatGMTOffset = (offsetMinutes: number): string => {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;

  return `GMT${sign}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

// Get the current timezone using moment-timezone
const getCurrentTimezone = (): string => {
  try {
    return moment.tz.guess();
  } catch (error) {
    console.error("Error getting timezone:", error);
    return "America/Los_Angeles"; // Fallback to a default
  }
};

// Get friendly timezone names
const getTimezoneNames = (): Record<string, string> => {
  // This mapping associates IANA timezone identifiers with user-friendly names
  const timezoneNames: Record<string, string> = {
    "Pacific/Midway": "Midway Island, Samoa",
    "Pacific/Honolulu": "Hawaii",
    "America/Juneau": "Alaska",
    "America/Boise": "Mountain Time",
    "America/Dawson": "Dawson, Yukon",
    "America/Chihuahua": "Chihuahua, La Paz, Mazatlan",
    "America/Phoenix": "Arizona",
    "America/Chicago": "Central Time",
    "America/Regina": "Saskatchewan",
    "America/Mexico_City": "Guadalajara, Mexico City, Monterrey",
    "America/Belize": "Central America",
    "America/Detroit": "Eastern Time",
    "America/Bogota": "Bogota, Lima, Quito",
    "America/Caracas": "Caracas, La Paz",
    "America/Santiago": "Santiago",
    "America/St_Johns": "Newfoundland and Labrador",
    "America/Sao_Paulo": "Brasilia",
    "America/Tijuana": "Tijuana",
    "America/Montevideo": "Montevideo",
    "America/Argentina/Buenos_Aires": "Buenos Aires, Georgetown",
    "America/Godthab": "Greenland",
    "America/Los_Angeles": "Pacific Time",
    "Atlantic/Azores": "Azores",
    "Atlantic/Cape_Verde": "Cape Verde Islands",
    GMT: "UTC",
    "Europe/London": "Edinburgh, London",
    "Europe/Dublin": "Dublin",
    "Europe/Lisbon": "Lisbon",
    "Africa/Casablanca": "Casablanca, Monrovia",
    "Atlantic/Canary": "Canary Islands",
    "Europe/Belgrade": "Belgrade, Bratislava, Budapest, Ljubljana, Prague",
    "Europe/Sarajevo": "Sarajevo, Skopje, Warsaw, Zagreb",
    "Europe/Brussels": "Brussels, Copenhagen, Madrid, Paris",
    "Europe/Amsterdam": "Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna",
    "Africa/Algiers": "West Central Africa",
    "Europe/Bucharest": "Bucharest",
    "Africa/Cairo": "Cairo",
    "Europe/Helsinki": "Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius",
    "Europe/Athens": "Athens",
    "Asia/Jerusalem": "Jerusalem",
    "Africa/Harare": "Harare, Pretoria",
    "Europe/Moscow": "Istanbul, Minsk, Moscow, St. Petersburg, Volgograd",
    "Asia/Kuwait": "Kuwait, Riyadh",
    "Africa/Nairobi": "Nairobi",
    "Asia/Baghdad": "Baghdad",
    "Asia/Tehran": "Tehran",
    "Asia/Dubai": "Abu Dhabi, Muscat",
    "Asia/Baku": "Baku, Tbilisi, Yerevan",
    "Asia/Kabul": "Kabul",
    "Asia/Yekaterinburg": "Ekaterinburg",
    "Asia/Karachi": "Islamabad, Karachi, Tashkent",
    "Asia/Kolkata": "Chennai, Kolkata, Mumbai, New Delhi",
    "Asia/Kathmandu": "Kathmandu",
    "Asia/Dhaka": "Astana, Dhaka",
    "Asia/Colombo": "Sri Jayawardenepura",
    "Asia/Almaty": "Almaty, Novosibirsk",
    "Asia/Rangoon": "Yangon Rangoon",
    "Asia/Bangkok": "Bangkok, Hanoi, Jakarta",
    "Asia/Krasnoyarsk": "Krasnoyarsk",
    "Asia/Shanghai": "Beijing, Chongqing, Hong Kong SAR, Urumqi",
    "Asia/Kuala_Lumpur": "Kuala Lumpur, Singapore",
    "Asia/Taipei": "Taipei",
    "Australia/Perth": "Perth",
    "Asia/Irkutsk": "Irkutsk, Ulaanbaatar",
    "Asia/Seoul": "Seoul",
    "Asia/Tokyo": "Osaka, Sapporo, Tokyo",
    "Asia/Yakutsk": "Yakutsk",
    "Australia/Darwin": "Darwin",
    "Australia/Adelaide": "Adelaide",
    "Australia/Sydney": "Canberra, Melbourne, Sydney",
    "Australia/Brisbane": "Brisbane",
    "Australia/Hobart": "Hobart",
    "Asia/Vladivostok": "Vladivostok",
    "Pacific/Guam": "Guam, Port Moresby",
    "Asia/Magadan": "Magadan, Solomon Islands, New Caledonia",
    "Asia/Kamchatka": "Kamchatka, Marshall Islands",
    "Pacific/Fiji": "Fiji Islands",
    "Pacific/Auckland": "Auckland, Wellington",
    "Pacific/Tongatapu": "Nuku'alofa",
  };

  return timezoneNames;
};

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
  const flatListRef = useRef<FlatList>(null);

  // Get current timezone when component mounts
  useEffect(() => {
    setCurrentTimezone(getCurrentTimezone());
  }, []);

  // Process timezones into a format that's easier to use with memoization
  const processedTimezones = useMemo((): TimeZoneItem[] => {
    const timezoneNames = getTimezoneNames();

    // Instead of using all moment timezone names, only use the ones in our curated list
    // This keeps the list manageable and focused on common timezones
    return Object.keys(timezoneNames)
      .map((tzName) => {
        const offset = getTimezoneOffset(tzName);
        const abbr = getTimezoneAbbreviation(tzName);
        // Since we're iterating over the keys of timezoneNames,
        // we know locationName exists, but TypeScript doesn't, so we add a fallback
        const locationName = timezoneNames[tzName] || tzName;

        // Format the label to match: (GMT-11:00) Midway Island, Samoa (SST)
        const formattedOffset = formatGMTOffset(offset);
        const label = `(${formattedOffset}) ${locationName}${abbr ? ` (${abbr})` : ""}`;

        return {
          value: tzName,
          label,
          search:
            `${tzName} ${locationName} ${formattedOffset} ${abbr}`.toLowerCase(),
          offset,
          abbreviation: abbr,
          locationName,
        };
      })
      .sort((a, b) => a.offset - b.offset); // Sort by offset
  }, []);

  const selectedTimezone = useMemo(() => {
    return (
      processedTimezones.find((tz) => tz.value === value) || {
        label: placeholder,
        value: "",
      }
    );
  }, [value, placeholder, processedTimezones]);

  // Prepare the list of timezones, marking the device timezone
  const displayTimezones = useMemo(() => {
    // Create complete list of timezones
    const timezones = [...processedTimezones];

    // Mark the current device timezone with an icon if we have it and we're not searching
    if (currentTimezone && !searchQuery) {
      return timezones.map((tz) => {
        if (tz.value === currentTimezone) {
          // Mark the current timezone with an icon but keep it in its sorted position
          return {
            ...tz,
            label: `📍 ${tz.label} (Current)`,
            isCurrentTimezone: true,
          };
        }
        return tz;
      });
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

  // Find index of the currently selected timezone in the filtered list
  const selectedIndex = useMemo(() => {
    if (!value) return -1;
    return filteredTimezones.findIndex((tz) => tz.value === value);
  }, [filteredTimezones, value]);

  const openModal = useCallback(() => {
    setModalVisible(true);
    // Pre-scroll to selected timezone after modal is opened
    setTimeout(() => {
      if (selectedIndex !== -1 && flatListRef.current) {
        flatListRef.current.scrollToIndex({
          index: selectedIndex,
          animated: true,
          viewOffset: 0,
          viewPosition: 0, // 0 means top of the viewport
        });
      }
    }, 100);
  }, [selectedIndex]);

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
        // Extract the location name without the offset and abbreviation for a cleaner toast
        const locationDisplay = selectedTz.locationName;
        toast.success(`Timezone set to ${locationDisplay}`, {
          duration: 2000,
        });
      }
    },
    [onValueChange, closeModal, processedTimezones],
  );

  const renderItem = ({ item }: { item: TimeZoneItem }) => {
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

  // Handle scroll to index error
  const handleScrollToIndexFailed = (info: {
    index: number;
    highestMeasuredFrameIndex: number;
    averageItemLength: number;
  }) => {
    const wait = new Promise((resolve) => setTimeout(resolve, 100));
    void wait.then(() => {
      flatListRef.current?.scrollToIndex({
        index: info.index,
        animated: true,
        viewPosition: 0,
      });
    });
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
                    ref={flatListRef}
                    data={filteredTimezones}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.value}
                    className="flex-1"
                    showsVerticalScrollIndicator={true}
                    initialNumToRender={20}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    contentContainerClassName="pb-2"
                    onScrollToIndexFailed={handleScrollToIndexFailed}
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
