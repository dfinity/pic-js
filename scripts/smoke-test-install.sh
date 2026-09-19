#!/bin/bash
# Verify the published package installs and works under each package manager.
#
# @dfinity/pic downloads the pocket-ic binary from a postinstall script. npm,
# pnpm and bun all block lifecycle scripts by default, each with its own opt-in
# mechanism, so this asserts the documented opt-in still delivers the binary.
#
# Usage: ./scripts/smoke-test-install.sh <npm|pnpm|yarn|bun>

set -euo pipefail

pm="${1:?usage: smoke-test-install.sh <npm|pnpm|yarn|bun>}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

echo "--- packing @dfinity/pic"
tarball="$(cd "$repo_root/packages/pic" && pnpm pack --pack-destination "$work_dir" | tail -1)"
test -f "$tarball" || { echo "pack produced no tarball" >&2; exit 1; }

cd "$work_dir"

# Each package manager needs its own opt-in for the postinstall to run. Keep
# these aligned with docs/src/content/docs/guides/*.
#
# npm is the exception: it keys allowScripts by resolved spec, so a tarball
# install needs the file: path where a consumer installing from the registry
# writes the package name. This leg therefore proves npm still honours
# allowScripts, but not the exact key the guide tells users to write.
case "$pm" in
  npm)  trust="\"allowScripts\": { \"file:$tarball\": true }," ;;
  pnpm) trust='"pnpm": { "onlyBuiltDependencies": ["@dfinity/pic"] },' ;;
  bun)  trust='"trustedDependencies": ["@dfinity/pic"],' ;;
  yarn) trust='' ;;  # yarn runs postinstall by default
  *)    echo "unknown package manager: $pm" >&2; exit 1 ;;
esac

# Pin the same pnpm corepack already has, so resolution does not depend on the
# temp directory's context.
pin=""
if [ "$pm" = "pnpm" ]; then
  pin="\"packageManager\": \"pnpm@$(cd "$repo_root" && pnpm --version)\","
fi

cat > package.json <<EOF
{
  "name": "consumer-install-smoke",
  "version": "1.0.0",
  $pin
  $trust
  "private": true
}
EOF

node -e 'JSON.parse(require("fs").readFileSync("package.json","utf8"))' \
  || { echo "generated package.json is not valid JSON" >&2; exit 1; }

echo "--- installing with $pm"
case "$pm" in
  npm)  npm install "$tarball" ;;
  pnpm) pnpm add "$tarball" ;;
  yarn) yarn add "file:$tarball" ;;
  bun)  bun add "$tarball" ;;
esac

binary="node_modules/@dfinity/pic/pocket-ic"
if [ ! -x "$binary" ]; then
  echo "FAIL: $pm install did not produce an executable $binary" >&2
  echo "The postinstall opt-in for $pm may have changed; check the guide." >&2
  exit 1
fi
echo "--- binary present: $(wc -c < "$binary" | tr -d ' ') bytes"

# Prove the binary runs and the library can drive it.
cat > smoke.js <<'EOF'
const { PocketIcServer } = require('@dfinity/pic');

(async () => {
  const server = await PocketIcServer.start();
  const url = server.getUrl();
  if (!url) throw new Error('server did not report a URL');
  await server.stop();
  console.log(`--- PocketIcServer started and stopped (${url})`);
})();
EOF

echo "--- running smoke test with $pm"
case "$pm" in
  bun) bun run smoke.js ;;
  *)   node smoke.js ;;
esac

echo "--- $pm OK"
