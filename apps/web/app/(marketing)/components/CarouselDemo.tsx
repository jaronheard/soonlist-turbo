"use client";

import * as React from "react";
import Image from "next/image";
import Autoplay from "embla-carousel-autoplay";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@soonlist/ui/carousel";

const images = [
  "https://upcdn.io/12a1yek/raw/uploads/Soonlist/1.png",
  "https://upcdn.io/12a1yek/raw/uploads/Soonlist/2.png",
  "https://upcdn.io/12a1yek/raw/uploads/Soonlist/3.png",
  "https://upcdn.io/12a1yek/raw/uploads/Soonlist/4.png",
  "https://upcdn.io/12a1yek/raw/uploads/Soonlist/5.png",
  "https://upcdn.io/12a1yek/raw/uploads/Soonlist/6.png",
  "https://upcdn.io/12a1yek/raw/uploads/Soonlist/7.png",
  // "https://upcdn.io/12a1yek/raw/uploads/Soonlist/8.png",
];

export function CarouselDemo() {
  return (
    <Carousel
      className="h-full w-full"
      plugins={[
        Autoplay({
          delay: 3500,
          jump: true,
          stopOnMouseEnter: true,
        }),
      ]}
      opts={{
        align: "start",
        loop: true,
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
