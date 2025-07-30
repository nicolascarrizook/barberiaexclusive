#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Patterns to match unused variables and imports
const patterns = [
  // Unused imports
  {
    regex: /import\s+{([^}]+)}\s+from\s+['"][^'"]+['"]/g,
    fix: (match, imports) => {
      const importList = imports.split(',').map(imp => imp.trim());
      const usedImports = importList.filter(imp => {
        const varName = imp.replace(/\s+as\s+.*$/, '').trim();
        return varName.startsWith('_') || varName === 'React' || varName === 'useEffect';
      });
      if (usedImports.length === 0) {
        return `// ${match}`;
      }
      return `import {${usedImports.join(', ')}} from '${match.match(/from\s+['"]([^'"]+)['"]/)[1]}'`;
    }
  },
  // Unused variables
  {
    regex: /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g,
    fix: (match, varName) => {
      if (varName.startsWith('_') || varName === 'React' || varName === 'useEffect') {
        return match;
      }
      return match.replace(varName, `_${varName}`);
    }
  }
];

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;
    let newContent = content;

    patterns.forEach(pattern => {
      newContent = newContent.replace(pattern.regex, (...args) => {
        const result = pattern.fix(...args);
        if (result !== args[0]) {
          modified = true;
        }
        return result;
      });
    });

    if (modified) {
      fs.writeFileSync(filePath, newContent);
      console.log(`Fixed: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDir(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      processFile(filePath);
    }
  });
}

// Start processing from src directory
if (fs.existsSync('src')) {
  console.log('Fixing unused variables...');
  walkDir('src');
  console.log('Done!');
} else {
  console.log('src directory not found');
} 