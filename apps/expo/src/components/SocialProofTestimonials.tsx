import React from "react";
import { Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";

const testimonials = [
  {
    body: "Soonlist has brought SO much more ease into the process of organizing and prioritizing the events that are important to me!",
    author: {
      name: "Della Mueller",
      handle: "delladella",
      imageSource: require("../assets/della.png"),
    },
  },
  {
    body: "I'm a freak for my calendar, and Soonlist is the perfect way to keep it fresh and full of events that inspire me.",
    author: {
      name: "Eric Benedon",
      handle: "eggsbenedon",
      imageSource: require("../assets/eric.png"),
    },
  },
];

interface TestimonialCardProps {
  testimonial: typeof testimonials[0];
}

function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <View className="mx-2 flex-1 rounded-xl bg-accent-yellow p-4 shadow-sm">
      <Text className="mb-3 text-center font-heading text-sm font-bold text-neutral-1">
        "{testimonial.body}"
      </Text>
      <View className="flex-row items-center justify-center">
        <ExpoImage
          source={testimonial.author.imageSource}
          style={{ width: 32, height: 32 }}
          className="rounded-full border-2 border-accent-orange"
          contentFit="cover"
          cachePolicy="disk"
        />
        <View className="ml-2">
          <Text className="text-xs font-semibold text-neutral-1">
            {testimonial.author.name}
          </Text>
          <Text className="text-xs font-medium text-neutral-2">
            @{testimonial.author.handle}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function SocialProofTestimonials() {
  return (
    <View className="mb-6">
      <Text className="mb-3 text-center text-sm font-medium text-gray-600">
        Loved by thousands of users
      </Text>
      <View className="flex-row">
        {testimonials.map((testimonial) => (
          <TestimonialCard
            key={testimonial.author.handle}
            testimonial={testimonial}
          />
        ))}
      </View>
    </View>
  );
}

