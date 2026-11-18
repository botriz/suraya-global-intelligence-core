import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { createCoreStore } from "../suraya-core.js";

const secret = crypto.randomBytes(48).toString("hex");

test("core state is encrypted at rest and round-trips", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "suraya-core-"));
  const filePath = path.join(directory, "secure", "core.enc");
  try {
    const store = createCoreStore({ secret, filePath });
    const state = { owner: "test-owner", locked: true, nested: { approved: false } };
    store.write(state);
    const raw = fs.readFileSync(filePath, "utf8");
    assert.equal(raw.includes("test-owner"), false);
    assert.deepEqual(store.read(), state);
    assert.equal((fs.statSync(filePath).mode & 0o777), 0o600);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("core store rejects short or missing secrets", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "suraya-core-"));
  try {
    const store = createCoreStore({ secret: "short", filePath: path.join(directory, "core.enc") });
    assert.throws(() => store.write({ locked: true }), /at least 32 UTF-8 bytes/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("core store detects ciphertext tampering", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "suraya-core-"));
  const filePath = path.join(directory, "core.enc");
  try {
    const store = createCoreStore({ secret, filePath });
    store.write({ locked: true });
    const envelope = JSON.parse(fs.readFileSync(filePath, "utf8"));
    envelope.data = (envelope.data[0] === "0" ? "1" : "0") + envelope.data.slice(1);
    fs.writeFileSync(filePath, JSON.stringify(envelope));
    assert.throws(() => store.read());
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
