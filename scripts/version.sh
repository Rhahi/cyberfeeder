#!/bin/sh

mkdir -p "./tmp"
PACKAGE_JSON_PATH="./package.json"
JSON_PATH="./app/mainfest.json"
VERSION=$(npm list --json | jq -r ".version")
jq --arg v "$VERSION" '.version = $v' "$JSON_PATH" > "./tmp/manifest.json" && mv "./tmp/manifest.json" "$JSON_PATH"

git add "$JSON_PATH"
git commit --amend --no-edit
echo "Version updated to $VERSION"
