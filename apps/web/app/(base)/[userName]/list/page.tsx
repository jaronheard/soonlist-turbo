import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ userName: string }>;
}

// Redirect from old /list path to new /{username} path
export default async function PublicListRedirect({ params }: Props) {
  const { userName } = await params;
  redirect(`/${userName}`);
}
