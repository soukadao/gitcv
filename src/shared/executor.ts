import { spawn, SpawnOptions } from "child_process";

export function execute(args: string[], spawnOptions: SpawnOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, spawnOptions);
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout).toString("utf-8"));
      } else {
        reject(new Error(Buffer.concat(stderr).toString("utf-8")));
      }
    });
  });
}
