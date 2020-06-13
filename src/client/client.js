var express = require('express');

var counter = 0;
var serverId = require('crypto').randomBytes(16).toString('base64');

var requests = [];
var responses = [];
var app = express();
app.use(express.json());
app.use(express.text());

app.use(express.static('public'));

app.get('/pull', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(requests));
});

app.post('/respond', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end('{}');
  responses.push(req.body);
});

app.post('/send', (req, res) => {
  var id = `${serverId}/${getCounter()}`;
  var request = {
    id: id,
    payload: req.body,
    origin: serverId
  };
  requests.push(request);
  res.setHeader('Content-Type', 'text/plain');
  res.end(id);
});

app.post('/responses', (req, res) => {
  if(typeof req.body == 'undefined'){
    res.write("No body provided.");
    res.status(400);
    res.end();
    return;
  }
  if(typeof req.body.id == 'undefined'){
    res.write("No id provided.");
    res.status(400);
    res.end();
    return;
  }
  res.setHeader('Content-Type', 'application/json');
  var id = req.body.id;
  var resp = [];
  responses.filter(x => x.request.id == id).forEach(
    (r) => {
      resp.push(r.payload);
    }
  );
  res.end(JSON.stringify(resp));
})

app.get('/responses', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  var resp = [];
  responses.forEach((r) => {
    resp.push(r.payload);
  })
  res.end(JSON.stringify(resp));
});

function getCounter(){
  if(counter >= 2147483647){
    counter = 0;
  } else {
    counter++;
  }
  return counter;
}

var server = app.listen(8080);
