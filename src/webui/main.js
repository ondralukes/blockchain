window.addEventListener('DOMContentLoaded', init);

let selectedPublicKey = null;
let selectedPrivateKey = null;
let selectedVHead = null;
let selectedHead = null;
let headBalance = null;
let vheadBalance = null;

let preparedTransaction = null;

function init() {
    document.getElementById('confirmation').style.display = 'none';
    document.getElementById('result-prompt').style.display = 'none';

    document.getElementById('login-btn')
        .addEventListener('click', login);
    document.getElementById('get-receiver-key-btn')
        .addEventListener('click', getReceiverKey);
    document.getElementById('send-btn')
        .addEventListener('click', send);

    document.getElementById('receiver-key').addEventListener('input', updateState);
    document.getElementById('send-amount').addEventListener('input',updateState);
    document.getElementById('receive-id').addEventListener('input',updateState);

    document.getElementById('confirmation-no')
        .addEventListener('click', closeConfirmation);
    document.getElementById('confirmation-yes')
        .addEventListener('click', confirmTransaction);

    document.getElementById('result-ok-btn')
        .addEventListener('click', closeResult);
    updateState();
}

function login() {
    const data = {
        name: document.getElementById('name-input').value
    };
    request('ui/login', data, (xhttp) => {

        selectedPrivateKey = null;
        selectedPublicKey = null;
        selectedHead = null;
        selectedVHead = null;

        document.getElementById('public-key').value = '';
        document.getElementById('private-key').value = '';
        document.getElementById('head').value = '';
        document.getElementById('vhead').value = '';

        if(xhttp.readyState === 4){
            if(xhttp.status === 200){
                const body = JSON.parse(xhttp.responseText);
                document.getElementById('public-key').value = body.publicKey;
                document.getElementById('private-key').value = body.privateKey;
                if(body.head !== null){
                    document.getElementById('head').value = body.head;
                } else {
                    document.getElementById('head').value = '(none)';
                }
                if(body.vhead !== null){
                    document.getElementById('vhead').value = body.vhead;
                } else {
                    document.getElementById('vhead').value = '(none)';
                }

                selectedPublicKey = body.publicKey;
                selectedPrivateKey = body.privateKey;
                selectedHead = body.head;
                selectedVHead = body.vhead;
                getBalances();
            } else if(xhttp.status === 500){
                const body = JSON.parse(xhttp.responseText);
                error(body.message);
            }
        }
        updateState();
    });
}

function getBalances(){
    headBalance = 0;
    vheadBalance = 0;
    if(selectedVHead !== null){
        request(
            'ui/get',
            {
                id: selectedVHead
            },
            (xhttp) => {
                if(xhttp.status === 200){
                    const t = JSON.parse(xhttp.responseText);
                    vheadBalance = getInputFromTransaction(t, selectedPublicKey);
                }
            }
        )
    }
    if(selectedHead !== null){
        request(
            'ui/get',
            {
                id: selectedHead
            },
            (xhttp) => {
                if(xhttp.status === 200){
                    const t = JSON.parse(xhttp.responseText);
                    headBalance = getInputFromTransaction(t, selectedPublicKey);
                }
            }
        )
    }
}

function getInputFromTransaction(trans, publicKey){
    const output = trans.outputs.find(x => {
        console.log(`${x.receiver} == ${publicKey}`);
        return x.receiver === publicKey;
    }
    );
    if(typeof output === 'undefined') return 0;
    return output.amount;
}

function getReceiverKey() {
    const data = {
        name: document.getElementById('receiver-name').value
    };
    request('ui/getPublic', data, (xhttp) => {
        if(xhttp.readyState === 4){
            if(xhttp.status === 200){
                const body = JSON.parse(xhttp.responseText);
                document.getElementById('receiver-key').value = body.publicKey;
            } else if(xhttp.status === 500){
                document.getElementById('receiver-key').value = 'Error getting public key.';
            }
        }
        updateState();
    });
}

function send(){
    const amount = parseInt(document.getElementById('send-amount').value);
    const transaction = {
        owner: selectedPublicKey,
        inputs: [],
        outputs: [
            {
                amount: amount,
                receiver: document.getElementById('receiver-key').value
            }
        ]
    };

    if(selectedHead !== null){
        transaction.inputs.push(selectedHead);
        transaction.outputs.push(
            {
                receiver: selectedPublicKey,
                amount: headBalance - amount
            }
        );
    } else if(selectedVHead !== null){
        transaction.inputs.push(selectedVHead);
        transaction.outputs.push(
            {
                receiver: selectedPublicKey,
                amount: vheadBalance - amount
            }
        );
    }

    hashAndSignTransaction(transaction);
    preparedTransaction = transaction;
    showConfirmation();
}

