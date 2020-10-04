# VeriToken [Express](https://expressjs.com/) middleware

### Enterprise Grade Identity Theft & Data Exploitation Prevention As A Service
VeriToken provides your business with an enterprise grade security solution that prevents external and internal users from stealing or abusing your identity and exploiting your data.

This is achieved by providing you with a proprietary lightweight API that anonymously validates your organisation authentication token/session and conducts behavioural analysis to indicate potential identity thefts or data exploitation in real-time.

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
- Man in the middle - monitor connected local network traffic to intercept the token or seesion id.
- Malicious Browser addons.
- Access your mobile phone storage.
- Physically copy it.

##### To secure the above vulnerability we have developed a ML based middleware that protects your identity from been stolen or misuse.

### Our free account [Express](https://expressjs.com/) middleware prevents token/session misuse:
- From different location.
- From different IP range.
- Limited token/session overuse.

### Our future versions will introduce the following prevention capabilities:
- User related behavioural analysis screening and rule engine for management.
- ML/DL screening to produce trafic insights.
- Analytics and reports.
- Other tech stack middleware libraries.

### How To
- [x] Register for free to get a client id at [veriToken.co](https://veriToken.co/#/auth/register/client)
- [x] Install the package: ```npm i @mbsoft/veritoken```
- [x] Log in to [veriToken.co](https://veriToken.co), copy your client id and manage your middleware roles.
- [x] Open your app.js or any other file that holds the [Express](https://expressjs.com/) definition.
- [x] Follow the bellow code to implement the middleware: 
```javascript

const veritoken = require('@mbsoft/veritoken');
// Create Express webapp. e.g. following 4 lines are yours this is just an example
let app = express();
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: false}));
app.use(compression({filter: shouldCompress}));
//////////////////////////////////////////

// ******* Use veriToken middleware ************

// For token authentication - PLACE IT IN A PLACE BEFOR YOUR TOKEN VERIFICATION MIDDLEWARE
app.use(veritoken('your-client-id'));
// OR
// For session based authentication - PLACE IT IN A PLACE BEFOR YOUR SESSION VERIFICATION MIDDLEWARE
app.use(veritoken('your-client-id'), 'session', 'YOUR-SESSION-COOKIE-NAME');

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
- clientId (required) - the registered client id.
- type (optional) - 'token' - Token based authentication (default) or 'session' Cookie based authentication.
- sessionCookieName (optional) - If type === 'session' apply the session cookie name located in your client request header.
- active (optional) - Apply some rules whether you wish to activate the middleware - e.g. on dev or staging environments you don't wish to run the middleware. (default: true)
- ignorePaths (optional) - Array of paths you do not wish to verify e.g. ['/api/auth/login'] (default: [])
- ignoreHttpMethods (optional) - Array of HTTP method to ignore when testing the token. (default : ['OPTIONS', 'GET'])

### Middleware behavior
VeriToken middleware verifies that your issued token/session is being used following the roles you defined on our backoffice.

**It sends out only the token/session id, and the original client request headers - NO DATA INVOLVE**

Following the token/seesion verification, VeriToken middleware adds a new property to your request object named: veriToken so later on your next middleware you can access the result using ```req.veriToken```.

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
    message: 'Error message'
}
```

**On your own middleware you can decide what is action based on VeriToken outcome :smile:**

For any support or any question please email us to [support@veritoken.co](mailto:support@veritoken.co)

#

