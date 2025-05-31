import { createContext, useContext } from "react";

import { useSmartUpdates } from "~/hooks/useSmartUpdates";

interface UpdateProviderProps {
  children: React.ReactNode;
}

export type UpdateContextType = ReturnType<typeof useSmartUpdates>;

const UpdateContext = createContext<UpdateContextType | undefined>(undefined);

export const useUpdateContext = () => {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error("useUpdateContext must be used within an UpdateProvider");
  }
  return context;
};

export function UpdateProvider({ children }: UpdateProviderProps) {
  const updates = useSmartUpdates();

  return (
    <UpdateContext.Provider value={updates}>{children}</UpdateContext.Provider>
  );
}
