<a href="http://promises-aplus.github.com/promises-spec">
	<img src="http://promises-aplus.github.com/promises-spec/assets/logo-small.png" align="right" alt="Promises/A+ logo" />
</a>

# Promessa
A Node.js Promises library which complies with the [Promises/A+ specification](http://promises-aplus.github.com/promises-spec). Written with a focus towards readability over high performance and used as a learning exercise to better understand how Promises function and evaluate themselves internally.

[![NPM](https://nodei.co/npm/promessa.png?downloads=true)](https://nodei.co/npm/promessa/)

- [Usage](#usage)
- [Methods](#methods)
- [Tests](#tests)
- [Reference](#reference)

## Usage
```js
let Promessa = require('promessa');

let myPromise = new Promessa((resolve,reject) => {

	// implement here
});
```

## Methods
Promessa implements the following constructor and prototype:
- `new Promessa(function(resolve,reject) { ... })`
- `Promessa.prototype.then(onFulfilled,onRejected)`
- `Promise.prototype.catch(onRejected)`

In addition, the following utility methods are available:
- `Promessa.resolve(value)`
- `Promessa.reject(reason)`
- `Promessa.all(promiseList)` (with `promiseList` as an `Array`)
- `Promessa.race(promiseList)` (with `promiseList` as an `Array`)

For use of these methods, I won't repeat what is already available via the excellent [MDN Promise documentation](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise).

## Tests
Library passes the [`promises-aplus-tests`](https://www.npmjs.com/package/promises-aplus-tests) suite to meet the Promises/A+ specification. In addition a basic test suite for `Promessa.all(promiseList)` and `Promessa.race(promiseList)` methods is included.

All tests are run via [`test/run.sh`](test/run.sh).

## Reference
Promise implementations/documentation referred to during development:
- https://github.com/then/promise
- https://github.com/abdulapopoola/Adehun
- https://www.promisejs.org/patterns/
