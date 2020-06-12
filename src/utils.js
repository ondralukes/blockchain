var sha512 = require('crypto-js/sha512');
var Base64 = require('crypto-js/enc-base64');

exports.blockHash = function(block){
  var string = block.contentHash+block.prevHash+block.timestamp;
  return this.hash(string);
}

exports.hashTree = function(hashes){
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

      result[i] = this.hash(h1 + h2);
    }
  }
  return result[0];
}

exports.hash = function(x){
  return Base64.stringify(sha512(x))
}
