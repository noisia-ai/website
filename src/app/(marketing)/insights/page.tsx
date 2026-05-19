import { InsightsIndexPage } from "@/components/insights/InsightsPages";

export const metadata = {
  title: "Insights",
  description: "Reportes editoriales de Noisia para convertir conversacion digital en inteligencia accionable."
};

type InsightsPageProps = {
  searchParams?: Promise<{
    page?: string;
  }>;
};

export default async function InsightsPage({ searchParams }: InsightsPageProps) {
  const params = await searchParams;
  const page = Number(params?.page ?? "1");

  return <InsightsIndexPage page={Number.isFinite(page) ? page : 1} />;
}
