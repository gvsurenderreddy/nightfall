#!/usr/bin/env nodejs
'use strict';

var http = require('http');
var bucket = {};

var TIMEOUT = 1000 * 60 * 5;
var PEERS_FROM_RANGE = 3;
var TOTAL_PEERS = 6;

var peers_available = 0;


setInterval(function() {
    for(var a in bucket) {
        for(var b in bucket[a]) {
            console.log(bucket[a][b]);
            if(bucket[a][b].ts + TIMEOUT < Date.now()) {
                console.log('removing ' + bucket[a][b].ip);
                delete bucket[a][b];
                peers_available--;
            }
        }
    }
}, 3000);


var getRandomItem = function(list) {
    if(Array.isArray(list)) {
        return list[Math.floor(Math.random() * list.length)];
    } else {
        console.log(list);
        var keys = Object.keys(list);
        return list[keys[Math.floor(Math.random() * keys.length)]];
    }
}

var addRandomPeers = function(set, bucket, num) {
    if(Array.isArray(bucket)) {
        while(set.length < num) {
            var x = getRandomItem(bucket);

            if(set.indexOf(x) < 0) {
                set.push(x);
            }
        }
    } else {
        // don't even think about calling addRandomPeers here instead
        // infini loop of death will haunt you
        while(set.length < num) {
            var x = getRandomItem(bucket);
            var y = getRandomItem(x);

            if(set.indexOf(y) < 0) {
                set.push(y);
            }
        }
    }

    return set;
}

http.createServer(function(req, res) {
    var ip = req.connection.remoteAddress.split('.');

    var range = ip[0] + '.' + ip[1];
    var host = ip[2] + '.' + ip[3];

    if(req.url == '/seek') {
        var set = [];

        if(range in bucket) {
            var peers_from_range = Math.min(bucket[range].length, PEERS_FROM_RANGE);

            set = addRandomPeers([], bucket[range], peers_from_range);
        }

        var total_peers = Math.min(peers_available, TOTAL_PEERS);
        set = addRandomPeers(set, bucket, total_peers);

        res.end(JSON.stringify(set) + '\n');
    } else if(req.url == '/have') {
        var body = '';

        req.on('data', function(data) {
            body += data;

            if(body.length > 1e6) {
                req.connection.destroy();
            }
        }).on('end', function() {
            var reply;

            try {
                var json = JSON.parse(body);

                if(!(range in bucket)) {
                    console.log('creating bucket: ' + range);
                    bucket[range] = [];
                }

                if(!(host in bucket[range])) {
                    console.log('inserting host into bucket:' + ip);
                    bucket[range][host] = {
                        'ip': ip.join('.'),
                        'port': json['port'],
                        'key': json['key'],
                        'ts': Date.now()
                    };
                    peers_available++;
                } else {
                    console.log('reset expiration for: ' + ip);
                    bucket[range][host].ts = Date.now();
                }

                reply = {'status': 'success'};
            } catch(SyntaxError) {
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
