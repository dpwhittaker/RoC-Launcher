const fs = require('fs');
const path = require('path');
const request = require('request');

module.exports.getManifest = function(mods, fullScan, checkFiles) {
    if (!mods) mods = [];
    var files = require('./required');
    if (fullScan || !fs.existsSync(path.join())) {
        //force download with size:0, md5:""
        files = files.concat([
            {name:"swgemu.cfg", size:0, md5:"", url:"http://www.launchpad2.net/SWGEmu/swgemu.cfg"},
            {name:"swgemu_machineoptions.iff", size:0, md5:"", url:"http://www.launchpad2.net/SWGEmu/swgemu_machineoptions.iff"},
            {name:"swgemu_preload.cfg", size:0, md5:"", url:"http://www.launchpad2.net/SWGEmu/swgemu_preload.cfg"}
        ]);
    }
    request({url:"https://github.com/dpwhittaker/RoC-Launcher/releases/download/Assets/manifest.json", json:true}, function(err, response, body) {
        if (err) return console.error(err);
        var allmods = [];
        for (var mod in body) if (mod != 'required') allmods.push(mod);
        if (module.exports.modList) module.exports.modList(allmods);
        files = files.concat(body.required);
        for (var mod of mods) files = files.concat(body[mod]);
        if (checkFiles) checkFiles(files);
    });
}

module.exports.install = function(swgPath, emuPath, mods, fullScan) {
    const child_process = require('child_process');

    module.exports.getManifest(mods, fullScan, checkFiles);

    var fileIndex = 0;
    var completedBytes = 0;
    var totalBytes = 0;
    var files;
    function checkFiles(manifest) {
        files = manifest;
        for (let file of files) {
            totalBytes += file.size;
            if (/\.zip$/.test(file.name))
                totalBytes += file.size;
        }

        var env = {swgPath, emuPath};
        if (fullScan) env.fullScan = true;
        for (let i = 0; i < 4; i++) {
            let fork = child_process.fork(__filename, {env});
            fork.on('message', m => installedCallback(fork, m));
            fork.send(files[fileIndex++]);
        }
    }
    function installedCallback(fork, message) {
        if (message.complete !== undefined) {
            completedBytes += message.complete;
            progress(completedBytes, totalBytes);
            if (fileIndex == files.length) {
                fork.kill();
                console.log("killing fork");
            }
            else fork.send(files[fileIndex++]);
        } else if (message.progress) {
            completedBytes += message.progress;
            progress(completedBytes, totalBytes);
        } else {
            console.log(JSON.stringify(message));
        }
    }
    function progress(completed, total) {
        if (module.exports.progress) module.exports.progress(completed, total);
    }
}

if (process.send) {
    const AdmZip = require('adm-zip');

    function mkdirp(pathToCreate) {
        pathToCreate.split(path.sep).reduce((currentPath, folder) => {
            currentPath += folder + path.sep;
            if (!fs.existsSync(currentPath)) fs.mkdirSync(currentPath);
            return currentPath;
        }, '');
    }
    mkdirp(process.env.emuPath);

    process.on('message', (fileInfo) => {
        let src = path.join(process.env.swgPath, fileInfo.name);
        let dst = path.join(process.env.emuPath, fileInfo.name);
        let progressReported = 0;
        mkdirp(path.dirname(dst));
        if (fs.existsSync(dst))
            src = dst;
        fs.stat(src, (err, stats) => {
            if (err) { process.send('err: ' + err); return doDownload(); }
            if (stats.size != fileInfo.size) {process.send("size mismatch actual: " + stats.size + ' expected: ' + fileInfo.size); return doDownload();}
            if (process.env.fullScan)
                md5(src, hash => {
                    if (hash != fileInfo.md5) {
                        process.send('md5 mismatch actual: ' + hash + ' expected: ' + fileInfo.md5);
                        progress(-fileInfo.size);
                        return doDownload();
                    }
                    process.send('md5 matches ' + fileInfo.name);
                    copyFile(src, dst, complete, progress);
                }, progress);
            else copyFile(src, dst, complete, progress);
        });
        function doDownload() {
            process.send('downloading ' + fileInfo.url + ' to ' + dst);
            download(fileInfo.url, dst, complete, progress);
        }
        function complete(err) {
            if (err) return process.send("err:" + err);
            process.send("complete: " + fileInfo.name);
            var expectedSize = fileInfo.size;
            if (/\.zip$/.test(fileInfo.name)) expectedSize *= 2;
            process.send({'complete':expectedSize - progressReported});
        }
        function progress(bytes) {
            progressReported += bytes;
            process.send({progress: bytes});
        }
    });

    function download(url, dest, complete, progress) {
        try { fs.unlinkSync(dest); } catch (ex){}
        var file = fs.createWriteStream(dest);
        request(url)
        .on('error', err => {
            file.close();
            fs.unlink(dest);
            if (complete) complete(err.message);
        })
        .on('response', res => {
            res.on('data', d => progress(d.length));
            if (/\.zip$/.test(dest))
                res.on('end', () => unzip(dest, complete))
            else
                res.on('end', complete);
        })
        .pipe(file);
    };

    function unzip(dest, complete) {
        process.send('unzipping');
        var zip = new AdmZip(dest);
        zip.extractAllToAsync(process.env.emuPath, true, complete);
    }

    function md5(file, complete, progress) {
        var hash = require('crypto').createHash('md5'); 
        var stream = fs.createReadStream(file);
        stream.on('data', data => {progress(data.length); hash.update(data, 'utf8')});
        stream.on('end', () => complete(hash.digest('hex')));
    }

    function copyFile(source, target, complete, progress) {
        if (source == target) return complete();
        var cbCalled = false;
        var rd = fs.createReadStream(source);
        rd.on("error", done);
        var wr = fs.createWriteStream(target);
        wr.on("error", done);
        wr.on("close", done);
        rd.on('data', d => progress(d.length));
        rd.pipe(wr);
        function done(err) {
            if (!cbCalled) {
                complete(err);
                cbCalled = true;
            }
        }
    }
}
