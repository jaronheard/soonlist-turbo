"use client";

import React, { useEffect, useState } from "react";

interface EmojiGridProps {
  emojis: string[];
}

const EmojiGrid: React.FC<EmojiGridProps> = ({ emojis }) => {
  // Add this CSS in your global styles or a CSS module
  const styles = `
@keyframes grow {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(2);
  }
  100% {
    transform: scale(1);
  }
}

.animate-grow {
  animation: grow 0.3s ease-in-out infinite;
}
`;

  const getRandomIndex = React.useCallback(
    () => getRandomGrowingEmojiIndex(emojis),
    [emojis],
  );

  const [growingEmojiIndex, setGrowingEmojiIndex] =
    useState<number>(getRandomIndex());

  useEffect(() => {
    if (emojis.length === 0) return;

    const intervalId = setInterval(() => {
      setGrowingEmojiIndex(getRandomIndex());
    }, 300); // Reduced frequency for better performance

    return () => clearInterval(intervalId);
  }, [emojis, getRandomIndex]);

  return (
    <div className="mx-auto grid grid-cols-5 justify-center gap-2">
      <style>{styles}</style>
      {emojis.map((emoji, index) => (
        <span
          key={index}
          className={`text-3xl ${growingEmojiIndex === index ? "animate-grow" : ""}`}
          title="Founding Member"
        >
          {emoji}
        </span>
      ))}
    </div>
  );
};

// Function to generate a random index for the growing emoji
export function getRandomGrowingEmojiIndex(emojis: string[]): number {
  if (!Array.isArray(emojis) || emojis.length === 0) {
    return -1;
  }
  return Math.floor(Math.random() * emojis.length);
}

export default EmojiGrid;
