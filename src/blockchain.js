const {Worker} = require('worker_threads');
const sha512 = require('crypto-js/sha512');
var RSA = require('node-rsa');
const Base64 = require('crypto-js/enc-base64');

module.exports = class Blockchain {
  constructor(masterPub, net){
    this.net = net;
    net.setChain(this);
    this.pendingTransactions = [];
    this.pendingBlocks = [];
    this.nextBlockTime = Math.ceil(timestamp() / 10) * 10;

    //Create init transaction
    // var initT = {
    //   owner: 'init',
    //   inputs: [],
    //   outputs: [
    //     {
    //       amount: 1000000,
    //       receiver: masterPub
    //     }
    //   ],
    // };
    // initT.hash = objectHash(initT);
    // initT.signature = 'theres no signature';

    //Create init block
    this.blocks = [
      // {
      //   time: this.nextBlockTime - 10,
      //   transactions: [initT],
      //   prevHash: 'z4PhNX7vuL3xVChQ1m2AB9Yg5AULVxXcg/SpIdNs6c5H0NE8XYXysP+DGNKHfuwvY7kxvUdBeoGlODJ6+SfaPg=='
      // }
    ];

    // var initTId = `${initT.hash}@${this.nextBlockTime - 10}`;

    this.validatedHeadCache = {
      // masterPub: initTId
    };

    var _this = this;

    this.validator = new Worker('./blockValidator.js', {
      workerData: {
        master: masterPub
      }
    });
    this.validator.on('message', (b) => _this.handleWorkerMessage(b));

    setInterval(function(){_this.timer();}, 1000);

    //Register master and receive money
    // var masterHead = this.register(masterPub, masterPriv);
    // this.masterHead = this.receive(masterHead, masterPriv, initTId);
  }

  handleWorkerMessage(message){
    if(message.type == 'validated'){
      this.handleValidated(message.block);
    } else if(message.type == 'getTransaction'){
      var transaction = this.getVerifiedTransaction(message.id);
      this.validator.postMessage({
        type: 'response',
        transaction: transaction
      });
    }
  }

  handleValidated(block){
    console.log(`[Blockchain] Received validated block ${block.time} with ${block.transactions.length} transactions`);
    this.pendingBlocks.splice(
      this.pendingBlocks.indexOf(block),
      1
    );

    block.prevHash = objectHash(this.blocks[this.blocks.length - 1]);
    this.blocks.push(block);
    block.transactions.forEach((t) => {
      this.validatedHeadCache[t.owner] = `${t.hash}@${block.time}`;
    });
  }

  timer(){
    var time = timestamp();
    if(time >= this.nextBlockTime){
      //Copy array
      var transactions = this.pendingTransactions.slice(0);
      this.pendingTransactions = [];

      var block = {
        time: this.nextBlockTime,
        transactions: transactions
      };

      this.pendingBlocks.push(block);
      this.validator.postMessage({
        type: 'validate',
        block: block
      });

      if(time == this.nextBlockTime) time++;
      this.nextBlockTime = Math.ceil(time / 10) * 10;
    }
  }

  register(pub, priv){
    var r = {
      owner: pub,
      inputs:[],
      outputs: []
    };



    return this.insertTransaction(r, priv);
  }

  send(sender, receiver, amount){
    var balance = 0;
    var head;
    if(typeof sender.head !== 'undefined'){
      head = this.getTransaction(sender.head);
      balance = this.getInputFromTransaction(head, head.owner);
    }

    var remainder = balance - amount;
    if(remainder < 0) remainder = 0;
    var transaction = {
      owner: sender.public,
      inputs: [],
      outputs: [
        {
          amount: amount,
          receiver: receiver.public
        },
        {
          amount: remainder,
          receiver: sender.public
        }
      ]
    };

    if(typeof sender.head !== 'undefined') transaction.inputs.push(sender.head);

    var newHeadId = this.insertTransaction(transaction,  sender.private);

    console.log(`[Blockchain] Sent ${amount}, now have ${balance - amount}`);
    return newHeadId;
  }

  receive(user, tId){
    var head = this.getTransaction(user.head);
    var t = this.getTransaction(tId);
    var balance = this.getInputFromTransaction(head, head.owner);
    var amount = this.getInputFromTransaction(t, head.owner);
    balance += amount;
    var r = {
      owner: head.owner,
      inputs:[
        user.head,
        tId
      ],
      outputs: [
        {
          amount: balance,
          receiver: head.owner
        }
      ]
    };

    console.log(`[Blockchain] Received ${amount}, now have ${balance}`);
    return this.insertTransaction(r, user.private);
  }

  getInputFromTransaction(t, recv){
    var res = 0;
    var output = t.outputs.find(x => x.receiver == recv);
    if(typeof output !== 'undefined'){
       res += output.amount;
    }
    return res;
  }

  getTransaction(id){
    var split = id.split('@');
    var block = parseInt(split[1]);
    var hash = split[0];

    var block = this.blocks.find(x => x.time == block);

    if(typeof block === 'undefined')
      block = this.pendingBlocks.find(x => x.time == block);

    if(typeof block === 'undefined')
      return this.pendingTransactions.find(x => x.hash == hash);

    return block.transactions.find(x => x.hash == hash);
  }

  getVerifiedTransaction(id){
    var split = id.split('@');
    var block = parseInt(split[1]);
    var hash = split[0];

    var block = this.blocks.find(x => x.time == block);
    if(typeof block === 'undefined') return block;
    return block.transactions.find(x => x.hash == hash);
  }

  insertTransaction(trans, priv){
    trans.hash = objectHash(trans);
    var key = RSA(priv);
    var signature = key.sign(
      JSON.stringify(trans),
      'base64',
      'utf8'
    );
    trans.signature = signature;
    this.net.broadcast(trans);
    return this.insertSignedTransaction(trans);
  }

  insertSignedTransaction(trans){
    this.pendingTransactions.push(trans);
    return `${trans.hash}@${this.nextBlockTime}`;
  }
}

function timestamp(){
  return Math.floor(new Date().getTime() / 1000);
}

function objectHash(obj){
  return Base64.stringify(
    sha512(
    JSON.stringify(obj)
    )
  );
}
