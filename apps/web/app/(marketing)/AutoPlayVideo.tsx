"use client";

import { useEffect, useRef } from "react";

// const sampleEventId =
//   process.env.NODE_ENV === "production"
//     ? "t8f7locjjfbf"
//     : "clpiq9ohe0005vt8uksvndxq3";
// const sampleEventListId =
//   process.env.NODE_ENV === "production"
//     ? "cloetmfc60001jr0ays7hsxum"
//     : "tlmtav2fb70t";
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
