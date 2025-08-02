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
  "https://upcdn.io/12a1yek/raw/uploads/Soonlist/0f.png",
  "https://upcdn.io/12a1yek/raw/uploads/Soonlist/1f.png",
  "https://upcdn.io/12a1yek/raw/uploads/Soonlist/2f.png",
  "https://upcdn.io/12a1yek/raw/uploads/Soonlist/3f.png",
  "https://upcdn.io/12a1yek/raw/uploads/Soonlist/4f.png",
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
              style={{ objectFit: "cover" }}
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
