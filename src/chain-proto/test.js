var Blockchain = require('./blockchain');

var chain = new Blockchain();

var t = chain.send(chain.masterTransaction, 'receiver', 250);

var receiver = chain.register('receiver');

receiver = chain.receive(receiver, t);
chain.send(receiver, 'master', 249);

setTimeout(
  function (){
    receiver = chain.send(receiver, 'master', 1);
  },
  12000
);
