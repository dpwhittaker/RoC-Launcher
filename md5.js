const crypto = require('crypto');
const fs = require('fs');

function md5(file, cb) {
    var hash = crypto.createHash('md5'), 
    stream = fs.createReadStream(file);
    stream.on('data', data => hash.update(data, 'utf8'));
    stream.on('end', () => cb(hash.digest('hex')));
}

md5(process.argv[2], console.log);

console.log("Size:", fs.statSync(process.argv[2]).size);