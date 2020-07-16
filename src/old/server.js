const Blockchain = require('./blockchain');
const Network = require('./network');
const {readFileSync} = require('fs');
const RSA = require('node-rsa');

const {log, warn} = require('./console');

let confFile = 'config.json';
if(process.argv.length < 3){
  log('Loading default config file: config.json');
} else {
  log(`Loading config file: ${process.argv[2]}`);
  confFile = process.argv[2];
}
const conf = JSON.parse(readFileSync(confFile));

const users = new Map();
users.set(
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
        + '-----END RSA PRIVATE KEY-----',
    }
);

const net = new Network(conf);
new Blockchain(users.get('master').public, net);