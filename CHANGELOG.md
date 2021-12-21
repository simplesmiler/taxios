# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.2.9
### Added
- `--sort-fields` option.

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
