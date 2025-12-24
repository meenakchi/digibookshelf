// Run this with: node fix-paths.js
// This will update all asset paths in your HTML and JS files

const fs = require('fs');
const path = require('path');

const files = [
  'public/index.html',
  'public/profile.html',
  'public/tbr.html',
  'public/profile.js'
];

files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace ../assets/ with /assets/
    content = content.replace(/\.\.\/assets\//g, '/assets/');
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✓ Fixed paths in ${file}`);
  } catch (err) {
    console.error(`✗ Error processing ${file}:`, err.message);
  }
});

console.log('\n✓ All paths updated! Your files are now ready for Render.');
console.log('\nNext steps:');
console.log('1. Move your assets folder to the root (same level as public/)');
console.log('2. Push to GitHub');
console.log('3. Deploy on Render!');