import {
  authorizeReportingRequest,
  buildReportingDataset,
  csvDatasetResponse,
  errorResponse,
  getPublishedOutputForReporting,
  jsonDatasetResponse,
  resolveReportingDataset
} from "@/lib/reporting/public-api";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ outputId: string; path?: string[] }> }
) {
  const { outputId, path = [] } = await context.params;
  const auth = await authorizeReportingRequest(request, outputId);
  if (!auth.ok) return auth.response;

  const route = path.join("/");
  const lastSegment = path[path.length - 1] ?? "summary";
  const dataset = resolveDatasetFromPath(path);
  const wantsCsv = /\.csv$/i.test(lastSegment) || new URL(request.url).searchParams.get("format") === "csv";

  if (!dataset) {
    return errorResponse("unknown_dataset", `Unknown reporting dataset: ${route || "summary"}.`, 404);
  }

  try {
    const output = await getPublishedOutputForReporting(outputId);
    if (!output) {
      return errorResponse("report_not_found", "Published report not found.", 404);
    }

    const rows = buildReportingDataset(output, dataset);
    return wantsCsv ? csvDatasetResponse(dataset, rows) : jsonDatasetResponse(output, dataset, rows);
  } catch (err) {
    console.error("[reporting-api] dataset failed", { outputId, route, err });
    return errorResponse("server_error", "Reporting API failed while building the dataset.", 500);
  }
}

function resolveDatasetFromPath(path: string[]) {
  if (path.length === 0) return resolveReportingDataset("summary");

  if (path[0] === "datasets") {
    return resolveReportingDataset(path[1]);
  }

  if (path[0] === "time-series" && path[1] === "monthly") {
    return resolveReportingDataset("time-series-monthly");
  }

  if (path[0] === "distributions" && path[1]) {
    return resolveReportingDataset(`${path[1]}-distribution`);
  }

  return resolveReportingDataset(path[0]);
}
