const { publishEvent } = require('../logging/attackLogger');

// Fake WP response logic
module.exports = async (req, res) => {
    let status = 200;
    let resBody = "";
    const resHeaders = {
        'Server': 'Apache/2.4.41 (Ubuntu)',
        'X-Powered-By': 'PHP/7.4.3'
    };

    if (req.originalUrl.includes('wp-admin') || req.originalUrl.includes('wp-login.php')) {
        resBody = `
            <!DOCTYPE html>
            <html>
            <head><title>WordPress &rsaquo; Log In</title></head>
            <body class="login">
                <form name="loginform" id="loginform" action="/wp-login.php" method="post">
                    <input type="text" name="log" />
                    <input type="password" name="pwd" />
                    <input type="submit" value="Log In" />
                </form>
            </body>
            </html>
        `;
        if (req.method === 'POST') {
            status = 302; // Simulate generic redirect
            resHeaders['Location'] = '/wp-admin/';
            resBody = "Redirecting...";
        }
    } else if (req.originalUrl.includes('xmlrpc.php')) {
        resBody = `XML-RPC server accepts POST requests only.`;
        status = 200;
    } else {
        // Generic 404 for random scanners
        status = 404;
        resBody = `<!DOCTYPE html><html><body><h1>Not Found</h1><p>The requested URL was not found on this server.</p></body></html>`;
    }

    // Set headers
    for (const [key, value] of Object.entries(resHeaders)) {
        res.setHeader(key, value);
    }

    res.status(status).send(resBody);

    // Asynchronously log the attack
    await publishEvent({
        port: 80,
        req: req,
        resData: { status, headers: resHeaders, body: resBody.substring(0, 500) } // Truncate body
    });
};
