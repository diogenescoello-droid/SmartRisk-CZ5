import fs from "node:fs";
import assert from "node:assert/strict";

const context = fs.readFileSync(
  "web-release/scope-context.js",
  "utf8"
);

const repository = fs.readFileSync(
  "web-release/scope-repository.js",
  "utf8"
);

assert.match(
  context,
  /function sharedScopeKey\(\)/
);

assert.match(
  context,
  /state\.scopeType === "provincial"/
);

assert.match(
  context,
  /sharedScopeKey,/
);

assert.match(
  repository,
  /statesCollection\.doc\(sharedScopeKey\)/
);

assert.match(
  repository,
  /nativeRunTransaction/
);

assert.match(
  repository,
  /storedRevision !== currentRevision/
);

assert.match(
  repository,
  /revision: nextRevision/
);

assert.match(
  repository,
  /legacyReference/
);

assert.match(
  repository,
  /version: "13\.3\.0"/
);

assert.match(
  repository,
  /shared-scope-territorial-state/
);

assert.doesNotMatch(
  repository,
  /const overlayReference = db\s*\.collection\("territorialStates"\)\s*\.doc\(user\.uid\)/
);

console.log(
  "PASS RC13.3: persistencia compartida y control de concurrencia instalados."
);
