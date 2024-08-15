import { Subject } from "rxjs";

export interface ToastMessage {
  message: string;
  type: "success" | "error";
}

export const toastSubject = new Subject<ToastMessage>();

export function showToast(message: string, type: "success" | "error") {
  toastSubject.next({ message, type });
}
