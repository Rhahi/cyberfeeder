#!/bin/sh
# Upload and submit the Chromium release package through Chrome Web Store API v2.
set -eu

VERSION="${1:-}"
ZIP="build/extension-chromium.zip"
API="https://chromewebstore.googleapis.com"
POLL_ATTEMPTS=60
POLL_SECONDS=5

if [ -z "$VERSION" ]; then
  echo "usage: $0 <release-version>" >&2
  exit 2
fi

if [ -z "${CHROME_WEB_STORE_ACCESS_TOKEN:-}" ] || \
  [ -z "${CHROME_WEB_STORE_PUBLISHER_ID:-}" ] || \
  [ -z "${CHROME_WEB_STORE_EXTENSION_ID:-}" ]; then
  echo "CHROME_WEB_STORE_ACCESS_TOKEN, CHROME_WEB_STORE_PUBLISHER_ID and CHROME_WEB_STORE_EXTENSION_ID must be set" >&2
  exit 2
fi

if [ ! -f "$ZIP" ]; then
  echo "missing package: $ZIP" >&2
  exit 2
fi

ZIP_VERSION="$(unzip -p "$ZIP" manifest.json | jq -er '.version')" || {
  echo "could not read manifest version from $ZIP" >&2
  exit 1
}
if [ "$ZIP_VERSION" != "$VERSION" ]; then
  echo "package version $ZIP_VERSION does not match release version $VERSION" >&2
  exit 1
fi

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT HUP INT TERM
RESPONSE="$TMPDIR/response.json"
STATUS_CODE=""
ITEM_PATH="publishers/$CHROME_WEB_STORE_PUBLISHER_ID/items/$CHROME_WEB_STORE_EXTENSION_ID"

request() {
  method="$1"
  url="$2"
  shift 2
  STATUS_CODE="$(curl --silent --show-error --output "$RESPONSE" --write-out '%{http_code}' \
    --request "$method" \
    --header "Authorization: Bearer $CHROME_WEB_STORE_ACCESS_TOKEN" \
    "$@" "$url")" || {
    echo "Chrome Web Store API request failed: $method $url" >&2
    exit 1
  }
  case "$STATUS_CODE" in
    2??) ;;
    *)
      echo "Chrome Web Store API returned HTTP $STATUS_CODE for $method $url" >&2
      cat "$RESPONSE" >&2
      exit 1
      ;;
  esac
  jq -e . "$RESPONSE" >/dev/null || {
    echo "Chrome Web Store API returned invalid JSON for $method $url" >&2
    cat "$RESPONSE" >&2
    exit 1
  }
}

fetch_status() {
  request GET "$API/v2/$ITEM_PATH:fetchStatus"
  jq -e --arg item "$CHROME_WEB_STORE_EXTENSION_ID" '.itemId == $item' "$RESPONSE" >/dev/null || {
    echo "fetchStatus response did not match the configured extension" >&2
    exit 1
  }
}

matching_version_states() {
  jq -r --arg version "$VERSION" '
    [
      .submittedItemRevisionStatus,
      .publishedItemRevisionStatus
    ]
    | .[]?
    | select(. != null)
    | select(any(.distributionChannels[]?; .crxVersion == $version))
    | .state
  ' "$RESPONSE"
}

version_is_accepted() {
  states="$(matching_version_states)"
  if [ -z "$states" ]; then
    return 1
  fi

  for state in $states; do
    case "$state" in
      REJECTED | CANCELLED)
        echo "Chrome Web Store has version $VERSION in $state state" >&2
        exit 1
        ;;
      PENDING_REVIEW | STAGED | PUBLISHED | PUBLISHED_TO_TESTERS) ;;
      *)
        echo "Chrome Web Store has version $VERSION in unexpected state: $state" >&2
        exit 1
        ;;
    esac
  done
}

wait_for_prior_upload() {
  attempt=1
  while [ "$attempt" -le "$POLL_ATTEMPTS" ]; do
    fetch_status
    upload_state="$(jq -er '.lastAsyncUploadState // "NOT_FOUND"' "$RESPONSE")"
    case "$upload_state" in
      IN_PROGRESS)
        sleep "$POLL_SECONDS"
        ;;
      SUCCEEDED | FAILED | NOT_FOUND)
        return
        ;;
      *)
        echo "unexpected Chrome Web Store upload state: $upload_state" >&2
        exit 1
        ;;
    esac
    attempt=$((attempt + 1))
  done
  echo "timed out waiting for prior Chrome Web Store upload" >&2
  exit 1
}

