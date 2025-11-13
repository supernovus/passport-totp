/**
 * Bits I cut out of the original package.json as the packages listed are seriously
 * outdated and have dependencies with several "critical" security flaws.
 */
package = {
  "devDependencies": {
    "mocha": "1.x.x", // This is up to version 11.x!
    "chai": "1.x.x"   // This is up to 6.x!
  },
  "scripts": {
    "test": "NODE_PATH=./lib node_modules/.bin/mocha --reporter spec --require test/bootstrap/node test/*.test.js"
  }
}
