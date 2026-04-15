export interface Commit {
  readonly hash: string;
  readonly author: string;
  readonly date: string;
  readonly message: string;
  readonly trailers: Trailer[];
  readonly notes: string | null;
}

export interface Trailer {
  readonly type: CommitType;
}

export type CommitType =
  | "issue"
  | "spec"
  | "pr"
  | "issue-comment"
  | "spec-comment"
  | "pr-comment"
  | "rd"
  | "rd-comment";

export const COMMIT_LOG_ARGS = ["log", "--reverse", "--format=%H%n%an%n%aI%n%s%n%(trailers)%x01%N%x00"];

export function parseCommits(output: string): Commit[] {
  return output
    .split("\x00")
    .map((block) => block.trim())
    .filter(Boolean)
    .map(parseCommit);
}

function parseCommit(block: string): Commit {
  const [mainPart, notesPart] = block.split("\x01");
  const lines = mainPart.split("\n");
  const [hash, author, date, message, ...trailerLines] = lines;
  const trailers = trailerLines.flatMap(parseTrailer);
  const notes = notesPart?.trim() || null;
  return { hash, author, date, message, trailers, notes };
}

function parseTrailer(line: string): Trailer[] {
  const match = line.match(/^[^:]+:\s*(.+)$/);
  if (!match) return [];
  const value = match[1].toLowerCase().trim();
  if (!isCommitType(value)) return [];
  return [{ type: value }];
}

function isCommitType(value: string): value is CommitType {
  return ["issue", "spec", "pr", "issue-comment", "spec-comment", "pr-comment", "rd", "rd-comment"].includes(value);
}

export interface BranchOrigin {
  readonly branch: string;
  readonly hash: string;
}

export interface CommitsResponse {
  readonly commits: Commit[];
  readonly origin: BranchOrigin | null;
}
