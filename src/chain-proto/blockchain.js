module.exports = class Blockchain {
  constructor(){
    this.transactions = [
      {
        owner: 'init',
        inputs: [],
        outputs: [
          {
            amount: 1000,
            receiver: 'master'
          },
        ]
      },
      {
        owner: 'master',
        inputs: [0],
        outputs: [
          {
            amount: 1000,
            receiver: 'master'
          },
        ]
      },
    ];
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
    if(balance < amount){
      console.log('Transaction failed');
      return -1;
    }

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

    console.log(`Sent ${amount}, now have ${balance - amount}`);
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

    console.log(`Received ${amount}, now have ${balance}`);
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
    return this.transactions[id];
  }

  insertTransaction(trans){
    this.transactions.push(trans);
    return this.transactions.length - 1;
  }
}
