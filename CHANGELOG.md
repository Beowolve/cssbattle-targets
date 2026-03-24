# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning.

## [Unreleased]

## [2.0.0] - 2026-03-24

### Added

- Added lazy loading for target lists with scroll-triggered fetches.
- Added refresh merge behavior so newly published targets are prepended.
- Added application version label in the header.

### Technical

- Added reusable GitHub Actions modules and `CI`/`Release` workflows.
- Added `cliff.toml` for release notes generation via `git-cliff`.
- Added repository release workflow rules in `AGENTS.md`.
