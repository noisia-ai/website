import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET() {
  const candidates = [
    path.resolve(process.cwd(), "../../docs/api/openapi.yaml"),
    path.resolve(process.cwd(), "docs/api/openapi.yaml")
  ];

  for (const filePath of candidates) {
    try {
      const spec = await readFile(filePath, "utf8");
      return new Response(spec, {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300",
          "Content-Type": "application/yaml; charset=utf-8",
          "X-Content-Type-Options": "nosniff"
        }
      });
    } catch {
      // Try the next likely workspace root.
    }
  }

  return Response.json(
    { error: "openapi_not_found", message: "OpenAPI specification file not found." },
    { status: 500 }
  );
}
