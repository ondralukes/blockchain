const path = require('path');
const RSA = require('node-rsa');
const fs = require('fs');
const http = require('http');
const chalk = require('chalk');

const dir = path.join(process.env.HOME, '.blockchain');
console.log(chalk.grey('Using ', dir));
if(!fs.existsSync(dir))
    fs.mkdirSync(dir);

const command = process.argv[2];

run();

async function run() {
    switch (command) {
        case 'init':
            init();
            break;
        case 'head':
            await head();
            break;
        case 'register':
            await register();
            break;
    }
}

function init(){
    if(fs.existsSync(path.join(dir, 'public')) || fs.existsSync(path.join(dir, 'private'))){
        console.log(chalk.red('A key was already generated.'));
        process.exit(1);
    }

    console.log('Generating new RSA key');
    const key = new RSA({b: 4096});
    const publicKey = key.exportKey('public');
    fs.writeFileSync(path.join(dir, 'public'), publicKey);
    fs.writeFileSync(path.join(dir, 'private'), key.exportKey('private'));
    console.log();
    console.log(chalk.green('Done'));
}

async function head(){
    if(!fs.existsSync(path.join(dir, 'public'))){
        console.log('No key! Run `init` command.');
        process.exit(1);
    }
    const publicKey = fs.readFileSync(path.join(dir, 'public')).toString();

    const id = await getHeadId(publicKey);
    console.log(id);
    if(id !== null){
        const trn = await getTrn(id);
        console.log();
        console.log(trn);
    } else {
        console.log();
        console.log(chalk.yellow('No head transaction.'));
    }
}

async function register(){
    if(process.argv.length < 4){
        console.log(chalk.red('Usage: register <name>'));
        process.exit(1);
    }

    if(!fs.existsSync(path.join(dir, 'public'))){
        console.log('No key! Run `init` command.');
        process.exit(1);
    }

    if(fs.existsSync(path.join(dir, 'username'))){
        const username = fs.readFileSync(path.join(dir, 'username')).toString();
        console.log(chalk.red('Already registered as', username));
        process.exit(1);
    }

    const publicKey = fs.readFileSync(path.join(dir, 'public')).toString();
    const resp = await request('/ep/register', {
        name: process.argv[3],
        publicKey: publicKey
    });

    console.log();
    if(resp.error){
        console.log(chalk.red(resp.error));
    } else {
        fs.writeFileSync(path.join(dir, 'username'), process.argv[3]);
        console.log(chalk.green('Success.'));
    }
}

async function getHeadId(publicKey){
    return request(
        '/ep/head',
        {
            publicKey: publicKey
        }
    );
}

async function getTrn(id) {
    return request('/ep/trn', id);
}

async function request(path, data){
    return new Promise((resolve) => {
        process.stdout.write(chalk.cyan('POST ') + chalk.blue(path));
        let resp = '';
        const req = http.request(
            {
                hostname: 'localhost',
                port: 8080,
                path: path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            },
            (res) => {
                res.on('data', (chunk) => {
                    resp += chunk;
                });

                res.on('end', () => {
                    if(res.statusCode !== 200){
                        process.stdout.write(' ' + chalk.bgYellow(res.statusCode) + '\n');
                    } else {
                        process.stdout.write(' ' + chalk.bgGreen(res.statusCode) + '\n');
                    }

                    resolve(JSON.parse(resp));
                });
            });

        req.on('error', (err) => {
            process.stdout.write(' ' + chalk.bgRed(err.code) + '\n');
            process.exit(1);
        });
        req.write(
            JSON.stringify(data)
        );
        req.end();
    });
}