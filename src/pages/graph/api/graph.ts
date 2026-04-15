import type { GraphRow } from "../graph-parse";

export async function fetchGraph(): Promise<GraphRow[]> {
  const res = await fetch("/api/graph");
  return res.json();
}
