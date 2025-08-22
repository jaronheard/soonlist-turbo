# Product Requirements Document: Discover Access via Offer Codes

## Overview

Enable new users to access the Discover feature through iOS App Store offer codes, with ability for existing users to share Discover access with friends.

## Goals

1. Enable existing users to share Discover access with friends
2. Improve the discover experience for new users (currently you have to ask to be added to Discover and if you're expecting to see the Discover tab, you'll be confused)
3. Drive new user acquisition through Discover feature access

## User Stories

### New User Flow

1. **As a prospective user**, I receive a link with offer code "DISCOVERPDX"
2. **As a new user**, I click the link and am taken to the App Store
3. **As a new user**, I see the offer (e.g., "1 month free with Discover access")
4. **As a new user**, I download the app and start my trial
5. **As a new user**, I automatically get Discover access on first launch

### Existing User Sharing

1. **As a Discover user**, I want to share Discover with friends
2. **As a Discover user**, I tap "Share Discover" in Discover tab
3. **As a Discover user**, I can share via:
   - Pre-written message with offer link

### Admin/Support Flow

1. **As an admin**, I can grant promotional Discover access via RevenueCat
2. **As support**, I can comp users who had issues with offer codes

## Implementation Plan

### 1. App Store Connect Setup

- Create offer code "DISCOVERPDX" (1 month free trial)
- Available to both new AND existing subscribers

### 2. Expo/React Native Implementation (3 parts)

#### Part 1: Enable Discover right after sign-up / login

```typescript
import Purchases from "react-native-purchases";

const onAuthComplete = async (userId: string) => {
  // 1) Link any anonymous purchases to the new account
  const { customerInfo } = await Purchases.logIn(userId);

  // 2) Look for the DISCOVERPDX offer in the linked account
  const hasDiscoverOffer = customerInfo.activeSubscriptions.some((id) =>
    id.includes("DISCOVERPDX"),
  );

  if (hasDiscoverOffer) {
    await clerk.user?.update({
      publicMetadata: { showDiscover: true },
    });
  }
};
```

#### Part 2: Detect redemption by existing subscribers (periodic check)

```typescript
// Call once per app launch or on a timer
const checkOfferCodeForExistingUser = async () => {
  if (!user) return;

  const info = await Purchases.getCustomerInfo();
  const hasDiscoverOffer = info.activeSubscriptions.some((id) =>
    id.includes("DISCOVERPDX"),
  );

  if (hasDiscoverOffer && !user.publicMetadata.showDiscover) {
    await clerk.user?.update({
      publicMetadata: { showDiscover: true },
    });
  }
};
```

#### Part 3: Share Discover Button

```tsx
import { Share } from "react-native";

const ShareDiscoverButton = () => (
  <Button
    onPress={() =>
      Share.share({
        message:
          "Try Discover on Soonlist – 1 month free! " +
          "https://apps.apple.com/redeem?ctx=offercodes&id=SOONLIST_ID&code=DISCOVERPDX",
      })
    }
  >
    Share Discover
  </Button>
);
```

### 3. Analytics

- Track "discover_shared" event when share button tapped
- Existing subscription tracking will capture conversions

## Launch Plan

All at once:

1. Create "DISCOVERPDX" offer code in App Store Connect
2. Deploy iOS app update with:
   - Anonymous purchase handling
   - Offer code detection for new and existing users
   - Share Discover button
3. Start sharing the offer link!

## Success Metrics

- Successful trial starts from offer code
- Share button taps
- Conversion rate (existing RevenueCat tracking)
