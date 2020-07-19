const engine = require('./engine/build/Release/engine');
const express = require('express');

function onExit(){
    console.log('Stopping engine.');

    const rc = engine.stop();
    if(rc !== 0){
        console.error('[Server] Engine failed to stop (' + rc + ')');
    }
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

app.listen(8080);