import type { Commit } from "../commit-parse";

export async function fetchCommits(branch: string): Promise<Commit[]> {
  const res = await fetch(`/api/commits?branch=${encodeURIComponent(branch)}`);
  return res.json();
}
