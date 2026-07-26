import fs from "node:fs";
import assert from "node:assert/strict";

const read = path =>
  fs.readFileSync(path, "utf8");

const gate =
  read("web-release/access-gate.js");

const context =
  read("web-release/scope-context.js");

const repository =
  read("web-release/scope-repository.js");

const index =
  read("web-release/index.html");

assert.match(
  gate,
  /unified-application-by-scope/
);

assert.doesNotMatch(
  gate,
  /loadScopedApplication/
);

assert.doesNotMatch(
  gate,
  /scoped-app\.js/
);

assert.match(
  context,
  /filterData/
);

assert.match(
  context,
  /resolveTerritories/
);

assert.match(
  context,
  /scopeLabel/
);

assert.match(
  repository,
  /territorialStates/
);

assert.match(
  repository,
  /filterGlobalReviewSources/
);


assert.match(
  repository,
  /interfaz-unificada-territorial/
);

assert.match(
  index,
  /scope-context\.js/
);

assert.match(
  index,
  /scope-repository\.js/
);

assert.match(
  index,
  /scope-ui\.js/
);


assert.match(
  repository,
  /filterGlobalTerritorialSources/
);

assert.match(
  repository,
  /ENOS_RISK_LOCATIONS/
);

assert.match(
  repository,
  /F03_CARTOGRAPHY/
);

const scopeUi =
  read("web-release/scope-ui.js");

assert.match(
  scopeUi,
  /enforceTerritorialControls/
);

assert.match(
  scopeUi,
  /addTerritory/
);


console.log(
  "PASS RC13.2: interfaz unificada y alcance territorial instalados."
);