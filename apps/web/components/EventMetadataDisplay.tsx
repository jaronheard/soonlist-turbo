"use client";

import type { EventMetadata } from "@soonlist/cal";

import { InstagramMention } from "./InstagramMention";

interface EventMetadataDisplayProps {
  eventMetadata?: EventMetadata | null;
}

export function EventMetadataDisplay({
  eventMetadata,
}: EventMetadataDisplayProps) {
  if (!eventMetadata) {
    return null;
  }

  const { source, mentions, urls } = eventMetadata;

  const hasSomeData =
    source || (mentions && mentions.length > 0) || (urls && urls.length > 0);

  if (!hasSomeData) {
    return null;
  }

  return (
    <div className="mt-6 space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
        Source Information
      </h3>

      {/* Platform Badge */}
      {source && source !== "unknown" && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase text-neutral-500">
            Platform:
          </span>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium capitalize text-blue-800">
            {source}
          </span>
        </div>
      )}

      {/* Instagram Mentions */}
      {source === "instagram" && mentions && mentions.length > 0 && (
        <div className="space-y-2">
          <span className="block text-xs font-medium uppercase text-neutral-500">
            Instagram Mentions:
          </span>
          <div className="flex flex-wrap gap-2">
            {mentions.map((mention, index) => (
              <InstagramMention
                key={`${mention}-${index}`}
                username={mention}
                isMainAuthor={index === 0}
              />
            ))}
          </div>
        </div>
      )}

      {/* Generic Mentions (non-Instagram) */}
      {source !== "instagram" && mentions && mentions.length > 0 && (
        <div className="space-y-2">
          <span className="block text-xs font-medium uppercase text-neutral-500">
            Mentions:
          </span>
          <div className="flex flex-wrap gap-2">
            {mentions.map((mention, index) => (
              <span
                key={`${mention}-${index}`}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  index === 0
                    ? "bg-purple-100 text-purple-800 ring-2 ring-purple-300"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                @{mention.replace(/^@/, "")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* URLs */}
      {urls && urls.length > 0 && (
        <div className="space-y-2">
          <span className="block text-xs font-medium uppercase text-neutral-500">
            Related Links:
          </span>
          <div className="space-y-1">
            {urls.map((url, index) => (
              <a
                key={`${url}-${index}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                {url}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
