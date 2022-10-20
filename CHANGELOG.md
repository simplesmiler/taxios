# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.2.13
### Fixed
- Path params with snake case now interpolate properly.

## 0.2.12
### Changed
- Relaxed axios peer dep to cover all future 0.x versions (closes #12, thanks to @crutch12).
- Prepared for axios returning unknown
  (see [axios#4141](https://github.com/axios/axios/issues/4141)
  and [axios#3002](https://github.com/axios/axios/pull/3002))

## 0.2.11
### Added
- `src` is now shipped to simplify debugging.

## 0.2.10
### Added
- `--sort-fields` option.

## 0.2.8
### Fixed
- JSON is now preferred over FormData when both request bodies are allowed.
- `taxios-generate` no longer panics on unknown request media types.
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