function receive(){
    const tId = document.getElementById('receive-id').value;
    request(
        'ui/get',
        {
            id: tId
        },
        (xhttp) => {
            if(xhttp.status === 200){
                const t = JSON.parse(xhttp.responseText);
                receivePhase2(t, tId);
            }
        }
    );
}

function receivePhase2(t, id){
    const amount = getInputFromTransaction(t, selectedPublicKey);
    const transaction = {
        owner: selectedPublicKey,
        inputs: [id],
        outputs: []
    };

    if(selectedHead !== null){
        transaction.inputs.push(selectedHead);
        transaction.outputs.push(
            {
                receiver: selectedPublicKey,
                amount: headBalance + amount
            }
        );
    } else if(selectedVHead !== null){
        transaction.inputs.push(selectedVHead);
        transaction.outputs.push(
            {
                receiver: selectedPublicKey,
                amount: vheadBalance + amount
            }
        );
    } else {
        transaction.outputs.push(
            {
                receiver: selectedPublicKey,
                amount: amount
            }
        );
    }

    hashAndSignTransaction(transaction);
    preparedTransaction = transaction;
    showConfirmation();
}

function hashAndSignTransaction(transaction){
    transaction.hash = objectHash(transaction);

    const key = new NodeRSA(selectedPrivateKey);

    transaction.signature = key.sign(
        JSON.stringify(transaction),
        'base64',
        'utf8'
    );
}

function confirmTransaction(){
    request(
        'ui/send',
        {
            transaction: preparedTransaction
        },
        (xhttp) => {
            if(xhttp.status === 200){
                document.getElementById('result-tid')
                    .innerText = JSON.parse(xhttp.responseText).id;
                document.getElementById('result-prompt').style.display = '';
            }
        }
    );
    closeConfirmation();
}

function getTransaction(id){
    request(
        'ui/get',
        {
            id: id
        },
        (xhttp) => {});
}

function request(url, data, callback) {
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if(xhttp.readyState === 4) callback(xhttp);
    }
    xhttp.open('POST', url, true);
    xhttp.setRequestHeader('Content-Type', 'application/json');
    xhttp.send(JSON.stringify(data));
}

function updateState() {
    updateSendButtonState();
    updateReceiveButtonState();
}

function updateSendButtonState() {
    const sendButton = document.getElementById('send-btn');
    if(selectedPublicKey === null){
        sendButton.innerText = 'Please log in.';
        sendButton.disabled = true;
        sendButton.classList.remove('btn-outline-primary');
        sendButton.classList.add('btn-outline-danger');
        return;
    }

    const amount = parseInt(
        document.getElementById('send-amount').value
    );
    if(isNaN(amount) || amount <= 0){
        sendButton.innerText = 'Please enter a valid amount.';
        sendButton.disabled = true;
        sendButton.classList.remove('btn-outline-primary');
        sendButton.classList.add('btn-outline-danger');
        return;
    }

    const receiverKey = document.getElementById('receiver-key').value;
    if(
        !receiverKey.includes('-BEGIN PUBLIC KEY-')||
        !receiverKey.includes('-END PUBLIC KEY-'))
    {
        sendButton.innerText = 'Please enter a valid receiver\'s public key.';
        sendButton.disabled = true;
        sendButton.classList.remove('btn-outline-primary');
        sendButton.classList.add('btn-outline-danger');
        return;
    }
    sendButton.innerText = 'Send';
    sendButton.disabled = false;
    sendButton.classList.add('btn-outline-primary');
    sendButton.classList.remove('btn-outline-danger');
}

function updateReceiveButtonState() {
    const receiveButton = document.getElementById('receive-btn');
    if(selectedPublicKey === null){
        receiveButton.innerText = 'Please log in.';
        receiveButton.disabled = true;
        receiveButton.classList.remove('btn-outline-primary');
        receiveButton.classList.add('btn-outline-danger');
        return;
    }

    const id = document.getElementById('receive-id').value;
    if(!id.includes('@')){
        receiveButton.innerText = 'Please enter a valid transaction ID.';
        receiveButton.disabled = true;
        receiveButton.classList.remove('btn-outline-primary');
        receiveButton.classList.add('btn-outline-danger');
        return;
    }

    receiveButton.innerText = 'Receive';
    receiveButton.disabled = false;
    receiveButton.classList.add('btn-outline-primary');
    receiveButton.classList.remove('btn-outline-danger');
}

function closeConfirmation() {
    document.getElementById('confirmation').style.display = 'none';
}

function closeResult() {
    document.getElementById('result-prompt').style.display = 'none';
}

function showConfirmation() {
    document.getElementById('confirmation-json')
        .innerText = JSON.stringify(
        preparedTransaction,
        null,
        ' '
    );
    document.getElementById('confirmation').style.display = '';
}

function hash(str){
    return CryptoJS.enc.Base64.stringify(CryptoJS.SHA512(str));
}

function objectHash(obj){
    return hash(JSON.stringify(obj));
}