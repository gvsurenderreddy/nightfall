#!/usr/bin/env js
'use strict';

var nightfall = {};

// clean up every x seconds
var CLEANING_INTERVAL = nightfall.CLEANING_INTERVAL = 1000 * 30;
// time out every x seconds
var TIMEOUT = nightfall.TIMEOUT = 1000 * 60 * 5;

// if used as a plugin, you'll need another 
var prefix = nightfall.prefix = '/nightfall';

var motto = nightfall.motto = function() {/*The masses are the decisive
element, they are the rock on
which the final victory of the
revolution will be built.
*/}.toString().slice(15, -3);

var jsonify = function(x) {
    return JSON.stringify(x) + '\n';
};

var Engine = (function(mode) {
    if(mode === 'redis') {
        return require('./redis');
    }

    return require('./memory');
})(process.argv.slice(-1));
var storage = new Engine();

var main = nightfall.main = function(req, res, next) {
    next = next || function(result) {
        result = result || motto;
        res.setHeader('Content-Type', 'text/plain');
        res.end(result);
    };

    // let's not assume we'll only receive an ipv4
    var ip = req.connection.remoteAddress;
    if(!/^\d{0,3}\.\d{0,3}\.\d{0,3}\.\d{0,3}$/.test(ip)) {
        // it must be an ipv6
        return next('This service is meant to connect users via their ipv4 addresses.');
    }

    var url = req.url.replace(prefix, ''); // strip out the prefix
    var chunks = url.split('/'); // break the url into its components
    var topic = chunks[1];
    var action = chunks[2];
    var modifier = chunks[3];

    if(action === 'seek') {
        if(modifier !== 'nearby') {
            modifier = 'any';
        }

        storage.connect(function(s) {
            s[modifier](topic, ip, function(peers) {
                res.end(jsonify(peers));
            });
        });
    } else if(action === 'have') {
        var body = '';

        req.on('data', function(data) {
            body += data;
            if(body.length > 1e3) {
                req.connection.destroy();
            }
        }).on('end', function() {
            var reply = {};
            var json;

            try {
                json = JSON.parse(body);
            } catch(SyntaxError) {
                reply = {'error': 'not json'};
            }

            storage.connect(function(s) {
                if(json &&
                    !('ip' in json || 'ts' in json) &&
                    typeof json.port === 'number' &&
                    typeof json.password === 'string' &&
                    typeof json.publicKey === 'string'
                ) {
                    json.ip = ip;
                    json.ts = Date.now();

                    s.add(topic, ip, json, TIMEOUT);

                    reply = {'status': 'success'};
                } else {
                    reply = {'error': 'invalid json'};
                }

                res.end(jsonify(reply));
            });
        });
    } else {
        next(); // default message is the 'motto', declared at the top
    }
};

/* If this is being called as a standalone server */
if(require.main === module) {
    storage.background(CLEANING_INTERVAL, TIMEOUT);

    /* launch the server */
    require('http').createServer(main).listen(7473, '', function() {
        console.log('[+] Nightfall is ready');
    });
} else { 
    /* otherwise (if it is being included as a library) */
    module.exports = nightfall;
}
