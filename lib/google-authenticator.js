'use strict';

const crypto = require('crypto'),
  base32 = require('thirty-two'),
  qr = require('qr-image');

const OTP = 'otpauth://',
  O_TYPES = ['totp','hotp'],
  O_ALGOS = ['SHA1','SHA256','SHA512'],
  O_SSIZE = [8,128],
  DEF_SPEC = Object.freeze({
    counter: 0,
    prefix: true,
    secretSize: 32,
    type: O_TYPES[0],
  });

const E_SSIZE = 
  `spec.secretSize MUST be between ${O_SSIZE[0]} and ${O_SSIZE[1]}`;

/**
 * GoogleAuthenticator helper.
 * 
 * Originally based on the version from passport-2fa-totp, but I rewrote the
 * register() method to be almost entirely different.
 */
module.exports = {
  /**
   * Create a secret key value, an optauth URI, and a qr code image for
   * a new TOTP or HOTP registration.
   * 
   * @param {(object|string)} spec - The specification.
   * If this is a string, it will be used as the `spec.name` parameter.
   * 
   * @param {string} spec.name - The account name for the registration.
   * 
   * You'd usually use the username or some other unique identifier here.
   * This parameter is MANDATORY, an error will be thrown if it is not
   * specified, is not a string, or is an empty string.
   * 
   * @param {(string|boolean)} [spec.prefix=true] Prefix to prepend to
   * the account name (separated by a ':' character).
   * 
   * If this is set to `true` and spec.issuer is a string, then
   * spec.prefix will use the spec.issuer value.
   * 
   * If your spec.name value includes a prefix already, but you still
   * want to set spec.issuer, then set spec.prefix to `false`.
   * 
   * @param {string} [spec.type="totp"] The OTP type being registered.
   * 
   * @param {string} [spec.algorithm] Specify the algorithm to use.
   * 
   * If specified, must be one of: `SHA1`, `SHA256`, or `SHA512`.
   * 
   * **NOTE:** This parameter is currently ignored by all existing
   * Google Authenticator implementations, so this is mostly only
   * useful if you are using another authenticator that also uses the
   * Key Uri Format specification.
   * 
   * @param {number} [spec.digits] Number of digits for OTP codes.
   * 
   * According to the official spec this may only be set to
   * either `6` or `8`. This function does not enforce that in
   * case third-party authenticators have a more extended range.
   * 
   * **NOTE:** This parameter is currently ignored by multiple
   * implementations of the Google Authenticator, including the
   * Android implementation (arguably the most used version).
   * 
   * @param {number} [spec.period] The validity time period for `totp`
   * codes. Not applicable to any other type.
   * 
   * **NOTE:** This parameter is currently ignored by all existing
   * Google Authenticator implementations (which just use a fixed
   * value of `30` seconds). Why does Google have so many options in
   * their specification that they never actually implemented in their
   * apps they wrote the specifications for?
   * 
   * @param {number} [spec.counter=0] The initial counter value used
   * for `hotp` registrations. Not applicable to any other type.
   * 
   * @returns {GoogleAuthRegistration}
   */
  register: function (spec) {
    if (typeof spec === 'string') {
      spec = {name: spec};
    }

    spec = Object.assign({}, DEF_SPEC, spec);
    if (typeof spec.name !== 'string') {
      throw new TypeError("spec.name is mandatory and MUST be a string");
    }

    let name = spec.name.trim();
    if (name === '') {
      throw new RangeError("spec.name MUST NOT be empty");
    }

    let size = spec.secretSize;
    if (typeof size !== 'number') {
      throw new TypeError("spec.secretSize MUST only be a number if specified");
    }
    if (size < O_SSIZE[0] || size > O_SSIZE[1]) {
      throw new RangeError(E_SSIZE);
    }

    if (!O_TYPES.includes(spec.type)) {
      throw new RangeError("spec.type MUST be one of: ".O_TYPES.join(' or '));
    }

    if (typeof spec.issuer === 'string' && spec.prefix === true) {
      spec.prefix = spec.issuer;
    }
    else if (typeof spec.prefix === 'string' && spec.issuer === true) {
      spec.issuer = spec.prefix;
    }

    if (typeof spec.prefix === 'string') {
      name = (spec.prefix.trim()+':'+name);
    }

    let secret;
    if (typeof spec.secret === 'string') {
      secret = spec.secret;
    }
    else {
      secret = base32.encode(crypto.randomBytes(size))
        .toString()
        .replace(/=/g, '');
    }

    let authUrl = `${OTP+spec.type}/${name}?secret=${secret}`;

    if (typeof spec.issuer === 'string') {
      authUrl += '&issuer=' + spec.issuer.trim();
    }

    if (typeof spec.algorithm === 'string') {
      if (O_ALGOS.includes(spec.algorithm)) {
        authUrl += '&algorithm=' + spec.algorithm;
      } else {
        console.error('Ignoring invalid spec.algorithm', spec, 
          {validAlgorithms: O_ALGOS});
      }
    }

    if (typeof spec.digits === 'number') {
      authUrl += '&digits=' + spec.digits;
    }

    if (spec.type === O_TYPES[1]) { // hotp has an extra mandatory parameter
      if (typeof spec.counter === 'number') {
        authUrl += '&counter=' + spec.counter;
      } else {
        throw new TypeError("spec.counter is mandatory for HOTP");
      }
    }
    else if (typeof spec.period === 'number') {
      authUrl += '&period=' + spec.period;
    }

    let qrCode = qr.imageSync(authUrl, { type: 'svg' });

    return {
      secret: secret,
      qr: qrCode,
      uri: authUrl,
      spec,
    };
  },

  decodeSecret: function (secret) {
    return base32.decode(secret);
  }
}

/**
 * @typedef {object} GoogleAuthRegistration
 * 
 * @prop {string} secret - The secret key generated for this user.
 * Store this value safely in your database for use in OTP code
 * validation during your app's login process.
 * 
 * @prop {string} qr - The QR code image in SVG format.
 * 
 * @prop {string} uri - The `optauth:` URI represented by the QR code.
 * 
 */
