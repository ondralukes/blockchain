const engine = require('./engine/build/Release/engine');

console.log('Starting engine')
console.log(`Started engine (${engine.start()})`);
console.log('Stopping in 3 seconds');

engine.obj({
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
            "amount": 123,
            "receiver": "test receiver2"
        },
        {
            "amount": 123,
            "receiver": "test receiver3"
        },
        {
            "amount": 123,
            "receiver": "test receiver4"
        },
    ]
});
let i = 0;
const enqueueInterval = setInterval(
    ()=> {
        engine.enqueue(i++);
    },
    100
);

setTimeout(
    () => {
        clearInterval(enqueueInterval);
        console.log('Stopping engine');
        console.log(`Engine stopped (${engine.stop()})`);
    },
    3000
);