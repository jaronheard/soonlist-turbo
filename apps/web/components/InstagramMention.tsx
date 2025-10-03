"use client";

import { Instagram } from "lucide-react";

interface InstagramMentionProps {
  username: string;
  isMainAuthor?: boolean;
}

export function InstagramMention({
  username,
  isMainAuthor = false,
}: InstagramMentionProps) {
  // Clean up username - remove @ symbol if present
  const cleanUsername = username.replace(/^@/, "");
  const instagramUrl = `https://www.instagram.com/${cleanUsername}`;

  return (
    <a
      href={instagramUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all hover:scale-105 ${
        isMainAuthor
          ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white ring-2 ring-purple-300 shadow-md"
          : "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 hover:from-purple-200 hover:to-pink-200"
      }`}
    >
      <Instagram className="h-4 w-4" />
      <span className={isMainAuthor ? "font-semibold" : ""}>
        @{cleanUsername}
      </span>
      {isMainAuthor && (
        <span className="ml-1 rounded-full bg-white/30 px-1.5 py-0.5 text-[10px] font-bold uppercase">
          Author
        </span>
      )}
    </a>
  );
}

