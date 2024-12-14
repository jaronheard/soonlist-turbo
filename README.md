# soonlist-turbo

This is the monorepo for Soonlist. Find the web app at [soonlist.com](https://soonlist.com).

# Setup

In order to develop for project, you'll need a Mac with the following installed:

- [Xcode Command Line Tools](https://developer.apple.com/library/archive/technotes/tn2339/_index.html)
- [Node](https://nodejs.org/en/download/) and a Node version manager like [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm)
- [pnpm](https://pnpm.io/installation)

## Clone the repo

```bash
git clone https://github.com/jaronheard/soonlist-turbo.git
cd soonlist-turbo
```

## Install dependencies

```bash
pnpm install
```

## Setup environment variables

You'll need to create a `.env.local` file in the root of the project and an `.env.production file` in the root of the project. Contact @jaronheard for the values for these files.

## Ngrok Setup

Ngrok is used for exposing your local development server for developing the mobile app. Follow these steps:

1. Sign up for a free account at [ngrok.com](https://ngrok.com/).

2. Install the ngrok CLI globally:

   ```bash
   npm install -g ngrok
   ```

3. Authenticate your ngrok CLI:

   ```bash
   ngrok authtoken YOUR_NGROK_AUTH_TOKEN
   ```

4. Create a new ngrok edge:

   - Go to the [ngrok dashboard](https://dashboard.ngrok.com/).
   - Navigate to "Cloud Edge" > "Edges" and click "New Edge".
   - Configure the edge with the appropriate settings for this project. Contact @jaronheard for this.
   - IMPORTANT: you'll need to create new webooks for each service and add the signing secret for each one. Contact @jaronheard for this.
   - Note the edge ID (it should look like `edghts_XXXXXXXXXXXXXXXXX`).

5. Add your personal ngrok script to the package.json file:

   ```diff
   + "ngrok-YOURNAME": "ngrok tunnel --label edge=edghts_XXXXXXXXXXXXXXXXX http://localhost:3000",
   ```

6. Run the ngrok tunnel:
   ```bash
   pnpm ngrok-YOURNAME
   ```

Note: Each developer will need to create their own ngrok endpoint for mobile app development.

## Run the project

```bash
pnpm dev
```

Simultaneously in another terminal, for webhooks and mobile app development:

```bash
pnpm ngrok-YOURNAME
```

# Notes

## Inspecting the database

To inspect the database, you can use the Drizzle Studio. Run the following command in the `packages/db` folder:

```bash
pnpm studio
```

This will start the Drizzle Studio, allowing you to interact with the database.

## Expo specific instructions

You may need:

- [EAS CLI](https://github.com/expo/eas-cli)

And there may be a few more steps here if you want to run this on a device

## More information needed

Please note that this README is a work in progress, and there's still a lot of information missing. Future updates will include more detailed instructions on various aspects of the project. 😊

🚀✨
