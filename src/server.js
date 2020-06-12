var express = require('express');
const VerifyResult = Object.freeze(
  {'Valid':0,'NotVerified':1, 'Invalid':2}
);

var Utils = require('./utils');
var app = express();

app.use(express.text());
app.use(express.static('public'));

var lastBlockTime = Math.ceil(timestamp() / 10)*10;

var chainedBlocks = 1;
var hashes = [];
var messages = [];
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
  },
  {
    id:2,
    hashes:[],
    messages:[]
  }
];

function getBlockForAdding(){
  if(timestamp() - lastBlockTime < blockTime/2){
    return blocks[chainedBlocks];
  }  else {
    return blocks[chainedBlocks + 1];
  }
}

function canDistribute(){
  return timestamp() - lastBlockTime > blockTime/2;
}

var block = [];
const blockTime = 10;

setInterval(timer, 1000);

function timestamp(){
  return Math.floor(Date.now() / 1000);
}

function timer(){
    var time = timestamp();
    var timeToNext = blockTime - time + lastBlockTime;

    if(timeToNext > 0){
      return;
    }

    time = Math.floor(time / 10)*10;
    console.log('Finishing block.');
    var block = blocks[chainedBlocks];
    console.log('Block size = ' + block.hashes.length);

    var hash = Utils.hashTree(block.hashes);
    console.log(hash);

    block.contentHash = hash;
    block.prevHash = Utils.blockHash(blocks[chainedBlocks - 1]);
    block.timestamp = time;

    chainedBlocks++;

    blocks.push({
      id:blocks.length,
      hashes:[],
      messages:[]
    });

    lastBlockTime = time;
    console.log('New block:');
    console.log(block);
    console.log('Blockchain now contains ' + chainedBlocks + ' blocks.');
}

function verifyChain(index){
  console.log('\n');
  console.log('Veryfying chain from block ' + index);
  var indexResult;
  for(var i = index; i < chainedBlocks;i++){
    var result = VerifyResult.NotVerified;
    var block = blocks[i];
    console.log('Block #' + i + '===');
    console.log('   Block contains '+ block.hashes.length + ' messages.');
    if(i != 0){
      var prevBlock = blocks[i - 1];
      var deltaTime = block.timestamp - prevBlock.timestamp;
      console.log('   Block duration ' + deltaTime + ' seconds');
    } else {
      console.log('   First block');
    }

    if(i != chainedBlocks - 1){
      var nextBlock = blocks[i+1];
      if(Utils.blockHash(block) == nextBlock.prevHash){
        console.log('   Block hash matches next block.');
        result = VerifyResult.Valid;
      } else {
        console.log('   Block hash does NOT match next block.');
        result = VerifyResult.Invalid;
      }
    } else {
      console.log('   Last block. Cannot verify.');
    }

    var calculatedHash = Utils.hashTree(block.hashes);
    if(calculatedHash == block.contentHash){
      console.log('   Block hash matches content.');
    } else {
      console.log('   Block hash does NOT match content.');
      result = VerifyResult.Invalid;
    }

    switch (result) {
      case VerifyResult.Valid:
        console.log('\x1b[32m%s\x1b[0m', '   Valid');
        break;
      case VerifyResult.NotVerified:
        console.log('\x1b[33m%s\x1b[0m', '   Not verified');
        break;
      case VerifyResult.Invalid:
        console.log('\x1b[31m%s\x1b[0m', '   Invalid');
        break;
    }
    if(i == index) indexResult = result;
  }
  console.log('\n');
  return indexResult;
}

app.post('/add', (req, res) => {
  var hash = Utils.hash(req.body);
  var block = getBlockForAdding();
  console.log('Added message ' + hash + ' to block ' + block.id);
  block.hashes.push(hash);
  block.messages.push(req.body);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    blockId: block.id,
    hash: hash
  }));
});

app.post('/verify', (req, res) => {
  var hash = Utils.hash(req.body);
  console.log('Searching for message ' + hash);
  var blockId;
  var resp = [];

  //Try to find block in blockchain
  blocks.forEach((b, i) => {
    b.hashes.forEach((h) => {
      if(h != hash) return;
      var e = {
        blockId: i,
      };
      var verif = verifyChain(i);
      if(verif == VerifyResult.Valid){
        e.verified = true;
      } else if(verif == VerifyResult.Invalid){
        e.verified = false;
        e.invalid = true;
      } else {
        e.verified = false;
        e.invalid = false;
      }
      resp.push(e);
    });
  });

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(resp));
});

app.get('/block/:blockId', (req, res) => {
  var blockId = parseInt(req.params.blockId);
  if(blockId >= blocks.length){
    res.status(404);
    res.end();
    return;
  }
  var block = blocks[blockId];
  var resp = {
    blockId: blockId,
    hash: Utils.blockHash(block),
    contentHash: block.contentHash,
    hashes: block.hashes,
    timestamp: block.timestamp,
    blocksAfter: blocks.length - blockId - 1
  };
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(resp));
});

app.get('/pull', (req, res) => {
  var id = blocks.length;
  res.setHeader('Content-Type', 'application/json');
  if(canDistribute()){
    var block = blocks[chainedBlocks];
    res.end(JSON.stringify({
      hashes: block.hashes,
      messages: block.messages,
      blockId: block.id
    }));
  } else {
    res.end('{}');
  }

})

var server = app.listen(8080);
