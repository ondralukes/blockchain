var Blockchain = require('./blockchain');
var RSA = require('node-rsa');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

var users = {
  master: {
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
              + '-----END RSA PRIVATE KEY-----'
  }
};

var chain = new Blockchain(users.master.public, users.master.private);

users.master.head = chain.masterHead;



ask();
function ask(){
  rl.question('chain-prototype>', (ans) => {
    var split = ans.split(' ');
    if(split[0] == 'register'){
      register(split[1]);
    } else if(split[0] == 'send'){
      send(
        split[1],
        split[2],
        parseInt(split[3])
      );
    } else if(split[0] == 'balance'){
      balance(split[1]);
    }
    ask();
  });
}

function register(name){
  if(users.hasOwnProperty(name)){
    console.log('Name already used.');
    return;
  }

  var key = new RSA({b:1024});
  var user = {
    public: key.exportKey('public'),
    private: key.exportKey('private')
  };

  user.head = chain.register(user.public, user.private);
  user.vhead = user.head;

  users[name] = user;
}

function send(senderName, receiverName, amount){
  var sender = users[senderName];
  if(typeof sender === 'undefined'){
    console.log(`No such user: ${senderName}.`);
    return;
  }

  var receiver = users[receiverName];
  if(typeof receiver === 'undefined'){
    console.log(`No such user: ${receiverName}.`);
    return;
  }

  var vhead = chain.validatedHeadCache[sender.public];

  var h = selectHead(sender.head, vhead);
  var newHead = chain.send(h, sender.private, receiver.public, amount);
  console.log(
    `Chain head ${shortenId(h)}`+
    ` => ${shortenId(newHead)}`
  );
  sender.head = newHead;

  console.log(`Receiving transaction ${shortenId(newHead)}`);
  receive(receiverName, newHead);
}

function selectHead(head, vhead){
  var t = chain.getTransaction(head);
  if(typeof t === 'undefined'){
    console.log('Warning: Current head was removed (probably was not valid). Continuing with last validated head.');
    return vhead;
  }
  return head;
}

function receive(receiverName, tId){
  var receiver = users[receiverName];

  var vhead = chain.validatedHeadCache[receiver.public];

  var h = selectHead(receiver.head, vhead);
  var newHead = chain.receive(h, receiver.private, tId);
  console.log(
    `Chain head ${shortenId(h)}`+
    ` => ${shortenId(newHead)}`
  );
  receiver.head = newHead;
}

function balance(name){
  var user = users[name];

  if(typeof user === 'undefined'){
    console.log(`No such user: ${name}.`);
    return;
  }

  var vhead = chain.validatedHeadCache[user.public];
  console.log(`head ${shortenId(user.head)} vhead ${shortenId(vhead)}`);
  if(typeof user.head !== 'undefined'){
    var ht = chain.getTransaction(user.head);
    if(typeof ht === 'undefined'){
      console.log('Couldn\'t find head transaction.');
    } else {
      var o = ht.outputs.find(x => x.receiver == user.public);
      console.log(`Balance at head transaction output: ${o.amount}`);
    }
  }
  if(typeof vhead !== 'undefined'){
    var vht = chain.getTransaction(vhead);
    if(typeof vht === 'undefined'){
      console.log('Couldn\'t find vhead transaction.');
    } else {
      var o = vht.outputs.find(x => x.receiver == user.public);
      console.log(`Balance at vhead transaction output: ${o.amount}`);
    }
  }
}

function shortenId(id){
  if(typeof id === 'undefined'){
    return '<invalid id>';
  }
  var split = id.split('@');
  var block = split[1];
  var hash = split[0];

  return `${shortenHash(hash)}@${block}`;
}

function shortenHash(hash){
  return hash.substring(0,8);
}

// var t = chain.send(chain.masterTransaction, 'receiver', 250);
//
// var receiver = chain.register('receiver');
//
// receiver = chain.receive(receiver, t);
// chain.send(receiver, 'master', 249);
//
// setTimeout(
//   function (){
//     receiver = chain.send(receiver, 'master', 1);
//   },
//   12000
// );