wait_for_current_upload() {
  attempt=1
  while [ "$attempt" -le "$POLL_ATTEMPTS" ]; do
    fetch_status
    upload_state="$(jq -er '.lastAsyncUploadState // "NOT_FOUND"' "$RESPONSE")"
    case "$upload_state" in
      SUCCEEDED) return ;;
      IN_PROGRESS)
        sleep "$POLL_SECONDS"
        ;;
      FAILED | NOT_FOUND)
        echo "Chrome Web Store upload did not succeed (state: $upload_state)" >&2
        exit 1
        ;;
      *)
        echo "unexpected Chrome Web Store upload state: $upload_state" >&2
        exit 1
        ;;
    esac
    attempt=$((attempt + 1))
  done
  echo "timed out waiting for Chrome Web Store upload" >&2
  exit 1
}

upload_current_package() {
  request POST "$API/upload/v2/$ITEM_PATH:upload" \
    --header 'Content-Type: application/zip' \
    --upload-file "$ZIP"
  jq -e --arg item "$CHROME_WEB_STORE_EXTENSION_ID" '.itemId == $item' "$RESPONSE" >/dev/null || {
    echo "upload response did not match the configured extension" >&2
    exit 1
  }

  upload_state="$(jq -er '.uploadState' "$RESPONSE")"
  case "$upload_state" in
    SUCCEEDED)
      jq -e --arg version "$VERSION" '.crxVersion == $version' "$RESPONSE" >/dev/null || {
        echo "synchronous upload did not confirm version $VERSION" >&2
        exit 1
      }
      ;;
    IN_PROGRESS)
      wait_for_current_upload
      ;;
    FAILED | NOT_FOUND)
      echo "Chrome Web Store upload failed (state: $upload_state)" >&2
      exit 1
      ;;
    *)
      echo "unexpected Chrome Web Store upload state: $upload_state" >&2
      exit 1
      ;;
  esac
}

publish_current_package() {
  request POST "$API/v2/$ITEM_PATH:publish" \
    --header 'Content-Type: application/json' \
    --data '{"publishType":"DEFAULT_PUBLISH","blockOnWarnings":false}'
  jq -e --arg item "$CHROME_WEB_STORE_EXTENSION_ID" '.itemId == $item' "$RESPONSE" >/dev/null || {
    echo "publish response did not match the configured extension" >&2
    exit 1
  }

  state="$(jq -er '.state' "$RESPONSE")"
  case "$state" in
    PENDING_REVIEW | STAGED | PUBLISHED | PUBLISHED_TO_TESTERS) ;;
    REJECTED | CANCELLED)
      echo "Chrome Web Store rejected or cancelled version $VERSION ($state)" >&2
      exit 1
      ;;
    *)
      echo "publish response returned unexpected state: $state" >&2
      exit 1
      ;;
  esac

  warning="$(jq -c '.warningInfo // empty' "$RESPONSE")"
  if [ -n "$warning" ]; then
    echo "::warning::Chrome Web Store publish warning: $warning"
  fi
}

wait_for_version() {
  attempt=1
  while [ "$attempt" -le "$POLL_ATTEMPTS" ]; do
    fetch_status
    if version_is_accepted; then
      return
    fi
    sleep "$POLL_SECONDS"
    attempt=$((attempt + 1))
  done
  echo "timed out waiting for Chrome Web Store to accept version $VERSION" >&2
  exit 1
}

# A matching version that is already submitted or published makes re-runs safe.
fetch_status
if version_is_accepted; then
  echo "Chrome Web Store already has version $VERSION submitted or published"
  exit 0
fi

# A completed asynchronous upload can belong to another version. Only wait for a
# prior in-progress upload to settle; otherwise always upload this release ZIP.
last_upload_state="$(jq -er '.lastAsyncUploadState // "NOT_FOUND"' "$RESPONSE")"
case "$last_upload_state" in
  IN_PROGRESS)
    wait_for_prior_upload
    fetch_status
    if version_is_accepted; then
      echo "Chrome Web Store already has version $VERSION submitted or published"
      exit 0
    fi
    ;;
  SUCCEEDED | FAILED | NOT_FOUND) ;;
  *)
    echo "unexpected Chrome Web Store upload state: $last_upload_state" >&2
    exit 1
    ;;
esac

upload_current_package
publish_current_package
wait_for_version
echo "Chrome Web Store accepted version $VERSION"
