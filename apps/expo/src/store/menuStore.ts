import { create } from "zustand";

/**
 * Store for tracking menu open/close state to prevent tap-through issues.
 *
 * On iOS, when a native menu (via zeego) is dismissed by tapping outside,
 * the tap event can pass through to underlying interactive components.
 * This store helps coordinate menu state so components can ignore
 * taps that occur immediately after a menu closes.
 */

interface MenuState {
  /** Timestamp when any menu was last closed */
  lastMenuClosedAt: number;
  /** Number of currently open menus */
  openMenuCount: number;
  /** Report that a menu has opened */
  menuOpened: () => void;
  /** Report that a menu has closed */
  menuClosed: () => void;
  /**
   * Check if a tap should be ignored because it likely came from
   * dismissing a menu. Call this before handling navigation or
   * other actions that could be triggered by tap-through.
   * @param graceMs - Grace period in ms (default: 300)
   */
  shouldIgnoreTap: (graceMs?: number) => boolean;
}

export const useMenuStore = create<MenuState>((set, get) => ({
  lastMenuClosedAt: 0,
  openMenuCount: 0,

  menuOpened: () => {
    set((state) => ({
      openMenuCount: state.openMenuCount + 1,
    }));
  },

  menuClosed: () => {
    set((state) => ({
      openMenuCount: Math.max(0, state.openMenuCount - 1),
      lastMenuClosedAt: Date.now(),
    }));
  },

  shouldIgnoreTap: (graceMs = 300) => {
    const { lastMenuClosedAt, openMenuCount } = get();
    // If a menu is currently open, don't ignore (let the menu handle it)
    if (openMenuCount > 0) {
      return false;
    }
    // If a menu recently closed, ignore taps within the grace period
    const elapsed = Date.now() - lastMenuClosedAt;
    return elapsed < graceMs;
  },
}));
