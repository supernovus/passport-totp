'use strict';

const passport = require('passport-strategy'), 
  totp = require('notp').totp,
  util = require('util'),
  {lookup} = require('./utils'),
  cp = Object.assign;

const DEFAULT_OPTIONS = Object.freeze({
  codeField: 'code',
  defaultPeriod: 30,
  window: 6,
});

/**
 * @callback DoneCallback
 * @param {?Error} err - Error if applicable, null if not.
 * @param {string} key - The secret key value for the user.
 * @param {number} [period] The period used for TOTP generation.
 * If not specified, the `defaultPeriod` strategy option will be used.
 */

/**
 * @callback SetupCallback
 * @param {object} req - The Passport request object.
 * 
 * As this strategy is meant to be called as part of a multifactor
 * authentication process, it is expected that the _primary_ strategy
 * has already been called and there should be a `req.user` object
 * that we can use to look up a secret key value to validate with.
 * 
 * @param {DoneCallback} done - The callback that will actually check
 * the submitted request value using the `notp.totp` library.
 */

/**
 * TOTP `Strategy` constructor.
 *
 * The TOTP authentication strategy authenticates requests based on the
 * TOTP value submitted through an HTML-based form.
 *
 * @param {object} [options] Options (may be omitted entirely to use defaults).
 * @param {string} [options.codeField='code'] Form field in the request that
 * contains the HOTP code value. Default: `code`
 * @param {number} [options.defaultPeriod=30] The default TOTP period to use
 * when generating and/or validating HOTP codes. This must always be the
 * same for any given user in order for the codes to work. Default: `30`
 * @param {number} [options.window=6] Time step delay window used when
 * validating HOTP codes. Default: `6`
 * @param {SetupCallback} setup - Mandatory setup callback function.
 * 
 * This is used to find the secret key, generally via the `req.user` property,
 * which should have been populated by a separate _primary_ Passport strategy,
 * such as `passport-local` or `passport-fido2-webauthn`.
 * 
 * Once it has a secret key (and optionally a `period` if they are allowed
 * to be set on a per-user basis), it can pass those to the _done function_.
 * 
 * @api public
 */
function Strategy(options, setup) {
  if (typeof options == 'function') {
    let oset = setup;
    setup = options;
    options = (oset && typeof oset === 'object') ? oset : {};
  }

  if (typeof setup !== 'function') {
    throw new TypeError("Invalid setup function");
  }
  
  passport.Strategy.call(this);

  this._options = cp({}, DEFAULT_OPTIONS, options);
  this._setup = setup;
  this.name = 'totp';
}

/**
 * Inherit from `passport.Strategy`.
 */
util.inherits(Strategy, passport.Strategy);

/**
 * Authenticate request based on TOTP values.
 *
 * @param {object} req - Passport request object.
 * @param {object} [options] Options for this specific request.
 * Any of the options from the constructor may be overridden here.
 * @api protected
 */
Strategy.prototype.authenticate = function(req, options) {
  let self = this;
  let {codeField,defaultPeriod,window} = cp({}, this._options, options);
  let value = lookup(req.body, codeField) || lookup(req.query, codeField);
  
  this._setup(req, options, function(err, key, period=defaultPeriod) {
    if (err) { return self.error(err); }
    
    var rv = totp.verify(value, key, { window, time: period });
    if (!rv) { return self.fail(); }
    return self.success(req.user);
  });
}


/**
 * Expose `Strategy`.
 */ 
module.exports = Strategy;
