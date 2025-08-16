/* global requestAnimationFrame, cancelAnimationFrame, performance, window */
/* eslint-disable func-style, init-declarations */
import {emit, on} from 'events.js';
import {getContext} from 'core.js';

/**
 * The game loop updates and renders the game every frame. The game loop is stopped by default and will not start
 * until the loops `start()` function is called. The game loop uses a time-based animation with a fixed `dt` to
 * [avoid frame rate issues](http://blog.sklambert.com/using-time-based-animation-implement/). Each update call is
 * guaranteed to equal 1/60 of a second.
 *
 * This means that you can avoid having to do time based calculations in your update functions and instead do fixed updates.
 *
 * Adapted from the original [kontra.js](https://github.com/straker/kontra/tree/main)
 */

const noop = () => {
    // Do nothing
};

// Clear the canvas context
function clear (context) {
    const canvas = context.canvas;

    context.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * @class GameLoop
 *
 * @param {Object} properties - Properties of the game loop.
 * @param {(dt: Number) => void} [properties.update] - Function called every frame to update the game. Is passed the fixed `dt` as a parameter.
 * @param {Function} properties.render - Function called every frame to render the game.
 * @param {Number}   [properties.fps=60] - Desired frame rate.
 * @param {Boolean}  [properties.clearCanvas=true] - Clear the canvas every frame before the `render()` function is called.
 * @param {CanvasRenderingContext2D} [properties.context] - The context that should be cleared each frame if `clearContext` is not set to `false`. Defaults to [core.getContext()](api/core#getContext).
 * @param {Boolean} [properties.blur=false] - If the loop should still update and render if the page does not have focus.
 */
export default function GameLoop ({
    fps = 60,
    clearCanvas = true,
    update = noop,
    render,
    context = getContext(),
    blur = false
} = {}) {
    const
        clearFn = clearCanvas ? clear : noop,
        // Delta between performance.now timings (in ms)
        delta = 1e3 / fps,
        step = 1 / fps;
    let
        accumulator = 0,
        dt,
        focused = true,
        last,
        // eslint-disable-next-line prefer-const
        loop,
        now,
        rAF;

    if (!blur) {
        window.addEventListener('focus', () => {
            focused = true;
        });
        window.addEventListener('blur', () => {
            focused = false;
        });
    }

    on('init', () => {
        loop.context ??= getContext();
    });

    // Called every frame of the game loop.
    function frame () {
        rAF = requestAnimationFrame(frame);

        // Don't update the frame if tab isn't focused
        if (!focused) {
            return;
        }
        now = performance.now();
        dt = now - last;
        last = now;

        // Prevent updating the game with a very large dt if the game were to lose focus and then regain focus later
        if (dt > 1e3) {
            return;
        }
        accumulator += dt;
        while (accumulator >= delta) {
            emit('tick');
            loop.update(step);

            accumulator -= delta;
        }
        clearFn(loop.context);
        loop.render();
    }

    // Game loop object
    loop = {

        /**
         * The context the game loop will clear. Defaults to [core.getContext()](api/core#getCcontext).
         * @memberof GameLoop
         * @property {CanvasRenderingContext2D} context
         */
        context,

        /**
         * If the game loop is currently stopped.
         * @memberof GameLoop
         * @property {Boolean} isStopped
         */
        isStopped: true,

        /**
         * Called every frame to render the game. Put all of your games render logic here.
         * @memberof GameLoop
         */
        render,

        /**
         * Start the game loop.
         * @memberof GameLoop
         */
        start () {
            if (this.isStopped) {
                last = performance.now();
                this.isStopped = false;
                requestAnimationFrame(frame);
            }
        },

        /**
         * Stop the game loop.
         * @memberof GameLoop
         */
        stop () {
            this.isStopped = true;
            cancelAnimationFrame(rAF);
        },

        /**
         * Called every frame to update the game. Put all of your games update logic here.
         * @memberof GameLoop
         * @param {Number} [dt] - The fixed dt time of 1/60 of a frame.
         */
        update
    };

    return loop;
}
