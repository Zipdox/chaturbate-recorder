const youtubedl = require('youtube-dl');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

if(!fs.existsSync('recordings/')) fs.mkdirSync('recordings/');
const config = require('./config.js');
var logstream = fs.createWriteStream('process.log', {flags:'a'});

var recording = [];
for(model of config.models){
    recording[model] = false;
}
if(config.models.length > 1)
console.log('Models', config.models.join(', '), 'will be checked every', config.refresh, 'seconds.\n')
else
console.log('Model', config.models.join(' '), 'will be checked every', config.refresh, 'seconds.\n');

async function getInfo(username){
    return new Promise((resolve, reject) => {
        youtubedl.getInfo(`https://chaturbate.com/${username}/`, [], (err, info) => {
            if(err) reject(err);
            resolve(info);
        });
    });
}

async function checkModel(username){
    const json = await getInfo(username).catch((error) => {});
    if(json == undefined) return null
    return json.url;
}

async function checkModels(){
    for(model in recording){
        if(recording[model]){
            console.log(model, "already recording");
            continue;
        }
        console.log("Checking", model);
        let url = await checkModel(model);
        if(url == null){
            console.log(model, "isn't live");
            continue;
        }
        const fileName = `${model}_${new Date().toISOString().replace('T', '_').replace(/:/g, '-').split('.')[0]}.mkv`;
        recording[model] = ffmpeg(url).audioCodec('copy').videoCodec('copy').on('end', function(){
            recording[model] = false;
            console.log(model, "ended recording");
            logstream.write(`${new Date().toUTCString()} Finished recording ${fileName}\n`);
        }).save(`recordings/${fileName}`);
        console.log("Started recording", model);
        logstream.write(`${new Date().toUTCString()} Started recording ${fileName}\n`);
    }
}

checkModels();
setInterval(checkModels, config.refresh * 1000);
