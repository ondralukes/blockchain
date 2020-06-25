const express = require('express');
const RSA = require('node-rsa');

module.exports =
    /**
     * @property {Map} users
     * @property {Blockchain} chain
     */
    class WebUI {
    constructor(app) {
        this.users = new Map();
        this.users.set(
            'master',
            {
                public: '-----BEGIN PUBLIC KEY-----'
                    + 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCVyShgFEKqCVz0Zl3vAYGDJ9oz'
                    + 'Ox48NBJVjZOkZ8fNzZWY5+n/8KfnLxqWdbkXx0ZnjRLqhVSXbbfgoruDcw7gRE+X'
                    + 'OEGNCdjlifx0agsL8LMwE9UpV//VdoMuAjPlbPKiqtl9bEstdchJpPpyhymbYwR4'
                    + 'RRP7aGCw6Xg5Bx5HBQIDAQAB'
                    + '-----END PUBLIC KEY-----',
                private: '-----BEGIN RSA PRIVATE KEY-----'
                    + 'MIICXAIBAAKBgQCVyShgFEKqCVz0Zl3vAYGDJ9ozOx48NBJVjZOkZ8fNzZWY5+n/'
                    + '8KfnLxqWdbkXx0ZnjRLqhVSXbbfgoruDcw7gRE+XOEGNCdjlifx0agsL8LMwE9Up'
                    + 'V//VdoMuAjPlbPKiqtl9bEstdchJpPpyhymbYwR4RRP7aGCw6Xg5Bx5HBQIDAQAB'
                    + 'AoGAAkbAWlV0fekOhJhZrRw0v62HX2fyma+g57PzHniFTNdnAp/jqoQZySWqHcdE'
                    + 'PNxGcaRvOSk1k+eS99MBToodG71cEtG2caoqumGpBGRnCu8UUhCBm59iMlBJnLdh'
                    + 'Vzh+vVDFpIrRuKoqF55IcckXuhuoWmF9yAFlbmwsAXPMswECQQDu6YAx7Oj1+TSU'
                    + 'KkKz26Z3q3ISMGxEJh1pZFAebSEywujNFpQMkHCRS42ipS0QhQAoaF82fBII92EN'
                    + 'D6RvLRHxAkEAoH+/LRMAc2MmELThJ2w5vyIt27ADwzCsGoFOuh+LNZH1n1B0DOYN'
                    + 'HVpZNsAta/kd9Rf5vVSzGBoxojXJE8pyVQJAIn820n6p2LKGJArCHORPciIgU34I'
                    + 'dAKo5onkg7AwRfsc0Fg9Ql8s0d398ok1K5h4wFzpup1JoV/O9KrYjHEOkQJAc8pV'
                    + '8T3hOF3Si4EDYv6oVqVg8jp1LG/D6kdZtdumAhrwWmSfpOKfmYqiDGbvHhOWskj+'
                    + 'ysH9hyj2n/EvxRBsFQJBAJYT9NPJ+bLdAeFe27C7qT165yxjkD/JqW1xQzDGtI9x'
                    + 'uwG7lXbt1Q380qJO0eT3Ey+da6iyJS6xpTuot8H4Bck='
                    + '-----END RSA PRIVATE KEY-----'
            }
        );
        app.use(express.static('webui'));

        const _this = this;
        app.post('/ui/register', (req, res) => _this.register(req, res));
        app.post('/ui/login', (req, res) => _this.login(req, res));
        app.post('/ui/getPublic', (req, res) => _this.getPublic(req, res));
        app.post('/ui/send', (req, res) => _this.send(req, res));
        app.post('/ui/get', (req, res) => _this.get(req, res));
    }

    register(req, res){
        const name = req.body.name;
        if(typeof name === 'undefined'){
            res.status(400);
            res.end();
            return;
        }

        if(this.users.has(name)){
            res.status(500);
            res.setHeader('Content-Type', 'application/json');
            res.write(JSON.stringify(
                {
                    message: 'This name is already registered.'
                }
            ));
            res.end();
            return;
        }
        const key = new RSA({b: 1024});
        const user = {
            public: key.exportKey('public').replace(/\n/g, ''),
            private: key.exportKey('private').replace(/\n/g, '')
        };

        this.users.set(name, user);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(
            {
                publicKey: user.public
            }
        ));
    }

    async login(req, res){
        let name = this.getRequestName(req, res)
        if(name === null) return;
        const user = this.users.get(name);
        res.setHeader('Content-Type', 'application/json');

        const vhead = await this.chain.getVHead(user.public);
        console.log(vhead);
        res.end(JSON.stringify(
            {
                publicKey: user.public,
                privateKey: user.private,
                vhead: await this.chain.getVHead(user.public)
            }
        ));
    }

    getPublic(req, res){
        let name;
        if((name = this.getRequestName(req, res)) === null) return;

        const user = this.users.get(name);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(
            {
                publicKey: user.public,
            }
        ));
    }

    send(req, res){
        const transaction = req.body.transaction;
        if(typeof transaction === 'undefined'){
            res.status(400);
            res.end();
            return;
        }

        const tId = this.chain.insertSignedTransaction(transaction, true);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
                id: tId
            }));
    }

    getRequestName(req, res){
        const name = req.body.name;
        if(typeof name === 'undefined'){
            res.status(400);
            res.end();
            return null;
        }

        if(!this.users.has(name)){
            res.status(500);
            res.setHeader('Content-Type', 'application/json');
            res.write(JSON.stringify(
                {
                    message: 'This user does not exist.'
                }
            ));
            res.end();
            return null;
        }
        return name;
    }

    async get(req, res){
        const id = req.body.id;
        if(typeof id === 'undefined'){
            res.status(400);
            res.end();
            return;
        }

        const trans = await this.chain.getTransaction(id, true);
        if(trans === null){
            res.status(500);
            res.end();
            return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(trans));
    }
}

