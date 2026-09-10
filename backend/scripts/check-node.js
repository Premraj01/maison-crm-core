// Fails fast when the shell's Node is too old to run the dev servers.
//
// Without this the failure is `ERR_REQUIRE_ESM` thrown from deep inside the
// Nest CLI's dependencies, which says nothing about Node versions. The Nest CLI
// require()s ES modules, which only works on Node >= 20.19 / 22.12.
const [major, minor] = process.versions.node.split('.').map(Number);
const ok = major > 22 || (major === 22 && minor >= 12) || (major === 20 && minor >= 19);

if (!ok) {
  const pinned = require('node:fs')
    .readFileSync(require('node:path').join(__dirname, '..', '..', '.nvmrc'), 'utf8')
    .trim();

  console.error(
    `\n  This project needs Node >= 20.19 (or >= 22.12); you are on ${process.versions.node}.\n` +
      `  The Nest CLI require()s ES modules, which older versions cannot do — the\n` +
      `  backend would crash with ERR_REQUIRE_ESM while the frontend started fine.\n\n` +
      `  Fix:  nvm use          # .nvmrc pins ${pinned}\n`,
  );
  process.exit(1);
}
