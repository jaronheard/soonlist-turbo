import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { env } from "~/env";

// Load environment variables
const ONE_SIGNAL_APP_ID = env.ONE_SIGNAL_APP_ID;
const ONE_SIGNAL_REST_API_KEY = env.ONE_SIGNAL_REST_API_KEY;

// Ensure required environment variables are set
if (!ONE_SIGNAL_APP_ID || !ONE_SIGNAL_REST_API_KEY) {
  console.error(
    "Missing required environment variables: ONE_SIGNAL_APP_ID or ONE_SIGNAL_REST_API_KEY",
  );
}

// Define types for request body
interface LiveActivityRequestBody {
  action: "start" | "update" | "end";
  activityId: string;
  content?: {
    message?: Record<string, string>;
    name?: string;
    contents?: Record<string, string>;
    headings?: Record<string, string>;
    sound?: string;
    priority?: number;
  };
  attributes?: Record<string, unknown>;
}

/**
 * POST handler for managing Live Activities via OneSignal
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate the request
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate required environment variables
    if (!ONE_SIGNAL_APP_ID || !ONE_SIGNAL_REST_API_KEY) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    // Parse and validate request body
    const body = (await req.json()) as LiveActivityRequestBody;
    const { action, activityId, content, attributes } = body;

    // Validate required parameters
    if (!action || !activityId) {
      return NextResponse.json(
        { error: "Missing required parameters: action, activityId" },
        { status: 400 },
      );
    }

    // Validate action type
    if (!["start", "update", "end"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be one of: start, update, end" },
        { status: 400 },
      );
    }

    // Prepare request body for OneSignal API
    const oneSignalBody: Record<string, unknown> = {
      event: action,
      activity_id: activityId,
    };

    // Add event_updates for update events
    if (action === "update" && content) {
      oneSignalBody.event_updates = { data: content };
    }

    // Add event_attributes and other fields for start events
    if (action === "start") {
      if (!attributes) {
        return NextResponse.json(
          {
            error:
              "Missing required parameter: attributes (required for start action)",
          },
          { status: 400 },
        );
      }

      oneSignalBody.event_attributes = attributes;

      // Add optional notification fields if provided in content
      if (content?.name) oneSignalBody.name = content.name;
      if (content?.contents) oneSignalBody.contents = content.contents;
      if (content?.headings) oneSignalBody.headings = content.headings;
      if (content?.sound) oneSignalBody.sound = content.sound;
      if (content?.priority) oneSignalBody.priority = content.priority;
    }

    // Make request to OneSignal API
    const url = `https://onesignal.com/api/v1/apps/${ONE_SIGNAL_APP_ID}/activities/activity/DefaultLiveActivityAttributes`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${ONE_SIGNAL_REST_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(oneSignalBody),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as Record<string, unknown>;
      console.error("OneSignal API error:", errorData);
      return NextResponse.json(
        {
          error: "Failed to process Live Activity request",
          details: errorData,
        },
        { status: 500 },
      );
    }

    const responseData = (await response.json()) as Record<string, unknown>;
    return NextResponse.json({ success: true, data: responseData });
  } catch (error) {
    console.error("Error processing Live Activity request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
