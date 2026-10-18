import { cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// Most of the art is referenced through url strings that are only assembled at
// runtime (heart/hunger/currency icons, ability and weapon icons), so Vite
// never sees those imports and does not emit the files. Mirror the whole art
// folder into dist so the built game can still resolve them.
await mkdir(join(root, "dist"), { recursive: true });
await cp(join(root, "assets"), join(root, "dist", "assets"), { recursive: true });
console.log("Copied assets/ into dist/assets/.");
