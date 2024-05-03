import { Client } from "@planetscale/database";
import { drizzle } from "drizzle-orm/planetscale-serverless";

import * as schema from "./schema";

export * from "drizzle-orm/sql";
export { alias } from "drizzle-orm/mysql-core";

const psClient = new Client({ url: process.env.DATABASE_URL || "" });
export const db = drizzle(psClient, { schema });
