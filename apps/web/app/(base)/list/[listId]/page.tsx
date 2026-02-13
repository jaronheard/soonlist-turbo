import ListDetailClient from "./ListDetailClient";

interface PageProps {
  params: Promise<{ listId: string }>;
}

export default async function ListDetailPage({ params }: PageProps) {
  const { listId } = await params;
  return <ListDetailClient listId={listId} />;
}
