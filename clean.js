const fs = require('fs');
const content = fs.readFileSync('script.js', 'utf8').split('\n');
// Delete lines 516 to 535 (1-indexed)
// 0-indexed range is 515 to 534.
// Array.splice(start, count)
content.splice(515, 20); 
fs.writeFileSync('script.js', content.join('\n'));
console.log('CLEANUP_SUCCESS');
