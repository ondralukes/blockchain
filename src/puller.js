var http = require('http');

var Utils = require('./utils');

var opt = {
  host: 'localhost',
  path: '/pull',
  port: '8080',
  method: 'GET'
};

var lastBlockTime = Math.ceil(timestamp() / 10)*10;

var blocks = [
  {
    id:0,
    contentHash:
    'ESR4XzDTKyRvubusZVpRZv1Sb7L0Vtno+JizUaXEzPrMtAT+7DNk548Rs7r/+6r/03yr91i1l/zuUMktT5ZeLg==',
    prevHash:
    '',
    timestamp:
    lastBlockTime,
    hashes:[
      'AEPj7ApTzFNpmS6bsW4Sx5czpp3/xEiEbranEtK6Vq1moExo3wiJPCZCwU3vnLDSL4shWMcaxRGru5Lg72b+JQ=='
    ],
    messages:[
      'baseblock'
    ]
  },
  {
    id:1,
    hashes:[],
    messages:[]
  }
];

var lastPulledId = -1;

var block = {
  hashes: [],
  messages: []
};
const blockTime = 10;

function timestamp(){
  return Math.floor(Date.now() / 1000);
}

function timer(){
  var time = timestamp();
  var timeToNext = blockTime - time + lastBlockTime;

  if(timeToNext <= 0){
    time = Math.floor(time / 10)*10;
    lastBlockTime = time;
    var block = blocks[blocks.length - 1];
    console.log("Finalized block at time " + time);
    console.log(block);
    block.timestamp = time;
    block.prevHash = Utils.blockHash(blocks[blocks.length - 2]);
    block.contentHash = Utils.hashTree(block.hashes);
    blocks.push({
      id: blocks.length,
      hashes: [],
      messages: []
    });
    console.log(block);
    return;
  }
  http.request(
    opt,
    (res) => {
      var body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        var obj = JSON.parse(body);
        onPull(obj);
      })
    }
  ).end();
}

function onPull(resp){
  if(resp.blockId){
    if (resp.blockId > lastPulledId){
      var block = blocks[blocks.length - 1];
      console.log('RECV: ' + resp.hashes.length);
      resp.hashes.forEach((h, i) => {
        var msg = resp.messages[i];
        if(Utils.hash(msg) != h){
          console.log("Invalid hash! Message discarded.");
          return;
        }
        block.hashes.push(h);
        block.messages.push(msg);
      });
      lastPulledId = resp.blockId;
    }
  }
}

setInterval(timer, 1000);
