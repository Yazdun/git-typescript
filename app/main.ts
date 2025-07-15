import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import * as crypto from "crypto";

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

    process.stdout.write(
      decompressed.substring(decompressed.indexOf("\x00") + 1),
    );
  } catch (err) {
    console.error(err);
  }
}

function hashObject() {
  const fileName = args.at(-1);

  if (!fileName) {
    console.error("File name is required.");
    return;
  }

  const filePath = path.join(process.cwd(), fileName);
  const fileContent = fs.readFileSync(filePath);

  const objectBuffer = new Uint8Array(
    Buffer.from(`blob ${fileContent.length}\x00${fileContent.toString()}`),
  );

  const blobData = new Uint8Array(zlib.deflateSync(objectBuffer));

  const objectSha = crypto
    .createHash("sha1")
    .update(objectBuffer)
    .digest("hex");

  const objectFolder = objectSha.substring(0, 2);
  const objectFile = objectSha.substring(2);
  const objectDirPath = path.join(
    process.cwd(),
    ".git",
    "objects",
    objectFolder,
  );

  fs.mkdirSync(objectDirPath, { recursive: true });
  fs.writeFileSync(path.join(objectDirPath, objectFile), blobData);

  process.stdout.write(objectSha);
}
