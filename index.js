'use strict'

const _ = require('lodash');

const defaultValidatorsDef = [
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
];

/**
 * Verity your client tokens/session ids.
 * @param redisClient The redis client object.
 * @param type Whether it's a 'token' (default) or 'session' - taken from a cookie key.
 * @param sessionCookieName If type === 'session' then you should set the session cookie name that holds the session id.
 * @param active Apply some rules whether you wish to activate the middleware - e.g. on dev or staging environments you don't wish to run the middleware. - default is: true
 * @param ignorePaths Array of paths you do not wish to verify e.g. ['/api/auth/login']
 * @param ignoreHttpMethods Array of HTTP method to ignore when testing the token. - the default is : ['OPTIONS', 'GET']
 * @param validatorsDef An object that defines the verification tests you wish to run. see defaultValidatorsDef above.
 * @returns The middleware creates veriToken property under the request object (e.i. you can access it later on using req.veriToken).
 * The value of veriToken is an object with the following properties:  on failure : {status: 'failed', message: 'error  message'}
 * on success: {status: 'success', message: 'success message'}. Then you can do with in whatever you want on the next middleware.
 */
const verifyToken = (redisClient,
                     type = 'token',
                     sessionCookieName = undefined,
                     active = true,
                     ignorePaths = [],
                     ignoreHttpMethods = ['OPTIONS', 'GET'],
                     validatorsDef = defaultValidatorsDef) => {

    return (req, res, next) => {
        try {
            if (!active) {
                next();
                return;
            }

            if (ignoreHttpMethods && ignoreHttpMethods.indexOf(req.method.toUpperCase()) > -1) {
                next();
                return;
            }

            if (ignorePaths && ignorePaths.indexOf(req.url) > -1) {
                next();
                return;
            }

            let token;
            if (type === 'token') {
                if (req.headers) {
                    token = _.get(req.headers, 'authorization', null);
                    if (token) {
                        token = token.split(" ")[1];
                    }
                }
            } else {
                // Type 'session'
                if (req.headers && sessionCookieName) {
                    token = getSessionIdFromCookies(req.headers, sessionCookieName);
                }
            }

            if (!token) {
                req.veriToken = {
                    status: 'failed',
                    message: 'Token/Session does not exists'
                };
                next();
                return;
            }

            const clientIP = getRemoteIp(req);

            const key = `veritoken.${token}`;
            redisClient.get(key, async (err, reply) => {
                if (err) {
                    throw new Error('Fail to access redis');
                }

                if (reply){
                    const storedValidators = JSON.parse(reply);
                    verify(redisClient, token, clientHeaders, res, clientIP, storedValidators);
                } else {
                    // New token
                    verify(redisClient, token, clientHeaders, clientIP, res, undefined, validatorsDef);
                }
            });
        } catch (error) {
            req.veriToken = {
                status: 'failed',
                message: `Something went wong: ${error}`
            };
            next();
        }
    };
};


/**
 * Verity client request token/session.
 * @param redisClient
 * @param token
 * @param clientHeaders
 * @param clientIP
 * @param res
 * @param validators
 * @param validatorsDef
 */
const verify = (redisClient, token, clientHeaders, clientIP, res, validators, validatorsDef) => {
    const key = `veritoken.${token}`;
    // Existing token
    if (validators) {
        let error;
        for (let i = 0; i < validators.length; i++ ) {
            const validator = validators[i];
            error = check(clientHeaders, clientIP, validator);
            if (error) {
                break;
            }
        }

        if (error) {
            res.status('401').send({
                status: 'failed',
                message: error
            });
            redisClient.del(key);
        } else {
            res.status('200').send({
                status: 'success',
                message: 'Valid token'
            });
            saveValidators(client, key, validators);
        }
    } else {
        // New token just store with validators
        validatorsDef.forEach((validator) => {
            initValidator(clientHeaders, clientIP, validator);
        });
        saveValidators(key, validatorsDef, res);
    }
};


/**
 * Save Validators
 * @param redisClient
 * @param key
 * @param validators
 * @param res
 */
const saveValidators = (redisClient, key, validators, res) => {
    redisClient.set(key, JSON.stringify(validators), 'EX', 3600, (err) => {
        if (err) {
            throw new Error('Fail to store in redis');
        } else {
            if (res) {
                res.status('200').send({
                    status: 'success',
                    message: 'Request holding a new token'
                });
            }
        }
    });
};


/**
 * Init validators
 * @param clientHeaders
 * @param clientIP
 * @param validator
 */
const initValidator = (clientHeaders, clientIP, validator) => {
    if (validator.enabled && validator.type === 'ip') {
        if (clientIP) {
            validator.value = clientIP;
        }
    } else if (validator.enabled && validator.type === 'User-Agent') {
        const ua = clientHeaders['user-agent'];
        if (ua) {
            validator.value = ua;
        }
    } else if (validator.enabled && validator.type === 'X-Csrf-Token') {
        const csrf = clientHeaders['x-csrf-token'] || clientHeaders['x-csrftoken'] || clientHeaders['x-xsrf-token'];
        if (csrf) {
            validator.value = csrf;
        }
    } else if (validator.type === 'maxHits') {
        validator.counter = 1;
    }
};


/**
 * Check client request details vs. the validators.
 * @param clientHeaders
 * @param clientIP
 * @param validator
 * @returns {string|undefined}
 */
const check = (clientHeaders, clientIP, validator) => {
    if (validator.enabled && validator.type === 'ip') {
        if (validator.value && clientIP !== validator.value) {
            return 'IP address had been changed';
        }
    } else if (validator.enabled && validator.type === 'User-Agent') {
        const ua = clientHeaders['user-agent'];
        if (validator.value && ua !== validator.value) {
            return 'User Agent had been changed';
        }
    } else if (validator.enabled && validator.type === 'X-Csrf-Token') {
        const csrf = clientHeaders['x-csrf-token'] || clientHeaders['x-csrftoken'] || clientHeaders['x-xsrf-token'];
        if (validator.value && csrf !== validator.value) {
            return 'Cross site request forgery protection token had been changed';
        }
    } else if (validator.type === 'maxHits') {
        if (validator.counter + 1 > validator.value) {
            return `Token has been used more then ${validator.value}`;
        } else {
            validator.counter++;
        }
    }
    return undefined;
};


/**
 * Get the client session cookie.
 * @param headers
 * @param key
 * @returns {*}
 */
const getSessionIdFromCookies = (headers, key) => {
    const cookies = {};
    headers.cookie.split(';').forEach(function(cookie) {
        var parts = cookie.match(/(.*?)=(.*)$/)
        cookies[ parts[1].trim() ] = (parts[2] || '').trim();
    });
    return cookies[key];
};


/**
 * Get client remote IP.
 * @param req
 * @returns {*|(() => )|string}
 */
const getRemoteIp = (req) => {
    let clientIP;
    if (req.headers['cf-connecting-ip'] && req.headers['cf-connecting-ip'].split(', ').length) {
        const first = req.headers['cf-connecting-ip'].split(', ');
        clientIP = first[0];
    } else {
        clientIP = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
    }
    return clientIP;
};



module.exports = verifyToken;
