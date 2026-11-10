#!/bin/sh
# Writes names.json from the NAMES env var ("Ana, Bea, Caro") so the list never lives in git.
# ponytail: quotes, backslashes and newlines are stripped instead of escaped; names don't need them.
printf '%s' "${NAMES:-}" | tr -d '"\134\015\012' | awk -F, '{ printf "["; s=""; for (i = 1; i <= NF; i++) { gsub(/^ +| +$/, "", $i); if ($i != "") { printf "%s\"%s\"", s, $i; s="," } } printf "]" } END { if (NR == 0) printf "[]" }' > /usr/share/nginx/html/names.json
