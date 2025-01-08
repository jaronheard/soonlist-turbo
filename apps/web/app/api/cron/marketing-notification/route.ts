import { appRouter } from "@soonlist/api";
import { createTRPCContext } from "@soonlist/api/trpc";

export async function GET(req: Request) {
  try {
    const caller = appRouter.createCaller(
      await createTRPCContext({ headers: req.headers }),
    );

    await caller.notification.sendMarketingNotification({
      adminSecret: process.env.ADMIN_SECRET || "",
      title: "📸 Soonlist Just Got Better!",
      body: "Tap to explore our streamlined capture flow, event stats & more. Not seeing it? Update in TestFlight.",
      data: {
        url: "/feed",
      },
    });

    return new Response("Marketing notification sent successfully", {
      status: 200,
    });
  } catch (error) {
    console.error("Error sending marketing notification:", error);
    return new Response("Error sending marketing notification", {
      status: 500,
    });
  }
}
