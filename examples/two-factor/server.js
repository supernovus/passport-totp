'use strict';

const express = require('express')
  , ejsLayouts = require('express-ejs-layouts')
  , bodyParser = require('body-parser')
  , session = require('express-session')
  , flash = require('connect-flash')
  , { passport } = require('./lib/passport')
  , routes = require('./lib/routes')
  ;

const app = express();

// Setup the view engine and default middleware.
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(ejsLayouts);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(session({
  secret: 'keyboard cat',
  name: 'SessionID',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
  },
}));
app.use(flash());

// Initialize Passport and enable its session middleware.
app.use(passport.initialize());
app.use(passport.session());

// Add the routes.
app.use('/', routes);

// Now listen!
app.listen(3000, function () {
  console.log('Express server listening on port 3000');
});
