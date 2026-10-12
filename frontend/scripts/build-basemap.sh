#!/usr/bin/env bash
# Generates the Munich basemap tileset from a Protomaps planet build and records it in basemap.json.
# Zoom levels below 8 are left out on purpose: the map never shows them and they contain
# CC BY 4.0 landcover data (ESA WorldCover) that would require additional attribution.
#
# Usage: scripts/build-basemap.sh <build date YYYYMMDD>, see https://maps.protomaps.com/builds
# Requires the pmtiles CLI (https://github.com/protomaps/go-pmtiles) in the version below.
set -euo pipefail

PMTILES_VERSION="1.31.2"
REPOSITORY="it-at-m/parkhausradar"

cd "$(dirname "$0")/.."

build_date="${1:?Usage: scripts/build-basemap.sh <build date YYYYMMDD>}"
if [[ ! "$build_date" =~ ^[0-9]{8}$ ]]; then
  echo "Build date must have the format YYYYMMDD" >&2
  exit 1
fi

if ! pmtiles version | grep -q "pmtiles ${PMTILES_VERSION},"; then
  echo "pmtiles CLI ${PMTILES_VERSION} is required, found: $(pmtiles version)" >&2
  exit 1
fi

read -r bbox minzoom maxzoom < <(node -p "const c = require('./basemap.json'); [c.bbox.join(','), c.minzoom, c.maxzoom].join(' ')")
source_url="https://build.protomaps.com/${build_date}.pmtiles"
file="muenchen-${build_date}.pmtiles"
output="public/map/${file}"

mkdir -p public/map
pmtiles extract "$source_url" "$output" --bbox="$bbox" --minzoom="$minzoom" --maxzoom="$maxzoom"

sha256="$(sha256sum "$output" | cut -d' ' -f1)"
url="https://github.com/${REPOSITORY}/releases/download/basemap-${build_date}/${file}"

node -e "
const fs = require('node:fs');
const config = JSON.parse(fs.readFileSync('basemap.json', 'utf8'));
Object.assign(config, { source: '${source_url}', file: '${file}', url: '${url}', sha256: '${sha256}' });
fs.writeFileSync('basemap.json', JSON.stringify(config, null, 2) + '\n');
"
npx --no-install prettier --write basemap.json > /dev/null

echo "Created ${output} (sha256 ${sha256})"
echo "Next: publish it as release asset of tag basemap-${build_date}, see README section 'Basemap'"
