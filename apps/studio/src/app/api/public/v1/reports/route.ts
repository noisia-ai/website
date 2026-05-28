import {
  authorizeReportingRequest,
  errorResponse,
  listReportsForGrant,
  noStoreHeaders
} from "@/lib/reporting/public-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await authorizeReportingRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const data = await listReportsForGrant(auth.grant);
    return Response.json(
      {
        data,
        meta: {
          dataset: "reports",
          row_count: data.length
        }
      },
      { headers: noStoreHeaders() }
    );
  } catch (err) {
    console.error("[reporting-api] list reports failed", err);
    return errorResponse("server_error", "Reporting API failed while listing reports.", 500);
  }
}
