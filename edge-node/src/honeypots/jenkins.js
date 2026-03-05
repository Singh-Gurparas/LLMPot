const { publishEvent } = require('../logging/attackLogger');

module.exports = async (req, res) => {
    let resBody = "";
    let status = 403;
    const resHeaders = {
        'Server': 'Jetty(9.4.43.v20210629)',
        'X-Jenkins': '2.289.1',
        'X-Jenkins-Session': '8b45a2cc',
        'X-Hudson': '1.395',
        'X-Jenkins-CLI-Port': '50000',
        'X-Jenkins-CLI2-Port': '50000',
    };

    if (req.originalUrl.startsWith('/login')) {
        resBody = `
            <!DOCTYPE html><html><head><title>Sign in [Jenkins]</title></head>
            <body>
            <form action="/j_spring_security_check" method="post">
                <input name="j_username" type="text" placeholder="User" />
                <input name="j_password" type="password" placeholder="Password" />
                <button type="submit">Sign in</button>
            </form>
            </body></html>
        `;
        status = 200;
    } else if (req.originalUrl.includes('script')) {
        // Classic Groovy script execution exploit target
        resBody = "<html><body>Error: script execution requires authentication</body></html>";
    } else {
        resBody = `Authentication required. Please <a href="/login">login</a>.`;
        status = 403;
    }

    for (const [key, value] of Object.entries(resHeaders)) {
        res.setHeader(key, value);
    }

    res.status(status).send(resBody);

    await publishEvent({
        port: 8080,
        req: req,
        resData: { status, headers: resHeaders, body: resBody.substring(0, 500) }
    });
};
