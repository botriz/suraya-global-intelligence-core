// Deliberately expose only the encrypted state-store API.
// Recovery-token unlock helpers are not part of the default public surface.
export { createCoreStore, readCore, writeCore } from "./suraya-core.js";
