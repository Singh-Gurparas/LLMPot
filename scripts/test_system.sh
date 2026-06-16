#!/bin/bash

# LLMPot System Integration Test Script
# Run this after docker compose up -d

echo "============================================="
echo "   LLMPot System Integration Test"
echo "============================================="

HOST="localhost"
FAIL_COUNT=0

function check_status() {
    if [ $1 -eq 0 ]; then
        echo -e " [\033[32mPASS\033[0m] $2"
    else
        echo -e " [\033[31mFAIL\033[0m] $2"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
}

echo "1. Checking Edge Node Services..."
curl -s --connect-timeout 2 http://$HOST:80 > /dev/null
check_status $? "Edge Node HTTP/WP (Port 80)"

curl -s --connect-timeout 2 http://$HOST:8081 > /dev/null
check_status $? "Edge Node Jenkins (Port 8081)"

curl -s --connect-timeout 2 http://$HOST:9200 > /dev/null
check_status $? "Edge Node Elasticsearch (Port 9200)"

echo "2. Checking Backend APIs..."
HEALTH=$(curl -s --connect-timeout 2 http://$HOST:8000/health)
if [[ "$HEALTH" == *"healthy"* ]]; then
    check_status 0 "Backend API Health (/health)"
else
    check_status 1 "Backend API Health (/health)"
fi

curl -s --connect-timeout 2 http://$HOST:8000/api/nodes > /dev/null
check_status $? "Backend API Nodes (/api/nodes)"

curl -s --connect-timeout 2 http://$HOST:8000/api/analytics/overview > /dev/null
check_status $? "Backend API Analytics (/api/analytics/overview)"

curl -s --connect-timeout 2 http://$HOST:8000/api/attacks > /dev/null
check_status $? "Backend API Attacks (/api/attacks)"

echo "3. Checking Frontend..."
curl -s --connect-timeout 2 http://$HOST:3000 > /dev/null
check_status $? "Frontend Dashboard (Port 3000)"

echo "============================================="
if [ $FAIL_COUNT -eq 0 ]; then
    echo -e " \033[32mALL TESTS PASSED!\033[0m"
    exit 0
else
    echo -e " \033[31m$FAIL_COUNT TESTS FAILED!\033[0m"
    exit 1
fi
