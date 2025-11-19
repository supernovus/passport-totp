'use strict';

const express = require('express')
  , router = express.Router()
  , { ensureLoggedIn } = require('connect-ensure-login')
  , db = require('./database')
  , { passport, GoogleAuthenticator } = require('./passport')
  ;

function ensureSecondFactor(req, res, next) {
  if (req.session.secondFactor == 'totp') { return next(); }
  res.redirect('/login-otp')
}

router.get('/', function (req, res) {
  res.render('index', { user: req.user });
});

// To view account details, user must be authenticated using two factors
router.get('/account', ensureLoggedIn(), ensureSecondFactor, function (req, res) {
  res.render('account', { user: req.user });
});

router.get('/setup', ensureLoggedIn(), function (req, res, next) {
  db.keys.get(req.user.id, function (err, uk) {
    if (err) { return next(err); }

    let keyData;
    let commit = () => res.render('setup', {
      user: req.user,
      key: keyData,
    });

    if (uk) {
      // two-factor auth has already been setup
      keyData = GoogleAuthenticator.register({
        name: req.user.email,
        secret: uk.key,
        period: uk.period,
      });
      commit();
    } else {
      // new two-factor setup, generate and save a secret key
      keyData = GoogleAuthenticator.register({
        name: req.user.email,
      });

      db.keys.put(req.user.id, {
        key: keyData.secret,
        period: keyData.spec.period,
      }, function (err) {
        if (err) { return next(err); }
        commit();
      });
    }
  });
});

router.get('/login', function (req, res) {
  res.render('login', { user: req.user, message: req.flash('error') });
});

// POST /login
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
//
//   curl -v -d "username=bob&password=secret" http://127.0.0.1:3000/login
router.post('/login',
  passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }),
  function (req, res) {
    res.redirect('/');
  });

router.get('/login-otp', ensureLoggedIn(),
  function (req, res, next) {
    // If user hasn't set up two-factor auth, redirect
    db.keys.get(req.user.id, function (err, obj) {
      if (err) { return next(err); }
      if (!obj) { return res.redirect('/setup'); }
      return next();
    });
  },
  function (req, res) {
    res.render('login-otp', { user: req.user, message: req.flash('error') });
  });

router.post('/login-otp',
  passport.authenticate('totp', { failureRedirect: '/login-otp', failureFlash: true }),
  function (req, res) {
    req.session.secondFactor = 'totp';
    res.redirect('/');
  });

router.get('/logout', function (req, res, next) {
  req.logout(err => {
    if (err) { return next(err) }
    res.redirect('/');
  });
});

module.exports = router;
