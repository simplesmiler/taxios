# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased
### Breaking
- TypeScript 4.3 is now required.
- `--skip-additional-properties` is the new default. Use `--keep-additional-properties` for old behaviour.
- `--named-enums` is the new default. Use `--union-enums` for old behaviour.

## 0.2.8
### Fixed
- JSON is now preferred over FormData when both request bodies are allowed.
- `taxios-generate` no longer panics on unknown response media types.
### Security
- Axios bumped to `^0.21.0`.
- Lerna bumped to  `^4.0.0`.


## 0.2.7
### Added
- Configurable query string serialization.

## 0.2.6
### Fixed
- Models names are not longer forcibly converted to PascalCase.

## 0.2.5
### Added
- `--skip-additional-properties` option.

## 0.2.4
### Added
- `--named-enums` option.
