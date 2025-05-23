import fsSync from "fs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
      return;
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

// Run the formatting function
formatEvents().catch((err) => {
  console.error(err);
  process.exit(1);
});
