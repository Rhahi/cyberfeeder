#!/bin/sh
# Sync every manifest with the version semantic-release resolved for this
# release. package.json is handled by @semantic-release/npm.
set -e
VERSION="${1:?usage: sync-version.sh <version>}"
mkdir -p "./tmp"
for JSON_PATH in ./manifests/*.json; do
    jq --arg v "$VERSION" '.version = $v' "$JSON_PATH" > "./tmp/manifest.json"
    mv "./tmp/manifest.json" "$JSON_PATH"
done
echo "Manifest version set to $VERSION"
