import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createConnection } from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

async function main() {
  const connection = await createConnection(DATABASE_URL);
  const [tables] = await connection.query("SHOW TABLES");
  if (!Array.isArray(tables) || tables.length === 0) {
    console.error("No tables found");
    await connection.end();
    return;
  }
  const tableKey = Object.keys(tables[0])[0];
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const exportDir = path.resolve(__dirname, "../../exports");
  await fs.mkdir(exportDir, { recursive: true });

  for (const row of tables) {
    const tableName = row[tableKey];
    const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);
    const filePath = path.join(exportDir, `${tableName}.json`);
    await fs.writeFile(filePath, JSON.stringify(rows, null, 2));
    console.log(`Exported ${tableName} to ${filePath}`);
  }

  await connection.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
