#!/bin/bash

# Initialize git hooks with Husky
echo "🚀 Initializing Git hooks with Husky..."

# Check if .git exists
if [ ! -d ".git" ]; then
  echo "❌ Error: This is not a git repository. Please run 'git init' first."
  exit 1
fi

# Set up git hooks path
git config core.hooksPath .husky

echo "✅ Git hooks initialized successfully!"
echo ""
echo "📝 Git hooks configured:"
echo "  - pre-commit: Runs linting, formatting, and tests"
echo "  - commit-msg: Validates commit message format"
echo ""
echo "🔧 To skip hooks temporarily, use: git commit --no-verify"
echo ""
echo "📖 See CONTRIBUTING.md for more information about the hooks"