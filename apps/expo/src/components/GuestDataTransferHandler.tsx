import { useGuestDataTransfer } from "~/hooks/useGuestDataTransfer";

export function GuestDataTransferHandler() {
  // This hook will automatically handle guest data transfer when a user signs in
  useGuestDataTransfer();

  // This component doesn't render anything
  return null;
}
