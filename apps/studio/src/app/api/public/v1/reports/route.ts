import { handlePublicV1ReportsGET } from "@/lib/reporting/public-route-handlers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handlePublicV1ReportsGET(request);
}
