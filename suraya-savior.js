import crypto from "node:crypto";
import { readCore, writeCore } from "./suraya-core.js";

function configuredHashes() {
  return (process.env.SURAYA_SAVIOR_KEY_SHA256 || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => /^[a-f0-9]{64}$/.test(value));
}

export function isSaviorKey(buf) {
  if (!Buffer.isBuffer(buf)) return false;
  const allowed = configuredHashes();
  if (allowed.length === 0) return false;
  const candidate = crypto.createHash("sha256").update(buf).digest();
  return allowed.some((value) =>
    crypto.timingSafeEqual(candidate, Buffer.from(value, "hex"))
  );
}

export function unlockWithSavior(buf) {
  const core = readCore();
  if (!isSaviorKey(buf)) return { ok: false, core };

  core.locked = false;
  core.savior = true;
  writeCore(core);

  return { ok: true, core };
}
