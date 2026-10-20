#!/usr/bin/env bash
# Build + install via Expo, then launch by bundle id.
# iOS 27 simulators often timeout on `simctl openurl` (POSIX 60) even after a successful build.
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BUNDLE_ID="com.ilicoo.dev"
DEVICE="${EXPO_IOS_DEVICE:-}"

free_metro() {
  local pids
  pids="$(lsof -nP -iTCP:8081 -sTCP:LISTEN -t 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    echo "› Freeing port 8081"
    kill $pids 2>/dev/null || true
    sleep 1
    kill -9 $pids 2>/dev/null || true
  fi
}

booted_udid() {
  xcrun simctl list devices booted | grep -Eo "[A-F0-9-]{36}" | head -1
}

ensure_simulator() {
  local udid
  udid="$(booted_udid)"

  if [ -z "$udid" ] && [ -n "$DEVICE" ]; then
    echo "› Booting $DEVICE"
    xcrun simctl boot "$DEVICE" 2>/dev/null || true
    udid="$(booted_udid)"
  fi

  if [ -z "$udid" ]; then
    echo "› Booting iPhone 16 (iOS 18 — simctl openurl is more reliable)"
    xcrun simctl boot "iPhone 16" 2>/dev/null || true
    udid="$(booted_udid)"
  fi

  if [ -n "$udid" ]; then
    xcrun simctl bootstatus "$udid" -b >/dev/null
    # Wake SpringBoard so openurl / launch are not stuck (code 60).
    xcrun simctl spawn "$udid" launchctl kickstart -k system/com.apple.SpringBoard >/dev/null 2>&1 || true
    sleep 2
  fi
}

launch_app() {
  local udid
  udid="$(booted_udid)"
  if [ -z "$udid" ]; then
    xcrun simctl launch booted "$BUNDLE_ID"
  else
    xcrun simctl launch "$udid" "$BUNDLE_ID"
  fi
}

free_metro
ensure_simulator

EXPO_ARGS=(run:ios)
if [ -n "$DEVICE" ]; then
  EXPO_ARGS+=(--device "$DEVICE")
fi

set +e
npx expo "${EXPO_ARGS[@]}"
STATUS=$?
set -e

if [ "$STATUS" -eq 0 ]; then
  exit 0
fi

echo "› Expo failed to open the deep link (simctl openurl timeout). Launching ${BUNDLE_ID} directly…"
launch_app
exec npx expo start --dev-client --port 8081
