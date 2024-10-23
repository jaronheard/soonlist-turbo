"use client";

export const AutoPlayVideo = ({ src, ...rest }: { src: string }) => {
  return (
    <video autoPlay muted loop playsInline {...rest}>
      <source src={src} type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  );
};
