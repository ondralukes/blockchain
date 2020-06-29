const engine = require('./engine/build/Release/engine');

console.log('Starting engine')
console.log(`Started engine (${engine.start()})`);
console.log('Stopping in 3 seconds');

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
    },
    1000
);

// setTimeout(
//     () => {
//         clearInterval(enqueueInterval);
//         console.log('Stopping engine');
//         console.log(`Engine stopped (${engine.stop()})`);
//     },
//     3000
// );