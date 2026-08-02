#!/usr/bin/env bash
set -euo pipefail
npm run test
npm run build
npx cap sync android
(cd android && ./gradlew assembleDebug)
mkdir -p artifacts
cp android/app/build/outputs/apk/debug/app-debug.apk artifacts/Murph-MLB-Edge.apk
echo "APK: $(pwd)/artifacts/Murph-MLB-Edge.apk"
