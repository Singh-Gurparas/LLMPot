# UnHarmd: AI-Powered Distributed Honeypot Platform

UnHarmd is a modular, scalable, and globally distributed honeypot system designed to capture, log, and analyze cybersecurity threats in real-time utilizing LLM-driven threat intelligence.

![UnHarmd Dashboard Concept](https://via.placeholder.com/1200x600?text=UnHarmd+Real-Time+Threat+Intelligence)

## Core Architecture and Component Flow

The platform relies on a distributed structure emphasizing security boundary isolation and high-volume event ingestion.

\`\`\`mermaid
flowchart LR
    A[Attacker] -->|Port 80, 8080, 9200| E[Dockerized Edge Node]
    E -->|Publish Event| R[Redis Internal Net]
    R -->|Async Loop| B[FastAPI AI Analyzer]
    B -->|Persist| P[(PostgreSQL)]
    B -->|Generate| LLM{OpenAI/Gemini}
    F[React Dashboard] -->|Polls/Fetches| B
\`\`\`

1. **Attacker Traffic:** Scanners and attackers hit the **Edge Node**, which simulates vulnerable services (WordPress, Jenkins, Elasticsearch) using Node.js/Express.
2. **Ingestion & Enrichment:** The Edge Node immediately ships connection telemetry over an internal Redis Pub/Sub stream to decouple capture from analysis.
3. **AI Pipeline:** A background FastAPI worker consumes the Redis events, performs MaxMind GeoIP lookups, generates SHA256 payload fingerprints, and forwards the attack sequence to the **Groq API** (llama3-70b-8192) for intent classification and mitigation reporting.
4. **Actionable Intelligence:** Threat telemetry (Sessions, Events, Attacks, and AI Reports) is persisted in PostgreSQL and served via REST APIs to a premium glassmorphic React Dashboard.

## Features & Hardening

- **Session Replay:** Attack timelines are fully reconstructed, allowing analysts to step through individual Request -> Response pairs in real-time.
- **Node Monitoring:** Edge node health checks, uptime tracking, and real-time status.
- **Security Hardening:** The docker-compose network is isolated. The Node.js Edge container operates via a non-root `unharmd` user running read-only on unprivileged internal ports (dynamically mapped over Docker). It invokes Express rate-limiting to prevent DoS.
- **Observability:** Centralized structured JSON logging output utilizing `winston` and `python-json-logger`.

### 1. Environment Configuration

1. **Get a Groq API Key**: Sign up at [Groq Console](https://console.groq.com/keys) and generate an API key.
2. **Create .env File**: Create a file named `.env` in the root directory of the project.
3. **Configure Variables**: Use the provided template:

```env
# Groq API Key
GROQ_API_KEY=your_groq_api_key_here

# Infrastructure
REDIS_URL=redis://redis:6379
DATABASE_URL=postgresql+asyncpg://unharmd_admin:unharmd_secret@postgres:5432/unharmd_db

# Edge Node
NODE_REGION=local-dev
```

### 2. Start Services via Docker Compose

From the root `infrastructure` directory:

```bash
cd infrastructure
docker-compose up --build -d
```

### 3. Tail Observability Logs
Verify the structured logs are functioning:
```bash
docker logs unharmd-backend -f
# OR
docker logs unharmd-edge-node -f
\`\`\`

### 3. Simulate Attacks
Run the included bash test suite to fire targeted payloads against the Edge Node:
\`\`\`bash
chmod +x ./scripts/simulate_attacks.sh
./scripts/simulate_attacks.sh
\`\`\`
*This script fires a SQLi probe, a Jenkins RCE exploit, a Directory Traversal payload, and an Nmap scanner.*

### 4. Validate Dashboard UI
1. Open \`http://localhost:3000\` in your browser.
2. Ensure the **Global Attack Map** parses the GeoIP lookup.
3. In the **Attack Feed**, click an entry to open the **Attack Analysis** Details modal.
4. Click **View Full Session Replay** to watch the attacker's reconstructed event timeline.

## Project Structure
- **/backend**: FastAPI server connecting to PostgreSQL and Redis.
- **/edge-node**: Hardened Node.js server acting as the honeypot array.
- **/frontend**: React + Vite application visualizing intelligence data.
- **/infrastructure**: Core docker-compose layouts and DB Initialization.
- **/scripts**: Simulation scripts for red-teaming your own honeypots.

## License
MIT
