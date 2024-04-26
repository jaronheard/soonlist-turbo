import { db } from "@/server/db";
import { requestResponses } from "@/server/db/schema";
import { insertRequestResponseSchema } from "@/server/db/types";

export const dynamic = "force-dynamic";

// todo: convert to trpc
export async function POST(req: Request) {
  const reqData = (await req.json()) as unknown;
  const parsedData = insertRequestResponseSchema.parse(reqData);
  const requestResponseRecord = await db
    .insert(requestResponses)
    .values(parsedData);
  console.log("gpt-logs saved to database", requestResponseRecord);
  return new Response(JSON.stringify(requestResponseRecord));
}
