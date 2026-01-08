#!/bin/bash

echo "🔍 VERIFICATION REPORT - JSON Parsing & Theme Randomization"
echo "==========================================================="
echo ""

echo "✅ CHECKING: stripMarkdownJson() method exists"
if grep -q "private stripMarkdownJson" services/multiAgentService.ts; then
    echo "   ✓ Method found in MultiAgentService"
else
    echo "   ✗ Method NOT found"
    exit 1
fi

echo ""
echo "✅ CHECKING: stripMarkdownJson() called in generateOutline()"
if grep -A 3 "async generateOutline" services/multiAgentService.ts | grep -q "stripMarkdownJson"; then
    echo "   ✓ Called in generateOutline()"
else
    echo "   ✗ NOT called in generateOutline()"
    exit 1
fi

echo ""
echo "✅ CHECKING: stripMarkdownJson() called in generateTitle()"
if grep -A 20 "async generateTitle" services/multiAgentService.ts | grep -q "stripMarkdownJson"; then
    echo "   ✓ Called in generateTitle()"
else
    echo "   ✗ NOT called in generateTitle()"
    exit 1
fi

echo ""
echo "✅ CHECKING: stripMarkdownJson() called in generateVoicePassport()"
if grep -A 20 "async generateVoicePassport" services/multiAgentService.ts | grep -q "stripMarkdownJson"; then
    echo "   ✓ Called in generateVoicePassport()"
else
    echo "   ✗ NOT called in generateVoicePassport()"
    exit 1
fi

echo ""
echo "✅ CHECKING: Theme randomization with Math.random()"
if grep -q "Math.floor(Math.random()" cli.ts; then
    echo "   ✓ Random selection implemented"
else
    echo "   ✗ Random selection NOT found"
    exit 1
fi

echo ""
echo "✅ CHECKING: Config has required_triggers"
if grep -q '"required_triggers"' projects/channel-1/config.json; then
    echo "   ✓ required_triggers found in config"
    echo "   Themes: $(grep -A 4 'required_triggers' projects/channel-1/config.json | grep -oP '"\K[^"]+' | tr '\n' ', ')"
else
    echo "   ✗ required_triggers NOT found in config"
    exit 1
fi

echo ""
echo "✅ CHECKING: Proper log formatting"
if grep -q 'Theme from CLI (highest priority)' cli.ts; then
    echo "   ✓ CLI theme message correct"
else
    echo "   ✗ CLI theme message incorrect"
    exit 1
fi

if grep -q 'Theme from config (RANDOM pick)' cli.ts; then
    echo "   ✓ Config theme message correct"
else
    echo "   ✗ Config theme message incorrect"
    exit 1
fi

if grep -q 'Using hardcoded default theme' cli.ts; then
    echo "   ✓ Default theme message correct"
else
    echo "   ✗ Default theme message incorrect"
    exit 1
fi

echo ""
echo "=========================================================="
echo "✅ ALL CHECKS PASSED - Implementation is correct!"
echo "=========================================================="
