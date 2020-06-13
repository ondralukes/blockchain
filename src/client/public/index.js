function init(){
  document.getElementById('pingBtn').addEventListener('click', ping);
  setInterval(timer, 1000);
}

var requestId = '';
var responsesFrom = [];

function ping(){
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (xhttp.readyState == 4 && xhttp.status == 200){
      requestId = xhttp.responseText;
      responsesFrom = [];
      clearResponses();
    }
  }
  xhttp.open("POST", 'send', true);
  xhttp.setRequestHeader('Content-Type', 'application/json');
  xhttp.send(JSON.stringify(
    {
      type: 'ping'
    }
  ));
}

function timer(){
  if(requestId == '') return;
  getResponses(requestId);
}

function getResponses(id){
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (xhttp.readyState == 4 && xhttp.status == 200){
      handleResponses(JSON.parse(xhttp.responseText));
    }
  }
  xhttp.open("POST", 'responses', true);
  xhttp.setRequestHeader('Content-Type', 'application/json');
  xhttp.send(JSON.stringify(
    {
      id: id
    }
  ));
}

function handleResponses(responses){
  responses.forEach(
    (r) => {
      if(!responsesFrom.includes(r.sender)){
        responsesFrom.push(r.sender);
        addResponse(r);
      }
    }
  )
}

function addResponse(r){
  document.getElementById('results').innerHTML +=
  `<div class="row"><div class="col-6 text-center">${r.status}</div>`+
  `<div class="col-6 text-center">${r.sender}</div></div>`;
}

function clearResponses(){
  document.getElementById('results').innerHTML = '';
}
