#!/bin/sh

npm run clean
npm run compile
mkdir -p "./app/js"
for CONFIG_FILE in "./rollup"/*.js; do
    rollup --config $CONFIG_FILE
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
        toml2json --pretty "$FILE" > "./app/data/$NAME.json"
    fi
done

# apply version in HTML
PACKAGE_JSON_PATH="./package.json"
HTML_PATH="./app/html/sidebar.html"
VERSION=$(npm list --json | jq -r ".version")
sed -i "s/\(footer id=\"version\"\)[^<]*</\1>$VERSION</" "$HTML_PATH"
echo "Version updated to $VERSION"
