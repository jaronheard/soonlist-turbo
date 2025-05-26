import fsSync from "fs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createConnection } from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  let connection;
  try {
    connection = await createConnection(DATABASE_URL);
    const [tables] = await connection.query("SHOW TABLES");
    if (!Array.isArray(tables) || tables.length === 0) {
      console.error("No tables found");
      await connection.end();
      return;
    }
    const tableKey = Object.keys(tables[0])[0];
    const exportDir = path.resolve(__dirname, "../../exports");
    await fs.mkdir(exportDir, { recursive: true });

    for (const row of tables) {
      const tableName = row[tableKey];
      const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);
      const filePath = path.join(exportDir, `${tableName}.json`);
      await fs.writeFile(filePath, JSON.stringify(rows, null, 2));
      console.log(`Exported ${tableName} to ${filePath}`);

      // If this is the Events table, run the formatting function
      if (tableName === "Events") {
        console.log("Running formatEvents for Events table...");
        await formatEvents();
      }
    }
  } catch (error) {
    console.error("Error in main function:", error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function formatEvents() {
  try {
    // Read the Events.json file
    const eventsPath = path.join(__dirname, "../../exports/Events.json");
    const outputPath = path.join(
      __dirname,
      "../../exports/Events-formatted.json",
    );

    if (!fsSync.existsSync(eventsPath)) {
      console.error("Events.json file not found at:", eventsPath);
      process.exit(1);
    }

    const eventsData = JSON.parse(await fs.readFile(eventsPath, "utf8"));

    console.log(`Processing ${eventsData.length} events...`);

    // Transform each event
    const formattedEvents = eventsData
      .map((eventItem, index) => {
        try {
          const { event, eventMetadata, ...topLevelProps } = eventItem;

          // Extract the required keys from the nested event object
          const {
            name,
            images = [],
            endDate,
            endTime,
            location,
            timeZone,
            startDate,
            startTime,
            description,
            ...otherEventProps
          } = event || {};

          // Get the first image or null if no images
          const image = images && images.length > 0 ? images[0] : null;

          // Create the formatted event object
          const formattedEvent = {
            ...topLevelProps, // Keep existing top-level properties (id, userId, userName, created_at, updatedAt)
            name,
            image,
            endDate,
            endTime,
            location,
            timeZone,
            startDate,
            startTime,
            description,
            // Keep the specified top-level DateTime and visibility properties
            endDateTime: eventItem.endDateTime,
            startDateTime: eventItem.startDateTime,
            visibility: eventItem.visibility,
            // Keep the original event field
            event,
          };

          return formattedEvent;
        } catch (error) {
          console.error(`Error processing event at index ${index}:`, error);
          return null;
        }
      })
      .filter((event) => event !== null); // Remove any null entries from failed processing

    // Write the formatted events to a new file
    await fs.writeFile(outputPath, JSON.stringify(formattedEvents, null, 2));

    console.log(`✅ Successfully formatted ${formattedEvents.length} events`);
    console.log(`📁 Output saved to: ${outputPath}`);

    // Show a sample of the transformation
    if (formattedEvents.length > 0) {
      console.log("\n📋 Sample formatted event:");
      console.log(JSON.stringify(formattedEvents[0], null, 2));
    }
  } catch (error) {
    console.error("❌ Error formatting events:", error);
  }
}
