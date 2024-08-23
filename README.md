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

You'll need to create a `.env.local` file in the root of the project and an .env.production file in the root of the project. Contact @jaronheard for the values for these files.

## Run the project

```bash
pnpm dev

```

## Expo specific instructions

You may need:

- [EAS CLI](https://github.com/expo/eas-cli)

And there may be a few more steps here if you want to run this on a device
