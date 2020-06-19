const {Worker} = require('worker_threads');
const sha512 = require('crypto-js/sha512');
const RSA = require('node-rsa');
const Base64 = require('crypto-js/enc-base64');

const {log, warn} = require('./console');

module.exports =
    /**
     * @property {boolean} insertLocally
     * @property {Map} validatedHeadCache
     * @property {Array} pendingTransactions
     * @property {Array} pendingBlocks
     * @property {Array} blocks
     * @property {Number} nextBlockTime
     * @property {Worker} validator
     * @property {Network} net
     * @property {string} masterPublicKey
     * @type {Blockchain}
     */
    class Blockchain {
  constructor(masterPub, net){
    this.net = net;
    net.setChain(this);
    this.pendingTransactions = [];
    this.pendingBlocks = [];
    this.nextBlockTime = Math.ceil(timestamp() / 10) * 10;

    this.blocks = [];

    this.validatedHeadCache = new Map();
    this.masterPublicKey = masterPub;

    const _this = this;

    this.validator = new Worker('./blockValidator.js', {
      workerData: {
        master: masterPub
      }
    });
    this.validator.on('message', (b) => _this.handleWorkerMessage(b));

    setInterval(function(){_this.timer();}, 1000);
  }

  async handleWorkerMessage(message){
    if(message.type === 'validated'){
      this.handleValidated(message.block);
    } else if(message.type === 'getTransaction'){
      const transaction = await this.getTransaction(message.id, true);
      this.validator.postMessage({
        type: 'response',
        transaction: transaction
      });
    }
  }

  handleValidated(block){
    log(`[Blockchain] Received validated block ${block.time} with ${block.transactions.length} transactions`);
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

  async send(sender, receiver, amount){
    let balance = 0;
    let head = await this.selectHead(sender);
    if(head === null){
      warn('[Blockchain] Warning: Continuing without head.');
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

    if(head !== null) transaction.inputs.push(sender.head);

    const newHeadId = this.insertTransaction(transaction, sender.private);

    console.log(`[Blockchain] Sent ${amount}, now have ${balance - amount}`);
    return newHeadId;
  }

  async receive(user, tId){
    const t = await this.getTransaction(tId);
    const headId = await this.selectHead(user);

    if(t === null){
      warn('[Blockchain] Transaction invalid.');
      return headId;
    }

    if(headId === null){
      if(t.owner !== this.masterPublicKey) {
        warn('No head selected. Transaction aborted.');
        return;
      }
    }

    if(headId === null) {
      warn('[Blockchain] Warning: Continuing without head.');
    }

    let balance = 0;
    let head;
    if(headId !== null) {
      head = await this.getTransaction(headId);
      if(head !== null) {
        balance = this.getInputFromTransaction(head, user.public);
      } else {
        warn('[Blockchain] Warning: Continuing without head.');
      }
    }
    const amount = this.getInputFromTransaction(t, user.public);
    balance += amount;
    const r = {
      owner: user.public,
      inputs: [
        tId
      ],
      outputs: [
        {
          amount: balance,
          receiver: user.public
        }
      ]
    };

    if(headId !== null) r.inputs.push(headId);

    log(`[Blockchain] Received ${amount}, now have ${balance}`);
    return this.insertTransaction(r, user.private);
  }

  async selectHead(user){
    let headValid = false;
    let vheadValid = false;
    if(typeof user.head !== 'undefined' && user.head !== null){
      const t = await this.getTransaction(user.head);
      if(t !== null){
        headValid = true;
      }
    }

    let vhead = await this.getVHead(user.public);
    if(vhead !== null) vheadValid = true;

    if(!vheadValid){
      warn('[Blockchain] Cannot find any validated head. Try again later.');
      return null;
    }

    if(!headValid){
      return vhead;
    }

    if(vhead !== user.head){
      warn('[Blockchain] Head transaction is not yet validated. Aborted.');
      return null;
    }

    return vhead;
  }



  getInputFromTransaction(t, recv){
    let res = 0;
    const output = t.outputs.find(x => x.receiver === recv);
    if(typeof output !== 'undefined'){
       res += output.amount;
    }
    return res;
  }

  async getTransaction(id, requireValidated = false){
    const split = id.split('@');
    const blockId = parseInt(split[1], 10);
    const hash = split[0];

    if(requireValidated){
      let t = this.getLocalVerifiedTransaction(id);
      if(typeof t !== 'undefined') return t;
      return await this.net.getRemoteTransaction(id);
    }
    let block = this.blocks.find(x => x.time === blockId);
    if(typeof block !== 'undefined'){
      let t = block.transactions.find(x => x.hash === hash);
      if(typeof t !== 'undefined') return t;
    }

    block = this.pendingBlocks.find(x => x.time === blockId)
    if(typeof block !== 'undefined'){
      let t = block.transactions.find(x => x.hash === hash);
      if(typeof t !== 'undefined') return t;
    }

    let t = this.pendingTransactions.find(x => x.hash === hash);

    if(typeof t === 'undefined') {
      return await this.net.getRemoteTransaction(id);
    }

    return t;
  }

  getLocalVerifiedTransaction(id){
    const split = id.split('@');
    const blockId = parseInt(split[1], 10);
    const hash = split[0];

    const block = this.blocks.find(x => x.time === blockId);
    if(typeof block === 'undefined') return block;
    return block.transactions.find(x => x.hash === hash);
  }

  async getVHead(publicKey){
    if(this.validatedHeadCache.has(publicKey)){
      return this.validatedHeadCache.get(publicKey);
    } else {
      return await this.net.getRemoteVHead(publicKey);
    }
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
    if(this.insertLocally){
      return this.insertSignedTransaction(trans);
    } else {
      return `${trans.hash}@${this.nextBlockTime}`;
    }
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
