# Scripts

This directory contains utility scripts for the Barbershop Booking project.

## Available Scripts

### init-husky.sh
Initializes Git hooks using Husky. Run this after cloning the repository:
```bash
./scripts/init-husky.sh
```

### pre-commit-checks.js
Runs various pre-commit checks:
- Prevents committing `.env` files
- Warns about large commits (>20 files or >500 lines)
- Detects debug code (console.log, debugger, TODO, FIXME)

This script is automatically run by the pre-commit hook.

### run-related-tests.js
Finds and runs tests related to staged files. It:
- Identifies test files for modified source files
- Runs only the relevant tests to save time
- Helps catch regressions before committing

This script is automatically run by the pre-commit hook.

## Usage

These scripts are primarily used by Git hooks and don't need to be run manually. However, you can run them directly for testing:

```bash
# Run pre-commit checks manually
node scripts/pre-commit-checks.js

# Run related tests manually
node scripts/run-related-tests.js
```

## Adding New Scripts

When adding new scripts:
1. Place them in this directory
2. Make them executable: `chmod +x scripts/your-script.sh`
3. Document them in this README
4. Add appropriate error handling and user feedback