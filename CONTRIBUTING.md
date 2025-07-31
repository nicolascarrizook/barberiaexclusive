# Contributing to Barbershop Booking

Thank you for your interest in contributing to Barbershop Booking! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Development Setup](#development-setup)
- [Git Hooks](#git-hooks)
- [Commit Message Convention](#commit-message-convention)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)

## Development Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd barbershop-booking
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## Git Hooks

This project uses Husky to manage Git hooks that run automatically during the development workflow. The hooks help maintain code quality and consistency.

### Pre-commit Hooks

When you run `git commit`, the following checks are performed automatically:

1. **ESLint** - Checks and auto-fixes JavaScript/TypeScript code issues
2. **Prettier** - Formats code according to project standards
3. **TypeScript Compilation** - Ensures no TypeScript errors
4. **Environment File Check** - Prevents accidentally committing `.env` files
5. **Commit Size Check** - Warns about large commits (>20 files or >500 lines)
6. **Debug Code Detection** - Warns about console.log, debugger, TODO, FIXME
7. **Related Tests** - Runs tests for modified files

#### Hook Details

- **Lint-staged Configuration** (`.lintstagedrc.json`):
  - Runs ESLint with auto-fix on staged JS/TS files
  - Runs Prettier on all staged files
  - Runs TypeScript compiler check on TS files

- **Custom Pre-commit Checks** (`scripts/pre-commit-checks.js`):
  - Blocks commits containing `.env` files
  - Warns about large commits that might be hard to review
  - Warns about debug code left in the codebase

- **Test Runner** (`scripts/run-related-tests.js`):
  - Automatically finds and runs tests related to modified files
  - Helps catch regressions before pushing

### Commit-msg Hook

The commit-msg hook validates that your commit messages follow the Conventional Commits format.

### Bypassing Hooks

If you need to bypass the hooks in exceptional cases:

```bash
# Skip all hooks
git commit --no-verify -m "your message"

# Skip specific checks by commenting them out temporarily in .husky/pre-commit
```

**Note:** Use this sparingly and only when absolutely necessary.

## Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system or dependency changes
- `ci`: CI/CD configuration changes
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

### Examples

```bash
# Simple feature
git commit -m "feat: add appointment cancellation"

# Feature with scope
git commit -m "feat(booking): add time slot validation"

# Bug fix with description
git commit -m "fix: resolve date picker timezone issue

The date picker was showing incorrect times for users in different timezones.
This fix ensures all times are displayed in the barbershop's local timezone."

# Breaking change
git commit -m "feat!: update API response format

BREAKING CHANGE: API responses now use camelCase instead of snake_case"
```

### Commit Message Rules

- Header must be 72 characters or less
- Body lines must be 100 characters or less
- Use imperative mood ("add" not "adds" or "added")
- Don't capitalize the first letter of the subject
- Don't end the subject with a period

## Code Style

### General Guidelines

- Follow the existing code style in the project
- Use TypeScript for type safety
- Write self-documenting code with clear variable names
- Add comments for complex logic
- Keep functions small and focused

### ESLint Rules

The project enforces several ESLint rules:

- No unused variables (prefix with `_` to ignore)
- React hooks rules
- TypeScript best practices

Run `npm run lint` to check for issues, or `npm run lint:fix` to auto-fix.

### Prettier Formatting

Prettier is configured with:

- Single quotes
- Semicolons
- 2-space indentation
- 80-character line width
- Trailing commas (ES5)

Run `npm run format` to format all files.

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test Button.test.tsx
```

### Writing Tests

- Place test files next to the component they test or in a `__tests__` folder
- Use `.test.tsx` or `.test.ts` suffix
- Write descriptive test names
- Test user behavior, not implementation details
- Aim for high coverage but prioritize meaningful tests

Example:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## Pull Request Process

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Write code following the style guidelines
   - Add/update tests as needed
   - Update documentation if necessary

3. **Commit Your Changes**
   - Make small, focused commits
   - Follow the commit message convention
   - Let the pre-commit hooks run

4. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a pull request on GitHub

5. **PR Guidelines**
   - Fill out the PR template completely
   - Link related issues
   - Ensure all checks pass
   - Request review from maintainers

6. **Code Review**
   - Address feedback promptly
   - Push additional commits as needed
   - Re-request review when ready

### PR Checklist

Before submitting a PR, ensure:

- [ ] All tests pass (`npm test`)
- [ ] No linting errors (`npm run lint`)
- [ ] Code is formatted (`npm run format:check`)
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] Commit messages follow conventions
- [ ] Documentation is updated if needed
- [ ] No console.logs or debug code
- [ ] No hardcoded values or secrets

## Getting Help

If you have questions:

1. Check existing issues and PRs
2. Read the documentation
3. Ask in discussions
4. Create an issue with the question label

Thank you for contributing to Barbershop Booking! 🎉