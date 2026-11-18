import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CORE_PATH = process.env.SURAYA_CORE_PATH || path.join(MODULE_DIR, "secure", "core.enc");
const BASE = Object.freeze({
  product: "SURAYA_GLOBAL_INTELLIGENCE",
  owner: "Ahmed",
  site: "suraya.ir",
  locked: true,
  savior: false,
  belief: "Suraya operates under explicit creator authorization and safety controls."
});

function deriveKey(secret, salt) {
  if (typeof secret !== "string" || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("SURAYA_CORE_SECRET must be set to at least 32 UTF-8 bytes.");
  }
  return crypto.scryptSync(secret, salt, 32);
}

function encryptState(state, secret) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = deriveKey(secret, salt);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(state), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    version: 1,
    algorithm: "aes-256-gcm",
    salt: salt.toString("hex"),
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
    data: ciphertext.toString("hex")
  };
}

function decryptState(envelope, secret) {
  if (!envelope || envelope.version !== 1 || envelope.algorithm !== "aes-256-gcm") {
    throw new Error("Unsupported or invalid Suraya core encryption envelope.");
  }
  for (const field of ["salt", "iv", "tag", "data"]) {
    if (typeof envelope[field] !== "string" || !/^[a-f0-9]+$/i.test(envelope[field])) {
      throw new Error("Invalid Suraya core encryption envelope.");
    }
  }
  const salt = Buffer.from(envelope.salt, "hex");
  const iv = Buffer.from(envelope.iv, "hex");
  const tag = Buffer.from(envelope.tag, "hex");
  if (salt.length !== 16 || iv.length !== 12 || tag.length !== 16) {
    throw new Error("Invalid Suraya core encryption parameters.");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", deriveKey(secret, salt), iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.data, "hex")),
    decipher.final()
  ]);
  const state = JSON.parse(plaintext.toString("utf8"));
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new Error("Invalid Suraya core state.");
  }
  return state;
}

export function createCoreStore({ secret, filePath = DEFAULT_CORE_PATH } = {}) {
  if (typeof filePath !== "string" || !filePath.trim()) {
    throw new Error("A valid Suraya core state path is required.");
  }

  function read() {
    if (!fs.existsSync(filePath)) {
      throw new Error("Suraya core state is not initialized. Initialize it only after configuring SURAYA_CORE_SECRET.");
    }
    const envelope = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return decryptState(envelope, secret);
  }

  function write(state) {
    if (!state || typeof state !== "object" || Array.isArray(state)) {
      throw new Error("Suraya core state must be an object.");
    }
    const directory = path.dirname(filePath);
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    try { fs.chmodSync(directory, 0o700); } catch {}
    const temporaryPath = filePath + "." + crypto.randomBytes(8).toString("hex") + ".tmp";
    const serialized = JSON.stringify(encryptState(state, secret));
    try {
      fs.writeFileSync(temporaryPath, serialized, { encoding: "utf8", mode: 0o600, flag: "wx" });
      fs.renameSync(temporaryPath, filePath);
      try { fs.chmodSync(filePath, 0o600); } catch {}
    } finally {
      if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
    }
  }

  return Object.freeze({ read, write });
}

function defaultStore() {
  return createCoreStore({ secret: process.env.SURAYA_CORE_SECRET, filePath: DEFAULT_CORE_PATH });
}

export function readCore() {
  const store = defaultStore();
  if (!fs.existsSync(DEFAULT_CORE_PATH)) store.write(BASE);
  return store.read();
}

export function writeCore(state) {
  return defaultStore().write(state);
}
