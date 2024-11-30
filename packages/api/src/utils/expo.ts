import type {
  ExpoPushErrorReceipt,
  ExpoPushSuccessTicket,
} from "expo-server-sdk";

export function getTicketId(
  ticket: ExpoPushSuccessTicket | ExpoPushErrorReceipt | undefined,
): string | undefined {
  if (!ticket) return undefined;
  return "id" in ticket ? ticket.id : undefined;
}
