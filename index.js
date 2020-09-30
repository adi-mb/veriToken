'use strict'

const axios = require('axios');
const _ = require('lodash');

/**
 * Verity your client tokens.
 * @param clientId Your client ID - register for free at: https://veritoken.co
 * @param active Apply some rules whether you wish to activate the middleware - e.g. on dev or staging environments you don't wish to run the middleware. - default is: true
 * @param ignorePaths Array of paths you do not wish to verify e.g. ['/api/auth/login']
 * @param ignoreHttpMethods Array of HTTP method to ignore when testing the token. - the default is : ['OPTIONS', 'GET']
 * @returns The middleware creates veriToken property under the request object (e.i. you can access it later on using req.veriToken).
 * The value of veriToken is an object with the following properties:  on failure : {status: 'failed', message: 'error  message'}
 * on success: {status: 'success', message: 'success message'}. Then you can do with in whatever you want on the next middleware.
 */
const verifyToken = (clientId, active = true, ignorePaths = [], ignoreHttpMethods = ['OPTIONS', 'GET']) => {

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
            if (req.headers) {
                token = _.get(req.headers, 'authorization', null);
                if (token) {
                    token = token.split(" ")[1];
                }
            }

            if (!token) {
                req.veriToken = {
                    status: 'failed',
                    message: 'Token do not exists'
                };
                next();
                return;
            }

            const clientIP = getRemoteIp(req);

            axios.post('https://api.veritoken.co/api/verifyToken', {
                clientId: clientId,
                token: token,
                clientHeaders: req.headers,
                clientIP: clientIP
            }).then(function (response) {
                req.veriToken = response.data;
                next();
            }).catch(function (error) {
                if (error.response) {
                    req.veriToken = error.response.data;
                } else {
                    req.veriToken = {
                        status: 'failed',
                        message: 'Fail to access the VeriToken server'
                    };
                }
                next();
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


const getRemoteIp = function(req) {
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
