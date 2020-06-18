const {Worker} = require('worker_threads');
const sha512 = require('crypto-js/sha512');
const RSA = require('node-rsa');
const Base64 = require('crypto-js/enc-base64');

module.exports = class Blockchain {
  constructor(masterPub, net){
    this.net = net;
    net.setChain(this);
    this.pendingTransactions = [];
    this.pendingBlocks = [];
    this.nextBlockTime = Math.ceil(timestamp() / 10) * 10;

    this.blocks = [];

    this.validatedHeadCache = new Map();

    const _this = this;

    this.validator = new Worker('./blockValidator.js', {
      workerData: {
        master: masterPub
      }
    });
    this.validator.on('message', (b) => _this.handleWorkerMessage(b));

    setInterval(function(){_this.timer();}, 1000);
  }

  handleWorkerMessage(message){
    if(message.type === 'validated'){
      this.handleValidated(message.block);
    } else if(message.type === 'getTransaction'){
      const transaction = this.getVerifiedTransaction(message.id);
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
      this.validatedHeadCache.set(t.owner, `${t.hash}@${block.time}`);
    });
  }

  timer(){
    let time = timestamp();
    if(time >= this.nextBlockTime){
      //Copy array
      const transactions = this.pendingTransactions.slice(0);
      this.pendingTransactions = [];

      const block = {
        time: this.nextBlockTime,
        transactions: transactions
      };

      this.pendingBlocks.push(block);
      this.validator.postMessage({
        type: 'validate',
        block: block
      });

      if(time === this.nextBlockTime) time++;
      this.nextBlockTime = Math.ceil(time / 10) * 10;
    }
  }

  register(pub, priv){
    const r = {
      owner: pub,
      inputs: [],
      outputs: []
    };

    return this.insertTransaction(r, priv);
  }

  send(sender, receiver, amount){
    let balance = 0;
    let head;
    if(typeof sender.head !== 'undefined'){
      head = this.getTransaction(sender.head);
      balance = this.getInputFromTransaction(head, head.owner);
    }

    let remainder = balance - amount;
    if(remainder < 0) remainder = 0;
    let transaction = {
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

    const newHeadId = this.insertTransaction(transaction, sender.private);

    console.log(`[Blockchain] Sent ${amount}, now have ${balance - amount}`);
    return newHeadId;
  }

  receive(user, tId){
    const head = this.getTransaction(user.head);
    const t = this.getTransaction(tId);
    let balance = this.getInputFromTransaction(head, head.owner);
    const amount = this.getInputFromTransaction(t, head.owner);
    balance += amount;
    const r = {
      owner: head.owner,
      inputs: [
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
    let res = 0;
    const output = t.outputs.find(x => x.receiver === recv);
    if(typeof output !== 'undefined'){
       res += output.amount;
    }
    return res;
  }

  getTransaction(id){
    const split = id.split('@');
    const blockId = parseInt(split[1], 10);
    const hash = split[0];

    let block = this.blocks.find(x => x.time === blockId);

    if(typeof block === 'undefined')
      block = this.pendingBlocks.find(x => x.time === block);

    if(typeof block === 'undefined')
      return this.pendingTransactions.find(x => x.hash === hash);

    return block.transactions.find(x => x.hash === hash);
  }

  getVerifiedTransaction(id){
    const split = id.split('@');
    const blockId = parseInt(split[1], 10);
    const hash = split[0];

    const block = this.blocks.find(x => x.time === blockId);
    if(typeof block === 'undefined') return block;
    return block.transactions.find(x => x.hash === hash);
  }

  insertTransaction(trans, priv){
    trans.hash = objectHash(trans);
    const key = RSA(priv);
    trans.signature = key.sign(
        JSON.stringify(trans),
        'base64',
        'utf8'
    );
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
