/*
      Promise can have 3 states:
      - Pending
      - Fulfilled
      - Rejected
    */
const STATES = {
	PENDING: 'pending',
	FULFILLED: 'fulfilled',
	REJECTED: 'rejected',
};

/*Quick utillity function for checking if the value has .then method*/

const isThenable = (maybePromise) =>
	maybePromise && typeof maybePromise.then === 'function';

//Low Level JS Promise
class LLJSPROMISE {
	constructor(computation) {
		this._state = STATES.PENDING;

		this._value = undefined;
		this._reason = undefined;

		this._thenQueue = [];
		this._finallyQueue = [];

		if (typeof computation === 'function') {
			setTimeout(() => {
				try {
					computation(
						//Bind to current Promise
						this._onFulfilled.bind(this),
						this._onRejected.bind(this)
					);
				} catch (ex) {
					this._onRejected(ex);
				}
			});
		}
	}

	then(fulfilledFn, catchFn) {
		const controlledPromise = new LLJSPROMISE();
		this._thenQueue.push([controlledPromise, fulfilledFn, catchFn]);

		if (this._state === STATES.FULFILLED) {
			this._propagateFulfilled();
		} else if (this._state === STATES.REJECTED) {
			this._propagateRejected();
		}

		return controlledPromise;
	}

	catch(catchFn) {
		return this.then(undefined, catchFn);
	}

	finally(sideEffectFn) {
		if (this._state !== STATES.PENDING) {
			sideEffectFn();

			return this._state === STATES.FULFILLED
				? LLJSPROMISE.resolve(this._value)
				: LLJSPROMISE.resolve(this._reason);
		}

		const controlledPromise = new LLJSPROMISE();
		this._finallyQueue.push([controlledPromise, sideEffectFn]);

		return controlledPromise;
	}

	_propagateFulfilled() {
		this._thenQueue.forEach(([controlledPromise, fulfilledFn]) => {
			if (typeof fulfilledFn === 'function') {
				const valueOrPromise = fulfilledFn(this._value);

				//Check if the value is a Promise
				if (isThenable(valueOrPromise)) {
					valueOrPromise.then(
						(value) => controlledPromise._onFulfilled(value),
						(reason) => controlledPromise._onRejected(reason)
					);
				} else {
					controlledPromise._onFulfilled(valueOrPromise);
				}
			} else {
				return controlledPromise._onFulfilled(this._value);
			}
		});

		this._thenQueue = [];
		this._finallyQueue = [];
	}

	_propagateRejected() {
		this._thenQueue.forEach(([controlledPromise, _, catchFn]) => {
			if (typeof catchFn === 'function') {
				const valueOrPromise = catchFn(this._reason);

				if (isThenable(valueOrPromise)) {
					valueOrPromise.then(
						(value) => controlledPromise._onFulfilled(value),
						(reason) => controlledPromise._onRejected(reason)
					);
				} else {
					controlledPromise._onFulfilled(valueOrPromise);
				}
			} else {
				return controlledPromise._onRejected(this._reason);
			}
		});

		this._thenQueue = [];
		this._finallyQueue = [];
	}

	_onFulfilled(value) {
		if (this._state === STATES.PENDING) {
			this._state = STATES.FULFILLED;
			this._value = value;
			this._propagateFulfilled();
		}
	}

	_onRejected(reason) {
		if (this._state === STATES.PENDING) {
			this._state = STATES.REJECTED;
			this.reason = reason;
			this._propagateRejected();
		}
	}
}

// Static methods
LLJSPROMISE.resolve = (value) => new LLJSPROMISE((resolve) => resolve(value));
LLJSPROMISE.reject = (value) => new LLJSPROMISE((_, reject) => reject(value));

const fs = require('fs');
const { resolve } = require('path');
const path = require('path');
const { encode } = require('punycode');

const readFile = (filename, encoding) =>
	new LLJSPROMISE((resolve, reject) => {
		fs.readFile(filename, encoding, (err, value) => {
			if (err) {
				return reject(err);
			}
			resolve(value);
		});
	});

const delay = (timeInMs, value) =>
	new LLJSPROMISE((resolve) => {
		setTimeout(() => {
			resolve(value);
		}, timeInMs);
	});

readFile(path.join(__dirname, 'indexxx.js'), 'utf-8')
	.then((text) => {
		console.log(`${text.length} characters read`);
		return delay(2000, text.replace(/[aieou]/g, ''));
	})
	.then((newText) => console.log(newText.slice(0, 200)))
	.catch((err) => {
		console.error(err);
	})
	.finally(() => {
		console.log('---All done---');
	});
