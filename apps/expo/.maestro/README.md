# Maestro E2E Tests

This directory contains end-to-end tests for the Soonlist mobile app using Maestro.

## Directory Structure

- `local/` - Tests for running locally in iOS simulator or Android emulator
- `cloud/` - Tests for running in cloud environments or on real devices
- `flows/` - Shared test flows used by both local and cloud tests
- `config.yaml` - Shared configuration values

## Setup

1. Install Maestro:

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

2. Install the Maestro Studio (optional but recommended):

```bash
maestro studio
```

## Running Tests

### Local Development

1. Start your Expo app:

```bash
yarn workspace expo dev
```

2. Run the local tests:

```bash
maestro test .maestro/local/
```

### Cloud/Real Device Testing

1. Build and deploy your app to a device or cloud environment

2. Run the cloud tests:

```bash
maestro test .maestro/cloud/
```

## Available Test Flows

- `auth.yaml` - Tests the authentication flow
- `onboarding.yaml` - Tests the onboarding experience
- `discover.yaml` - Tests the main app functionality and navigation

## Best Practices

1. Always run tests on a clean app state
2. Keep test data isolated
3. Use meaningful assertions
4. Add proper waits for animations and loading states
5. Keep test flows modular and reusable

## Troubleshooting

If tests are failing, try:

1. Clear app data and cache
2. Ensure the app is properly built and installed
3. Check that all UI elements have proper accessibility labels
4. Use Maestro Studio to debug test flows

## Environment Variables

The tests use different app IDs based on the environment:

- Development: `com.soonlist.app.dev`
- Preview: `com.soonlist.app.preview`
- Production: `com.soonlist.app`
