"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ZoomIn } from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

import "yet-another-react-lightbox/styles.css";

interface LightboxImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

export default function LightboxImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className = "",
  priority = false,
  sizes,
}: LightboxImageProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className={`cursor-pointer ${fill ? "relative h-full w-full" : ""}`}
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        aria-label={`Open ${alt} in fullscreen mode`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setOpen(true);
          }
        }}
      >
        <Image
          src={src}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          className={`object-cover object-top ${className}`}
          priority={priority}
          sizes={sizes}
        />
        {/* Gradient fade-out overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-interactive-3"></div>
        {/* Magnifying glass icon */}
        <div className="absolute bottom-2 right-2 rounded-full bg-interactive-2 p-2">
          <ZoomIn className="h-6 w-6 text-interactive-1" />
        </div>
      </div>

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        slides={[{ src }]}
        plugins={[Zoom]}
        carousel={{ finite: true }}
        animation={{ fade: 300 }}
        zoom={{
          maxZoomPixelRatio: 5,
          zoomInMultiplier: 2,
          doubleTapDelay: 300,
          doubleClickDelay: 300,
          keyboardMoveDistance: 50,
          wheelZoomDistanceFactor: 100,
          pinchZoomDistanceFactor: 100,
        }}
        render={{
          buttonPrev: () => null,
          buttonNext: () => null,
        }}
        controller={{
          closeOnBackdropClick: true,
          closeOnPullDown: true,
        }}
        styles={{
          container: { backgroundColor: "rgba(0, 0, 0, .9)" },
        }}
      />
    </>
  );
}
