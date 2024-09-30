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

## Local webhooks

A webhook server for the development environment is deployed to Vercel. No local development webhook server is needed.

## Run the project

```bash
pnpm dev
```

Simultaneously in another terminal, for webhooks and mobile app development:

```bash
pnpm ngrok
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
