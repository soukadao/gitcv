const SEP = "\x1f";

export interface GraphCommit {
  hash: string;
  parents: string[];
  author: string;
  date: string;
  message: string;
  refs: string[];
}

export type GraphRow =
  | { type: "commit"; graphPrefix: string; commit: GraphCommit }
  | { type: "graph"; content: string };

export function parseGraphOutput(raw: string): GraphRow[] {
  const rows: GraphRow[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    const sepIdx = line.indexOf(SEP);
    if (sepIdx !== -1) {
      const beforeSep = line.slice(0, sepIdx);
      const hashMatch = beforeSep.match(/([0-9a-f]{40})$/);
      if (!hashMatch) continue;
      const hash = hashMatch[1];
      const graphPrefix = beforeSep.slice(0, -40);
      const [parentsStr = "", author = "", date = "", message = "", refsStr = ""] = line
        .slice(sepIdx + 1)
        .split(SEP);
      rows.push({
        type: "commit",
        graphPrefix,
        commit: {
          hash,
          parents: parentsStr.trim().split(" ").filter(Boolean),
          author,
          date,
          message,
          refs: refsStr
            .split(",")
            .map((r) => r.trim())
            .filter(Boolean),
        },
      });
    } else {
      rows.push({ type: "graph", content: line });
    }
  }
  return rows;
}
