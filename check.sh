#!/usr/bin/env bash
# =============================================================
# 🔍 PRE-FLIGHT CHECK — запускай перед каждым запуском фабрики
# Использование: bash check.sh
# =============================================================
set -e

PASS=0
FAIL=0
WARN=0

GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
BOLD="\033[1m"
NC="\033[0m"

ok()   { echo -e "  ${GREEN}✅ $1${NC}"; ((PASS++)); }
fail() { echo -e "  ${RED}❌ $1${NC}"; ((FAIL++)); }
warn() { echo -e "  ${YELLOW}⚠️  $1${NC}"; ((WARN++)); }
info() { echo -e "  ${BLUE}ℹ️  $1${NC}"; }

echo ""
echo -e "${BOLD}=================================================${NC}"
echo -e "${BOLD}  🔍 PRE-FLIGHT CHECK — dzen content factory${NC}"
echo -e "${BOLD}=================================================${NC}"
echo ""

# -----------------------------------------------
echo -e "${BOLD}[1/5] 📦 Node.js & зависимости${NC}"
# -----------------------------------------------

if command -v node &>/dev/null; then
  NODE_VER=$(node --version)
  ok "Node.js: $NODE_VER"
else
  fail "Node.js не найден"
fi

if [ -d "node_modules" ]; then
  ok "node_modules есть"
else
  fail "node_modules отсутствует — запусти npm install"
fi

if command -v npx &>/dev/null && npx tsx --version &>/dev/null 2>&1; then
  ok "tsx доступен"
else
  fail "tsx не найден — npm install"
fi

echo ""
# -----------------------------------------------
echo -e "${BOLD}[2/5] 🔑 Переменные окружения (.env)${NC}"
# -----------------------------------------------

# Считываем .env если есть
if [ -f ".env" ]; then
  set -a; source .env 2>/dev/null || true; set +a
  ok ".env файл найден"
else
  warn ".env не найден — используются системные env"
fi

if [ -n "$GEMINI_API_KEY" ]; then
  KEY_LEN=${#GEMINI_API_KEY}
  ok "GEMINI_API_KEY установлен ($KEY_LEN сим.)"
else
  fail "GEMINI_API_KEY не установлен — добавь в .env или secrets"
fi

echo ""
# -----------------------------------------------
echo -e "${BOLD}[3/5] 🔧 TypeScript: проверка синтаксиса${NC}"
# -----------------------------------------------

TSC_OUT=$(npx tsc --noEmit 2>&1)
TSC_CODE=$?
if [ $TSC_CODE -eq 0 ]; then
  ok "tsc --noEmit: нет ошибок"
else
  fail "tsc --noEmit нашёл ошибки:"
  echo ""
  echo -e "${RED}$TSC_OUT${NC}"
  echo ""
fi

echo ""
# -----------------------------------------------
echo -e "${BOLD}[4/5] 📁 Конфиги и ключевые файлы${NC}"
# -----------------------------------------------

for f in cli.ts tsconfig.json package.json; do
  if [ -f "$f" ]; then
    ok "$f есть"
  else
    fail "$f не найден!"
  fi
done

# Проверяем JSON-файлы
for jf in config/*.json; do
  if [ -f "$jf" ]; then
    if python3 -m json.tool "$jf" &>/dev/null 2>&1; then
      ok "JSON ok: $jf"
    else
      fail "Сломанный JSON: $jf"
    fi
  fi
done

# Проверяем channels config
CHANNELS=("ethno-food-ritual" "budget-travel" "nomad-tech")
for ch in "${CHANNELS[@]}"; do
  CF="config/${ch}.json"
  if [ -f "$CF" ]; then
    ok "channel config: $ch"
  else
    warn "channel config не найден: $CF"
  fi
done

echo ""
# -----------------------------------------------
echo -e "${BOLD}[5/5] 📊 Статистика статей${NC}"
# -----------------------------------------------

if [ -d "articles" ]; then
  TOTAL_MD=$(find articles -name "*.md" ! -name "REPORT.md" -type f 2>/dev/null | wc -l | tr -d ' ')
  TOTAL_JPG=$(find articles -name "*.jpg" -type f 2>/dev/null | wc -l | tr -d ' ')
  TODAY=$(date +%Y-%m-%d)
  TODAY_MD=$(find articles -path "*/$TODAY/*.md" ! -name "REPORT.md" -type f 2>/dev/null | wc -l | tr -d ' ')
  ok "Статей всего: $TOTAL_MD .md, картинок: $TOTAL_JPG .jpg"
  info "Сегодня ($TODAY): $TODAY_MD статей"
else
  warn "articles/ директория пуста"
fi

if [ -f "public/feed.xml" ]; then
  FEED_ITEMS=$(grep -c "<item>" public/feed.xml 2>/dev/null || echo 0)
  ok "feed.xml: $FEED_ITEMS статей в RSS"
else
  warn "public/feed.xml не найден"
fi

# =============================================================
echo ""
echo -e "${BOLD}=================================================${NC}"
if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}${BOLD}  ✅ PASS: $PASS  ⚠️  WARN: $WARN  — запуск безопасен!${NC}"
  echo -e "${BOLD}=================================================${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}${BOLD}  ❌ FAIL: $FAIL  ✅ PASS: $PASS  ⚠️  WARN: $WARN${NC}"
  echo -e "${RED}${BOLD}  Исправь ошибки перед запуском фабрики!${NC}"
  echo -e "${BOLD}=================================================${NC}"
  echo ""
  exit 1
fi
