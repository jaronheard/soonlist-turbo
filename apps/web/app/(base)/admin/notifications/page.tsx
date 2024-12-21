import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

const NotificationBroadcastForm = dynamic(
  () =>
    import("./_components/notification-broadcast-form").then(
      (mod) => mod.NotificationBroadcastForm,
    ),
  { ssr: false },
);

export default async function AdminNotificationsPage() {
  const user = await currentUser();
  const roles = user?.publicMetadata.roles as string[] | undefined;
  const isAdmin = roles?.includes("admin");

  if (!isAdmin) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-8 font-heading text-3xl font-bold">
        Broadcast Notifications
      </h1>
      <NotificationBroadcastForm />
    </div>
  );
}
