var nightfall = {};

// keep your peers in a bucket
var bucket = nightfall.bucket = {};
// clean up every thirty seconds
var CLEANING_INTERVAL = nightfall.CLEANING_INTERVAL = 1000 * 30;
// time out every five minutes
var TIMEOUT = nightfall.TIMEOUT = 1000 * 60 * 5;

// 3 peers within a particular range
var PEERS_FROM_RANGE = nightfall.PEERS_FROM_RANGE = 3;
// keep six peers by default
var TOTAL_PEERS = nightfall.TOTAL_PEERS = 6;

// track the number of available peers
var peers_available = nightfall.peers_available = 0;

// if used as a plugin, you'll need another 
var prefix = nightfall.prefix = '/nightfall';

var motto = nightfall.motto = function() {/*The masses are the decisive
element, they are the rock on
which the final victory of the
revolution will be built.
*/}.toString().slice(15, -3);

/* Remove old peers every three seconds */
var backgroundRoutine = nightfall.backgroundRoutine = function(frequency) {
  frequency = frequency || 3000;
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
  }, frequency);
};

/* Get a random item from a list */
var getRandomItem = nightfall.getRandomItem = function(list) {
  var keys = Object.keys(list);
  return list[keys[Math.floor(Math.random() * keys.length)]];
};

/* Add random items from a bucket to a set */
var addRandomPeers = nightfall.addRandomPeers = function(set, bucket, num) {
  while(set.length < num) {
    var x = getRandomItem(bucket);
    var y = getRandomItem(x);
    if(set.indexOf(y) < 0) {
      set.push(y);
    }
  }
  return set;
};

var main = nightfall.main = function(req, res, next) {
  next = next || function(result) {
    result = result || motto;
    res.setHeader('Content-Type', 'text/plain');
    res.end(result);
  };

  // let's not assume we'll only receive an ipv4
  var IP = req.connection.remoteAddress;
  var ip;
  if(/^\d{0,3}\.\d{0,3}\.\d{0,3}\.\d{0,3}$/.test(IP)) {
    ip = IP.split('.');
  } else { // it must be an ipv6
    next('This service is meant to connect users via their ipv4 addresses.');
  }

  var url = req.url.replace(prefix, ''); // strip out the prefix
  var chunks = url.split('/'); // break the url into its components
  var topic = chunks[1];
  var action = chunks[2];

  var range = ip[0] + '.' + ip[1];
  var host = ip[2] + '.' + ip[3];

  if(action == 'seek') {
    var set = [];
    if(topic in bucket) {
      if(range in bucket[topic]) {
        var peers_from_range = Math.min(bucket[topic][range].length, PEERS_FROM_RANGE);
        set = addRandomPeers([],bucket[topic][range], peers_from_range);
      }
      var total_peers = Math.min(peers_available, TOTAL_PEERS);
      set = addRandomPeers(set, bucket[topic], total_peers);
    }
    res.end(JSON.stringify(set) + '\n');
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
    next(); // default message is the 'motto', declared at the top
  }
};

/* If this is being called as a standalone server */
if(require.main === module) {
  /* start the background process */
  backgroundRoutine();

  /* launch the server */
  require('http').createServer(main).listen(7473, '', function() {
    console.log('[+] Nightfall is ready');
  });
} else { 
  /* otherwise (if it is being included as a library) */
  module.exports = nightfall;
}
