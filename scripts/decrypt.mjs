import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { webcrypto } from "node:crypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const password = (
  process.env.SITE_PASSWORD ||
  readFileSync(join(root, ".site-password"), "utf8")
).trim();
const envelope = JSON.parse(readFileSync(join(root, "docs/payload.json"), "utf8"));

const salt = Buffer.from(envelope.salt, "base64");
const iv = Buffer.from(envelope.iv, "base64");
const data = Buffer.from(envelope.data, "base64");

const material = await webcrypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(password),
  "PBKDF2",
  false,
  ["deriveKey"]
);
const key = await webcrypto.subtle.deriveKey(
  { name: "PBKDF2", salt, iterations: envelope.iter, hash: "SHA-256" },
  material,
  { name: "AES-GCM", length: 256 },
  false,
  ["decrypt"]
);
const plain = JSON.parse(
  new TextDecoder().decode(
    await webcrypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data)
  )
);

mkdirSync(join(root, "src"), { recursive: true });
writeFileSync(
  join(root, "src/i18n.js"),
  `const I18N = ${JSON.stringify(plain.I18N, null, 2)};\n`
);
writeFileSync(
  join(root, "src/fund-i18n.js"),
  `const FUND_I18N = ${JSON.stringify(plain.FUND_I18N, null, 2)};\n`
);
writeFileSync(
  join(root, "src/data.js"),
  `const FUND = ${JSON.stringify(plain.FUND, null, 2)};\n`
);
writeFileSync(
  join(root, "src/maint-i18n.js"),
  `const MAINT_I18N = ${JSON.stringify(plain.MAINT_I18N, null, 2)};\n`
);
writeFileSync(
  join(root, "src/maint.js"),
  `const MAINT = ${JSON.stringify(plain.MAINT, null, 2)};\n`
);
writeFileSync(
  join(root, "src/assembly-i18n.js"),
  `const ASSEMBLY_I18N = ${JSON.stringify(plain.ASSEMBLY_I18N, null, 2)};\n`
);
writeFileSync(
  join(root, "src/assembly.js"),
  `const ASSEMBLY = ${JSON.stringify(plain.ASSEMBLY, null, 2)};\n`
);
console.log("Restored src/ from payload.json");
