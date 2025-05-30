# Welcome to your Convex functions directory!

Write your Convex functions here. See
https://docs.convex.dev/using/writing-convex-functions for more.

A query function that takes two arguments looks like:

```ts
// functions.js
import { v } from "convex/values";

import { query } from "./_generated/server";

export const myQueryFunction = query({
  // Validators for arguments.
  args: {
    first: v.number(),
    second: v.string(),
  },

  // Function implementation.
  handler: async (ctx, args) => {
    // Read the database as many times as you need here.
    // See https://docs.convex.dev/database/reading-data.
    const documents = await ctx.db.query("tablename").collect();

    // Arguments passed from the client are properties of the args object.
    console.log(args.first, args.second);

    // Write arbitrary JavaScript here: filter, aggregate, build derived data,
    // remove non-public properties, or create new objects.
    return documents;
  },
});
```

Using this query function in a React component looks like:

```ts
const data = useQuery(api.functions.myQueryFunction, {
  first: 10,
  second: "hello",
});
```

A mutation function looks like:

```ts
// functions.js
import { v } from "convex/values";

import { mutation } from "./_generated/server";

export const myMutationFunction = mutation({
  // Validators for arguments.
  args: {
    first: v.string(),
    second: v.string(),
  },

  // Function implementation.
  handler: async (ctx, args) => {
    // Insert or modify documents in the database here.
    // Mutations can also read from the database like queries.
    // See https://docs.convex.dev/database/writing-data.
    const message = { body: args.first, author: args.second };
    const id = await ctx.db.insert("messages", message);

    // Optionally, return a value from your mutation.
    return await ctx.db.get(id);
  },
});
```

Using this mutation function in a React component looks like:

```ts
const mutation = useMutation(api.functions.myMutationFunction);
function handleButtonPress() {
  // fire and forget, the most common way to use mutations
  mutation({ first: "Hello!", second: "me" });
  // OR
  // use the result once the mutation has completed
  mutation({ first: "Hello!", second: "me" }).then((result) =>
    console.log(result),
  );
}
```

Use the Convex CLI to push your functions to a deployment. See everything
the Convex CLI can do by running `npx convex -h` in your project root
directory. To learn more, launch the docs with `npx convex docs`.

# Convex Backend

This package contains the Convex backend functions for the Soonlist application.

## Structure

- `schema.ts` - Database schema definitions
- `users.ts` - User management functions (migrated from tRPC)
- `utils.ts` - Utility functions

## Users Functions

The users module provides the following functions:

### Queries (Read Operations)

- `getById(id: string)` - Get a user by their ID
- `getByUsername(userName: string)` - Get a user by their username
- `getOnboardingData(userId: string)` - Get onboarding data for a user

### Mutations (Write Operations)

- `updateAdditionalInfo(userId: string, info: UserAdditionalInfo)` - Update user profile info
- `saveOnboardingData(userId: string, data: OnboardingData)` - Save onboarding data
- `deleteAccount(userId: string)` - Delete a user account and all related data
- `resetOnboarding(userId: string)` - Reset onboarding for a user
- `setOnboardingCompletedAt(userId: string, completedAt: string)` - Mark onboarding as completed

## Usage Example

```typescript
import { useMutation, useQuery } from "convex/react";

import { api } from "../convex/_generated/api";

// Get a user by username
const user = useQuery(api.users.getByUsername, { userName: "john_doe" });

// Update user profile
const updateProfile = useMutation(api.users.updateAdditionalInfo);
await updateProfile({
  userId: "user1",
  bio: "Software developer",
  publicEmail: "john@example.com",
});
```

## Migration from tRPC

This module replaces the tRPC users router with equivalent Convex functions. Key differences:

1. **Authentication**: Instead of using `ctx.auth.userId` from Clerk, user IDs are passed as explicit parameters
2. **Error Handling**: Uses `ConvexError` instead of `TRPCError`
3. **Validation**: Uses Convex validators (`v.*`) instead of Zod schemas
4. **Database Access**: Uses Convex database queries instead of Drizzle ORM

## Development

To add new functions:

1. Define the function in the appropriate file
2. Add proper argument and return validators
3. Update this README with the new function
4. Test the function in your application

## Schema

The users table includes the following fields:

- `id` - Custom user ID (from Clerk)
- `username` - Unique username
- `email` - User email
- `displayName` - Display name
- `userImage` - Profile image URL
- `bio` - User biography (optional)
- `publicEmail`, `publicPhone`, `publicInsta`, `publicWebsite` - Public contact info (optional)
- `emoji` - User emoji (optional, unique)
- `onboardingData` - Onboarding information (JSON)
- `onboardingCompletedAt` - Onboarding completion timestamp
- `created_at`, `updatedAt` - Timestamps
