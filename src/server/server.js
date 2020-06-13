const fs = require('fs');
var RequestManager = require('./requestManager');

var conf = JSON.parse(fs.readFileSync('config.json'));

var reqMgr = new RequestManager(conf);
