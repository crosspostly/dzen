#!/usr/bin/env bash
# =============================================================
# 🔍 PRE-FLIGHT CHECK — запускай перед каждым запуском фабрики
# Использование: bash check.sh
# =============================================================

PASS=0
FAIL=0
WARN=0

GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
BOLD="\033[1m"
NC="\033[0m"

ok()   { echo -e "  ${GREEN}\u2705 $1${NC}"; PASS=$((PASS+1)); }
fail() { echo -e "  ${RED}\u274c $1${NC}"; FAIL=$((FAIL+1)); }
warn() { echo -e "  ${YELLOW}\u26a0\ufe0f  $1${NC}"; WARN=$((WARN+1)); }
info() { echo -e "  ${BLUE}\u2139\ufe0f  $1${NC}"; }

echo ""
echo -e "${BOLD}=================================================${NC}"
echo -e "${BOLD}  \ud83d\udd0d PRE-FLIGHT CHECK \u2014 dzen content factory${NC}"
echo -e "${BOLD}=================================================${NC}"
echo ""

# -----------------------------------------------
echo -e "${BOLD}[1/5] \ud83d\udce6 Node.js & \u0437\u0430\u0432\u0438\u0441\u0438\u043c\u043e\u0441\u0442\u0438${NC}"
# -----------------------------------------------

if command -v node &>/dev/null; then
  NODE_VER=$(node --version)
  ok "Node.js: $NODE_VER"
else
  fail "Node.js \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d"
fi

if [ -d "node_modules" ]; then
  ok "node_modules \u0435\u0441\u0442\u044c"
else
  fail "node_modules \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u2014 \u0437\u0430\u043f\u0443\u0441\u0442\u0438 npm install"
fi

if npx tsx --version &>/dev/null 2>&1; then
  ok "tsx \u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d"
else
  fail "tsx \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d \u2014 npm install"
fi

echo ""
# -----------------------------------------------
echo -e "${BOLD}[2/5] \ud83d\udd11 \u041f\u0435\u0440\u0435\u043c\u0435\u043d\u043d\u044b\u0435 \u043e\u043a\u0440\u0443\u0436\u0435\u043d\u0438\u044f (.env)${NC}"
# -----------------------------------------------

if [ -f ".env" ]; then
  set -a; source .env 2>/dev/null || true; set +a
  ok ".env \u0444\u0430\u0439\u043b \u043d\u0430\u0439\u0434\u0435\u043d"
else
  warn ".env \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d \u2014 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u044e\u0442\u0441\u044f \u0441\u0438\u0441\u0442\u0435\u043c\u043d\u044b\u0435 env"
fi

if [ -n "$GEMINI_API_KEY" ]; then
  KEY_LEN=${#GEMINI_API_KEY}
  ok "GEMINI_API_KEY \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d ($KEY_LEN \u0441\u0438\u043c.)"
else
  fail "GEMINI_API_KEY \u043d\u0435 \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d"
fi

echo ""
# -----------------------------------------------
echo -e "${BOLD}[3/5] \ud83d\udd27 TypeScript: \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0441\u0438\u043d\u0442\u0430\u043a\u0441\u0438\u0441\u0430${NC}"
# -----------------------------------------------

TSC_OUT=$(npx tsc --noEmit 2>&1)
TSC_CODE=$?
if [ $TSC_CODE -eq 0 ]; then
  ok "tsc --noEmit: \u043d\u0435\u0442 \u043e\u0448\u0438\u0431\u043e\u043a"
else
  fail "tsc --noEmit \u043d\u0430\u0448\u0451\u043b \u043e\u0448\u0438\u0431\u043a\u0438:"
  echo ""
  echo -e "${RED}$TSC_OUT${NC}"
  echo ""
fi

echo ""
# -----------------------------------------------
echo -e "${BOLD}[4/5] \ud83d\udcc1 \u041a\u043e\u043d\u0444\u0438\u0433\u0438 \u0438 \u043a\u043b\u044e\u0447\u0435\u0432\u044b\u0435 \u0444\u0430\u0439\u043b\u044b${NC}"
# -----------------------------------------------

for f in cli.ts tsconfig.json package.json; do
  if [ -f "$f" ]; then
    ok "$f \u0435\u0441\u0442\u044c"
  else
    fail "$f \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d!"
  fi
done

for jf in config/*.json; do
  if [ -f "$jf" ]; then
    if python3 -m json.tool "$jf" &>/dev/null 2>&1; then
      ok "JSON ok: $jf"
    else
      fail "\u0421\u043b\u043e\u043c\u0430\u043d\u043d\u044b\u0439 JSON: $jf"
    fi
  fi
done

CHANNELS=("ethno-food-ritual" "budget-travel" "nomad-tech")
for ch in "${CHANNELS[@]}"; do
  CF="config/${ch}.json"
  if [ -f "$CF" ]; then
    ok "channel config: $ch"
  else
    warn "channel config \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d: $CF"
  fi
done

echo ""
# -----------------------------------------------
echo -e "${BOLD}[5/5] \ud83d\udcca \u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u0441\u0442\u0430\u0442\u0435\u0439${NC}"
# -----------------------------------------------

if [ -d "articles" ]; then
  TOTAL_MD=$(find articles -name "*.md" ! -name "REPORT.md" -type f 2>/dev/null | wc -l | tr -d ' ')
  TOTAL_JPG=$(find articles -name "*.jpg" -type f 2>/dev/null | wc -l | tr -d ' ')
  TODAY=$(date +%Y-%m-%d)
  TODAY_MD=$(find articles -path "*/$TODAY/*.md" ! -name "REPORT.md" -type f 2>/dev/null | wc -l | tr -d ' ')
  ok "\u0421\u0442\u0430\u0442\u0435\u0439 \u0432\u0441\u0435\u0433\u043e: $TOTAL_MD .md, \u043a\u0430\u0440\u0442\u0438\u043d\u043e\u043a: $TOTAL_JPG .jpg"
  info "\u0421\u0435\u0433\u043e\u0434\u043d\u044f ($TODAY): $TODAY_MD \u0441\u0442\u0430\u0442\u0435\u0439"
else
  warn "articles/ \u0434\u0438\u0440\u0435\u043a\u0442\u043e\u0440\u0438\u044f \u043f\u0443\u0441\u0442\u0430"
fi

if [ -f "public/feed.xml" ]; then
  FEED_ITEMS=$(grep -c "<item>" public/feed.xml 2>/dev/null || echo 0)
  ok "feed.xml: $FEED_ITEMS \u0441\u0442\u0430\u0442\u0435\u0439 \u0432 RSS"
else
  warn "public/feed.xml \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d"
fi

# =============================================================
echo ""
echo -e "${BOLD}=================================================${NC}"
if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}${BOLD}  \u2705 PASS: $PASS  \u26a0\ufe0f  WARN: $WARN  \u2014 \u0437\u0430\u043f\u0443\u0441\u043a \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u0435\u043d!${NC}"
  echo -e "${BOLD}=================================================${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}${BOLD}  \u274c FAIL: $FAIL  \u2705 PASS: $PASS  \u26a0\ufe0f  WARN: $WARN${NC}"
  echo -e "${RED}${BOLD}  \u0418\u0441\u043f\u0440\u0430\u0432\u044c \u043e\u0448\u0438\u0431\u043a\u0438 \u043f\u0435\u0440\u0435\u0434 \u0437\u0430\u043f\u0443\u0441\u043a\u043e\u043c \u0444\u0430\u0431\u0440\u0438\u043a\u0438!${NC}"
  echo -e "${BOLD}=================================================${NC}"
  echo ""
  exit 1
fi
