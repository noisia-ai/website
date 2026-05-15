import { notFound, redirect } from "next/navigation";
import { InsightReportPage } from "@/components/insights/InsightsPages";
import { getInsightReport, insightsReports } from "@/content/insights/reports";

type InsightDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return insightsReports.flatMap((report) => [report.slug, ...(report.aliases ?? [])].map((slug) => ({ slug })));
}

export async function generateMetadata({ params }: InsightDetailPageProps) {
  const { slug } = await params;
  const report = getInsightReport(slug);

  return {
    title: report ? report.meta.study : "Insight",
    description: report?.meta.subtitle
  };
}

export default async function InsightDetailPage({ params }: InsightDetailPageProps) {
  const { slug } = await params;
  const report = getInsightReport(slug);

  if (!report) {
    notFound();
  }

  if (slug !== report.slug) {
    redirect(`/insights/${report.slug}`);
  }

  return <InsightReportPage report={report} />;
}
