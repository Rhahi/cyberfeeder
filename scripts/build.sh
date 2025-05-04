#!/bin/sh

set -e

npm run lint
npm run clean
mkdir -p "./app/js"
for CONFIG_FILE in "./rollup"/*.js; do
    rollup --config $CONFIG_FILE --bundleConfigAsCjs
done

# dnf install sass
rm -rf "./app/css/*"
mkdir -p "./app/css"
sass ./app-sass/:./app/css --no-source-map

# cargo install toml2json
rm -rf "./app/data"
mkdir -p "./app/data"
for FILE in "./data"/*; do
    if [[ -f "$FILE" ]]; then
        BASENAME="$(basename $FILE)"
        NAME="${BASENAME%.*}"
        # node ./scripts/toml2json.js "$FILE" > "./app/data/$NAME.json"
    fi
done
