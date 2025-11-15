'use strict';

const express = require('express')
  , ejsLayouts = require('express-ejs-layouts')
  , bodyParser = require('body-parser')
  , session = require('express-session')
  , flash = require('connect-flash')
  , loggedin = require('connect-ensure-login')
  , base32 = require('thirty-two')
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , TOTP = require('../..')
  , TotpStrategy = TOTP.Strategy
  , {GoogleAuthenticator} = TOTP
  , db = require('./lib/database')
  ;

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  db.users.get(id, done);
});

// Use the LocalStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a username and password), and invoke a callback
//   with a user object.  In the real world, this would query a database;
//   however, in this example we are using a baked-in set of users.
passport.use(new LocalStrategy(function(username, password, done) {
    process.nextTick(function () {
      // Find the user by username.  If there is no user with the given
      // username, or the password is not correct, set the user to `false` to
      // indicate failure and set a flash message.  Otherwise, return the
      // authenticated `user`.
      db.users.findOne({username}, function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false, { message: 'Invalid username or password' }); }
        if (user.password != password) { return done(null, false, { message: 'Invalid username or password' }); }
        return done(null, user);
      })
    });
  }));

passport.use(new TotpStrategy(
  function(rep, opts, done) {
    // setup function, supply key and period to done callback
    db.keys.get(rep.user.id, function(err, obj) {
      if (err) { return done(err); }
      let secret = GoogleAuthenticator.decodeSecret(obj.key);
      return done(null, secret, obj.period);
    });
  }
));

const app = express();

// configure Express
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
//app.engine('ejs', require('ejs'));
app.use(ejsLayouts);
//app.set('layout', 'layout.ejs')

//app.use(express.logger());
//app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.session({ secret: 'keyboard cat' }));
app.use(flash());
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);


app.get('/', function(req, res){
  res.render('index', { user: req.user });
});

// To view account details, user must be authenticated using two factors
app.get('/account', loggedin.ensureLoggedIn(), ensureSecondFactor, function(req, res){
  res.render('account', { user: req.user });
});

app.get('/setup', loggedin.ensureLoggedIn(), function(req, res, next){
  db.keys.get(req.user.id, function(err, obj) {
    if (err) { return next(err); }

    let keyData;
    let commit = () => res.render('setup', { 
      user: req.user, 
      key: keyData.secret, 
      qrImage: keyData.qr,
    });

    if (obj) {
      // two-factor auth has already been setup
      keyData = GoogleAuthenticator.register({
        name: req.user.email,
        secret: obj.key,
        period: obj.period,
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
      }, function(err) {
        if (err) { return next(err); }
        commit();
      });
    }
  });
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user, message: req.flash('error') });
});

// POST /login
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
//
//   curl -v -d "username=bob&password=secret" http://127.0.0.1:3000/login
app.post('/login', 
  passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/login-otp', loggedin.ensureLoggedIn(),
  function(req, res, next) {
    // If user hasn't set up two-factor auth, redirect
    findKeyForUserId(req.user.id, function(err, obj) {
      if (err) { return next(err); }
      if (!obj) { return res.redirect('/setup'); }
      return next();
    });
  },
  function(req, res) {
    res.render('login-otp', { user: req.user, message: req.flash('error') });
  });

app.post('/login-otp', 
  passport.authenticate('totp', { failureRedirect: '/login-otp', failureFlash: true }),
  function(req, res) {
    req.session.secondFactor = 'totp';
    res.redirect('/');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.listen(3000, function() {
  console.log('Express server listening on port 3000');
});


function ensureSecondFactor(req, res, next) {
  if (req.session.secondFactor == 'totp') { return next(); }
  res.redirect('/login-otp')
}
