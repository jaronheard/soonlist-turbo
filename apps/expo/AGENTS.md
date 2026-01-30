# Expo App

React Native mobile app using Expo Router, NativeWind, and React Query.

## State Management

For Zustand patterns, see [.cursor/rules/zustand.mdc](../../.cursor/rules/zustand.mdc).

The store lives in `src/store.ts`.

## Animations

Use React Native Reanimated with shared values:

```typescript
const sv = useSharedValue(0);
sv.value = withTiming(100);
```

Use `Animated.View` and similar animated components.

## Styling

NativeWind (TailwindCSS for React Native).

## Navigation

Expo Router provides typed file-based navigation.

## Development

- Each developer needs a personal ngrok edge (see root README.md)
- E2E tests use Maestro (`.maestro/` directory)
- Run tests: `pnpm test`

## Menus (Zeego)

Zeego context/dropdown menus cause tap passthrough to underlying content due to iOS `UIContextMenuInteraction` not coordinating with React Native's touch system. A global overlay fix is in place:

- `store.ts` has `isMenuOpen` / `setIsMenuOpen` state
- `_layout.tsx` renders a `Pressable` overlay that swallows stray taps when a menu is open
- **Any new menu component must call `setIsMenuOpen` via `onOpenChange`** — everything else is protected automatically

## Push Notifications

OneSignal handles push notifications.
