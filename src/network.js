const express = require('express');
const http = require('http');

module.exports = class Network {
  constructor(config){
    this.servers = config.servers;
    this.app = express();

    this.app.use(express.json());

    const _this = this;
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
    const broadcast = req.body;
    const hash = broadcast.hash;
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
    const opt = {
      host: s.host,
      path: '/broadcast',
      port: s.port,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    const rq = http.request(
        opt,
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });

          res.on('end', () => {
          });
        }
    );
    rq.on('error', () => {
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
