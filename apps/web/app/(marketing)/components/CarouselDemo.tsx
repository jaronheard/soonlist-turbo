"use client";

import * as React from "react";
import Image from "next/image";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@soonlist/ui/carousel";

const images = [
  "https://upcdn.io/12a1yek/raw/uploads/Soonlist/0e.png",
  "https://upcdn.io/12a1yek/raw/uploads/Soonlist/1e.png",
  "https://upcdn.io/12a1yek/raw/uploads/Soonlist/2e.png",
  "https://upcdn.io/12a1yek/raw/uploads/Soonlist/3e.png",
  "https://upcdn.io/12a1yek/raw/uploads/Soonlist/4e.png",
  "https://upcdn.io/12a1yek/raw/uploads/Soonlist/5e.png",
];

export function CarouselDemo() {
  return (
    <Carousel
      className="h-full w-full"
      opts={{
        align: "start",
        loop: false,
      }}
    >
      <CarouselContent>
        {images.map((src, index) => (
          <CarouselItem key={index}>
            <Image
              src={src}
              alt={`Demo frame ${index + 1}`}
              objectFit="cover"
              priority={index === 0}
              height={1616}
              width={750}
              className="rounded-lg"
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
