const fs = require('fs');

const content = fs.readFileSync('build_log.txt', 'utf16le');
const clean = content.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '');

const lines = clean.split('\n');
const start = Math.max(0, lines.length - 50);

for (let i = start; i < lines.length; i++) {
    console.log(lines[i].trim());
}
