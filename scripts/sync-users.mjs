import "dotenv/config";

// Import the necessary libraries
import crypto from "crypto";
import fs from "fs";
import { Clerk } from "@clerk/clerk-sdk-node";

// Set up Clerk client with your Clerk Backend API key
const clerkProd = Clerk({ secretKey: process.env.CLERK_SECRET_KEY_PROD });
const clerkDev = Clerk({ secretKey: process.env.CLERK_SECRET_KEY_DEV });

async function getClerkUsersProd() {
  try {
    // Fetch users from Clerk
    const { data: users } = await clerkProd.users.getUserList({ limit: 500 });
    console.log(`Fetched ${users.length} users from Clerk prod instance.`);
    return users;
  } catch (error) {
    console.error("Failed to fetch users from production:", error);
    throw error; // Rethrow the error if you want to handle it further up the chain.
  }
}

async function deleteAllClerkUsersDev() {
  try {
    // Fetch users from Clerk
    const { data: users } = await clerkDev.users.getUserList({ limit: 500 });
    console.log(`Fetched ${users.length} users from Clerk dev instance.`);
    let deletedUsersCount = 0; // Initialize as let to increment it.
    // Delete all users from Clerk
    for (const user of users) {
      await clerkDev.users.deleteUser(user.id);
      console.log(`Deleted user ${user.id} from Clerk dev instance.`);
      deletedUsersCount++;
    }
    console.log(`Deleted ${deletedUsersCount} users from Clerk dev instance.`);
  } catch (error) {
    console.error("Failed to delete users from development:", error);
    throw error; // Rethrow the error if you want to handle it further up the chain.
  }
}

async function saveUsersToFile(users) {
  try {
    const usersJson = JSON.stringify(users);
    fs.writeFileSync("users.json", usersJson);
    console.log(`Saved ${users.length} users to users.json`);
  } catch (error) {
    console.error("Failed to save users to file:", error);
    throw error; // Rethrow the error if you want to handle it further up the chain.
  }
}

async function addUsersDev(users) {
  let addedUserCount = 0; // Initialize as let to increment it.
  try {
    for (const user of users) {
      const hasPhoneNumber = user.phoneNumbers.length > 0;
      const phoneNumbers = hasPhoneNumber
        ? [user.phoneNumbers[0].phoneNumber]
        : undefined;

      const userToCreate = {
        externalId: user.id,
        emailAddress: [user.emailAddresses[0]?.emailAddress || ""],
        // generate random id for password using crypto
        password: crypto.randomBytes(20).toString("hex"),
        phoneNumber: phoneNumbers,
        username: user.username || undefined,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        publicMetadata: user.publicMetadata || undefined,
        privateMetadata: user.privateMetadata || undefined,
        unsafeMetadata: user.unsafeMetadata || undefined,
      };

      console.log(`Creating user ${user.id} in Clerk.`);
      console.log(userToCreate);
      await clerkDev.users.createUser(userToCreate);
      console.log(`Added user ${user.id} to Clerk.`);
      addedUserCount++;
    }
    console.log(`Added ${addedUserCount} users to Clerk.`);
  } catch (error) {
    console.error("Failed to add users to development:", error);
    throw error; // Rethrow the error if you want to handle it further up the chain.
  }
}

async function main() {
  try {
    // Fetch users from Clerk
    const users = await getClerkUsersProd();
    await deleteAllClerkUsersDev();
    console.log("Deleted development users complete.");
    // await saveUsersToFile(users);
    // console.log("Saved users to file complete.");
    await addUsersDev(users);
    console.log("Added users to development complete.");
  } catch (error) {
    console.error("An error occurred during the sync process:", error);
  }
}

main();
