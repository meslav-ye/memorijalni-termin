/**
 * Replay ratings against the linked remote Supabase project.
 *
 * Loads service-role key via `supabase projects api-keys` (never prints it).
 * Usage: pnpm dlx tsx scripts/replay-ratings-remote.ts
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { replayAllRatings } from "../lib/data/replay-ratings";

function extractJson(raw: string): unknown {
  const arrayStart = raw.indexOf("[");
  const objectStart = raw.indexOf("{");
  const start =
    arrayStart >= 0 && (objectStart < 0 || arrayStart < objectStart)
      ? arrayStart
      : objectStart;
  if (start < 0) throw new Error("supabase CLI: no JSON in output");
  const opener = raw[start]!;
  const closer = opener === "[" ? "]" : "}";
  const end = raw.lastIndexOf(closer);
  if (end < start) throw new Error("supabase CLI: truncated JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

function supabaseJson(args: string[]): unknown {
  const raw = execFileSync("pnpm", ["exec", "supabase", ...args, "-o", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return extractJson(raw);
}

function linkedProjectRef(): string {
  try {
    const fromFile = readFileSync(
      join(process.cwd(), "supabase", ".temp", "project-ref"),
      "utf8",
    ).trim();
    if (fromFile) return fromFile;
  } catch {
    // fall through to CLI
  }

  const parsed = supabaseJson(["projects", "list"]) as {
    ref: string;
    linked?: boolean;
  }[];
  const linked = parsed.find((p) => p.linked);
  if (!linked) throw new Error("Nema linked Supabase projekta.");
  return linked.ref;
}

function serviceRoleKey(projectRef: string): string {
  const keys = supabaseJson([
    "projects",
    "api-keys",
    "--project-ref",
    projectRef,
  ]) as { name?: string; id?: string; api_key?: string }[];
  const service = keys.find((k) => k.name === "service_role" || k.id === "service_role");
  if (!service?.api_key) throw new Error("service_role key not found");
  return service.api_key;
}

async function main() {
  const ref = linkedProjectRef();
  process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${ref}.supabase.co`;
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey(ref);
  console.log(`Replaying on linked project ${ref}…`);
  const result = await replayAllRatings();
  console.log(`Replayed ${result.games} finished game(s).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
