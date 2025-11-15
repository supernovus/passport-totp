/**
 * A fake database specifically for this example app.
 */
'use strict';

const {filterData} = require('@lumjs/finder');

const users = [
    { id: 1, username: 'bob', password: 'secret', email: 'bob@example.com' }
  , { id: 2, username: 'joe', password: 'birthday', email: 'joe@example.com' }
];

const keys = {}

function getNextUserId() {
  let curIds = users.map(user => user.id);
  let id = 1;
  while (true) {
    if (curIds.includes(id)) {
      id++;
    } else {
      return id;
    }
  }
}

function findUsers(query, options={}) {
  return filterData(users, query, options);
}

function findUser(query, opts) {
  let options = Object.assign({single: true}, opts);
  if (typeof opts === 'function') { // A special shortcut
    options.done = opts;
  }
  return findUsers(query, options);
}

function getUserById(id, done) {
  return findUser({id}, {
    validate(user) {
      if (!user) {
        return new Error(`User id '${id}' does not exist`);
      }
    },
    done,
  });
}

function findKeyForUserId(id, fn) {
  return fn(null, keys[id]);
}

function saveKeyForUserId(id, key, fn) {
  keys[id] = key;
  return fn(null);
}

module.exports = {
  users: {
    _table: users, 
    find: findUsers,
    findOne: findUser,
    get: getUserById,
  },

  keys: {
    _table: keys, 
    get: findKeyForUserId, 
    put: saveKeyForUserId,
  },
}
