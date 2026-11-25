#!/bin/bash
# xcodebuild 로그에서 오류 줄만 골라 실행 요약과 주석(annotation)에 남긴다. 로그 전체를 열지 못할 때도 원인을 보게.
# 쓰는 법(깃허브 액션, native/ios/App에서): bash ../../../ios-kit/build-errors.sh <로그 파일> <단계 이름>
LOG=$1
NAME=$2
ERR=$(grep -E ": error: |^error: |\*\* (BUILD|ARCHIVE) FAILED" "$LOG" | sed -E 's#^/.*/native/ios/App/##' | awk '!seen[$0]++' | head -30)
{
  echo "### $NAME 오류"
  echo '```'
  if [ -n "$ERR" ]; then echo "$ERR"; else echo "(오류 줄을 찾지 못했어요. 로그 끝 20줄)"; tail -20 "$LOG"; fi
  echo '```'
} >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"
printf '%s\n' "$ERR" | head -10 | while IFS= read -r l; do
  if [ -n "$l" ]; then echo "::error::$NAME: $l"; fi
done
