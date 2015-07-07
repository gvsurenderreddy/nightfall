'use strict';

module.exports = function() {
    var bucket = {};

    var split = function(ip) {
        var chunks = ip.split('.');
        return {
            range: chunks.slice(0, 2).join('.'),
            host: chunks.slice(2, 4).join('.'),
        };
    };

    var that = {
        connect: function(cb) {
            cb(that);
        },

        background: function(frequency, ttl) {
            setInterval(function() {
                for(var a in bucket) {
                    for(var b in bucket[a]) {
                        for(var c in bucket[a][b]) {
                            if(bucket[a][b][c].ts + ttl < Date.now()) {
                                console.log('removing ' + bucket[a][b][c].ip);
                                bucket[a][b].splice(c, 1);
                            }
                        }
                    }
                }
            }, frequency);
        },

        add: function(topic, ip, data, ttl) {
            var range = split(ip).range;

            if(!(topic in bucket)) {
                bucket[topic] = {};
            }

            if(!(range in bucket[topic])) {
                bucket[topic][range] = [];
            }

            bucket[topic][range].push(data);
        },

        nearby: function(topic, ip, cb) {
            var peers = [];
            var range = split(ip).range;

            if(topic in bucket) {
                if(range in bucket[topic]) {
                    peers = peers.concat(bucket[topic][range]);
                }
            }

            cb(peers);
        },

        any: function(topic, ip, cb) {
            var peers = [];

            if(topic in bucket) {
                for(var range in bucket[topic]) {
                    peers = peers.concat(bucket[topic][range]);
                }
            }

            cb(peers);
        },
    };

    return that;
};

