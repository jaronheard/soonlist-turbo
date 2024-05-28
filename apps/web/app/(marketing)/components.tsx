"use client";

import { useEffect, useRef } from "react";

import { badgeVariants } from "@soonlist/ui/badge";

import { newMessage } from "~/lib/intercom/intercom";

export const AutoPlayVideo = ({ src, ...rest }: { src: string }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  }, []); // Empty dependency array ensures this runs once after the component mounts

  return (
    <video ref={videoRef} autoPlay muted loop playsInline {...rest}>
      <source src={src} type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  );
};

export const NotaflofBadge = () => {
  return (
    <button
      className={badgeVariants({ variant: "secondary" })}
      onClick={() =>
        newMessage(
          "NOTAFLOF request. I'd like to pay ... and my project is ...",
        )
      }
    >
      🌈 NOTAFLOF for community projects.
    </button>
  );
};
