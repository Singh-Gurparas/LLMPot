const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = createClient({ url: redisUrl });

redisClient.on('error', (err) => console.log('Redis Client Error', err));

async function connectRedis() {
    await redisClient.connect();
    console.log('Connected to Redis Event Stream');
}

const REDIS_CHANNEL = 'llmpot_events';

// Identify this node
const NODE_ID = process.env.NODE_ID || uuidv4();
const NODE_REGION = process.env.NODE_REGION || 'local-dev';
const NODE_IP = process.env.NODE_IP || '127.0.0.1';

async function publishEvent({ port, req, resData }) {
    if (!redisClient.isOpen) {
        console.warn("Redis not connected. Event dropped.");
        return;
    }

    const attackerIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Normalize IPv4-mapped IPv6 addresses like ::ffff:127.0.0.1
    let cleanIp = attackerIp;
    if (typeof cleanIp === 'string' && cleanIp.includes('::ffff:')) {
        cleanIp = cleanIp.split('::ffff:')[1];
    }
    // If it's a loopback IPv6, normalize to IPv4
    if (cleanIp === '::1') {
        cleanIp = '127.0.0.1';
    }

    const event = {
        node_id: NODE_ID,
        region: NODE_REGION,
        node_ip: NODE_IP,
        ip: cleanIp,
        port: port,
        method: req.method,
        path: req.originalUrl || req.url,
        headers: req.headers,
        body: req.body ? (typeof req.body === 'object' ? JSON.stringify(req.body) : req.body.toString()) : "",
        status: resData.status || 200,
        res_headers: resData.headers || {},
        res_body: resData.body || "",
        timestamp: new Date().toISOString()
    };

    try {
        await redisClient.publish(REDIS_CHANNEL, JSON.stringify(event));
        console.log(`[Event Published] ${event.ip} -> Port ${port} (${event.method} ${event.path})`);
    } catch (err) {
        console.error("Failed to publish event:", err);
    }
}

module.exports = {
    connectRedis,
    publishEvent,
    NODE_ID
};
