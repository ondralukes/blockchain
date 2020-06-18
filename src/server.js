const Blockchain = require('./blockchain');
const Network = require('./network');
const {readFileSync} = require('fs');
const RSA = require('node-rsa');
const readline = require('readline');

let confFile = 'config.json';
if(process.argv.length < 3){
  console.log('Loading default config file: config.json');
} else {
  console.log(`Loading config file: ${process.argv[2]}`);
  confFile = process.argv[2];
}
const conf = JSON.parse(readFileSync(confFile));

const users = new Map();
users.set(
    'master',
    {
    public: '-----BEGIN PUBLIC KEY-----'
        + 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCVyShgFEKqCVz0Zl3vAYGDJ9oz'
        + 'Ox48NBJVjZOkZ8fNzZWY5+n/8KfnLxqWdbkXx0ZnjRLqhVSXbbfgoruDcw7gRE+X'
        + 'OEGNCdjlifx0agsL8LMwE9UpV//VdoMuAjPlbPKiqtl9bEstdchJpPpyhymbYwR4'
        + 'RRP7aGCw6Xg5Bx5HBQIDAQAB'
        + '-----END PUBLIC KEY-----',
    private: '-----BEGIN RSA PRIVATE KEY-----'
        + 'MIICXAIBAAKBgQCVyShgFEKqCVz0Zl3vAYGDJ9ozOx48NBJVjZOkZ8fNzZWY5+n/'
        + '8KfnLxqWdbkXx0ZnjRLqhVSXbbfgoruDcw7gRE+XOEGNCdjlifx0agsL8LMwE9Up'
        + 'V//VdoMuAjPlbPKiqtl9bEstdchJpPpyhymbYwR4RRP7aGCw6Xg5Bx5HBQIDAQAB'
        + 'AoGAAkbAWlV0fekOhJhZrRw0v62HX2fyma+g57PzHniFTNdnAp/jqoQZySWqHcdE'
        + 'PNxGcaRvOSk1k+eS99MBToodG71cEtG2caoqumGpBGRnCu8UUhCBm59iMlBJnLdh'
        + 'Vzh+vVDFpIrRuKoqF55IcckXuhuoWmF9yAFlbmwsAXPMswECQQDu6YAx7Oj1+TSU'
        + 'KkKz26Z3q3ISMGxEJh1pZFAebSEywujNFpQMkHCRS42ipS0QhQAoaF82fBII92EN'
        + 'D6RvLRHxAkEAoH+/LRMAc2MmELThJ2w5vyIt27ADwzCsGoFOuh+LNZH1n1B0DOYN'
        + 'HVpZNsAta/kd9Rf5vVSzGBoxojXJE8pyVQJAIn820n6p2LKGJArCHORPciIgU34I'
        + 'dAKo5onkg7AwRfsc0Fg9Ql8s0d398ok1K5h4wFzpup1JoV/O9KrYjHEOkQJAc8pV'
        + '8T3hOF3Si4EDYv6oVqVg8jp1LG/D6kdZtdumAhrwWmSfpOKfmYqiDGbvHhOWskj+'
        + 'ysH9hyj2n/EvxRBsFQJBAJYT9NPJ+bLdAeFe27C7qT165yxjkD/JqW1xQzDGtI9x'
        + 'uwG7lXbt1Q380qJO0eT3Ey+da6iyJS6xpTuot8H4Bck='
        + '-----END RSA PRIVATE KEY-----',
    }
);

const net = new Network(conf);
const chain = new Blockchain(users.get('master').public, net);

let rl;
if(conf.enableInput){
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  ask();
}

