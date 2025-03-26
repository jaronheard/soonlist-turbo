import type { ImageSourcePropType } from "react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import { FinishDemoButton } from "~/components/FinishDemoButton";
import { QuestionContainer } from "~/components/QuestionContainer";
import { useAppStore } from "~/store";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";
import { logError } from "../../../utils/errorLogging";

interface Testimonial {
  body: string;
  author: {
    name: string;
    bio: string;
    handle: string;
    imageUrl: ImageSourcePropType;
  };
}

// For now, we'll use a static testimonial but this could be made dynamic
const testimonial: Testimonial = {
  body: "Soonlist has brought SO much more ease into organizing and prioritizing events I see!",
  author: {
    name: "Della Mueller",
    bio: "Designer, Portland, OR",
    handle: "delladella",
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    imageUrl: require("~/assets/della.png"),
  },
};

export default function WeGotYouScreen() {
  const { onboardingData } = useAppStore();

  const getPriorityMessage = () => {
    const priorityText = onboardingData.priority?.text;
    if (priorityText === "Meet new people") {
      return "See all your possibilities in one place—never miss a chance to connect.";
    }
    if (priorityText === "Get out more") {
      return "See all your possibilities in one place—always have options ready.";
    }
    if (priorityText === "No more FOMO") {
      return "See all your possibilities in one place—be confident in your choices.";
    }
    if (priorityText === "Plan flexibly") {
      return "See all your possibilities in one place—decide when you're ready.";
    }
    if (priorityText === "Build community") {
      return "See all your possibilities in one place—bring people together.";
    }
    return "See all your possibilities in one place—do more of what matters.";
  };

  return (
    <QuestionContainer
      question=""
      currentStep={7}
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <View className="w-full flex-1 items-center justify-center">
        <Text className="mb-4 px-4 text-center text-4xl font-bold text-white">
          We got you
        </Text>
        <Text className="mb-12 px-4 text-center text-2xl text-white">
          {getPriorityMessage()}
        </Text>
        <View className="mb-12 w-full rounded-lg bg-accent-yellow px-6 py-4 shadow-sm">
          <Text className="text-lg font-medium leading-tight text-neutral-1">
            "{testimonial.body}"
          </Text>
          <View className="mt-2 flex-row items-center justify-start gap-2">
            <Image
              source={testimonial.author.imageUrl}
              style={styles.authorImage}
              contentFit="cover"
              contentPosition="center"
              onError={(error) => {
                logError("Image loading error", error);
              }}
            />
            <View>
              <Text className="text-base font-semibold leading-none text-neutral-1">
                {testimonial.author.name}
              </Text>
              <Text className="text-base font-medium leading-none text-neutral-2">
                {testimonial.author.bio}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <FinishDemoButton text="Start your free trial" variant="light" />
    </QuestionContainer>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 100,
    paddingVertical: 12,
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  text: {
    color: "#000",
    fontSize: 16,
    fontWeight: "500",
  },
  authorImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 6,
    borderColor: "#FFD1BA", // accent-orange
  },
});
