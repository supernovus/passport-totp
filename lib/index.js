/**
 * Module dependencies.
 */
const Strategy = require('./strategy'),
      GoogleAuthenticator = require('./google-authenticator');

/**
 * Expose constructors.
 */
module.exports = {Strategy, GoogleAuthenticator}

/**
 * Module version.
 */
require('pkginfo')(module, 'version');
