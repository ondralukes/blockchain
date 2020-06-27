const engine = require('./engine/build/Release/engine');

console.log('Starting engine')
console.log(`Started engine (${engine.start()})`);
console.log('Stopping in 3 seconds');

engine.obj({
    int: 42,
    str: 'test',
    arr: [
        'str1',
        'str2',
        'str3'
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