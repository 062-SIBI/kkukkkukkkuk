#!/bin/bash
# 앱 실행 파일에서 ActivityKit, AppIntents가 약하게(LC_LOAD_WEAK_DYLIB) 이어졌는지 본다.
# 강하게 이어지면 iOS 16.2 미만 폰(앱 최소 iOS 15.0)에서 앱이 켜지자마자 꺼진다(최종 검토 4번).
# 쓰는 법(깃허브 액션, native/ios/App에서): bash ../../../ios-kit/weak-check.sh <App 실행 파일> [otool -l 출력 파일(시험용)]
BIN=$1
OUT=${2:-}
if [ -n "$OUT" ]; then L=$(cat "$OUT"); else L=$(otool -l "$BIN"); fi
fail=0
for F in ActivityKit AppIntents; do
  C=$(printf '%s\n' "$L" | grep -B2 "/$F.framework/$F " | grep -E '^[[:space:]]*cmd ' | tail -1 | awk '{print $2}')
  echo "$F: ${C:-이어지지 않음}" | tee -a "${GITHUB_STEP_SUMMARY:-/dev/null}"
  if [ "$C" = "LC_LOAD_DYLIB" ]; then
    echo "::error::$F 가 약하게 이어지지 않았어요(iOS 16.2 미만 폰에서 앱이 켜지자마자 꺼질 수 있어요)"
    fail=1
  fi
done
exit $fail
