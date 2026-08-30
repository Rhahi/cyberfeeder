TARGET="${TARGET:-firefox}"
NAME="extension-firefox"
if [ "$TARGET" = "chromium" ]; then
    NAME="extension-chromium"
fi
mkdir -p ./build
# zip updates an existing archive in place, so a file deleted from app/ would
# survive in a rebuilt zip. Start from scratch instead.
rm -f "./build/$NAME.zip"
cd app
zip -r "../build/$NAME.zip" ./*
