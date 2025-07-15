import type { ImageSource } from "expo-image";
import React from "react";
import { Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-assertions
const dellaImage = require("../assets/della.png") as ImageSource;
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-assertions
const ericImage = require("../assets/eric.png") as ImageSource;

const testimonials = [
  {
    body: "Soonlist has brought SO much more ease into the process of organizing and prioritizing the events that are important to me!",
    author: {
      name: "Della Mueller",
      title: "Designer",
      handle: "delladella",
      imageSource: dellaImage,
    },
    eventsSaved: 180,
  },
  {
    body: "I'm a freak for my calendar, and Soonlist is the perfect way to keep it fresh and full of events that inspire me.",
    author: {
      name: "Eric Benedon",
      title: "Grad Student",
      handle: "eggsbenedon",
      imageSource: ericImage,
    },
    eventsSaved: 50,
  },
  // {
  //   body: "Honestly, I wasn't sure if I would use it. But now I can't imagine life without it!",
  //   author: {
  //     name: "A.L. Major",
  //     title: "Program Director",
  //     handle: "almajor",
  //     imageSource: null, // placeholder
  //   },
  // },
];

interface TestimonialCardProps {
  testimonial: (typeof testimonials)[0];
}

function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <View
      className="mb-6 rounded-xl bg-accent-yellow p-4"
      style={{
        borderWidth: 3,
        borderColor: "white",
        shadowColor: "#5A32FB",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2.5,
        elevation: 2,
        position: "relative",
      }}
    >
      <Text className="mb-3 text-left font-heading text-base font-bold text-neutral-1">
        “{testimonial.body}”
      </Text>
      <View className="flex-row items-center justify-start">
        {testimonial.author.imageSource ? (
          <ExpoImage
            source={testimonial.author.imageSource}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              borderWidth: 2,
              borderColor: "#ff6b35",
            }}
            contentFit="cover"
            cachePolicy="disk"
          />
        ) : (
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              borderWidth: 2,
              borderColor: "#ff6b35",
              backgroundColor: "#5A32FB",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>
              {testimonial.author.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </Text>
          </View>
        )}
        <View className="ml-2">
          <Text className="text-sm font-semibold text-neutral-1">
            {testimonial.author.name}
          </Text>
          <Text className="text-sm font-medium text-neutral-2">
            {testimonial.author.title}
          </Text>
        </View>
      </View>
      <View
        style={{
          position: "absolute",
          bottom: -10,
          left: 0,
          right: 0,
          zIndex: 20,
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          className="rounded-full bg-interactive-2 px-2 py-0.5"
          style={{
            borderWidth: 2,
            borderColor: "white",
            shadowColor: "#5A32FB",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
            shadowRadius: 1,
            elevation: 1,
          }}
        >
          <Text className="text-xs font-medium text-neutral-1">
            {testimonial.eventsSaved}+ events saved
          </Text>
        </View>
      </View>
    </View>
  );
}

export function SocialProofTestimonials() {
  return (
    <View className="mb-6">
      <View>
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
