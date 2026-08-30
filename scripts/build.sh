#!/bin/sh

set -e

# Which browser engine to build for. Firefox is the default, so `npm run build`
# behaves exactly as before; `npm run build:chromium` builds the MV3 variant.
TARGET="${TARGET:-firefox}"
if [ "$TARGET" != "firefox" ] && [ "$TARGET" != "chromium" ]; then
    echo "unknown TARGET '$TARGET', expected 'firefox' or 'chromium'" >&2
    exit 1
fi
echo "Building Cyberfeeder for $TARGET"

npm run lint
npm run clean
mkdir -p "./app/js"
for CONFIG_FILE in "./rollup"/*.js; do
    TARGET="$TARGET" rollup --config $CONFIG_FILE --bundleConfigAsCjs
done

cp "./manifests/$TARGET.json" "./app/manifest.json"

# dnf install sass
rm -rf "./app/css/*"
mkdir -p "./app/css"
sass ./app-sass/:./app/css --no-source-map

# cargo install toml2json
rm -rf "./app/data"
mkdir -p "./app/data"
# POSIX [ ] rather than bash [[ ]]: this script runs under `sh`, which is dash on
# most CI images. There, [[ ]] exits 127, the `if` reads as false, and the build
# silently ships an empty data directory - which disables every style at runtime.
for FILE in "./data"/*; do
    if [ -f "$FILE" ]; then
        BASENAME="$(basename "$FILE")"
        NAME="${BASENAME%.*}"
        node ./scripts/toml2json.js "$FILE" > "./app/data/$NAME.json"
    fi
done

# The sidebar treats a missing data file as "bundled styles are up to date", so a
# build without these is broken in a way nothing else reports. Fail loudly here.
for NAME in style script; do
    if [ ! -s "./app/data/$NAME.json" ]; then
        echo "build failed: ./app/data/$NAME.json is missing or empty" >&2
        exit 1
    fi
done