function ask(){
  rl.question('chain-prototype>', (ans) => {
    const split = ans.split(' ');
    if(split[0] === 'register'){
      register(split[1]);
    } else if(split[0] === 'send'){
      send(
        split[1],
        split[2],
        parseInt(split[3])
      );
    } else if(split[0] === 'balance'){
      balance(split[1]);
    } else if(split[0] === 'dump'){
      console.log('===Dump begin===');
      console.log('Chain:');
      console.dir(chain.blocks, {depth:null});
      console.log('Pending blocks:');
      console.dir(chain.pendingBlocks, {depth:null});
      console.log('Pending transactions:');
      console.dir(chain.pendingTransactions, {depth:null});
      console.log('===Dump end===');
    }
    ask();
  });
}

function register(name){
  if(users.has(name)){
    console.log('Name already used.');
    return;
  }

  const key = new RSA({b: 1024});
  const user = {
    public: key.exportKey('public'),
    private: key.exportKey('private')
  };

  user.head = chain.register(user.public, user.private);
  user.vhead = user.head;

  users.set(name, user);
}

function send(senderName, receiverName, amount){
  const sender = users.get(senderName);
  if(typeof sender === 'undefined'){
    console.log(`No such user: ${senderName}.`);
    return;
  }

  const receiver = users.get(receiverName);
  if(typeof receiver === 'undefined'){
    console.log(`No such user: ${receiverName}.`);
    return;
  }

  const vhead = chain.validatedHeadCache.get(sender.public);
  const h = selectHead(sender.head, vhead);
  const newHead = chain.send(sender, receiver, amount);
  console.log(
    `Chain head ${shortenId(h)}`+
    ` => ${shortenId(newHead)}`
  );
  sender.head = newHead;

  console.log(`Receiving transaction ${shortenId(newHead)}`);
  receive(receiverName, newHead);
}

function selectHead(head, vhead){
  if(typeof head === 'undefined'){
    if(typeof vhead === 'undefined'){
      return head;
    } else {
      return vhead;
    }
  } else {
    const t = chain.getTransaction(head);
    if (typeof t === 'undefined') {
      console.log('Warning: Current head was removed (probably was not valid). Continuing with last validated head.');
      return vhead;
    }
    return head;
  }
}

function receive(receiverName, tId){
  const receiver = users.get(receiverName);

  const vhead = chain.validatedHeadCache.get(receiver.public);

  const h = selectHead(receiver.head, vhead);
  const newHead = chain.receive(receiver, tId);
  console.log(
    `Chain head ${shortenId(h)}`+
    ` => ${shortenId(newHead)}`
  );
  receiver.head = newHead;
}

function balance(name){
  let amount;
  let o;
  const user = users.get(name);

  if(typeof user === 'undefined'){
    console.log(`No such user: ${name}.`);
    return;
  }

  const vhead = chain.validatedHeadCache.get(user.public);
  console.log(`head ${shortenId(user.head)} vhead ${shortenId(vhead)}`);
  if(typeof user.head !== 'undefined'){
    var ht = chain.getTransaction(user.head);
    if(typeof ht === 'undefined'){
      console.log('Couldn\'t find head transaction.');
    } else {
      o = ht.outputs.find(x => x.receiver === user.public);
      amount = 0;
      if(typeof o !== 'undefined'){
        amount = o.amount;
      }
      console.log(`Balance at head transaction output: ${amount}`);
    }
  }
  if(typeof vhead !== 'undefined'){
    const vht = chain.getTransaction(vhead);
    if(typeof vht === 'undefined'){
      console.log('Couldn\'t find vhead transaction.');
    } else {
      o = vht.outputs.find(x => x.receiver === user.public);
      amount = 0;
      if(typeof o !== 'undefined'){
        amount = o.amount;
      }
      console.log(`Balance at vhead transaction output: ${amount}`);
    }
  }
}

function shortenId(id){
  if(typeof id === 'undefined'){
    return '<invalid id>';
  }
  const split = id.split('@');
  const block = split[1];
  const hash = split[0];

  return `${shortenHash(hash)}@${block}`;
}

function shortenHash(hash){
  return hash.substring(0,8);
}