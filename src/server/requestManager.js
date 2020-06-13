var express = require('express');
var http = require('http');

module.exports = class RequestManager{
  constructor(conf){
    this.servers = conf.servers;
    this.counter = 0;
    this.requests = [];
    this.serverId = require('crypto').randomBytes(16).toString('base64');

    console.log("Server id "+ this.serverId);
    console.log("Pulling from:");
    conf.servers.forEach((s) => {
      console.log(`${s.host} port ${s.port}`);
    });



    this.app = express();
    this.app.use(express.text());
    this.app.use(express.json());

    this.app.get('/pull', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(this.requests));
    });

    this.app.post('/respond', (req, res) => {
      this.handleResponse(req.body);
      res.setHeader('Content-Type', 'application/json');
      res.end('{}');
    });
    this.server = this.app.listen(conf.port);

    var _this = this;
    setInterval(function(){_this.timer();}, 1000);
  }

  timer(){
    this.servers.forEach((s) => {
      var opt = {
        host: s.host,
        path: '/pull',
        port: s.port,
        method: 'GET'
      };
      http.request(
        opt,
        (res) => {
          var body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });

          res.on('end', () => {
            var obj = JSON.parse(body);
            obj.forEach((rq) => {
              this.pullRequest(rq,s);
            });
          })
        }
      ).end();
    });
  }

  createRequest(payload){
    var id = `${this.serverId}/${this.getCounter()}`;
    var request = {
      id: id,
      payload: payload,
      origin: this.serverId
    };
    this.requests.push(request);
    console.log(`[RequestManager] <CREATE> ${request.id}`);
  }

  pullRequest(request,server){
    if(!this.requests.some(x => x.id == request.id)){
      request.pulledFrom = server;
      this.requests.push(request);
      console.log(`[RequestManager] <PULL> ${request.id} from ${server.host}:${server.port}`);
      this.respond(request);
    }
  }

  respond(request){
    var response = {
      request: {
        id: request.id,
        origin: request.origin
      },
      payload: this.processRequest(request.payload)
    };

    var req = this.requests.find(x => x.id == response.request.id);
    var s = req.pulledFrom;
    console.log(`[RequestManager] <RESPOND> ${request.id} => ${s.host}:${s.port}`);
    this.sendResponse(response,s);
  }

  processRequest(payload){
    if(typeof payload.type === 'undefined'){
      return {
        status: "invalid",
        sender: this.serverId
      };
    }

    if(payload.type == 'ping'){
      return {
        status: "success",
        sender: this.serverId
      };
    }

    return {
      status: "not supported",
      sender: this.serverId
    };
  }

  handleResponse(response){
    if(response.request.origin == this.serverId){
      console.log(`[RequestManager] <RECEIVE RESPONSE> ${response.request.id}`);
    } else {
      var req = this.requests.find(x => x.id == response.request.id);
      var s = req.pulledFrom;
      console.log(`[RequestManager] <FORWARD> ${response.request.id} => ${s.host}:${s.port}`);
      this.sendResponse(response,s);
    }
  }

  sendResponse(response,s){
    var data = JSON.stringify(response);

    var opt = {
      host: s.host,
      path: '/respond',
      port: s.port,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    var req = http.request(
      opt,
      (res) => {}
    );

    req.write(data);
    req.end();
  }

  getCounter(){
    if(this.counter >= 2147483647){
      this.counter = 0;
    } else {
      this.counter++;
    }
    return this.counter;
  }
}
