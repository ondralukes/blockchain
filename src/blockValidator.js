const {workerData, parentPort} = require('worker_threads');
const RSA = require('node-rsa');

const logEnabled = true;

const master = workerData.master;
const blocks = [];
let resp = null;

parentPort.on('message', (m) => {
  if(m.type === 'validate'){
    blocks.push(m.block);
  } else if(m.type === 'response'){
    resp = m.transaction;
  }
});

async function timer(){
  if(blocks.length === 0){
    setTimeout(timer, 500);
    return;
  }
  const block = blocks.pop();
  await validateBlock(block);
  parentPort.postMessage({
    type: 'validated',
    block: block
  });
  setTimeout(timer, 500);
}

async function validateBlock(block){
  log(`[Validator] Validating block ${block.time}`);
  block.transactions.forEach((t) => t.validated = false);

  let run = 0;
  while(true){
    log(`[Validator] =Run ${run}`);
    let validated = 0;
    for(let i = 0; i<block.transactions.length; i++){
      const t = block.transactions[i];
      if(!t.validated) await validateTransaction(t, block);
      if(t.validated) validated++;
    }
    log(`[Validator] ==Validated ${validated}/${block.transactions.length}`);
    if(validated === block.transactions.length) break;
    run++;
  }

  //Remove invalid
  const passed = [];
  block.transactions.forEach((t) => {
    if(t.valid){
      delete t.valid;
      delete t.validated;
      passed.push(t);
    }
  });

  block.transactions = passed;
  log(`[Validator] =${block.transactions.length} transactions passed.`);
}

async function validateTransaction(trans, block){
  let t;
  log(`[Validator] ====Validating transaction ${shortenHash(trans.hash)}`);
  if(Object.keys(trans).length !== 6){ //Object properties + temporary 'validated'
    log('[Validator] =====Invalid object structure. Invalid.');
    trans.validated = true;
    trans.valid = false;
    return;
  }
  log('[Validator] ======Validating inputs');
  log(trans.inputs);
  let totalInput = 0;
  for(let i = 0; i<trans.inputs.length; i++){
    const input = trans.inputs[i];
    log(`[Validator] =======Validating input ${shortenId(input)}`);
    if(transactionBlock(input) !== block.time){
      log('[Validator] ===========From older block.');
      t = await getTransaction(input);
    } else {
      log('[Validator] ===========From this block.');
      t = block.transactions.find(x => x.hash === transactionHash(input));
      if(!t.validated){
        log('[Validator] ===========Input depends on not validated transaction. Delaying validation.');
        return;
      } else if(!t.valid){
        log('[Validator] ===========Input depends on invalid transaction. Invalid.');
        trans.validated = true;
        trans.valid = false;
        return;
      }
    }
    const output = t.outputs.find(x => x.receiver === trans.owner);
    if(typeof output === 'undefined'){
      log('[Validator] ===========Input does not match any output.');
    } else {
      totalInput += output.amount;
    }
  }
  log(`[Validator] ======Total input: ${totalInput}`);
  log('[Validator] ======Validating outputs');
  let totalOutput = 0;
  let valid = true;
  trans.outputs.forEach(output => {
    if(Object.keys(output).length !== 2 ||
      !Object.keys(output).includes('receiver') ||
      !Object.keys(output).includes('amount')){
      log('[Validator] =====Invalid object structure. Invalid.');
      trans.validated = true;
      trans.valid = false;
      return;
    }
    if(output.amount < 0){
        log('[Validator] =========Output contains negative amount. Invalid.');
        valid = false;
        return;
    }
    totalOutput += output.amount;
  });
  if(!valid){
    trans.validated = true;
    trans.valid = false;
    return;
  }
  log(`[Validator] ======Total output: ${totalOutput}`);

  if(totalOutput !== totalInput){
    if(trans.owner === master){
      log("[Validator] ======Master transaction override.");
    } else {
      log(`[Validator] ======Input does not match output. Invalid.`);
      trans.validated = true;
      trans.valid = false;
      return;
    }
  }
  log('[Validator] ======Verifying signature');
  const key = new RSA(trans.owner);

  const signature = trans.signature;
  delete trans.signature;
  delete trans.validated;

  if(!key.verify(
    JSON.stringify(trans),
    signature,
    'utf8',
    'base64'
  )){
    trans.validated = true;
    trans.valid = false;
    return;
  }

  trans.signature = signature;
  trans.validated = true;
  trans.valid = true;
}

async function getTransaction(id){
  return new Promise(resolve => {
    parentPort.postMessage({
      type: 'getTransaction',
      id: id
    });

    const i = setInterval(
        function () {
          if (resp !== null) {
            clearInterval(i);
            const r = resp;
            resp = null;
            resolve(r);
          }
        },
        50
    );
  });
}

function transactionBlock(id){
  const split = id.split('@');
  return parseInt(split[1], 10);
}

function transactionHash(id){
  const split = id.split('@');
  return split[0];
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

setTimeout(timer, 500);

function log(msg){
  if(logEnabled){
    console.log(msg);
  }
}
