#!/bin/bash
# Script to remove tracked files that should be ignored

echo "Removing .DS_Store files from git tracking..."
find . -name .DS_Store -exec git rm --cached {} \; 2>/dev/null || true

echo "Removing __pycache__ directories from git tracking..."
git rm -r --cached backend/__pycache__ 2>/dev/null || true
git rm -r --cached backend/routers/__pycache__ 2>/dev/null || true

echo "Removing frontend/build from git tracking..."
git rm -r --cached frontend/build 2>/dev/null || true

echo "Done! Review changes in GitHub Desktop and commit if needed."
