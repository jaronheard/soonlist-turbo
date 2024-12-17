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

  const [growingEmojiIndex, setGrowingEmojiIndex] = useState<number>(
    getRandomGrowingEmojiIndex(emojis),
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      setGrowingEmojiIndex(getRandomGrowingEmojiIndex(emojis));
    }, 300);

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [emojis]);

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
  return Math.floor(Math.random() * emojis.length);
}

export default EmojiGrid;
