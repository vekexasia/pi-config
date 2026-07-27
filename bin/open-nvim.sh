#!/usr/bin/env bash

set -e
if [ "${HERDR_ENV:-}" != 1 ]; then
  echo "herdr-nvim.sh must run inside herdr" >&2
  exit 1
fi

if [ "$#" -ne 1 ]; then
  echo "usage: $0 PATH" >&2
  exit 2
fi

PANE=$(herdr pane list | python3 -c 'import json,sys; print(next(p["pane_id"] for p in json.load(sys.stdin)["result"]["panes"] if p["focused"]))')
NEW_PANE=$(herdr pane split "$PANE" --direction right | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"]["pane"]["pane_id"])')
FILE=$(printf '%q' "$1")
herdr pane run "$NEW_PANE" "nvim $FILE; printf '%s\\n' __NVIM_\"CLOSED__\""
herdr pane wait-output "$NEW_PANE" --match "__NVIM_CLOSED__" --timeout 3600000
herdr pane close "$NEW_PANE"
