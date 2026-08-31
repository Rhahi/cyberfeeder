#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT HUP INT TERM
VERSION="1.2.3"

mkdir -p "$WORKDIR/build"
printf '{"version":"%s"}\n' "$VERSION" > "$WORKDIR/manifest.json"
(
  cd "$WORKDIR"
  zip -q build/extension-chromium.zip manifest.json
)

MOCK_BIN="$WORKDIR/bin"
mkdir "$MOCK_BIN"
cat > "$MOCK_BIN/curl" <<'EOF'
#!/bin/sh
set -eu

output=""
url=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --output)
      output="$2"
      shift 2
      ;;
    *)
      url="$1"
      shift
      ;;
  esac
done

index="$(cat "$MOCK_STATE")"
index=$((index + 1))
printf '%s\n' "$index" > "$MOCK_STATE"
response="$MOCK_RESPONSES/$index.json"
if [ ! -f "$response" ]; then
  echo "unexpected curl request: $url" >&2
  exit 1
fi
printf '%s\n' "$url" >> "$MOCK_CALLS"
cat "$response" > "$output"
printf '200'
EOF
chmod +x "$MOCK_BIN/curl"

write_response() {
  printf '%s\n' "$1" > "$RESPONSES/$RESPONSE_INDEX.json"
  RESPONSE_INDEX=$((RESPONSE_INDEX + 1))
}

start_case() {
  CASE="$1"
  RESPONSES="$WORKDIR/$CASE"
  mkdir "$RESPONSES"
  RESPONSE_INDEX=1
  printf '0\n' > "$RESPONSES/state"
  : > "$RESPONSES/calls"
}

run_publish() {
  expected="$1"
  if output="$(
    cd "$WORKDIR"
    PATH="$MOCK_BIN:$PATH" \
      MOCK_RESPONSES="$RESPONSES" \
      MOCK_STATE="$RESPONSES/state" \
      MOCK_CALLS="$RESPONSES/calls" \
      CHROME_WEB_STORE_ACCESS_TOKEN=test-token \
      CHROME_WEB_STORE_PUBLISHER_ID=publisher-id \
      CHROME_WEB_STORE_EXTENSION_ID=extension-id \
      sh "$ROOT/scripts/publish-chromium.sh" "$VERSION" 2>&1
  )"; then
    actual=0
  else
    actual=$?
  fi

  case "$expected" in
    success)
      [ "$actual" -eq 0 ] || {
        echo "$CASE should have succeeded:" >&2
        echo "$output" >&2
        exit 1
      }
      ;;
    failure)
      [ "$actual" -ne 0 ] || {
        echo "$CASE should have failed" >&2
        exit 1
      }
      ;;
  esac
}

status_without_version() {
  printf '{"itemId":"extension-id","lastAsyncUploadState":"%s"}' "$1"
}

status_with_version() {
  printf '{"itemId":"extension-id","lastAsyncUploadState":"NOT_FOUND","%sItemRevisionStatus":{"state":"%s","distributionChannels":[{"crxVersion":"%s"}]}}' \
    "$1" "$2" "$VERSION"
}

start_case fresh-success
write_response "$(status_without_version NOT_FOUND)"
write_response '{"itemId":"extension-id","uploadState":"SUCCEEDED","crxVersion":"1.2.3"}'
write_response '{"itemId":"extension-id","state":"PENDING_REVIEW"}'
write_response "$(status_with_version submitted PENDING_REVIEW)"
run_publish success
[ "$(grep -c '/upload/' "$RESPONSES/calls")" -eq 1 ]

start_case already-pending
write_response "$(status_with_version submitted PENDING_REVIEW)"
run_publish success
[ "$(wc -l < "$RESPONSES/calls")" -eq 1 ]

start_case already-published
write_response "$(status_with_version published PUBLISHED)"
run_publish success
[ "$(wc -l < "$RESPONSES/calls")" -eq 1 ]

start_case stale-succeeded
write_response "$(status_without_version SUCCEEDED)"
write_response '{"itemId":"extension-id","uploadState":"SUCCEEDED","crxVersion":"1.2.3"}'
write_response '{"itemId":"extension-id","state":"PENDING_REVIEW"}'
write_response "$(status_with_version submitted PENDING_REVIEW)"
run_publish success
[ "$(grep -c '/upload/' "$RESPONSES/calls")" -eq 1 ]

for state in REJECTED CANCELLED; do
  start_case "already-$(printf '%s' "$state" | tr '[:upper:]' '[:lower:]')"
  write_response "$(status_with_version submitted "$state")"
  run_publish failure
  printf '%s\n' "$output" | grep -q "version $VERSION in $state state"
  [ "$(wc -l < "$RESPONSES/calls")" -eq 1 ]
done

echo "publish-chromium mock tests passed"
