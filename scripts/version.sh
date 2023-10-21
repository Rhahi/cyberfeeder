# apply version in HTML
PACKAGE_JSON_PATH="./package.json"
HTML_PATH="./app/html/sidebar.html"
VERSION=$(npm list --json | jq -r ".version")
sed -i "s/\(footer id=\"version\"\)[^<]*</\1>$VERSION</" "$HTML_PATH"
echo "Version updated to $VERSION"
