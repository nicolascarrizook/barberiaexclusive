#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

// Get test files related to staged files
function getRelatedTestFiles(stagedFiles) {
  const testFiles = new Set();
  
  stagedFiles.forEach(file => {
    // Skip non-source files
    if (!file.includes('src/') || file.includes('__tests__') || file.includes('.test.') || file.includes('.spec.')) {
      return;
    }

    // Get the base name without extension
    const ext = path.extname(file);
    const baseName = file.slice(0, -ext.length);
    const dir = path.dirname(file);

    // Look for test files in various locations
    const possibleTestFiles = [
      // Same directory
      `${baseName}.test${ext}`,
      `${baseName}.spec${ext}`,
      // __tests__ folder in same directory
      `${dir}/__tests__/${path.basename(baseName)}.test${ext}`,
      `${dir}/__tests__/${path.basename(baseName)}.spec${ext}`,
    ];

    possibleTestFiles.forEach(testFile => {
      try {
        execSync(`git ls-files --error-unmatch ${testFile}`, { stdio: 'ignore' });
        testFiles.add(testFile);
      } catch {
        // File doesn't exist in git, ignore
      }
    });
  });

  return Array.from(testFiles);
}

// Run tests for specific files
function runTests(testFiles) {
  if (testFiles.length === 0) {
    console.log(`${colors.yellow}ℹ️  No related test files found for staged changes${colors.reset}`);
    return true;
  }

  console.log(`${colors.cyan}🧪 Running tests for ${testFiles.length} related file(s)...${colors.reset}`);
  testFiles.forEach(file => console.log(`   - ${file}`));
  console.log('');

  try {
    // Run vitest with the specific test files
    execSync(`npx vitest run ${testFiles.join(' ')}`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log(`\n${colors.green}✅ All related tests passed${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`\n${colors.red}❌ Some tests failed${colors.reset}`);
    return false;
  }
}

// Main execution
function main() {
  try {
    // Get staged files
    const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
      .split('\n')
      .filter(file => file && (
        file.endsWith('.ts') || 
        file.endsWith('.tsx') || 
        file.endsWith('.js') || 
        file.endsWith('.jsx')
      ));

    if (stagedFiles.length === 0) {
      console.log(`${colors.yellow}ℹ️  No JavaScript/TypeScript files staged${colors.reset}`);
      process.exit(0);
    }

    // Find related test files
    const testFiles = getRelatedTestFiles(stagedFiles);

    // Check if any test files themselves were modified
    const modifiedTestFiles = stagedFiles.filter(file => 
      file.includes('__tests__') || 
      file.includes('.test.') || 
      file.includes('.spec.')
    );

    if (modifiedTestFiles.length > 0) {
      console.log(`${colors.cyan}🧪 Test files were modified, running them...${colors.reset}`);
      testFiles.push(...modifiedTestFiles);
    }

    // Remove duplicates
    const uniqueTestFiles = [...new Set(testFiles)];

    // Run the tests
    const success = runTests(uniqueTestFiles);
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Only run if called directly
if (require.main === module) {
  main();
}