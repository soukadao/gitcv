import type { CommitsResponse } from "../commit-parse";

export async function fetchCommits(branch: string): Promise<CommitsResponse> {
  const res = await fetch(`/api/commits?branch=${encodeURIComponent(branch)}`);
  return res.json();
}
