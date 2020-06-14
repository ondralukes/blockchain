var Blockchain = require('./blockchain');

var chain = new Blockchain();

var t = chain.send(1, 'receiver', 250);

var receiver = chain.register('receiver');

receiver = chain.receive(receiver, t);
chain.send(receiver, 'master', 249);

console.dir(
  chain.transactions,
  {depth: null}
);
