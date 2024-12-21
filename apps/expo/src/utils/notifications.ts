import type { ExpoPushTicket } from "expo-server-sdk";

import { api } from "./api";

interface NotificationResult {
  success: boolean;
  ticket?: ExpoPushTicket;
  error?: string;
}

interface BroadcastResult {
  success: boolean;
  totalProcessed: number;
  successfulNotifications: number;
}

export async function sendNotificationToUser(params: {
  expoPushToken: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<NotificationResult> {
  try {
    const result = await api.notification.sendSingleNotification.mutate({
      expoPushToken: params.expoPushToken,
      title: params.title,
      body: params.body,
      data: params.data,
    });

    return result;
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
}

export async function broadcastNotification(params: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  adminSecret: string;
}): Promise<BroadcastResult> {
  try {
    const result = await api.notification.broadcastToAllUsers.mutate({
      title: params.title,
      body: params.body,
      data: params.data ?? {},
      adminSecret: params.adminSecret,
    });

    return result;
  } catch (error) {
    console.error("Error broadcasting notification:", error);
    throw error;
  }
}
