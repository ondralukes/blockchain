const Blockchain = require('./blockchain');
const Network = require('./network');
const {readFileSync} = require('fs');
const RSA = require('node-rsa');
const readline = require('readline');

const {log, warn} = require('./console');

let confFile = 'config.json';
if(process.argv.length < 3){
  log('Loading default config file: config.json');
} else {
  log(`Loading config file: ${process.argv[2]}`);
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
  rl.question('chain-prototype>', async (ans) => {
    const split = ans.split(' ');
    if(split[0] === 'register'){
      register(split[1]);
    } else if(split[0] === 'send'){
      await send(
        split[1],
        split[2],
        parseInt(split[3], 10)
      );
    } else if(split[0] === 'receive'){
      await receive(split[1], split[2]);
    } else if(split[0] === 'balance'){
      await balance(split[1]);
    } else if(split[0] === 'dump'){
      log('===Dump begin===');
      log('Chain:');
      console.dir(chain.blocks, {depth:null});
      log('Pending blocks:');
      console.dir(chain.pendingBlocks, {depth:null});
      log('Pending transactions:');
      console.dir(chain.pendingTransactions, {depth:null});
      log('===Dump end===');
    } else if (split[0] === 'local'){
      var localLog = split[1] === 'true';
      chain.insertLocally = localLog;
      log('Local blockchain insertion is ' + localLog);
    }
    ask();
  });
}

function register(name){
  if(users.has(name)){
    warn('Name already used.');
    return;
  }

  const key = new RSA({b: 1024});
  const user = {
    public: key.exportKey('public'),
    private: key.exportKey('private')
  };

  user.head = chain.register(user.public, user.private);
  log(`Registred, head = ${shortenId(user.head)}`);

  users.set(name, user);
}

async function send(senderName, receiverName, amount){
  const sender = users.get(senderName);
  if(typeof sender === 'undefined'){
    warn(`No such user: ${senderName}.`);
    return;
  }

  const receiver = users.get(receiverName);
  if(typeof receiver === 'undefined'){
    warn(`No such user: ${receiverName}.`);
    return;
  }

  const newHead = await chain.send(sender, receiver, amount);
  sender.head = newHead;

  log(`Transaction id is ${newHead}`);
}

async function receive(receiverName, tId){
  const receiver = users.get(receiverName);

  receiver.head = await chain.receive(receiver, tId);
}

async function balance(name){
  let amount;
  let o;
  const user = users.get(name);

  if(typeof user === 'undefined'){
    warn(`No such user: ${name}.`);
    return;
  }

  const vhead = await chain.getVHead(user.public);
  if(typeof user.head !== 'undefined'){
    var ht = await chain.getTransaction(user.head);
    if(ht === null){
      warn('Couldn\'t find head transaction.');
    } else {
      o = ht.outputs.find(x => x.receiver === user.public);
      amount = 0;
      if(typeof o !== 'undefined'){
        amount = o.amount;
      }
      log(`Balance at head transaction output: ${amount}`);
    }
  }
  if(vhead !== null){
    console.log(vhead);
    const vht = await chain.getTransaction(vhead);
    if(vht === null){
      warn('Couldn\'t find vhead transaction.');
    } else {
      o = vht.outputs.find(x => x.receiver === user.public);
      amount = 0;
      if(typeof o !== 'undefined'){
        amount = o.amount;
      }
      log(`Balance at vhead transaction output: ${amount}`);
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