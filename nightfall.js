#!/usr/bin/env nodejs
'use strict';

var http = require('http');
var bucket = {};

var CLEANING_INTERVAL = 1000 * 30;
var TIMEOUT = 1000 * 60 * 5;

var PEERS_FROM_RANGE = 3;
var TOTAL_PEERS = 6;

var peers_available = 0;

setInterval(function() {
    for(var a in bucket) {
        for(var b in bucket[a]) {
            for(var c in bucket[a][b]) {
                if(bucket[a][b][c].ts + TIMEOUT < Date.now()) {
                    console.log('removing ' + bucket[a][b][c].ip);
                    delete bucket[a][b][c];
                    peers_available--;
                }
            }
        }
    }
}, 3000);


var getRandomItem = function(list) {
    var keys = Object.keys(list);
    return list[keys[Math.floor(Math.random() * keys.length)]];
}

var addRandomPeers = function(set, bucket, num) {
    while(set.length < num) {
        var x = getRandomItem(bucket);
        var y = getRandomItem(x);

        if(set.indexOf(y) < 0) {
            set.push(y);
        }
    }

    return set;
}

http.createServer(function(req, res) {
    var ip = req.connection.remoteAddress.split('.');

    var chunks = req.url.split('/');
    var topic = chunks[1];
    var action = chunks[2];

    var range = ip[0] + '.' + ip[1];
    var host = ip[2] + '.' + ip[3];

    if(action == 'seek') {
        var set = [];

        if(topic in bucket) {
            if(range in bucket[topic]) {
                var peers_from_range = Math.min(bucket[topic][range].length, PEERS_FROM_RANGE);
                set = addRandomPeers([], bucket[topic][range], peers_from_range);
            }

            var total_peers = Math.min(peers_available, TOTAL_PEERS);
            set = addRandomPeers(set, bucket[topic], total_peers);
        }

        res.end(JSON.stringify(set) + '\n');
    } else if(action == 'have') {
        var body = '';

        req.on('data', function(data) {
            body += data;

            if(body.length > 1e3) {
                req.connection.destroy();
            }
        }).on('end', function() {
            var reply;
            var json;

            var reply = {};

            try {
                json = JSON.parse(body);
            } catch(SyntaxError) {
                reply = {'error': 'not json'};
            }

            if(json && !('ip' in json || 'ts' in json)) {
                if(!(topic in bucket)) {
                    console.log('creating bucket[%s]', topic);
                    bucket[topic] = {};
                }

                if(!(range in bucket[topic])) {
                    console.log('creating bucket[%s][%s]', topic, range);
                    bucket[topic][range] = {};
                }

                if(!(host in bucket[topic][range])) {
                    console.log('inserting host into bucket[%s]: ' + ip, topic);

                    var peer = {
                        'ip': ip.join('.'),
                        'ts': Date.now()
                    };

                    for(var key in json) {
                        peer[key] = json[key];
                    }

                    bucket[topic][range][host] = peer;

                    peers_available++;
                } else {
                    console.log('reset expiration for: ' + ip);

                    for(var key in json) {
                        bucket[topic][range][host][key] = json[key];
                    }

                    bucket[topic][range][host].ts = Date.now();
                }

                reply = {'status': 'success'};
            } else {
                reply = {'error': 'invalid json'};
            }

            res.end(JSON.stringify(reply) + '\n');
        });
    } else {
        res.end('The masses are the decisive\n' +
                'element, they are the rock on\n' +
                'which the final victory of the\n' +
                'revolution will be built.\n');
    }
}).listen(7473, '0.0.0.0', function() {
    console.log('[+] Nightfall is ready');
});
