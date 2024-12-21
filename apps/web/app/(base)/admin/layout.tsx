import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const roles = user?.publicMetadata.roles as string[] | undefined;
  const isAdmin = roles?.includes("admin");

  if (!isAdmin) {
    redirect("/");
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex-1 space-y-4">{children}</div>
    </div>
  );
}
