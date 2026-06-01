import { handlePublicV2ReportGET } from "@/lib/reporting/public-route-handlers";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ outputId: string; path?: string[] }> }
) {
  return handlePublicV2ReportGET(request, context);
}
