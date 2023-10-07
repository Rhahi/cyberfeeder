#!/bin/sh

# Check for the correct number of arguments
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <svg_file>"
    exit 1
fi

SVG_FILE="$1"

# Check if the provided file exists
if [ ! -f "$SVG_FILE" ]; then
    echo "Error: File $SVG_FILE does not exist."
    exit 1
fi

# Extract the filename without the extension
FILENAME=$(basename -- "$SVG_FILE")
BASENAME="${FILENAME%.*}"

# Convert the SVG file to PNG for each size
rsvg-convert -w 16 -h 16 -o "${BASENAME}_16.png" "$SVG_FILE"
rsvg-convert -w 32 -h 32 -o "${BASENAME}_32.png" "$SVG_FILE"
rsvg-convert -w 48 -h 48 -o "${BASENAME}_48.png" "$SVG_FILE"
rsvg-convert -w 64 -h 64 -o "${BASENAME}_64.png" "$SVG_FILE"
rsvg-convert -w 96 -h 96 -o "${BASENAME}_96.png" "$SVG_FILE"
rsvg-convert -w 128 -h 128 -o "${BASENAME}_128.png" "$SVG_FILE"

echo "Conversion completed."
