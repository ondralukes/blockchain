window.addEventListener('DOMContentLoaded', init);

function init() {
    document.getElementById('submit-btn')
        .addEventListener('click', register);
}

function register() {
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if(xhttp.readyState === 4){
            if(xhttp.status === 200){
                success('Success.');
            } else if(xhttp.status === 500){
                const body = JSON.parse(xhttp.responseText);
                error(body.message);
            }
        }
    }
    xhttp.open('POST', 'ui/register', true);
    xhttp.setRequestHeader('Content-Type', 'application/json');
    xhttp.send(JSON.stringify(
        {
            name: document.getElementById('name-input').value
        }
    ));
    clearStatus();
}

function clearStatus(){
    error('');
    success('');
}

function error(msg) {
    document.getElementById('error-text').innerHTML = msg;
}

function success(msg) {
    document.getElementById('success-text').innerHTML = msg;
}