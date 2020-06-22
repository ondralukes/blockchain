window.addEventListener('DOMContentLoaded', init);

let selectedName = null;
let selectedKey = null;
let selectedVHead = null;
let selectedHead = null;

function init() {
    document.getElementById('login-btn')
        .addEventListener('click', login);
    document.getElementById('get-receiver-key-btn')
        .addEventListener('click', getReceiverKey);
    document.getElementById('send-btn')
        .addEventListener('click', send);

    document.getElementById('receiver-key').addEventListener('input', updateState);
    document.getElementById('send-amount').addEventListener('input',updateState);
    updateState();
}

function login() {
    const data = {
        name: document.getElementById('name-input').value
    };
    request('ui/login', data, (xhttp) => {

        selectedKey = null;
        selectedHead = null;
        selectedVHead = null;

        document.getElementById('public-key').value = '';
        document.getElementById('head').value = '';
        document.getElementById('vhead').value = '';

        if(xhttp.readyState === 4){
            if(xhttp.status === 200){
                const body = JSON.parse(xhttp.responseText);
                document.getElementById('public-key').value = body.publicKey;
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

                selectedKey = body.publicKey;
                selectedHead = body.head;
                selectedVHead = body.vhead;
            } else if(xhttp.status === 500){
                const body = JSON.parse(xhttp.responseText);
                error(body.message);
            }
        }
        updateState();
    });
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
        owner: selectedKey,
        inputs: [],
        outputs: [
            {
                amount: amount,
                receiver: document.getElementById('receiver-key').value
            }
        ]
    }

    if(selectedHead !== null){
        transaction.inputs.push(selectedHead);
    }

    //TODO: hash, sign, and send transaction
}

function request(url, data, callback) {
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        callback(xhttp);
    }
    xhttp.open('POST', url, true);
    xhttp.setRequestHeader('Content-Type', 'application/json');
    xhttp.send(JSON.stringify(data));
}

function updateState() {
    const sendButton = document.getElementById('send-btn');
    if(selectedKey === null){
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