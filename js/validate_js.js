const fs = require('fs');
const acorn = require('acorn');
const html = fs.readFileSync('index.html', 'utf8');

const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let scriptIndex = 0;

while ((match = scriptRegex.exec(html)) !== null) {
    const code = match[1];
    // skip empty scripts
    if (!code.trim()) continue;

    try {
        acorn.parse(code, { ecmaVersion: 2020 });
        console.log(`Script \${scriptIndex} OK.`);
    } catch (e) {
        console.log(`Syntax Error in Script \${scriptIndex} at line \${e.loc.line}: \${e.message}`);
        const lines = code.split('\n');
        const start = Math.max(0, e.loc.line - 3);
        const end = Math.min(lines.length, e.loc.line + 3);
        for (let i = start; i < end; i++) {
            console.log(`\${i+1}: \${lines[i]}`);
        }
    }
    scriptIndex++;
}
