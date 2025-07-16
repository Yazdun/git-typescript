import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import * as crypto from "crypto";

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "init":
    init();
    process.stdout.write("Initialized git directory");
    break;

  case "cat-file":
    const hash = process.argv[4];
    const { data } = catFile({ hash });
    process.stdout.write(data);
    break;

  case "hash-object":
    const fileName = args.at(-1);
    if (!fileName) throw new Error("File name is required!");
    const { sha } = hashObject({ fileName });
    process.stdout.write(sha);
    break;

  case "ls-tree":
    try {
      const inputHash = args[2];
      const file = new Uint8Array(
        fs.readFileSync(
          `.git/objects/${inputHash.slice(0, 2)}/${inputHash.slice(2)}`,
        ),
      );

      const uncompressed = zlib.inflateSync(file);
      const textDecoder = new TextDecoder();
      const str = textDecoder.decode(uncompressed);

      const [header, ...rest] = str.split("\0");

      if (!header.startsWith("tree ")) throw new Error("Invalid tree object");

      let buffer = new Uint8Array([
        ...rest
          .join("\0")
          .split("")
          .map((c) => c.charCodeAt(0)),
        0,
      ]);

      let offset = 0;

      while (offset < buffer.length - 1) {
        const nullIndex = buffer.indexOf(0, offset);
        if (nullIndex === -1) break;
        const entry = textDecoder.decode(buffer.slice(offset, nullIndex));
        const [, name] = entry.split(" ");
        process.stdout.write(name + "\n");
        offset = nullIndex + 1 + 20;
      }
    } catch (err: any) {
      throw new Error(err as any);
    }
    break;

  default:
    throw new Error(`Unknown command ${command}`);
}

function init() {
  fs.mkdirSync(".git", { recursive: true });
  fs.mkdirSync(".git/objects", { recursive: true });
  fs.mkdirSync(".git/refs", { recursive: true });
  fs.writeFileSync(".git/HEAD", "ref: refs/heads/main\n");
}

function catFile({ hash }: { hash: string }): { data: string } {
  const folder = hash.substring(0, 2);
  const file = hash.substring(2);
  const blobPath = path.join(process.cwd(), ".git", "objects", folder, file);

  try {
    const compressed = fs.readFileSync(blobPath);
    const decompressed = zlib.unzipSync(new Uint8Array(compressed)).toString();
    const data = decompressed.substring(decompressed.indexOf("\x00") + 1);
    return { data };
  } catch (err) {
    throw new Error(err as any);
  }
}

function hashObject({ fileName }: { fileName: string }): { sha: string } {
  const filePath = path.join(process.cwd(), fileName);
  const fileContent = fs.readFileSync(filePath);
  const buffer = new Uint8Array(
    Buffer.from(`blob ${fileContent.length}\x00${fileContent.toString()}`),
  );

  const blob = new Uint8Array(zlib.deflateSync(buffer));
  const sha = crypto.createHash("sha1").update(buffer).digest("hex");

  const obj = {
    folder: sha.substring(0, 2),
    file: sha.substring(2),
    dirPath: path.join(process.cwd(), ".git", "objects", sha.substring(0, 2)),
  };

  fs.mkdirSync(obj.dirPath, { recursive: true });
  fs.writeFileSync(path.join(obj.dirPath, obj.file), blob);

  return { sha };
}
