import type { ImageSourcePropType } from "react-native";
import React, { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { MoreHorizontal, PlusCircle, ShareIcon } from "lucide-react-native";

import onboardingEventsCollage from "../../assets/onboarding-events-collage.png";
import { SoonlistAppIcon } from "./SoonlistAppIcon";

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);

  const renderOverview = () => (
    <>
      <Text className="mb-4 text-center text-4xl font-bold">
        Welcome to Soonlist! 🎉
      </Text>

      <Image
        source={onboardingEventsCollage as ImageSourcePropType}
        className="mb-6 h-40 w-full"
        resizeMode="contain"
      />

      <Text className="mb-6 text-center text-xl">
        Organize your possiblities. Here's what Soonlist does:
      </Text>

      <View className="mb-4">
        <Text className="mb-2 text-xl font-semibold">
          1. Capture events easily 📸
        </Text>
        <Text className="text-base">
          Quickly add events from a screenshot, link, or text.
        </Text>
      </View>

      <View className="mb-4">
        <Text className="mb-2 text-xl font-semibold">
          2. One place for all your possibilities ✨
        </Text>
        <Text className="text-base">
          See every event you've saved in one place.
        </Text>
      </View>

      <View className="mb-4">
        <Text className="mb-2 text-xl font-semibold">
          3. Share with friends 🥳
        </Text>
        <Text className="text-base">
          Easily share your saved events with a link anyone can access.
        </Text>
      </View>

      <Pressable
        onPress={() => setStep(2)}
        className="mt-6 rounded-full bg-interactive-1 px-6 py-3"
      >
        <Text className="text-center font-bold text-white">
          Next: How to Share
        </Text>
      </Pressable>
    </>
  );

  const renderShareInstructions = () => (
    <>
      <Text className="mb-4 text-center text-2xl font-bold">
        Share to Soonlist
      </Text>

      <View className="mb-4">
        <Text className="mb-2 text-xl font-semibold">
          1. Screenshot event info ✨
        </Text>
        <Text className="text-base">
          Take a screenshot or photo that includes event details.
        </Text>
      </View>

      <View className="mb-4">
        <Text className="mb-2 text-xl font-semibold">
          2. Share the screenshot{" "}
          <ShareIcon className="inline-block" size={16} />
        </Text>
        <Text className="text-base">Open your screenshot and tap share.</Text>
      </View>

      <View className="mb-4 rounded-lg bg-accent-yellow p-4">
        <Text className="text-accent-yellow-contrast mb-2 text-base font-bold uppercase">
          One Time Only
        </Text>

        <View className="mb-4">
          <Text className="mb-2 text-xl font-semibold">
            <MoreHorizontal className="inline-block" size={16} /> More in apps
            row
          </Text>
          <Text className="text-base">
            At the end of the second row of options, select{" "}
            <MoreHorizontal className="inline-block" size={12} />
            &nbsp;
            <Text className="font-bold">More</Text>
          </Text>
        </View>

        <View>
          <Text className="mb-2 text-xl font-semibold">
            <PlusCircle
              className="inline-block"
              size={16}
              color={"#FFFFFF"}
              fill={"#53d769"}
            />{" "}
            Favorite Soonlist
          </Text>
          <View className="pl-4">
            <Text className="mb-1 text-base">
              • Tap <Text className="font-bold">Edit</Text> (top right corner)
            </Text>
            <Text className="mb-1 text-base">
              • Tap{" "}
              <Text className="font-bold">
                <PlusCircle
                  className="inline-block"
                  size={16}
                  color={"#FFFFFF"}
                  fill={"#53d769"}
                />{" "}
                Plus
              </Text>{" "}
              left of <Text className="font-bold">Soonlist</Text> (bottom of
              list)
            </Text>
            <Text className="text-base">
              • Tap <Text className="font-bold">Done</Text> (top right corner)
            </Text>
          </View>
        </View>
      </View>

      <View className="mb-4">
        <Text className="mb-2 text-xl font-semibold">
          3. Select Soonlist{" "}
          <View className="inline-block rounded bg-interactive-2 p-1">
            <SoonlistAppIcon size={12} />
          </View>
        </Text>
        <Text className="text-base">
          Tap Soonlist to add your event! That's it.
        </Text>
      </View>

      <Pressable
        onPress={onComplete}
        className="mt-6 rounded-full bg-interactive-1 px-6 py-3"
      >
        <Text className="text-center font-bold text-white">Got it!</Text>
      </Pressable>
    </>
  );

  return (
    <View className="flex-1 justify-center bg-white p-4 pb-12">
      <View className="flex-1 justify-center">
        {step === 1 ? renderOverview() : renderShareInstructions()}
      </View>
    </View>
  );
}
