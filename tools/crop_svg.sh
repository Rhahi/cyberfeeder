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

FILENAME=$(basename -- "$SVG_FILE")
BASENAME="${FILENAME%.*}"

# Use Inkscape to crop the SVG
inkscape --export-type="svg" --export-area-drawing -o "$BASENAME_CROP.svg" "$SVG_FILE"

echo "Cropping completed."
