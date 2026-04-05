export async function fetchBranches(): Promise<string[]> {
  const res = await fetch("/api/branches");
  return res.json();
}
