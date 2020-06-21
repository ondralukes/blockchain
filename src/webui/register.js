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
                console.log('success');
            } else if(xhttp.status === 500){
                const body = JSON.parse(xhttp.responseText);
                console.log(`Error: ${body.message}`);
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
}