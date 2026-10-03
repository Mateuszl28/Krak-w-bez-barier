import { SearchView } from "@/components/SearchView";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return <SearchView initialQuery={sp.q ?? ""} awaria={sp.awaria ?? ""} />;
}
