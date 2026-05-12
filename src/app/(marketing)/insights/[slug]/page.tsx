import { notFound } from "next/navigation";
import { InsightReportPage } from "@/components/insights/InsightsPages";
import { getInsightReport, insightsReports } from "@/content/insights/reports";

type InsightDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return insightsReports.map((report) => ({ slug: report.slug }));
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

  return <InsightReportPage report={report} />;
}
