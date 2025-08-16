/* global document */
/* eslint-disable func-style, init-declarations */
import {emit} from 'events.js';

/**
 * Functions for initializing the library and getting the canvas and context objects.
 * Adapted from the original [kontra.js](https://github.com/straker/kontra/tree/main)
 */

let
    canvasEl,
    context;

/**
 * Return the canvas element.
 * @function getCanvas
 *
 * @returns {HTMLCanvasElement} The canvas element for the game.
 */
export function getCanvas () {
    return canvasEl;
}

/**
 * Return the context object.
 * @function getContext
 *
 * @returns {CanvasRenderingContext2D} The context object the game draws to.
 */
export function getContext () {
    return context;
}

/**
 * @function init
 *
 * @param {String|HTMLCanvasElement} [canvas] - The canvas for Kontra to use. Can either be the ID of the canvas element or the canvas element itself. Defaults to using the first canvas element on the page.
 * @param {Object} [options] - Game options.
 * @param {Boolean} [options.contextless=false] - If the game will run in an contextless environment. A contextless environment uses a [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) for the `canvas` and `context` so all property and function calls will noop.
 *
 * @returns {{canvas: HTMLCanvasElement, context: CanvasRenderingContext2D}} An object with properties `canvas` and `context`. `canvas` it the canvas element for the game and `context` is the context object the game draws to.
 */
export function init (canvas) {
    // Check if canvas is a string, an element, or default to getting first canvas on page
    canvasEl =
        document.getElementById(canvas) ||
        canvas ||
        document.querySelector('canvas');

    context = canvasEl.getContext('2d');
    context.imageSmoothingEnabled = false;

    emit('init');

    return {
        canvas: canvasEl,
        context
    };
}
