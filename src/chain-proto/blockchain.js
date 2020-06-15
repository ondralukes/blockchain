const {Worker} = require('worker_threads');
const sha512 = require('crypto-js/sha512');
const Base64 = require('crypto-js/enc-base64');

module.exports = class Blockchain {
  constructor(){
    this.pendingTransactions = [];
    this.pendingBlocks = [];
    this.blocks = [];
    this.nextBlockTime = Math.ceil(timestamp() / 10) * 10;

    var _this = this;

    this.validator = new Worker('./blockValidator.js');
    this.validator.on('message', (b) => _this.handleWorkerMessage(b));

    setInterval(function(){_this.timer();}, 1000);

    var init = this.insertTransaction(
      {
        owner: 'init',
        inputs: [],
        outputs: [
          {
            amount: 1000,
            receiver: 'master'
          },
        ]
      }
    );

    this.masterTransaction = this.insertTransaction(
      {
        owner: 'master',
        inputs: [init],
        outputs: [
          {
            amount: 1000,
            receiver: 'master'
          },
        ]
      }
    );
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

  register(name){
    var r = {
      owner: name,
      inputs:[],
      outputs: []
    };
    return this.insertTransaction(r);
  }

  send(headId, receiver, amount){
    var head = this.getTransaction(headId);
    var balance = 0;
    if(headId != -1){
      balance = this.getInputFromTransaction(head, head.owner);
    }
    // if(balance < amount){
    //   console.log('Transaction failed');
    //   return -1;
    // }

    var transaction = {
      owner: head.owner,
      inputs: [
        headId
      ],
      outputs: [
        {
          amount: amount,
          receiver: receiver
        },
        {
          amount: balance - amount,
          receiver: head.owner
        }
      ]
    };

    var newHeadId = this.insertTransaction(transaction);

    console.log(`[Blockchain] Sent ${amount}, now have ${balance - amount}`);
    return newHeadId;
  }

  receive(headId, tId){
    var head = this.getTransaction(headId);
    var t = this.getTransaction(tId);
    var balance = this.getInputFromTransaction(head, head.owner);
    var amount = this.getInputFromTransaction(t, head.owner);
    balance += amount;
    var r = {
      owner: head.owner,
      inputs:[
        headId,
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
    return this.insertTransaction(r);
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

  insertTransaction(trans){
    trans.hash = objectHash(trans);
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
