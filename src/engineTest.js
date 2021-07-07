const engine = require('./engine/build/Release/engine');

console.log('Starting engine')
console.log(`Started engine (${engine.start()})`);

const enqueueInterval = setInterval(
    ()=> {
        engine.enqueue({
            type: 'enqueue',
            transaction: {
                "owner": "test owner",
                "inputs": [
                    "test input1",
                    "test input2"
                ],
                "outputs": [
                    {
                        "amount": 123,
                        "receiver": "test receiver1"
                    },
                    {
                        "amount": 321,
                        "receiver": "test receiver2"
                    }
                ],
                "hash": "test hash",
                "signature": "test signature"
            }
        });
        engine.enqueue({
            type: 'getHead',
            publicKey: 'test owner',
            callback: (x) => {
                console.log('Engine getHead callback: ', x);
                engine.enqueue({
                    type: 'getTrn',
                    hash: x.hash,
                    timestamp: x.timestamp,
                    callback: (y) => console.log('Engine getTrn callback:', y)
                });
            }
        });
    },
    1000
);
