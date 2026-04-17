// apps/expo/src/components/Toast/ToastProvider.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

export type ToastVariant = "success" | "error";

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastOptions {
  message: string;
  action?: ToastAction;
  duration?: number; // ms, default 4000
  variant?: ToastVariant; // default "success"
}

export interface ActiveToast extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  current: ActiveToast | null;
  show: (options: ToastOptions) => void;
  dismiss: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<ActiveToast | null>(null);
  const idRef = useRef(0);

  const show = useCallback((options: ToastOptions) => {
    idRef.current += 1;
    setCurrent({ id: idRef.current, ...options });
  }, []);

  const dismiss = useCallback(() => {
    setCurrent(null);
  }, []);

  const value = useMemo(
    () => ({ current, show, dismiss }),
    [current, show, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
