#!/bin/bash
for i in {1..30}; do
  npx tsc --noEmit > tsc.log || true
  node fix-tsc.cjs > fix.log
  MODIFIED=$(cat fix.log | grep -o "[0-9]*" | head -1)
  if [ "$MODIFIED" -eq "0" ]; then
    echo "No more modifications"
    break
  fi
  echo "Iteration $i: modified $MODIFIED lines"
done
