# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-11-18
The first release of the `passport-totp-auth` package since it was forked.
### Added
- Imported `google-authenticator.js` from the [passport-2fa-totp] package.
### Changed
- Split the `lookup` function into a separate `utils.js` file.
- Added a few more options to the Strategy constructor.
  The options are now merged with a set of defaults and saved into
  an instance property so they can be more easily referenced.
- Made the options passed to `authenticate()` actually do something.
- Changed the argument signature for the _setup_ callback function.
  - Old: `(user, done)` -- user parameter was the `req.user` value.
  - New: `(req, options, done)` -- options is a new object that merges
    the options passed to the Strategy constructor with the options passed
    to the authenticate() method.
- Rewrote the `GoogleAuthenticator.register()` function almost entirely.
  The new version supports almost every option of the Key Uri Format.
  Even the ones that Google themselves apparently never bothered to use.
- Refactored the entire Example app.
  - Updated it from Express v3 to Express v5.
  - Split most of server.js into several smaller files.
  - Updated it to use the GoogleAuthenticator library.
  - Updated it to use express-ejs-layouts.
  - Updated the `setup.ejs` template to use the SVG format QR code,
    including some CSS rules to make it a reasonable size.

## [0.0.2] - 2015-08-27
### Note
- This was the last release from the original [passport-totp] project,
  and the state it was in when I forked it.

[Unreleased]: https://github.com/supernovus/passport-totp/compare/v.1.0...HEAD
[0.1.0]: https://github.com/supernovus/passport-totp/compare/v.0.2...v0.1.0
[0.0.2]: https://github.com/supernovus/passport-totp/releases/tag/v0.2.0

[passport-totp]: https://github.com/jaredhanson/passport-totp/
[passport-2fa-totp]: https://github.com/ilich/passport-2fa-totp/
