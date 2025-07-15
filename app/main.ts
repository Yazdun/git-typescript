import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "init":
    init();
    break;

  case "cat-file":
    catFile();
    break;

  case "hash-object":
    hashObject();
    break;

  default:
    throw new Error(`Unknown command ${command}`);
}

function init() {
  fs.mkdirSync(".git", { recursive: true });
  fs.mkdirSync(".git/objects", { recursive: true });
  fs.mkdirSync(".git/refs", { recursive: true });
  fs.writeFileSync(".git/HEAD", "ref: refs/heads/main\n");
  console.log("Initialized git directory");
}

function catFile(): void {
  const hash = process.argv[4];
  const folder = hash.substring(0, 2);
  const file = hash.substring(2);
  const blobPath = path.join(process.cwd(), ".git", "objects", folder, file);

  try {
    const compressed = fs.readFileSync(blobPath);
    const decompressed = zlib.unzipSync(new Uint8Array(compressed)).toString();
    console.log(decompressed);
  } catch (err) {
    console.log("folder is: ", folder);
    console.log("file is: ", file);
    console.log("blobPath is: ", blobPath);

    console.error(err);
  }
}

function hashObject() {}
