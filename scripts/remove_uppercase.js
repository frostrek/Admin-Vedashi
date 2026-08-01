const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../app/dashboard/vendor-registrations/page.tsx');
let content = fs.readFileSync(file, 'utf8');

// Replace "uppercase " in the specific className
content = content.replace(/text-sm font-bold text-gold uppercase tracking-wider mb-3 border-b border-border pb-1/g, 'text-sm font-bold text-gold tracking-wider mb-3 border-b border-border pb-1');

// Wait, the screenshot also shows uppercase for "STATUS:" label and "Name", "Email" isn't uppercase but "STATUS:" is.
// The user specifically asked for "All of the headings like Product infor, contact infor... Remove uppercase CSS from them".
fs.writeFileSync(file, content);
console.log('Replaced successfully.');
