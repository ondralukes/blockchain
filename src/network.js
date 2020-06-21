const express = require('express');
const http = require('http');
const WebUI = require('./webui');

const {log, warn} = require('./console');

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

    this.app.post('/getTransaction/', (req, res) =>
    {
      _this.getTransaction(req, res);
    });

    this.app.post('/getVHead', (req, res) =>
    {
      _this.getVHead(req, res);
    })

    if(config.webUI){
      log('[Network] Enabled Web UI');
      this.webui = new WebUI(this.app);
    }
    this.pendingBroadcasts = new Map();

    this.server = this.app.listen(config.port);
  }

  setChain(chain){
    this.chain = chain;
  }

  getTransaction(req,res){
    const t = this.chain.getLocalVerifiedTransaction(req.body.id);
    if(typeof t === 'undefined'){
      res.status(404);
      res.end();
      log(`[Network] Received get transaction ${shortenId(req.body.id)} not found`);
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    log(`[Network] Received get transaction ${shortenId(req.body.id)} found`);
    res.end(JSON.stringify(t));
  }

  getVHead(req, res){
    const vh = this.chain.validatedHeadCache.get(req.body.publicKey);
    if(typeof vh === 'undefined'){
      res.status(404);
      res.end();
      log('[Network] Received get vhead: not found');
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({id: vh}));
    log('[Network] Received get vhead: found');
  }

  receiveBroadcast(req, res){
    const broadcast = req.body;
    const hash = broadcast.hash;
    if(this.pendingBroadcasts.has(hash)){
      res.end();
      return;
    }
    log(`[Network] Received broadcast ${shortenHash(hash)}`);
    this.chain.insertSignedTransaction(broadcast);
    this.pendingBroadcasts.set(hash, 1);
    this.servers.forEach((s) => this.sendBroadcast(broadcast, s));
    res.end();
  }

  async getRemoteTransaction(id){
    log(`[Network] Searching for remote transaction ${shortenId(id)}`);
    let res;
    for(let s of this.servers){
      const opt = {
        host: s.host,
        path: '/getTransaction',
        port: s.port,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      res = await this.request(opt, {id: id});
      if(typeof res !== 'undefined' && res !== {}){
        log(`[Network] ${shortenId(id)}@${s.host}:${s.port} Found.`);
        return res;
      } else {
        warn(`[Network] ${shortenId(id)}@${s.host}:${s.port} Not found.`);
        warn(res);
      }
    }
    return null;
  }

  async getRemoteVHead(publicKey){
    log('[Network] Searching for remote vhead.');
    let res;
    for(let s of this.servers){
      const opt = {
        host: s.host,
        path: '/getVHead/',
        port: s.port,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      res = await this.request(
          opt,
          {publicKey: publicKey}
          );
      if(typeof res !== 'undefined' && res !== {}){
        log(`[Network] ${s.host}:${s.port} Found.`);
        return res.id;
      } else {
        warn(`[Network] ${s.host}:${s.port} Not found.`);
      }
    }
    return null;
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
    this.request(opt, b);
  }

  broadcast(t){
    log('[Network] Broadcasting.');

    this.servers.forEach((s) => this.sendBroadcast(t, s));
  }

  request(opt, body){
    return new Promise((resolve) => {
      const rq = http.request(
          opt,
          (res) => {
            let body = '';
            res.on('data', (chunk) => {
              body += chunk;
            });

            res.on('end', () => {
              if (res.statusCode !== 200 || body === '') {
                resolve();
              } else {
                resolve(JSON.parse(body));
              }
            });
          }
      );
      rq.on('error', () => {
        warn(`[Network] Warning: Connection to ${opt.host}:${opt.port} failed.`);
      });

      if(typeof body !== 'undefined')
        rq.write(JSON.stringify(body));
      rq.end();
    });
  }
}

function shortenHash(hash){
  return hash.substring(0,8);
}

function shortenId(id){
  if(typeof id === 'undefined'){
    return '<invalid id>';
  }
  const split = id.split('@');
  const block = split[1];
  const hash = split[0];

  return `${shortenHash(hash)}@${block}`;
}