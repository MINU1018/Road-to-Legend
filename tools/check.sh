#!/bin/sh
# 모든 JS 문법 검사 (빌드 단계가 없으므로 커밋 전에 실행)
cd "$(dirname "$0")/.." || exit 1
fail=0
for f in *.js tools/*.js tools/data/*.js; do [ -f "$f" ] || continue; node --check "$f" || { echo "문법 오류: $f"; fail=1; }; done
[ $fail = 0 ] && echo "문법 검사 통과"
exit $fail
