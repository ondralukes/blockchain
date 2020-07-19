const path = require('path');
const RSA = require('node-rsa');
const fs = require('fs');
const http = require('http');

const dir = path.join(process.env.HOME, '.blockchain');
console.log('Using ', dir);
if(!fs.existsSync(dir))
    fs.mkdirSync(dir);

const command = process.argv[2];

run();

async function run() {
    switch (command) {
        case 'init':
            if(fs.existsSync(path.join(dir, 'public')) || fs.existsSync(path.join(dir, 'private'))){
                console.log('A key was already generated.');
                process.exit(1);
            }

            console.log('Generating new RSA key');
            const key = new RSA({b: 4096});
            fs.writeFileSync(path.join(dir, 'public'), key.exportKey('public'));
            fs.writeFileSync(path.join(dir, 'private'), key.exportKey('private'));
            console.log('Done');
            break;
        case 'head':
            if(!fs.existsSync(path.join(dir, 'public'))){
                console.log('No key! Run `init` command.');
                process.exit();
            }
            const publicKey = fs.readFileSync(path.join(dir, 'public')).toString();
            console.log('POST localhost:8080/ep/head');

            const id = await getHeadId(publicKey);
            console.log(id);
            if(id !== null){
                const trn = await getTrn(id);
                console.log(trn);
            }
            break;
    }
}


async function getHeadId(publicKey){
    return new Promise((resolve) => {
        let resp = '';
        const req = http.request(
            {
                hostname: 'localhost',
                port: 8080,
                path: '/ep/head',
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
                    resolve(JSON.parse(resp));
                });
            });

        req.on('error', () => {
            console.log("Failed to connect.");
            process.exit(1);
        });
        req.write(
            JSON.stringify(
                {
                    publicKey: publicKey
                }
            ));
        req.end();
    });
}

async function getTrn(id) {
    return new Promise((resolve) => {
        let resp = '';
        const req = http.request(
            {
                hostname: 'localhost',
                port: 8080,
                path: '/ep/trn',
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
                    resolve(JSON.parse(resp));
                });
            });

        req.on('error', () => {
            console.log("Failed to connect.");
            process.exit(1);
        });
        req.write(
            JSON.stringify(id)
        );
        req.end();
    });
}