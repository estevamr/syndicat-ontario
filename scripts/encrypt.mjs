import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const password = (
  process.env.SITE_PASSWORD ||
  readFileSync(join(root, ".site-password"), "utf8")
).trim();

if (!password) {
  console.error("Set SITE_PASSWORD or write .site-password");
  process.exit(1);
}

const context = vm.createContext({});
for (const file of ["i18n.js", "fund-i18n.js", "data.js", "maint-i18n.js", "maint.js", "assembly-i18n.js", "assembly.js"]) {
  const source = readFileSync(join(root, "src", file), "utf8");
  const exported = {
    "i18n.js": "this.I18N = I18N;",
    "fund-i18n.js": "this.FUND_I18N = FUND_I18N;",
    "data.js": "this.FUND = FUND;",
    "maint-i18n.js": "this.MAINT_I18N = MAINT_I18N;",
    "maint.js": "this.MAINT = MAINT;",
    "assembly-i18n.js": "this.ASSEMBLY_I18N = ASSEMBLY_I18N;",
    "assembly.js": "this.ASSEMBLY = ASSEMBLY;",
  }[file];
  vm.runInContext(`${source}\n${exported}`, context);
}

if (
  !context.I18N ||
  !context.FUND_I18N ||
  !context.FUND ||
  !context.MAINT_I18N ||
  !context.MAINT ||
  !context.ASSEMBLY_I18N ||
  !context.ASSEMBLY
) {
  console.error("Encrypt failed: missing payload objects");
  process.exit(1);
}

const payload = JSON.stringify({
  I18N: context.I18N,
  FUND_I18N: context.FUND_I18N,
  FUND: context.FUND,
  MAINT_I18N: context.MAINT_I18N,
  MAINT: context.MAINT,
  ASSEMBLY_I18N: context.ASSEMBLY_I18N,
  ASSEMBLY: context.ASSEMBLY,
});

const salt = webcrypto.getRandomValues(new Uint8Array(16));
const iv = webcrypto.getRandomValues(new Uint8Array(12));
const iter = 210000;
const material = await webcrypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(password),
  "PBKDF2",
  false,
  ["deriveKey"]
);
const key = await webcrypto.subtle.deriveKey(
  { name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" },
  material,
  { name: "AES-GCM", length: 256 },
  false,
  ["encrypt"]
);
const data = new Uint8Array(
  await webcrypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(payload)
  )
);

function toB64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

writeFileSync(
  join(root, "docs/payload.json"),
  JSON.stringify(
    {
      v: 1,
      kdf: "PBKDF2",
      iter,
      salt: toB64(salt),
      iv: toB64(iv),
      data: toB64(data),
    },
    null,
    2
  )
);

console.log("Wrote docs/payload.json");
