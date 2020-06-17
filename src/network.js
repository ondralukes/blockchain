const express = require('express');
const http = require('http');

module.exports = class Network {
  constructor(config){
    this.servers = config.servers;
    this.app = express();

    this.app.use(express.json());

    var _this = this;
    this.app.post('/broadcast', (req, res) =>
    {
      _this.receiveBroadcast(req, res);
    });

    this.pendingBroadcasts = {};

    this.server = this.app.listen(config.port);
  }

  setChain(chain){
    this.chain = chain;
  }

  receiveBroadcast(req, res){
    var broadcast = req.body;
    var hash = broadcast.hash;
    if(this.pendingBroadcasts.hasOwnProperty(hash)){
      res.end();
      return;
    }
    console.log(`[Network] Received broadcast ${shortenHash(hash)}`);
    this.chain.insertSignedTransaction(broadcast);
    this.pendingBroadcasts[hash] = 1;
    this.servers.forEach((s) => this.sendBroadcast(broadcast, s));
    res.end();
  }

  sendBroadcast(b, s){
    var opt = {
      host: s.host,
      path: '/broadcast',
      port: s.port,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    var rq = http.request(
      opt,
      (res) => {
        var body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
        });
      }
    );
    rq.on('error', (err) => {
      console.log(`[Network] Warning: Connection to ${s.host}:${s.port} failed.`);
    });

    rq.write(JSON.stringify(b));
    rq.end();
  }

  broadcast(t){
    console.log('[Network] Broadcasting.');

    this.servers.forEach((s) => this.sendBroadcast(t, s));
  }
}

function shortenHash(hash){
  return hash.substring(0,8);
}
