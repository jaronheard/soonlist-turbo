"use client";

import { useEffect, useState } from "react";

const LOADING_TEXTS = [
  "Gathering moments",
  "Curating connections",
  "Igniting excitement",
  "Crafting your event",
  "Building community",
  "Unwrapping anticipation",
  "Connecting the dots",
  "Polishing your plans",
  "Fast-tracking fun",
  "Locking in memories",
  "Spinning up celebration",
  "Assembling joy",
  "Cueing up togetherness",
  "Setting the stage",
  "Plotting your journey",
  "Counting down",
  "Lining up laughter",
];

const PROGRESS_TEXTS = [
  "Moments away...",
  "Almost there...",
  "Just a heartbeat...",
  "Finalizing delight...",
  "Wrapping up wonder...",
  "Nearly ready...",
  "On the brink of amazing...",
  "Seconds to magic...",
  "Finishing touches...",
  "Hang tight, almost ready...",
  "Rounding up the fun...",
  "Last checks before liftoff...",
  "Quick polish, promise...",
  "Ready in a blink...",
  "Snapping into place...",
  "Locking in the love...",
  "Prepping your adventure...",
];

export function EventLoadingText() {
  const [loadingText, setLoadingText] = useState(
    "Moments away..."
  );
  const [randomLoadingText, setRandomLoadingText] = useState("");

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * LOADING_TEXTS.length);
    setRandomLoadingText(LOADING_TEXTS[randomIndex] || "Gathering moments");
  }, []);

  useEffect(() => {
    let index = 0;

    const interval = setInterval(() => {
      index = (index + 1) % PROGRESS_TEXTS.length;
      setLoadingText(PROGRESS_TEXTS[index] || "Moments away...");
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center">
      <p className="font-semibold text-neutral-1">🪄 {randomLoadingText} ✨</p>
      <p className="text-sm text-neutral-2">{loadingText}</p>
    </div>
  );
}
