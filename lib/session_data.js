const fs = require('fs');
const path = require('path');

const BASE_DATA_DIR = path.join(__dirname, '../data');

function ensureSessionDataDir(sock) {
    const dir = sock?.dataDir || BASE_DATA_DIR;
    fs.mkdirSync(dir, { recursive: true });

    // Seed a new account with the shipped defaults, without sharing the
    // files afterwards. Existing accounts keep their own settings.
    if (dir !== BASE_DATA_DIR) {
        for (const file of fs.readdirSync(BASE_DATA_DIR)) {
            const source = path.join(BASE_DATA_DIR, file);
            const target = path.join(dir, file);
            if (fs.statSync(source).isFile() && !fs.existsSync(target)) {
                fs.copyFileSync(source, target);
            }
        }
    }
    return dir;
}

function dataPath(sock, fileName) {
    return path.join(ensureSessionDataDir(sock), fileName);
}

function readSessionJson(sock, fileName, fallback = {}) {
    try {
        return JSON.parse(fs.readFileSync(dataPath(sock, fileName), 'utf8'));
    } catch (_) {
        return fallback;
    }
}

function writeSessionJson(sock, fileName, value) {
    const target = dataPath(sock, fileName);
    const temporary = `${target}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2));
    fs.renameSync(temporary, target);
}

module.exports = {
    BASE_DATA_DIR,
    ensureSessionDataDir,
    dataPath,
    readSessionJson,
    writeSessionJson
};