import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import moment from "moment-timezone";

import { Check } from "~/components/icons";
import { useSetPickerResult } from "~/store";
import { getUserTimeZone } from "~/utils/dates";
import { logError } from "~/utils/errorLogging";

interface TimeZoneItem {
  value: string;
  label: string;
  search: string;
  offset: number;
  abbreviation: string;
  locationName: string;
}

const getTimezoneAbbreviation = (timezone: string): string => {
  try {
    return moment().tz(timezone).zoneAbbr();
  } catch (error) {
    logError(`Error getting abbreviation for ${timezone}`, error);
    return "";
  }
};

const getTimezoneOffset = (timezone: string): number => {
  try {
    return moment().tz(timezone).utcOffset();
  } catch (error) {
    logError(`Error calculating offset for ${timezone}`, error);
    return 0;
  }
};

const formatGMTOffset = (offsetMinutes: number): string => {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  return `GMT${sign}${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
};

const getCurrentTimezone = (): string => {
  try {
    return moment.tz.guess() || getUserTimeZone();
  } catch (error) {
    logError("Error getting timezone", error);
    return getUserTimeZone();
  }
};

// Curated IANA → friendly-name map. Covers the common worldwide set; keeping
// the picker focused on these instead of every IANA zone keeps the list
// scannable without search.
const TIMEZONE_NAMES: Record<string, string> = {
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

export default function TimezonePickerScreen() {
  const { value } = useLocalSearchParams<{ value?: string }>();
  const setPickerResult = useSetPickerResult();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTimezone, setCurrentTimezone] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setCurrentTimezone(getCurrentTimezone());
  }, []);

  const processedTimezones = useMemo((): TimeZoneItem[] => {
    return Object.keys(TIMEZONE_NAMES)
      .map((tzName) => {
        const offset = getTimezoneOffset(tzName);
        const abbr = getTimezoneAbbreviation(tzName);
        const locationName = TIMEZONE_NAMES[tzName] || tzName;
        const formattedOffset = formatGMTOffset(offset);
        const label = `(${formattedOffset}) ${locationName}${
          abbr ? ` (${abbr})` : ""
        }`;
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
      .sort((a, b) => a.offset - b.offset);
  }, []);

  const displayTimezones = useMemo(() => {
    if (currentTimezone && !searchQuery) {
      return processedTimezones.map((tz) =>
        tz.value === currentTimezone
          ? { ...tz, label: `📍 ${tz.label} (Current)` }
          : tz,
      );
    }
    return processedTimezones;
  }, [processedTimezones, currentTimezone, searchQuery]);

  const filteredTimezones = useMemo(() => {
    if (!searchQuery) return displayTimezones;
    const query = searchQuery.toLowerCase();
    return displayTimezones.filter(
      (tz) =>
        tz.search.includes(query) || tz.value.toLowerCase().includes(query),
    );
  }, [displayTimezones, searchQuery]);

  const selectedIndex = useMemo(() => {
    if (!value) return -1;
    return filteredTimezones.findIndex((tz) => tz.value === value);
  }, [filteredTimezones, value]);

  // Scroll to the currently-selected row on first mount so the user sees
  // where they are in the list, not the top.
  useEffect(() => {
    if (selectedIndex === -1) return;
    const timeoutId = setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: selectedIndex,
        animated: false,
        viewPosition: 0,
      });
    }, 100);
    return () => clearTimeout(timeoutId);
    // Intentionally only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const selectTimezone = (tz: string) => {
    setPickerResult("timezone", tz);
    router.back();
  };

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: "Select Timezone",
          headerSearchBarOptions: {
            placeholder: "Search timezones",
            onChangeText: (e) => setSearchQuery(e.nativeEvent.text),
            hideWhenScrolling: false,
            autoCapitalize: "none",
          },
        }}
      />
      {filteredTimezones.length > 0 ? (
        <FlatList
          ref={flatListRef}
          data={filteredTimezones}
          keyExtractor={(item) => item.value}
          contentInsetAdjustmentBehavior="automatic"
          initialNumToRender={20}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScrollToIndexFailed={handleScrollToIndexFailed}
          renderItem={({ item }) => {
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
                    isSelected
                      ? "font-medium text-interactive-3"
                      : "text-gray-800"
                  }`}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                {isSelected && <Check size={20} color="#535D9E" />}
              </Pressable>
            );
          }}
        />
      ) : (
        <View className="flex-1 items-center justify-center p-5">
          <Text className="text-base text-gray-500">No timezones found</Text>
        </View>
      )}
    </View>
  );
}
