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
                    }
                ],
                "hash": "test hash",
                "signature": "test signature"
            }
        });
        engine.enqueue({
            type: 'getHead',
            publicKey: 'test owner',
            callback: (x) => console.log('Engine callback: ', x)
        });
    },
    1000
);
