// Downloads the basemap tileset referenced in basemap.json into public/map and verifies its checksum.
// The tileset is too large for Git and is therefore published as a GitHub release asset.
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { mkdir, readFile, rename, rm } from "node:fs/promises";
import process from "node:process";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

const config = JSON.parse(
  await readFile(new URL("../basemap.json", import.meta.url), "utf8")
);
const targetDir = new URL("../public/map/", import.meta.url);
const RELEASE_DOWNLOAD_URL =
  "https://github.com/it-at-m/parkhausradar/releases/download/";

// basemap.json is reviewed in pull requests, these checks only guard against mistakes in it
function validateConfig() {
  if (!/^muenchen-\d{8}\.pmtiles$/.test(config.file)) {
    throw new Error(`Invalid basemap file name: ${config.file}`);
  }
  if (!config.url.startsWith(RELEASE_DOWNLOAD_URL)) {
    throw new Error(
      `Basemap URL must point to a release of this repository: ${config.url}`
    );
  }
  if (!/^[0-9a-f]{64}$/.test(config.sha256)) {
    throw new Error(`Invalid basemap checksum: ${config.sha256}`);
  }
}

async function sha256OfFile(file) {
  const hash = createHash("sha256");
  await pipeline(createReadStream(file), hash);
  return hash.digest("hex");
}

async function download(target) {
  console.debug(`Downloading basemap ${config.url}`);
  const response = await fetch(config.url);
  if (!response.ok || !response.body) {
    throw new Error(
      `Basemap download failed: ${response.status} ${response.statusText}`
    );
  }

  await mkdir(targetDir, { recursive: true });
  const partial = new URL(`${config.file}.part`, targetDir);
  const hash = createHash("sha256");
  const hashing = new Transform({
    transform(chunk, _encoding, callback) {
      hash.update(chunk);
      callback(null, chunk);
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(response.body),
      hashing,
      createWriteStream(partial)
    );
    const actual = hash.digest("hex");
    if (actual !== config.sha256) {
      throw new Error(
        `Basemap checksum mismatch: expected ${config.sha256}, got ${actual}`
      );
    }
    await rename(partial, target);
  } finally {
    await rm(partial, { force: true });
  }

  console.debug(`Basemap ${config.file} downloaded and verified`);
}

try {
  validateConfig();
  const target = new URL(config.file, targetDir);
  if (existsSync(target) && (await sha256OfFile(target)) === config.sha256) {
    console.debug(`Basemap ${config.file} is up to date`);
  } else {
    await download(target);
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
