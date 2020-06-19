module.exports.log = (msg) => {
    console.log(msg);
}

module.exports.warn = (msg) => {
    console.log('\x1b[33m%s\x1b[0m', msg);
}

module.exports.error = (msg) => {
    console.log('\x1b[31m%s\x1b[0m', msg);
}