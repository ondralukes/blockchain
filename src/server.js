const engine = require('./engine/build/Release/engine');
const express = require('express');
const fs = require('fs');

let userKeys = new Map();

function onExit(){
    console.log('Stopping engine.');

    const rc = engine.stop();
    if(rc !== 0){
        console.error('[Server] Engine failed to stop (' + rc + ')');
    }

    console.log('Saving users.');
    fs.writeFileSync('users',
        JSON.stringify(
            [...userKeys]
        )
        );
    console.log('Bye bye!');
    process.exit();
}

process.on('exit', onExit.bind());
process.on('SIGINT', () => process.exit());
process.on('SIGUSR1', () => process.exit());
process.on('SIGUSR2', () => process.exit());
process.on('uncaughtException',(error) => {
        console.log(error);
        process.exit();
    }
);

if(fs.existsSync('users')){
    console.log('Loading users.');
    const obj = JSON.parse(fs.readFileSync('users').toString());
    console.log(obj);
    userKeys = new Map(obj);
    console.log('Done.');
}

console.log('[Server] Starting engine.');

const rc = engine.start();

if(rc !== 0){
    console.error('[Server] Engine failed to start (' + rc + ')');
    process.exit(1);
}

const app = express();

app.use(express.json());

app.post('/ep/head', (req, res) => {
    engine.enqueue({
        type: 'getHead',
        publicKey: req.body.publicKey,
        callback: (x) => {
            res.end(JSON.stringify(x));
        }
    });
});

app.post('/ep/trn', (req, res) => {
    engine.enqueue({
        type: 'getTrn',
        hash: req.body.hash,
        timestamp: req.body.timestamp,
        callback: (x) => {
            res.end(JSON.stringify(x));
        }
    })
});

app.post('/ep/register', (req, res) => {
    if(typeof req.body === 'undefined'){
        res.status(400);
        res.end(JSON.stringify({
            error: 'A body is required.'
        }));
        return;
    }

    if(typeof req.body.name === 'undefined'){
        res.status(400);
        res.end(JSON.stringify({
            error: 'A name is required.'
        }));
        return;
    }

    if(typeof req.body.publicKey === 'undefined'){
        res.status(400);
        res.end(JSON.stringify({
            error: 'A publicKey is required.'
        }));
        return;
    }
    if(userKeys.has(req.body.name)){
        res.status(500);
        res.end(JSON.stringify({
            error: 'This name is already registered.'
        }));
        return;
    }

    userKeys.set(req.body.name, req.body.publicKey);
    res.end('{}');
});

app.listen(8080);