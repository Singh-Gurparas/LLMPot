#!/bin/bash

# LLMPot Multi-Location Attack Simulator
# ---------------------------------------
# Generates simulated honeypot traffic from multiple
# source IPs representing different geographic locations.

HOST="localhost"

echo "============================================="
echo "   LLMPot Multi-Location Attack Simulator"
echo "============================================="

send_attack() {
    IP="$1"
    NAME="$2"
    METHOD="$3"
    URL="$4"
    USER_AGENT="$5"
    DATA="$6"

    echo "[*] $NAME"
    echo "    Source IP: $IP"

    if [ "$METHOD" = "POST" ]; then
        curl -s -X POST "http://$HOST$URL" \
            -H "User-Agent: $USER_AGENT" \
            -H "X-Forwarded-For: $IP" \
            -H "Content-Type: application/x-www-form-urlencoded" \
            -d "$DATA" \
            > /dev/null
    else
        curl -s -X GET "http://$HOST$URL" \
            -H "User-Agent: $USER_AGENT" \
            -H "X-Forwarded-For: $IP" \
            > /dev/null
    fi

    echo "    -> Sent"
    sleep 1
}

# ==================================================
# EUROPE
# ==================================================

send_attack \
    "85.214.132.117" \
    "Germany - SQL Injection" \
    "POST" \
    "/wp-login.php" \
    "Mozilla/5.0" \
    "log=admin%27%20OR%20%271%27%3D%271"

send_attack \
    "5.39.219.44" \
    "France - Directory Traversal" \
    "GET" \
    "/../../../../etc/passwd" \
    "Mozilla/5.0" \
    ""

send_attack \
    "51.15.23.91" \
    "France - Scanner Probe" \
    "GET" \
    "/admin" \
    "Nikto/2.1.6" \
    ""

send_attack \
    "185.220.101.42" \
    "Germany - Suspicious Request" \
    "GET" \
    "/.env" \
    "python-requests/2.31" \
    ""

# ==================================================
# ASIA
# ==================================================

send_attack \
    "123.125.71.29" \
    "China - Directory Traversal" \
    "GET" \
    "/../../../../etc/shadow" \
    "Mozilla/5.0" \
    ""

send_attack \
    "8.8.8.8" \
    "Asia - Web Scanner" \
    "GET" \
    "/robots.txt" \
    "sqlmap/1.7" \
    ""

send_attack \
    "1.1.1.1" \
    "Asia - Admin Probe" \
    "GET" \
    "/administrator" \
    "Mozilla/5.0" \
    ""

send_attack \
    "103.21.244.0" \
    "Asia - Login Probe" \
    "POST" \
    "/wp-login.php" \
    "Mozilla/5.0" \
    "log=admin&pwd=admin"

# ==================================================
# NORTH AMERICA
# ==================================================

send_attack \
    "104.244.42.1" \
    "USA - SQL Injection Probe" \
    "GET" \
    "/search?q=%27%20OR%201%3D1" \
    "Mozilla/5.0" \
    ""

send_attack \
    "66.249.66.1" \
    "USA - Automated Scanner" \
    "GET" \
    "/wp-admin" \
    "Googlebot/2.1" \
    ""

send_attack \
    "23.92.17.10" \
    "USA - Jenkins Probe" \
    "GET" \
    "/script" \
    "curl/8.0" \
    ""

# ==================================================
# SOUTH AMERICA
# ==================================================

send_attack \
    "177.105.252.193" \
    "Brazil - Jenkins Probe" \
    "POST" \
    ":8081/script" \
    "curl/8.0" \
    "script=test"

send_attack \
    "186.192.1.10" \
    "Brazil - Web Scanner" \
    "GET" \
    "/wp-login.php" \
    "Nikto/2.1.6" \
    ""

send_attack \
    "200.10.20.30" \
    "Argentina - Admin Probe" \
    "GET" \
    "/admin" \
    "Mozilla/5.0" \
    ""

# ==================================================
# AFRICA
# ==================================================

send_attack \
    "41.76.12.10" \
    "South Africa - Web Probe" \
    "GET" \
    "/login" \
    "Mozilla/5.0" \
    ""

send_attack \
    "102.67.15.20" \
    "Nigeria - Scanner Probe" \
    "GET" \
    "/wp-admin" \
    "python-requests/2.31" \
    ""

# ==================================================
# OCEANIA
# ==================================================

send_attack \
    "203.10.76.1" \
    "Australia - Web Scanner" \
    "GET" \
    "/administrator" \
    "Nikto/2.1.6" \
    ""

send_attack \
    "203.0.113.50" \
    "Australia - Login Probe" \
    "POST" \
    "/wp-login.php" \
    "Mozilla/5.0" \
    "log=admin&pwd=password"

# ==================================================
# MORE EUROPE
# ==================================================

send_attack \
    "185.56.80.10" \
    "Netherlands - Scanner" \
    "GET" \
    "/.git/config" \
    "curl/8.0" \
    ""

send_attack \
    "89.163.145.20" \
    "Poland - Admin Probe" \
    "GET" \
    "/admin" \
    "Mozilla/5.0" \
    ""

send_attack \
    "46.101.20.30" \
    "United Kingdom - Web Probe" \
    "GET" \
    "/login" \
    "python-requests/2.31" \
    ""

echo ""
echo "============================================="
echo "[+] Multi-location simulation completed"
echo "[+] Check the LLMPot dashboard"
echo "============================================="