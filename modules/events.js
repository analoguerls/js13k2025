/* eslint-disable func-style */

/**
 * A simple event system. Allows you to hook into lifecycle events or create your own.
 * Adapted from the original [kontra.js](https://github.com/straker/kontra/tree/main)
 */

export const callbacks = {};

/**
 * Register a callback for an event to be called whenever the event is emitted. The callback will be passed all arguments used in the `emit` call.
 * @function on
 *
 * @param {String} event - Name of the event.
 * @param {Function} callback - Function that will be called when the event is emitted.
 */
export function on (event, callback) {
    callbacks[event] ||= [];
    callbacks[event].push(callback);
}

/**
 * Call all callback functions for the event. All arguments will be passed to the callback functions.
 * @function emit
 *
 * @param {String} event - Name of the event.
 * @param {...*} args - Comma separated list of arguments passed to all callbacks.
 */
export function emit (event, ...args) {
    (callbacks[event] || []).map((fn) => fn(...args));
}
