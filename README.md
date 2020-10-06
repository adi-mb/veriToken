# VeriToken middleware

### Identity Theft & Data Exploitation Prevention
VeriToken is an [Express](https://expressjs.com/) middleware that provides an extra layer of security to protect your server authentication. It prevents external and internal users from stealing or abusing your identity and exploiting your data.

This is achieved by defining a set of rules that validates your token/session that will indicate potential identity thefts or data exploitation in real-time.

Whether an employee is attempting to access unauthorised data or an hacker trying to perform actions under false identity, VeriToken will give you the ability to instantly react and mitigate these threats.

### Why tokens?
The majority of organisation are using token base authentication, whether through [OpenID](https://openid.net/) or other authentication libraries. e.g. Google, Facebook… 

A token can be stolen and reused till it expires! Mobile application tokens usually has an unlimited expiration time. 

A token cannot be changed due to the fact that it’s encoded and password protected, which is an advantage! However what happens if an attacker gets a hold of your token? It can expose your organisation and users information and operation!

### Why sessions?
Same with a session based authentication, the client posts the login credential to the server, server verifies the credential and creates session id which is stored in server and returned to client via set-cookie. 
On subsequent request the session id from the cookie is sent back to the server for authentication.
A session id taken from the cookie can also be stolen and reused till it expires!

### How can an attacker get a hold of your token/session id?
There are number of ways an attacker can steal your identity:
- Website stores authentication token or session id on the local storage or cookie which can be accessed e.g adding a zero iframe with your org domains to another web page.
- Monitor local network traffic to intercept the token or seesion id.
- Malicious Browser addons.
- Access your mobile phone storage.
- Physically copy it.

##### To secure the above vulnerability we have developed a middleware that protects your identity from been stolen or misuse.

### Token/Session Validators Here The current verion Our free account [Express](https://expressjs.com/) middleware prevents token/session misuse:
The default set of validators we use are:  
- If your token/session was issued to one IP address, it cannot be used from another IP.
- If your token/session was issued for a certain device, it cannot be used from another device.
- If your token/session was issued with a Csrf token (Cross Site Request Forgery token), it cannot change.
- The maximum number of API hits using this token/session.

You can manage your preferences by overriding the default validators definition:
```javascript
[
    {
        "type" : "ip",
        "enabled" : true,
        "description" : "If your token was issued to one IP address, it cannot be used from another IP"
    },
    {
        "type" : "User-Agent",
        "enabled" : true,
        "description" : "If your token was issued for a certain device, it cannot be used from another device"
    },
    {
        "type" : "X-Csrf-Token",
        "enabled" : true,
        "description" : "If your token was issued with a Csrf token (Cross Site Request Forgery token), it cannot changed"
    },
    {
        "type" : "maxHits",
        "enabled" : true,
        "description" : "The maximum number of API hits using this token",
        "value" : 50
    }
]
```
Your can disable one of the validators or change the max number of hits or even fork this repo to extend it.

### Dependency
- [x] This package uses Redis, the package gets a Redis client reference and assume that it has been connected.
 
### How To
```javascript

// Connect to Redis
const hostname = 'YOUR HOST';
const port = 'YOUR PORT';
const password = 'YOUR PASSWORD';
const redis = require('redis');
redisClient = redis.createClient(port, hostname, {no_ready_check: true});
if (hostname !== '127.0.0.1') {
    redisClient.auth(password, (err) => {
        if (err) {
            logger.error("Fail to connect to redis");
            throw err;
        }
    });
}
redisClient.on('connect', function () {
    logger.info(`Connected to Redis on: ${hostname}:${port}`);
});
//////////////////////////////////////////


// Create Express webapp. e.g. following 4 lines are yours this is just an example
let app = express();
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: false}));
app.use(compression({filter: shouldCompress}));
//////////////////////////////////////////

// ******* Use veriToken middleware ************
const veritoken = require('@mbsoft/veritoken');

// For token authentication - PLACE IT IN A PLACE BEFOR YOUR TOKEN VERIFICATION MIDDLEWARE
app.use(veritoken(redisClient));

// OR

// For session based authentication - PLACE IT IN A PLACE BEFOR YOUR SESSION VERIFICATION MIDDLEWARE
app.use(veritoken(redisClient), 'session', 'YOUR-SESSION-COOKIE-NAME');

// **********************************************

// Your middleware that verifies your users - g.e.s
app.use((req,res,next) => {
    if (req.veriToken && req.veriToken.status === 'failed') {
        // You can decide what to do from here e.g. return 401 
        res.status('401').send({status: 'fail', reason: req.veriToken.message});
    }
    // code code
});
```

### Middleware arguments
VeriToken middleware supports the following arguments:
- redisClient (required) - connected redis client.
- type (optional) - 'token' - Token based authentication (default) or 'session' Cookie based authentication.
- sessionCookieName (optional) - If type === 'session' apply the session cookie name located in your client request header.
- active (optional) - Apply some rules whether you wish to activate the middleware - e.g. on dev or staging environments you don't wish to run the middleware. (default: true)
- ignorePaths (optional) - Array of paths you do not wish to verify e.g. ['/api/auth/login'] (default: [])
- ignoreHttpMethods (optional) - An array of HTTP method to ignore when testing the token. (default : ['OPTIONS', 'GET'])
- validatorsDef (optional) - Override the default array of validators, see the format above.

### Middleware behavior
VeriToken middleware verifies that your issued token/session is being used following the validators definition you provided.

Following the token/seesion verification, the middleware adds a new property to your request object named: veriToken so later on your next middleware you can access the result using ```req.veriToken```.

##### If the token/session usage is valid ```req.veriToken``` will hold the following object: 
```javascript
{
    status: 'success',
    message: 'Success message'
}
```


##### If the token/session usage is invalid ```req.veriToken``` will hold the following object: 
```javascript
{
    status: 'failed',
    message: 'Error message taken from the validator description'
}
```

**On your own middleware you can decide what is action based on VeriToken outcome :smile:**

#

