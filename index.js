'use strict';

let STATE_PENDING = 0,
	STATE_RESOLVED = 1,
	STATE_REJECTED = 2;


module.exports = Promessa;

function Promessa(handler) {

	// setup initial promise state
	this.state = STATE_PENDING;
	this.value = undefined;

	this.deferredIsQueued = false;
	this.deferredList = [];

	this.onResolved = null;
	this.onRejected = null;

	if (isFunction(handler)) {
		// commence promise resolution
		runHandler(this,handler);
	}
}

Promessa.prototype.then = function(onResolved,onRejected) {

	// create new promise and set resolve/reject handlers
	let promise = new Promessa();
	promise.onResolved = (isFunction(onResolved)) ? onResolved : null;
	promise.onRejected = (isFunction(onRejected)) ? onRejected : null;

	// add to promise deferred list and process all deferred
	this.deferredList.push(promise);
	queueDeferred(this);

	// return chained promise
	return promise;
};

Promessa.prototype.catch = function(onRejected) {

	return this.then(null,onRejected);
};

Promessa.resolve = function(value) {

	return new Promessa((resolve) => {

		resolve(value);
	});
};

Promessa.reject = function(reason) {

	// injecting rejected promise state manually, avoid calls to finalize()/queueDeferred() when not required
	let promise = new Promessa();
	promise.state = STATE_REJECTED;
	promise.value = reason;

	return promise;
};

Promessa.all = function(promiseList) {

	// is promiseList an array?
	if (!Array.isArray(promiseList)) {
		throw new TypeError('Method expects an array of promises')
	}

	let valueList = [],
		processor = Promessa.resolve();

	// add each promise (or promise like) item to processor chain
	promiseList.forEach((promiseItem) => {
		processor = processor.then(() => {

			// await on promise to finalize
			return promiseItem;
		}).then((value) => {

			// add finalized value to list
			valueList.push(value);
		});
	});

	return processor.then(() => {

		// return list of finalized promise values
		return valueList;
	});
};

Promessa.race = function(promiseList) {

	// is promiseList an array?
	if (!Array.isArray(promiseList)) {
		throw new TypeError('Method expects an array of promises')
	}

	return new Promessa((resolve,reject) => {

		promiseList.forEach((promiseItem) => {

			// resolve each promise (or promise like) item and in turn resolve()/reject() our race promise
			// by design the 'race' promise can only resolve/reject once, so first promise item to finalize wins
			promiseItem = (isPromise(promiseItem))
				? promiseItem // already a promise
				: Promessa.resolve(promiseItem); // convert non-promise

			promiseItem.then(resolve,reject);
		});
	});
};

function isFunction(value) {

	return (typeof value == 'function');
}

function isPromise(value) {

	return (Promessa === value.constructor);
}

function finalize(promise,state,value) {

	if (
		(promise.state != STATE_PENDING) ||
		(state == STATE_PENDING)
	) {
		// unable to finalize a promise in non-pending state
		return;
	}

	// set final promise state/value and run deferred promises
	promise.state = state;
	promise.value = value;
	queueDeferred(promise);
}

function queueDeferred(promise) {

	if (
		(promise.state == STATE_PENDING) ||
		(promise.deferredList.length < 1) ||
		(promise.deferredIsQueued)
	) {
		// promise isn't finalized yet, or deferred promises are already been queued to run
		return;
	}

	promise.deferredIsQueued = true;
	process.nextTick(() => {

		promise.deferredIsQueued = false;
		while (promise.deferredList.length > 0) {
			// shift deferred promise off stack and determine appropriate handler to call
			let deferredPromise = promise.deferredList.shift(),
				deferredHandler = (promise.state == STATE_RESOLVED)
					? deferredPromise.onResolved
					: deferredPromise.onRejected;

			if (!deferredHandler) {
				// no handler defined for deferred promise
				// directly set deferred promise with parent finalized state/value
				finalize(deferredPromise,promise.state,promise.value);
				continue; // jump to next deferred
			}

			// execute deferred promise handler based on parent promise finalized state/value
			let returnValue;

			try {
				returnValue = deferredHandler(promise.value);

			} catch (ex) {
				finalize(deferredPromise,STATE_REJECTED,ex);
				continue; // jump next deferred
			}

			// resolve returned handler value
			resolve(deferredPromise,returnValue);
		}
	});
}

function runHandler(promise,handler) {

	// ensures one of resolve()/reject() is called only once by given handler function
	let called;

	try {
		handler(
			// resolve callback
			(value) => {

				if (called) {
					// already called
					return;
				}

				called = true;
				resolve(promise,value);
			},
			// reject callback
			(reason) => {

				if (called) {
					// already called
					return;
				}

				called = true;
				finalize(promise,STATE_REJECTED,reason);
			}
		);

	} catch (ex) {
		if (called) {
			// already called
			return;
		}

		// reject
		called = true;
		finalize(promise,STATE_REJECTED,ex);
	}
}

function resolve(promise,value) {

	if (promise === value) {
		// you can't resolve a promise with itself - would result in a recursive resolution loop
		return finalize(
			promise,STATE_REJECTED,
			new TypeError('Unable to resolve promise with itself')
		);
	}

	if (value) {
		if (isPromise(value)) {
			// resolved value is itself another promise
			let childPromise = value;

			if (childPromise.state == STATE_PENDING) {
				// promise not finalized - await
				return childPromise.then(
					(value) => { resolve(promise,value); },
					(reason) => { finalize(promise,STATE_REJECTED,reason); }
				);
			}

			// promise already finalized
			return finalize(promise,childPromise.state,childPromise.value);
		}

		if ((typeof value == 'object') || isFunction(value)) {
			// attempt to action .then() function on the given object/function
			let thenHandler;

			try {
				thenHandler = value.then;

			} catch (ex) {
				// exception thrown calling [value.then()] - reject promise as final state
				return finalize(promise,STATE_REJECTED,ex);
			}

			if (isFunction(thenHandler)) {
				// callable then() function available - call against promise
				return runHandler(
					promise,
					thenHandler.bind(value)
				);
			}
		}
	}

	// finalize promise with simple value (not a promise/thenable)
	finalize(promise,STATE_RESOLVED,value);
}
