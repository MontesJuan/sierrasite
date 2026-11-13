import { access, cp, mkdtemp, readFile, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "games", "sierra", "dist");
const publicDir = path.join(root, "public");
const target = path.join(publicDir, "jugar");

// Validate a successful game build before replacing the previous public output.
const html = await readFile(path.join(source, "index.html"), "utf8");
if (!html.includes("<html") || !html.includes("<script")) {
  throw new Error("The game build has no valid HTML entry point.");
}
for (const match of html.matchAll(/(?:src|href)=["'](\/[^"']+)["']/g)) {
  const url = match[1].split(/[?#]/)[0];
  if (!url.startsWith("/jugar/")) {
    throw new Error(`Game asset must be scoped to /jugar/: ${url}`);
  }
  const asset = path.resolve(source, url.slice("/jugar/".length));
  if (!asset.startsWith(source + path.sep)) {
    throw new Error("Game asset escapes its build directory.");
  }
  await access(asset);
}
if (!(await stat(source)).isDirectory()) {
  throw new Error("The game dist output is not a directory.");
}

const staging = await mkdtemp(path.join(publicDir, ".jugar-build-"));
const stagedGame = path.join(staging, "jugar");
const previous = path.join(staging, "previous");
let movedPrevious = false;
let preserveStaging = false;
try {
  await cp(source, stagedGame, { recursive: true, errorOnExist: true });
  try {
    await rename(target, previous);
    movedPrevious = true;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  try {
    await rename(stagedGame, target);
  } catch (error) {
    if (movedPrevious) {
      try {
        await rename(previous, target);
      } catch (restoreError) {
        preserveStaging = true;
        throw new AggregateError(
          [error, restoreError],
          `Could not restore the previous game. It is preserved at ${previous}`,
        );
      }
    }
    throw error;
  }
  console.log("SIERRA adventure built at public/jugar (entry: /jugar).");
} finally {
  if (!preserveStaging) await rm(staging, { recursive: true, force: true });
}
