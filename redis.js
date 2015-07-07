'use strict';

var redis = require('redis');

var Client = function(client) {
    var resolve = function(keys, cb) {
        var ret = [];

        var queue = keys.length;

        var receive = function(err, val) {
            if(err) {
                 console.log(err);
            } else {
                ret.push(JSON.parse(val));
            }

            if(!--queue) cb(ret);
        };

        if(queue) {
            keys.forEach(function(k) {
                client.get(k, receive);
            });
        } else {
            cb(ret);
        }
    };

    var filter = function(f, cb) {
        client.keys(f, function(err, keys) {
            if(err) console.log(err);
            resolve(keys, cb);
        });
    };

    return {
        add: function(topic, ip, data, ttl) {
            var key = topic + '/' + ip;
            client.set(key, JSON.stringify(data));
            client.expire(key, ttl);
        },

        nearby: function(topic, ip, cb) {
            var chunks = ip.split('.');
            var range = chunks.slice(0, 2).join('.');

            filter(topic + '/' + range + '.*', function(peers) {
                cb(peers);
            });
        },

        any: function(topic, ip, cb) {
            filter(topic + '/*', function(peers) {
                cb(peers);
            });
        },
    };
};

module.exports = function() {
    return {
        connect: function(cb) {
            var client = redis.createClient();
            client.on('connect', function() {
                cb(new Client(client));
            });
        },

        background: function(frequency, ttl) {

        },
    };
};

