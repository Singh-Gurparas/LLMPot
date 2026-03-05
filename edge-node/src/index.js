require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const { connectRedis } = require('./logging/attackLogger');

const wpHoneypot = require('./honeypots/wordpress');
const elasticHoneypot = require('./honeypots/elasticsearch');
const jenkinsHoneypot = require('./honeypots/jenkins');

// Structured logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'edge-node' },
    transports: [
        new winston.transports.Console()
    ],
});

// Rate limiting to prevent DoS on the honeypot
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests, please try again later.',
    handler: (req, res, next, options) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(options.statusCode).send(options.message);
    }
});

async function startServers() {
    await connectRedis();

    // 1. Generic HTTP / WordPress Honeypot (Port 80 mapped to 8000 internally)
    const app80 = express();
    app80.set('trust proxy', 1); // trust first proxy to get real IP
    app80.use(limiter);
    app80.use(express.json({ strict: false }));
    app80.use(express.urlencoded({ extended: true }));

    // Add request logger
    app80.use((req, res, next) => {
        logger.info(`Received HTTP request`, { method: req.method, url: req.url, ip: req.ip });
        next();
    });

    app80.use('*', wpHoneypot);
    app80.listen(8000, '0.0.0.0', () => logger.info('HTTP/WP Honeypot listening on port 8000'));

    // 2. Elasticsearch Honeypot (Port 9200)
    const app9200 = express();
    app9200.set('trust proxy', 1);
    app9200.use(limiter);
    app9200.use(express.json());
    app9200.use('*', elasticHoneypot);
    app9200.listen(9200, '0.0.0.0', () => logger.info('Elasticsearch Honeypot listening on port 9200'));

    // 3. Jenkins Honeypot (Port 8080)
    const app8080 = express();
    app8080.set('trust proxy', 1);
    app8080.use(limiter);
    app8080.use(express.json());
    app8080.use(express.urlencoded({ extended: true }));
    app8080.use('*', jenkinsHoneypot);
    app8080.listen(8080, '0.0.0.0', () => logger.info('Jenkins Honeypot listening on port 8080'));

}

startServers().catch(err => {
    logger.error("Failed to start Edge Node:", { error: err.message });
    process.exit(1);
});
