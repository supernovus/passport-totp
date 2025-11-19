'use strict';

const passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , TOTP = require('../../../lib')
  , TotpStrategy = TOTP.Strategy
  , { GoogleAuthenticator } = TOTP
  , db = require('./database')
  ;

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.
passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  db.users.get(id, done);
});

// Use the LocalStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a username and password), and invoke a callback
//   with a user object.  In the real world, this would query a database;
//   however, in this example we are using a baked-in set of users.
passport.use(new LocalStrategy(function (username, password, done) {
  process.nextTick(function () {
    // Find the user by username.  If there is no user with the given
    // username, or the password is not correct, set the user to `false` to
    // indicate failure and set a flash message.  Otherwise, return the
    // authenticated `user`.
    db.users.findOne({ username }, function (err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false, { message: 'Invalid username or password' }); }
      if (user.password != password) { return done(null, false, { message: 'Invalid username or password' }); }
      return done(null, user);
    })
  });
}));

passport.use(new TotpStrategy(
  function (rep, opts, done) {
    // setup function, supply key and period to done callback
    db.keys.get(rep.user.id, function (err, obj) {
      if (err) { return done(err); }
      let secret = GoogleAuthenticator.decodeSecret(obj.key);
      return done(null, secret, obj.period);
    });
  }
));

module.exports = { passport, GoogleAuthenticator, TOTP };
