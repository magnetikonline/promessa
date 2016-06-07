'use strict';

let assert = require('assert'),
	testSuite = require('promises-aplus-tests'),
	Promessa = require('../index.js');


function createTestAdapter() {

	// return test adapter/harness as expected by [promises-aplus-tests]
	return {
		resolved: (value) => {

			return Promessa.resolve(value);
		},
		rejected: (reason) => {

			return Promessa.reject(reason);
		},
		deferred: () => {

			let funcResolve,
				funcReject;

			return {
				promise: new Promessa((resolve,reject) => {

					// hold reference to resolve/reject handlers
					funcResolve = resolve;
					funcReject = reject;
				}),
				resolve: funcResolve,
				reject: funcReject
			};
		}
	};
}

function runExtensionsTestSuite() {

	// note: all assert method calls are made on process.nextTick() to avoid .then()/.catch() catching assert throws
	function createDelayedPromise(delay,value,isResolve) {

		return new Promessa((resolve,reject) => {

			if (isResolve) {
				// resolve promise after timeout passes
				setTimeout(resolve.bind(null,value),delay);
				return;
			}

			// reject promise
			setTimeout(reject.bind(null,value),delay);
		});
	}

	// testing: Promessa.all()
	{
		let PROMISE_REJECT_VALUE = 'In error',
			instance,
			promiseList;

		// test: ensure Promessa.all() returns a promise instance
		instance = Promessa.all([]);

		assert(
			instance.constructor === Promessa,
			'Promessa.all() should return a Promise'
		);


		// test: ensure Promessa.all() passed invalid promise list throws error
		assert.throws(
			() => {

				Promessa.all(undefined);
			},
			TypeError,
			'Calling Promessa.all() without passing an array should throw an error'
		);


		// test: check Promessa.all() chain of all resolved promises returns expected value list
		promiseList = [
			createDelayedPromise(20,'First',true),
			createDelayedPromise(200,'Second',true),
			createDelayedPromise(40,'Third',true)
		];

		instance = Promessa.all(promiseList);

		instance
			.then((valueList) => {

				process.nextTick(assert.deepEqual.bind(
					null,
					valueList,
					['First','Second','Third'],
					'Expected Promessa.all() value list different to actual'
				));
			})
			.catch((reason) => {

				process.nextTick(() => {

					throw new Error('Execution should not end in Promise.catch() block');
				});
			});


		// test: check Promessa.all() chain of promises with a rejection returns error
		promiseList = [
			createDelayedPromise(20,'First',true),
			createDelayedPromise(40,'Second',true),
			createDelayedPromise(60,PROMISE_REJECT_VALUE,false) // promise rejection
		];

		instance = Promessa.all(promiseList);

		instance
			.then(() => {

				process.nextTick(() => {

					throw new Error('Execution should not end in Promise.then() block');
				});
			})
			.catch((reason) => {

				process.nextTick(assert.bind(
					null,
					reason == PROMISE_REJECT_VALUE,
					'Expected execution to end with an error value of [' + PROMISE_REJECT_VALUE + ']'
				));
			});
	}


	// testing: Promessa.race()
	{
		let PROMISE_RESOLVE_VALUE = 'Promise resolved',
			PROMISE_REJECT_VALUE = 'In error',
			instance;

		// test: ensure Promessa.race() returns a promise instance
		instance = Promessa.race([]);

		assert(
			instance.constructor === Promessa,
			'Promessa.race() should return a Promise'
		);


		// test: ensure Promessa.race() passed invalid promise list throws error
		assert.throws(
			() => {

				Promessa.race(undefined);
			},
			TypeError,
			'Calling Promessa.race() without passing an array should throw an error'
		);

		function testResolved(promiseList) {

			let instance = Promessa.race(promiseList);

			instance
				.then((value) => {

					process.nextTick(assert.bind(
						null,
						value == PROMISE_RESOLVE_VALUE,
						'Expected Promessa.race() to finish with a value of [' + PROMISE_RESOLVE_VALUE + ']'
					));
				})
				.catch((reason) => {

					process.nextTick(() => {

						throw new Error('Execution should not end in Promise.catch() block');
					});
				});
		}


		// test: check Promessa.race() chain of resolved promises returns value of first finalized
		testResolved([
			createDelayedPromise(50,'Slowest',true),
			createDelayedPromise(10,PROMISE_RESOLVE_VALUE,true),
			createDelayedPromise(20,'Slow',true)
		]);


		// test: check Promessa.race() chain of resolved promises with a slow rejection still returns value of first finalized
		testResolved([
			createDelayedPromise(50,'Slowest',false), // slowest promise rejected
			createDelayedPromise(10,PROMISE_RESOLVE_VALUE,true),
			createDelayedPromise(20,'Slow',true)
		]);


		// test: check Promessa.race() chain of resolved promises with a single non-promise value resolves first
		testResolved([
			PROMISE_RESOLVE_VALUE, // not a promise - just a value which will be Promessa.resolve() wrapped inside Promessa.race()
			createDelayedPromise(50,'Slowest',true),
			createDelayedPromise(20,'Slow',true)
		]);

		function testRejected(promiseList) {

			let instance = Promessa.race(promiseList);

			instance
				.then((value) => {

					process.nextTick(() => {

						throw new Error('Execution should not end in Promise.then() block');
					});
				})
				.catch((reason) => {

					process.nextTick(assert.bind(
						null,
						reason == PROMISE_REJECT_VALUE,
						'Expected Promessa.race() to finish with a value of [' + PROMISE_REJECT_VALUE + ']'
					));
				});
		}


		// test: check Promessa.race() chain of promises with early rejection ends first
		testRejected([
			createDelayedPromise(10,PROMISE_REJECT_VALUE,false), // fastest promise is a rejection
			createDelayedPromise(20,'Slow',true),
			createDelayedPromise(30,'Slowest',true)
		]);
	}
}


// start tests
testSuite(createTestAdapter(),(err) => {

	if (err !== null) {
		// errors with core test suite, not able to continue
		console.log('Core Promessa tests have failed - halting');
		return;
	}

	// execute test suite for extensions
	console.log();
	console.log('Commencing Promessa extensions test suite');
	runExtensionsTestSuite();
});
