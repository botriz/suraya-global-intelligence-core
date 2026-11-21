import test from "node:test";
import assert from "node:assert/strict";
import * as core from "../index.js";

test("public package entrypoint exposes only the encrypted state store API", () => {
  assert.deepEqual(Object.keys(core).sort(), ["createCoreStore", "readCore", "writeCore"]);
});
