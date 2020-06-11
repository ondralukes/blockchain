var express = require('express');
var sha512 = require('crypto-js/sha512');
const VerifyResult = Object.freeze(
  {'Valid':0,'NotVerified':1, 'Invalid':2}
);

var Base64 = require('crypto-js/enc-base64');
var app = express();

app.use(express.text());
app.use(express.static('public'));

var lastBlockTime = timestamp();
var hashes = [];
var blocks = [
  {
    contentHash:
    'ESR4XzDTKyRvubusZVpRZv1Sb7L0Vtno+JizUaXEzPrMtAT+7DNk548Rs7r/+6r/03yr91i1l/zuUMktT5ZeLg==',
    prevHash:
    '',
    timestamp:
    timestamp(),
    hashes:[
      'AEPj7ApTzFNpmS6bsW4Sx5czpp3/xEiEbranEtK6Vq1moExo3wiJPCZCwU3vnLDSL4shWMcaxRGru5Lg72b+JQ=='
    ]
  }
];

function blockHash(block){
  var string = block.contentHash+block.prevHash+block.timestamp;
  return Base64.stringify(sha512(string));
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
    console.log('Finishing block.');
    console.log('Block size = ' + hashes.length);
    hashes.forEach((h) => console.log(h));



    var hash = hashTree(hashes);
    console.log(hash);

    var block = {
      contentHash: hash,
      prevHash: blockHash(blocks[blocks.length - 1]),
      timestamp: time,
      hashes: hashes
    };

    blocks.push(block);

    hashes = [];
    lastBlockTime = time;
    console.log('New block:');
    console.log(block);
    console.log('Blockchain now contains ' + blocks.length + ' blocks.');
}

function hashTree(hashes){
  var treeLevels = 0;
  var result = [];
  hashes.forEach((h) => result.push(h));

  while(Math.pow(2, treeLevels) < result.length) treeLevels++;
  for(var len = Math.pow(2, treeLevels); len >= 1; len /= 2){
    for(var i = 0;i < len;i++){
      var h1 = '';
      var h2 = '';

      if(i*2 <result.length) h1 = result[i*2];
      if(i*2+1 < result.length) h2 = result[i*2+1];

      result[i] = Base64.stringify(sha512(h1 + h2));
    }
  }
  return result[0];
}

function verifyChain(index){
  console.log('\n');
  console.log('Veryfying chain from block ' + index);
  var indexResult;
  for(var i = index; i < blocks.length;i++){
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

    if(i != blocks.length - 1){
      var nextBlock = blocks[i+1];
      if(blockHash(block) == nextBlock.prevHash){
        console.log('   Block hash matches next block.');
        result = VerifyResult.Valid;
      } else {
        console.log('   Block hash does NOT match next block.');
        result = VerifyResult.Invalid;
      }
    } else {
      console.log('   Last block. Cannot verify.');
    }

    var calculatedHash = hashTree(block.hashes);
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
  var hash = Base64.stringify(sha512(req.body));
  console.log('Added message ' + hash);
  hashes.push(hash);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    blockId: blocks.length,
    hash: hash
  }));
});

app.post('/verify', (req, res) => {
  var hash = Base64.stringify(sha512(req.body));
  console.log('Searching for message ' + hash);
  var blockId;
  var resp = [];

  //Try to find block in blockchain
  blocks.forEach((b, i) => {
    b.hashes.forEach((h) => {
      if(h != hash) return;
      var e = {
        blockId: i,
        inBlock: true
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

  //Check queued hashes for next block
  hashes.forEach((h, i) => {
    if(h == hash){
      var e = {
        inBlock: false,
      };
      resp.push(e);
    }
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
    hash: blockHash(block),
    contentHash: block.contentHash,
    hashes: block.hashes,
    timestamp: block.timestamp,
    blocksAfter: blocks.length - blockId - 1
  };
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(resp));
})

var server = app.listen(8080);
