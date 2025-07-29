#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

// Check for .env files in staged files
function checkEnvFiles() {
  try {
    const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
      .split('\n')
      .filter(Boolean);

    const envFiles = stagedFiles.filter(file => 
      file.includes('.env') || 
      file.endsWith('.env.local') || 
      file.endsWith('.env.production')
    );

    if (envFiles.length > 0) {
      console.error(`${colors.red}❌ ERROR: Attempting to commit environment files:${colors.reset}`);
      envFiles.forEach(file => console.error(`   - ${file}`));
      console.error(`${colors.yellow}⚠️  Remove these files from the commit with: git reset HEAD ${envFiles.join(' ')}${colors.reset}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`${colors.red}Error checking for env files:${colors.reset}`, error.message);
    return false;
  }
}

// Check commit size (number of files and total lines changed)
function checkCommitSize() {
  try {
    const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
      .split('\n')
      .filter(Boolean);

    const stats = execSync('git diff --cached --stat', { encoding: 'utf-8' });
    const match = stats.match(/(\d+) files? changed.*?(\d+) insertions?.*?(\d+) deletions?/);
    
    if (match) {
      const filesChanged = parseInt(match[1]);
      const insertions = parseInt(match[2] || 0);
      const deletions = parseInt(match[3] || 0);
      const totalChanges = insertions + deletions;

      // Warn if commit is too large
      if (filesChanged > 20 || totalChanges > 500) {
        console.warn(`${colors.yellow}⚠️  WARNING: Large commit detected${colors.reset}`);
        console.warn(`   Files changed: ${filesChanged}`);
        console.warn(`   Lines changed: ${totalChanges} (+${insertions}, -${deletions})`);
        console.warn(`${colors.yellow}   Consider breaking this into smaller commits for better review${colors.reset}`);
        
        // Still allow the commit, just warn
        return true;
      }
    }
    return true;
  } catch (error) {
    console.error(`${colors.red}Error checking commit size:${colors.reset}`, error.message);
    return true; // Don't block on error
  }
}

// Check for debug code
function checkDebugCode() {
  try {
    const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
      .split('\n')
      .filter(file => file && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')));

    const debugPatterns = [
      /console\.(log|debug|info)/g,
      /debugger/g,
      /TODO:/gi,
      /FIXME:/gi,
      /XXX:/gi
    ];

    let hasDebugCode = false;
    const findings = [];

    for (const file of stagedFiles) {
      if (!fs.existsSync(file)) continue;
      
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        debugPatterns.forEach(pattern => {
          if (pattern.test(line)) {
            findings.push({
              file,
              line: index + 1,
              content: line.trim(),
              type: pattern.source
            });
            hasDebugCode = true;
          }
        });
      });
    }

    if (hasDebugCode) {
      console.warn(`${colors.yellow}⚠️  WARNING: Debug code detected in staged files:${colors.reset}`);
      findings.forEach(finding => {
        console.warn(`   ${finding.file}:${finding.line} - ${finding.content}`);
      });
      console.warn(`${colors.yellow}   Consider removing debug code before committing${colors.reset}`);
    }

    return true; // Just warn, don't block
  } catch (error) {
    console.error(`${colors.red}Error checking for debug code:${colors.reset}`, error.message);
    return true;
  }
}

// Main execution
function main() {
  console.log('🔍 Running pre-commit checks...\n');

  const checks = [
    { name: 'Environment files', fn: checkEnvFiles },
    { name: 'Commit size', fn: checkCommitSize },
    { name: 'Debug code', fn: checkDebugCode }
  ];

  let allPassed = true;

  for (const check of checks) {
    const passed = check.fn();
    if (!passed) {
      allPassed = false;
    }
    console.log(`${passed ? colors.green + '✓' : colors.red + '✗'} ${check.name}${colors.reset}`);
  }

  if (!allPassed) {
    console.error(`\n${colors.red}❌ Pre-commit checks failed${colors.reset}`);
    process.exit(1);
  }

  console.log(`\n${colors.green}✅ All pre-commit checks passed${colors.reset}`);
  process.exit(0);
}

main();