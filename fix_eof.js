const fs = require('fs');
const path = './app/dashboard/products/edit/[id]/page.tsx';
let data = fs.readFileSync(path, 'utf8');
const lines = data.split('\n');
// We need to keep up to line 2215 (index 2214) and from 2256 (index 2255)
const newLines = [...lines.slice(0, 2215), ...lines.slice(2255)];
fs.writeFileSync(path, newLines.join('\n'));
console.log('Removed dangling lines.');
