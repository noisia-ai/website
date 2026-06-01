import {
  authorizeReportingRequest,
  buildReportingDataset,
  buildReportingV2Section,
  csvDatasetResponse,
  errorResponse,
  getPublishedOutputForReporting,
  jsonDatasetResponse,
  jsonV2Response,
  listReportsForGrant,
  listReportsForGrantV2,
  noStoreHeaders,
  resolveReportingDataset,
  resolveReportingV2Section
} from "@/lib/reporting/public-api";

type PublicV1ReportsDeps = {
  authorize: typeof authorizeReportingRequest;
  listReports: typeof listReportsForGrant;
};

type PublicV1ReportDeps = {
  authorize: typeof authorizeReportingRequest;
  getOutput: typeof getPublishedOutputForReporting;
  buildDataset: typeof buildReportingDataset;
};

type PublicV2ReportsDeps = {
  authorize: typeof authorizeReportingRequest;
  listReports: typeof listReportsForGrantV2;
};

type PublicV2ReportDeps = {
  authorize: typeof authorizeReportingRequest;
  getOutput: typeof getPublishedOutputForReporting;
  buildSection: typeof buildReportingV2Section;
};

const v1ReportsDeps: PublicV1ReportsDeps = {
  authorize: authorizeReportingRequest,
  listReports: listReportsForGrant
};

const v1ReportDeps: PublicV1ReportDeps = {
  authorize: authorizeReportingRequest,
  getOutput: getPublishedOutputForReporting,
  buildDataset: buildReportingDataset
};

const v2ReportsDeps: PublicV2ReportsDeps = {
  authorize: authorizeReportingRequest,
  listReports: listReportsForGrantV2
};

const v2ReportDeps: PublicV2ReportDeps = {
  authorize: authorizeReportingRequest,
  getOutput: getPublishedOutputForReporting,
  buildSection: buildReportingV2Section
};

export async function handlePublicV1ReportsGET(request: Request, deps: PublicV1ReportsDeps = v1ReportsDeps) {
  const auth = await deps.authorize(request);
  if (!auth.ok) return auth.response;

  try {
    const data = await deps.listReports(auth.grant);
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

export async function handlePublicV1ReportGET(
  request: Request,
  context: { params: Promise<{ outputId: string; path?: string[] }> },
  deps: PublicV1ReportDeps = v1ReportDeps
) {
  const { outputId, path = [] } = await context.params;
  const auth = await deps.authorize(request, outputId);
  if (!auth.ok) return auth.response;

  const route = path.join("/");
  const lastSegment = path[path.length - 1] ?? "summary";
  const dataset = resolveV1DatasetFromPath(path);
  const wantsCsv = /\.csv$/i.test(lastSegment) || new URL(request.url).searchParams.get("format") === "csv";

  if (!dataset) {
    return errorResponse("unknown_dataset", `Unknown reporting dataset: ${route || "summary"}.`, 404);
  }

  try {
    const output = await deps.getOutput(outputId);
    if (!output) {
      return errorResponse("report_not_found", "Published report not found.", 404);
    }

    const rows = deps.buildDataset(output, dataset);
    return wantsCsv ? csvDatasetResponse(dataset, rows) : jsonDatasetResponse(output, dataset, rows);
  } catch (err) {
    console.error("[reporting-api] dataset failed", { outputId, route, err });
    return errorResponse("server_error", "Reporting API failed while building the dataset.", 500);
  }
}

export async function handlePublicV2ReportsGET(request: Request, deps: PublicV2ReportsDeps = v2ReportsDeps) {
  const auth = await deps.authorize(request);
  if (!auth.ok) return auth.response;

  try {
    const data = await deps.listReports(auth.grant);
    return Response.json(
      {
        data,
        meta: {
          api_version: 2,
          dataset: "reports",
          row_count: data.length
        }
      },
      { headers: noStoreHeaders() }
    );
  } catch (err) {
    console.error("[reporting-api-v2] list reports failed", err);
    return errorResponse("server_error", "Reporting API V2 failed while listing reports.", 500);
  }
}

export async function handlePublicV2ReportGET(
  request: Request,
  context: { params: Promise<{ outputId: string; path?: string[] }> },
  deps: PublicV2ReportDeps = v2ReportDeps
) {
  const { outputId, path = [] } = await context.params;
  const auth = await deps.authorize(request, outputId);
  if (!auth.ok) return auth.response;

  const route = path.join("/");
  const section = resolveV2SectionFromPath(path);

  if (!section) {
    return errorResponse("unknown_section", `Unknown reporting V2 section: ${route || "full"}.`, 404);
  }

  try {
    const output = await deps.getOutput(outputId);
    if (!output) {
      return errorResponse("report_not_found", "Published report not found.", 404);
    }

    const data = deps.buildSection(output, section);
    return jsonV2Response(output, section, data);
  } catch (err) {
    console.error("[reporting-api-v2] section failed", { outputId, route, err });
    return errorResponse("server_error", "Reporting API V2 failed while building the section.", 500);
  }
}

function resolveV1DatasetFromPath(path: string[]) {
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

function resolveV2SectionFromPath(path: string[]) {
  if (path.length === 0) return resolveReportingV2Section("full");

  if (path[0] === "sections") {
    return resolveReportingV2Section(path[1]);
  }

  return resolveReportingV2Section(path[0]);
}
