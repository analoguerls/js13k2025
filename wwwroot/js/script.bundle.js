(function () {
  'use strict';

  /**
   * @preserve
   * Kontra.js v10.0.2
   */
  /**
   * A group of helpful functions that are commonly used for game development. Includes things such as converting between radians and degrees and getting random integers.
   *
   * ```js
   * import { degToRad } from 'kontra';
   *
   * let radians = degToRad(180);  // => 3.14
   * ```
   * @sectionName Helpers
   */


  /**
   * Rotate a point by an angle.
   * @function rotatePoint
   *
   * @param {{x: Number, y: Number}} point - The {x,y} point to rotate.
   * @param {Number} angle - Angle (in radians) to rotate.
   *
   * @returns {{x: Number, y: Number}} The new x and y coordinates after rotation.
   */
  function rotatePoint(point, angle) {
    let sin = Math.sin(angle);
    let cos = Math.cos(angle);

    return {
      x: point.x * cos - point.y * sin,
      y: point.x * sin + point.y * cos
    };
  }

  /**
   * Clamp a number between two values, preventing it from going below or above the minimum and maximum values.
   * @function clamp
   *
   * @param {Number} min - Min value.
   * @param {Number} max - Max value.
   * @param {Number} value - Value to clamp.
   *
   * @returns {Number} Value clamped between min and max.
   */
  function clamp$1(min, max, value) {
    return Math.min(Math.max(min, value), max);
  }

  /**
   * Return the world rect of an object. The rect is the world position of the top-left corner of the object and its size. Takes into account the objects anchor and scale.
   * @function getWorldRect
   *
   * @param {{x: Number, y: Number, width: Number, height: Number}|{world: {x: Number, y: Number, width: Number, height: Number}}|{mapwidth: Number, mapheight: Number}} obj - Object to get world rect of.
   *
   * @returns {{x: Number, y: Number, width: Number, height: Number}} The world `x`, `y`, `width`, and `height` of the object.
   */
  function getWorldRect(obj) {
    let { x = 0, y = 0, width, height, radius } = obj.world || obj;

    // take into account tileEngine
    if (obj.mapwidth) {
      width = obj.mapwidth;
      height = obj.mapheight;
    }

    // account for circle
    if (radius) {
      width = radius.x * 2;
      height = radius.y * 2;
    }

    // account for anchor
    if (obj.anchor) {
      x -= width * obj.anchor.x;
      y -= height * obj.anchor.y;
    }

    // account for negative scales
    if (width < 0) {
      x += width;
      width *= -1;
    }
    if (height < 0) {
      y += height;
      height *= -1;
    }

    return {
      x,
      y,
      width,
      height
    };
  }

  let noop = () => {};

  /**
   * Remove an item from an array.
   *
   * @param {*[]} array - Array to remove from.
   * @param {*} item - Item to remove.
   *
   * @returns {Boolean|undefined} True if the item was removed.
   */
  function removeFromArray(array, item) {
    let index = array.indexOf(item);
    if (index != -1) {
      array.splice(index, 1);
      return true;
    }
  }

  /**
   * Detection collision between a rectangle and a circle.
   * @see https://yal.cc/rectangle-circle-intersection-test/
   *
   * @param {Object} rect - Rectangular object to check collision against.
   * @param {Object} circle - Circular object to check collision against.
   *
   * @returns {Boolean} True if objects collide.
   */
  function circleRectCollision(circle, rect) {
    let { x, y, width, height } = getWorldRect(rect);

    // account for camera
    do {
      x -= rect.sx || 0;
      y -= rect.sy || 0;
    } while ((rect = rect.parent));

    let dx = circle.x - Math.max(x, Math.min(circle.x, x + width));
    let dy = circle.y - Math.max(y, Math.min(circle.y, y + height));
    return dx * dx + dy * dy < circle.radius * circle.radius;
  }

  /**
   * A simple event system. Allows you to hook into Kontra lifecycle events or create your own, such as for [Plugins](api/plugin).
   *
   * ```js
   * import { on, off, emit } from 'kontra';
   *
   * function callback(a, b, c) {
   *   console.log({a, b, c});
   * });
   *
   * on('myEvent', callback);
   * emit('myEvent', 1, 2, 3);  //=> {a: 1, b: 2, c: 3}
   * off('myEvent', callback);
   * ```
   * @sectionName Events
   */

  // expose for testing
  let callbacks$2 = {};

  /**
   * There are currently only three lifecycle events:
   * - `init` - Emitted after `kontra.init()` is called.
   * - `tick` - Emitted every frame of [GameLoop](api/gameLoop) before the loops `update()` and `render()` functions are called.
   * - `assetLoaded` - Emitted after an asset has fully loaded using the asset loader. The callback function is passed the asset and the url of the asset as parameters.
   * @sectionName Lifecycle Events
   */

  /**
   * Register a callback for an event to be called whenever the event is emitted. The callback will be passed all arguments used in the `emit` call.
   * @function on
   *
   * @param {String} event - Name of the event.
   * @param {Function} callback - Function that will be called when the event is emitted.
   */
  function on$1(event, callback) {
    callbacks$2[event] = callbacks$2[event] || [];
    callbacks$2[event].push(callback);
  }

  /**
   * Call all callback functions for the event. All arguments will be passed to the callback functions.
   * @function emit
   *
   * @param {String} event - Name of the event.
   * @param {...*} args - Comma separated list of arguments passed to all callbacks.
   */
  function emit(event, ...args) {
    (callbacks$2[event] || []).map(fn => fn(...args));
  }

  /**
   * Functions for initializing the Kontra library and getting the canvas and context
   * objects.
   *
   * ```js
   * import { getCanvas, getContext, init } from 'kontra';
   *
   * let { canvas, context } = init();
   *
   * // or can get canvas and context through functions
   * canvas = getCanvas();
   * context = getContext();
   * ```
   * @sectionName Core
   */

  let canvasEl, context;

  // allow contextless environments, such as using ThreeJS as the main
  // canvas, by proxying all canvas context calls
  let handler$1 = {
    // by using noop we can proxy both property and function calls
    // so neither will throw errors
    get(target, key) {
      // export for testing
      if (key == '_proxy') return true;
      return noop;
    }
  };

  /**
   * Return the canvas element.
   * @function getCanvas
   *
   * @returns {HTMLCanvasElement} The canvas element for the game.
   */
  function getCanvas() {
    return canvasEl;
  }

  /**
   * Return the context object.
   * @function getContext
   *
   * @returns {CanvasRenderingContext2D} The context object the game draws to.
   */
  function getContext() {
    return context;
  }

  /**
   * Initialize the library and set up the canvas. Typically you will call `init()` as the first thing and give it the canvas to use. This will allow all Kontra objects to reference the canvas when created.
   *
   * ```js
   * import { init } from 'kontra';
   *
   * let { canvas, context } = init('game');
   * ```
   * @function init
   *
   * @param {String|HTMLCanvasElement} [canvas] - The canvas for Kontra to use. Can either be the ID of the canvas element or the canvas element itself. Defaults to using the first canvas element on the page.
   * @param {Object} [options] - Game options.
   * @param {Boolean} [options.contextless=false] - If the game will run in an contextless environment. A contextless environment uses a [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) for the `canvas` and `context` so all property and function calls will noop.
   *
   * @returns {{canvas: HTMLCanvasElement, context: CanvasRenderingContext2D}} An object with properties `canvas` and `context`. `canvas` it the canvas element for the game and `context` is the context object the game draws to.
   */
  function init$1(canvas, { contextless = false } = {}) {
    // check if canvas is a string first, an element next, or default to
    // getting first canvas on page
    canvasEl =
      document.getElementById(canvas) ||
      canvas ||
      document.querySelector('canvas');

    if (contextless) {
      canvasEl = canvasEl || new Proxy({}, handler$1);
    }


    context = canvasEl.getContext('2d') || new Proxy({}, handler$1);
    context.imageSmoothingEnabled = false;

    emit('init');

    return { canvas: canvasEl, context };
  }

  /**
   * An object for drawing sprite sheet animations.
   *
   * An animation defines the sequence of frames to use from a sprite sheet. It also defines at what speed the animation should run using `frameRate`.
   *
   * Typically you don't create an Animation directly, but rather you would create them from a [SpriteSheet](api/spriteSheet) by passing the `animations` argument.
   *
   * ```js
   * import { SpriteSheet, Animation } from 'kontra';
   *
   * let image = new Image();
   * image.src = 'assets/imgs/character_walk_sheet.png';
   * image.onload = function() {
   *   let spriteSheet = SpriteSheet({
   *     image: image,
   *     frameWidth: 72,
   *     frameHeight: 97
   *   });
   *
   *   // you typically wouldn't create an Animation this way
   *   let animation = Animation({
   *     spriteSheet: spriteSheet,
   *     frames: [1,2,3,6],
   *     frameRate: 30
   *   });
   * };
   * ```
   * @class Animation
   *
   * @param {Object} properties - Properties of the animation.
   * @param {SpriteSheet} properties.spriteSheet - Sprite sheet for the animation.
   * @param {Number[]} properties.frames - List of frames of the animation.
   * @param {Number}  properties.frameRate - Number of frames to display in one second.
   * @param {Boolean} [properties.loop=true] - If the animation should loop.
   * @param {String} [properties.name] - The name of the animation.
   */
  class Animation {
    constructor({ spriteSheet, frames, frameRate, loop = true, name }) {
      let {
        width,
        height,
        spacing = 0,
        margin = 0
      } = spriteSheet.frame;

      Object.assign(this, {
        /**
         * The sprite sheet to use for the animation.
         * @memberof Animation
         * @property {SpriteSheet} spriteSheet
         */
        spriteSheet,

        /**
         * Sequence of frames to use from the sprite sheet.
         * @memberof Animation
         * @property {Number[]} frames
         */
        frames,

        /**
         * Number of frames to display per second. Adjusting this value will change the speed of the animation.
         * @memberof Animation
         * @property {Number} frameRate
         */
        frameRate,

        /**
         * If the animation should loop back to the beginning once completed.
         * @memberof Animation
         * @property {Boolean} loop
         */
        loop,

        /**
         * The name of the animation.
         * @memberof Animation
         * @property {String} name
         */
        name,

        /**
         * The width of an individual frame. Taken from the [frame width value](api/spriteSheet#frame) of the sprite sheet.
         * @memberof Animation
         * @property {Number} width
         */
        width,

        /**
         * The height of an individual frame. Taken from the [frame height value](api/spriteSheet#frame) of the sprite sheet.
         * @memberof Animation
         * @property {Number} height
         */
        height,

        /**
         * The space between each frame. Taken from the [frame spacing value](api/spriteSheet#frame) of the sprite sheet.
         * @memberof Animation
         * @property {Number} spacing
         */
        spacing,

        /**
         * The border space around the sprite sheet image. Taken from the [frame margin value](api/spriteSheet#frame) of the sprite sheet.
         * @memberof Animation
         * @property {Number} margin
         */
        margin,

        /**
         * If the animation is currently stopped. Stopped animations will not update when the [update()](api/animation#update) function is called.
         *
         * Animations are not considered stopped until either the [stop()](api/animation#stop) function is called or the animation gets to the last frame and does not loop.
         *
         * ```js
         * import { Animation } from 'kontra';
         *
         * let animation = Animation({
         *   // ...
         * });
         * console.log(animation.isStopped);  //=> false
         *
         * animation.start();
         * console.log(animation.isStopped);  //=> false
         *
         * animation.stop();
         * console.log(animation.isStopped);  //=> true
         * ```
         * @memberof Animation
         * @property {Boolean} isStopped
         */
        isStopped: false,

        // f = frame, a = accumulator
        _f: 0,
        _a: 0
      });
    }

    /**
     * Clone an animation so it can be used more than once. By default animations passed to [Sprite](api/sprite) will be cloned so no two sprites update the same animation. Otherwise two sprites who shared the same animation would make it update twice as fast.
     * @memberof Animation
     * @function clone
     *
     * @returns {Animation} A new Animation instance.
     */
    clone() {
      return new Animation(this);
    }

    /**
     * Start the animation.
     * @memberof Animation
     * @function start
     */
    start() {
      this.isStopped = false;

      if (!this.loop) {
        this.reset();
      }
    }

    /**
     * Stop the animation.
     * @memberof Animation
     * @function stop
     */
    stop() {
      this.isStopped = true;
    }

    /**
     * Reset an animation to the first frame.
     * @memberof Animation
     * @function reset
     */
    reset() {
      this._f = 0;
      this._a = 0;
    }

    /**
     * Update the animation.
     * @memberof Animation
     * @function update
     *
     * @param {Number} [dt=1/60] - Time since last update.
     */
    update(dt = 1 / 60) {
      if (this.isStopped) {
        return;
      }

      // if the animation doesn't loop we stop at the last frame
      if (!this.loop && this._f == this.frames.length - 1) {
        this.stop();
        return;
      }

      this._a += dt;

      // update to the next frame if it's time
      while (this._a * this.frameRate >= 1) {
        this._f = ++this._f % this.frames.length;
        this._a -= 1 / this.frameRate;
      }
    }

    /**
     * Draw the current frame of the animation.
     * @memberof Animation
     * @function render
     *
     * @param {Object} properties - Properties to draw the animation.
     * @param {Number} properties.x - X position to draw the animation.
     * @param {Number} properties.y - Y position to draw the animation.
     * @param {Number} [properties.width] - width of the sprite. Defaults to [Animation.width](api/animation#width).
     * @param {Number} [properties.height] - height of the sprite. Defaults to [Animation.height](api/animation#height).
     * @param {CanvasRenderingContext2D} [properties.context] - The context the animation should draw to. Defaults to [core.getContext()](api/core#getContext).
     */
    render({
      x,
      y,
      width = this.width,
      height = this.height,
      context = getContext()
    }) {
      // get the row and col of the frame
      let row = (this.frames[this._f] / this.spriteSheet._f) | 0;
      let col = this.frames[this._f] % this.spriteSheet._f | 0;

      context.drawImage(
        this.spriteSheet.image,
        this.margin + col * this.width + (col * 2 + 1) * this.spacing,
        this.margin + row * this.height + (row * 2 + 1) * this.spacing,
        this.width,
        this.height,
        x,
        y,
        width,
        height
      );
    }
  }

  function factory$b() {
    return new Animation(...arguments);
  }

  /**
   * A simple 2d vector object. Takes either separate `x` and `y` coordinates or a Vector-like object.
   *
   * ```js
   * import { Vector } from 'kontra';
   *
   * let vector = Vector(100, 200);
   * let vector2 = Vector({x: 100, y: 200});
   * ```
   * @class Vector
   *
   * @param {Number|{x: number, y: number}} [x=0] - X coordinate of the vector or a Vector-like object. If passing an object, the `y` param is ignored.
   * @param {Number} [y=0] - Y coordinate of the vector.
   */
  class Vector {
    constructor(x = 0, y = 0, vec = {}) {
      if (x.x != undefined) {
        this.x = x.x;
        this.y = x.y;
      }
      else {
        this.x = x;
        this.y = y;
      }

    }

    /**
     * Set the x and y coordinate of the vector.
     * @memberof Vector
     * @function set
     *
     * @param {Vector|{x: number, y: number}} vector - Vector to set coordinates from.
     */
    set(vec) {
      this.x = vec.x;
      this.y = vec.y;
    }

    /**
     * Calculate the addition of the current vector with the given vector.
     * @memberof Vector
     * @function add
     *
     * @param {Vector|{x: number, y: number}} vector - Vector to add to the current Vector.
     *
     * @returns {Vector} A new Vector instance whose value is the addition of the two vectors.
     */
    add(vec) {
      return new Vector(this.x + vec.x, this.y + vec.y, this);
    }









  }

  function factory$a() {
    return new Vector(...arguments);
  }

  /**
   * This is a private class that is used just to help make the GameObject class more manageable and smaller.
   *
   * It maintains everything that can be changed in the update function:
   * position
   * velocity
   * acceleration
   * ttl
   */
  class Updatable {
    constructor(properties) {
      return this.init(properties);
    }

    init(properties = {}) {
      // --------------------------------------------------
      // defaults
      // --------------------------------------------------

      /**
       * The game objects position vector. Represents the local position of the object as opposed to the [world](api/gameObject#world) position.
       * @property {Vector} position
       * @memberof GameObject
       * @page GameObject
       */
      this.position = factory$a();

      // --------------------------------------------------
      // optionals
      // --------------------------------------------------

      /**
       * The game objects velocity vector.
       * @memberof GameObject
       * @property {Vector} velocity
       * @page GameObject
       */
      this.velocity = factory$a();



      // add all properties to the object, overriding any defaults
      Object.assign(this, properties);
    }

    /**
     * Update the position of the game object and all children using their velocity and acceleration. Calls the game objects [advance()](api/gameObject#advance) function.
     * @memberof GameObject
     * @function update
     * @page GameObject
     *
     * @param {Number} [dt] - Time since last update.
     */
    update(dt) {
      this.advance(dt);
    }

    /**
     * Move the game object by its acceleration and velocity. If you pass `dt` it will multiply the vector and acceleration by that number. This means the `dx`, `dy`, `ddx` and `ddy` should be how far you want the object to move in 1 second rather than in 1 frame.
     *
     * If you override the game objects [update()](api/gameObject#update) function with your own update function, you can call this function to move the game object normally.
     *
     * ```js
     * import { GameObject } from 'kontra';
     *
     * let gameObject = GameObject({
     *   x: 100,
     *   y: 200,
     *   width: 20,
     *   height: 40,
     *   dx: 5,
     *   dy: 2,
     *   update: function() {
     *     // move the game object normally
     *     this.advance();
     *
     *     // change the velocity at the edges of the canvas
     *     if (this.x < 0 ||
     *         this.x + this.width > this.context.canvas.width) {
     *       this.dx = -this.dx;
     *     }
     *     if (this.y < 0 ||
     *         this.y + this.height > this.context.canvas.height) {
     *       this.dy = -this.dy;
     *     }
     *   }
     * });
     * ```
     * @memberof GameObject
     * @function advance
     * @page GameObject
     *
     * @param {Number} [dt] - Time since last update.
     *
     */
    advance(dt) {

      let velocity = this.velocity;


      this.position = this.position.add(velocity);
      this._pc();

    }

    // --------------------------------------------------
    // velocity
    // --------------------------------------------------

    /**
     * X coordinate of the velocity vector.
     * @memberof GameObject
     * @property {Number} dx
     * @page GameObject
     */
    get dx() {
      return this.velocity.x;
    }

    /**
     * Y coordinate of the velocity vector.
     * @memberof GameObject
     * @property {Number} dy
     * @page GameObject
     */
    get dy() {
      return this.velocity.y;
    }

    set dx(value) {
      this.velocity.x = value;
    }

    set dy(value) {
      this.velocity.y = value;
    }

    // --------------------------------------------------
    // acceleration
    // --------------------------------------------------


    // --------------------------------------------------
    // ttl
    // --------------------------------------------------


    _pc() {}
  }

  /**
   * The base class of most renderable classes. Handles things such as position, rotation, anchor, and the update and render life cycle.
   *
   * Typically you don't create a GameObject directly, but rather extend it for new classes.
   * @class GameObject
   *
   * @param {Object} [properties] - Properties of the game object.
   * @param {Number} [properties.x] - X coordinate of the position vector.
   * @param {Number} [properties.y] - Y coordinate of the position vector.
   * @param {Number} [properties.width] - Width of the game object.
   * @param {Number} [properties.height] - Height of the game object.
   * @param {Number} [properties.radius] - Radius of the game object. **Note:** radius is mutually exclusive with `width` and `height` as the GameObject will always use `radius` over `width` and `height` for any logic.
   *
   * @param {CanvasRenderingContext2D} [properties.context] - The context the game object should draw to. Defaults to [core.getContext()](api/core#getContext).
   *
   * @param {Number} [properties.dx] - X coordinate of the velocity vector.
   * @param {Number} [properties.dy] - Y coordinate of the velocity vector.
   * @param {Number} [properties.ddx] - X coordinate of the acceleration vector.
   * @param {Number} [properties.ddy] - Y coordinate of the acceleration vector.
   * @param {Number} [properties.ttl=Infinity] - How many frames the game object should be alive. Used by [Pool](api/pool).
   *
   * @param {{x: Number, y: Number}} [properties.anchor={x:0,y:0}] - The x and y origin of the game object. {x:0, y:0} is the top left corner of the game object, {x:1, y:1} is the bottom right corner.
   * @param {GameObject[]} [properties.children] - Children to add to the game object.
   * @param {Number} [properties.opacity=1] - The opacity of the game object.
   * @param {Number} [properties.rotation=0] - The rotation around the anchor in radians.
   * @param {Number} [properties.drotation=0] - The angular velocity of the rotation in radians.
   * @param {Number} [properties.ddrotation=0] - The angular acceleration of the rotation in radians.
   * @param {Number} [properties.scaleX=1] - The x scale of the game object.
   * @param {Number} [properties.scaleY=1] - The y scale of the game object.
   *
   * @param {(dt?: Number) => void} [properties.update] - Function called every frame to update the game object.
   * @param {Function} [properties.render] - Function called every frame to render the game object.
   *
   * @param {...*} properties.props - Any additional properties you need added to the game object. For example, if you pass `gameObject({type: 'player'})` then the game object will also have a property of the same name and value. You can pass as many additional properties as you want.
   */
  class GameObject extends Updatable {
    /**
     * @docs docs/api_docs/gameObject.js
     */

    /**
     * Use this function to reinitialize a game object. It takes the same properties object as the constructor. Useful it you want to repurpose a game object.
     * @memberof GameObject
     * @function init
     *
     * @param {Object} properties - Properties of the game object.
     */
    init({
      // --------------------------------------------------
      // defaults
      // --------------------------------------------------

      /**
       * The width of the game object. Represents the local width of the object as opposed to the [world](api/gameObject#world) width.
       * @memberof GameObject
       * @property {Number} width
       */
      width = 0,

      /**
       * The height of the game object. Represents the local height of the object as opposed to the [world](api/gameObject#world) height.
       * @memberof GameObject
       * @property {Number} height
       */
      height = 0,

      /**
       * The context the game object will draw to.
       * @memberof GameObject
       * @property {CanvasRenderingContext2D} context
       */
      context = getContext(),

      render = this.draw,
      update = this.advance,

      // --------------------------------------------------
      // optionals
      // --------------------------------------------------

      /**
       * The radius of the game object. Represents the local radius of the object as opposed to the [world](api/gameObject#world) radius.
       * @memberof GameObject
       * @property {Number} radius
       */


      /**
       * The x and y origin of the game object. {x:0, y:0} is the top left corner of the game object, {x:1, y:1} is the bottom right corner.
       * @memberof GameObject
       * @property {{x: Number, y: Number}} anchor
       *
       * @example
       * // exclude-code:start
       * let { GameObject } = kontra;
       * // exclude-code:end
       * // exclude-script:start
       * import { GameObject } from 'kontra';
       * // exclude-script:end
       *
       * let gameObject = GameObject({
       *   x: 150,
       *   y: 100,
       *   width: 50,
       *   height: 50,
       *   color: 'red',
       *   // exclude-code:start
       *   context: context,
       *   // exclude-code:end
       *   render: function() {
       *     this.context.fillStyle = this.color;
       *     this.context.fillRect(0, 0, this.height, this.width);
       *   }
       * });
       *
       * function drawOrigin(gameObject) {
       *   gameObject.context.fillStyle = 'yellow';
       *   gameObject.context.beginPath();
       *   gameObject.context.arc(gameObject.x, gameObject.y, 3, 0, 2*Math.PI);
       *   gameObject.context.fill();
       * }
       *
       * gameObject.render();
       * drawOrigin(gameObject);
       *
       * gameObject.anchor = {x: 0.5, y: 0.5};
       * gameObject.x = 300;
       * gameObject.render();
       * drawOrigin(gameObject);
       *
       * gameObject.anchor = {x: 1, y: 1};
       * gameObject.x = 450;
       * gameObject.render();
       * drawOrigin(gameObject);
       */
      anchor = { x: 0, y: 0 },


      /**
       * The rotation of the game object around the anchor in radians. Represents the local rotation of the object as opposed to the [world](api/gameObject#world) rotation.
       * @memberof GameObject
       * @property {Number} rotation
       */
      rotation = 0,

      /**
       * Angular velocity of the rotation in radians.
       * @memberof GameObject
       * @property {Number} drotation
       */
      drotation = 0,


      /**
       * The x scale of the object. Represents the local x scale of the object as opposed to the [world](api/gameObject#world) x scale.
       * @memberof GameObject
       * @property {Number} scaleX
       */
      scaleX = 1,

      /**
       * The y scale of the object. Represents the local y scale of the object as opposed to the [world](api/gameObject#world) y scale.
       * @memberof GameObject
       * @property {Number} scaleY
       */
      scaleY = 1,

      ...props
    } = {}) {

      // by setting defaults to the parameters and passing them into
      // the init, we can ensure that a parent class can set overriding
      // defaults and the GameObject won't undo it (if we set
      // `this.width` then no parent could provide a default value for
      // width)
      super.init({
        width,
        height,
        context,

        anchor,


        rotation,

        drotation,


        scaleX,
        scaleY,

        ...props
      });

      // di = done init
      this._di = true;
      this._uw();


      // rf = render function
      this._rf = render;

      // uf = update function
      this._uf = update;

      on$1('init', () => {
        this.context ??= getContext();
      });
    }

    /**
     * Update all children
     */
    update(dt) {
      this._uf(dt);

    }

    /**
     * Render the game object and all children. Calls the game objects [draw()](api/gameObject#draw) function.
     * @memberof GameObject
     * @function render
     */
    render() {
      let context = this.context;
      context.save();

      // 1) translate to position
      //
      // it's faster to only translate if one of the values is non-zero
      // rather than always translating
      // @see https://jsperf.com/translate-or-if-statement/2
      if (this.x || this.y) {
        context.translate(this.x, this.y);
      }

      // 3) rotate around the anchor
      //
      // it's faster to only rotate when set rather than always rotating
      // @see https://jsperf.com/rotate-or-if-statement/2
      if (this.rotation) {
        context.rotate(this.rotation);
      }

      // 4) scale after translation to position so object can be
      // scaled in place (rather than scaling position as well).
      //
      // it's faster to only scale if one of the values is not 1
      // rather than always scaling
      // @see https://jsperf.com/scale-or-if-statement/4
      if (this.scaleX != 1 || this.scaleY != 1) {
        context.scale(this.scaleX, this.scaleY);
      }

      // 5) translate to the anchor so (0,0) is the top left corner
      // for the render function
      let width = this.width;
      let height = this.height;

      if (this.radius) {
        width = height = this.radius * 2;
      }

      let anchorX = -width * this.anchor.x;
      let anchorY = -height * this.anchor.y;

      if (anchorX || anchorY) {
        context.translate(anchorX, anchorY);
      }


      this._rf();

      // 7) translate back to the anchor so children use the correct
      // x/y value from the anchor
      if (anchorX || anchorY) {
        context.translate(-anchorX, -anchorY);
      }


      context.restore();
    }

    /**
     * Draw the game object at its X and Y position, taking into account rotation, scale, and anchor.
     *
     * Do note that the canvas has been rotated and translated to the objects position (taking into account anchor), so {0,0} will be the top-left corner of the game object when drawing.
     *
     * If you override the game objects `render()` function with your own render function, you can call this function to draw the game object normally.
     *
     * ```js
     * let { GameObject } = kontra;
     *
     * let gameObject = GameObject({
     *  x: 290,
     *  y: 80,
     *  width: 20,
     *  height: 40,
     *
     *  render: function() {
     *    // draw the game object normally (perform rotation and other transforms)
     *    this.draw();
     *
     *    // outline the game object
     *    this.context.strokeStyle = 'yellow';
     *    this.context.lineWidth = 2;
     *    this.context.strokeRect(0, 0, this.width, this.height);
     *  }
     * });
     *
     * gameObject.render();
     * ```
     * @memberof GameObject
     * @function draw
     */
    draw() {}

    /**
     * Sync property changes from the parent to the child
     */
    _pc() {
      this._uw();

    }

    /**
     * X coordinate of the position vector.
     * @memberof GameObject
     * @property {Number} x
     */
    get x() {
      return this.position.x;
    }

    /**
     * Y coordinate of the position vector.
     * @memberof GameObject
     * @property {Number} y
     */
    get y() {
      return this.position.y;
    }

    set x(value) {
      this.position.x = value;

      // pc = property changed
      this._pc();
    }

    set y(value) {
      this.position.y = value;
      this._pc();
    }

    get width() {
      // w = width
      return this._w;
    }

    set width(value) {
      this._w = value;
      this._pc();
    }

    get height() {
      // h = height
      return this._h;
    }

    set height(value) {
      this._h = value;
      this._pc();
    }

    /**
     * Update world properties
     */
    _uw() {
      // don't update world properties until after the init has finished
      if (!this._di) return;

      let {
        _wx = 0,
        _wy = 0,


        _wrot = 0,

        _wsx = 1,
        _wsy = 1
      } = this.parent || {};

      // wx = world x, wy = world y
      this._wx = this.x;
      this._wy = this.y;

      // ww = world width, wh = world height
      this._ww = this.width;
      this._wh = this.height;

      // wrx = world radius x, wry = world radius y
      if (this.radius) {
        this._wrx = this.radius;
        this._wry = this.radius;
      }


      // wsx = world scale x, wsy = world scale y
      this._wsx = _wsx * this.scaleX;
      this._wsy = _wsy * this.scaleY;

      this._wx = this._wx * _wsx;
      this._wy = this._wy * _wsy;
      this._ww = this.width * this._wsx;
      this._wh = this.height * this._wsy;

      if (this.radius) {
        this._wrx = this.radius * this._wsx;
        this._wry = this.radius * this._wsy;
      }

      // wrot = world rotation
      this._wrot = _wrot + this.rotation;

      let { x, y } = rotatePoint({ x: this._wx, y: this._wy }, _wrot);
      this._wx = x;
      this._wy = y;

    }

    /**
     * The world position, width, height, opacity, rotation, and scale. The world property is the true position, width, height, etc. of the object, taking into account all parents.
     *
     * The world property does not adjust for anchor or scale, so if you set a negative scale the world width or height could be negative. Use [getWorldRect](api/helpers#getWorldRect) to get the world position and size adjusted for anchor and scale.
     * @property {{x: Number, y: Number, width: Number, height: Number, opacity: Number, rotation: Number, scaleX: Number, scaleY: Number}} world
     * @memberof GameObject
     */
    get world() {
      return {
        x: this._wx,
        y: this._wy,
        width: this._ww,
        height: this._wh,

        radius: this.radius
          ? { x: this._wrx, y: this._wry }
          : undefined,


        rotation: this._wrot,

        scaleX: this._wsx,
        scaleY: this._wsy
      };
    }

    // --------------------------------------------------
    // group
    // --------------------------------------------------


    // --------------------------------------------------
    // radius
    // --------------------------------------------------

    get radius() {
      // r = radius
      return this._r;
    }

    set radius(value) {
      this._r = value;
      this._pc();
    }

    // --------------------------------------------------
    // opacity
    // --------------------------------------------------


    // --------------------------------------------------
    // rotation
    // --------------------------------------------------

    get rotation() {
      return this._rot;
    }

    set rotation(value) {
      this._rot = value;
      this._pc();
    }

    advance(dt) {
      super.advance(dt);


      this.rotation += this.drotation;
    }


    // --------------------------------------------------
    // scale
    // --------------------------------------------------

    /**
     * Set the x and y scale of the object. If only one value is passed, both are set to the same value.
     * @memberof GameObject
     * @function setScale
     *
     * @param {Number} x - X scale value.
     * @param {Number} [y=x] - Y scale value.
     */
    setScale(x, y = x) {
      this.scaleX = x;
      this.scaleY = y;
    }

    get scaleX() {
      return this._scx;
    }

    set scaleX(value) {
      this._scx = value;
      this._pc();
    }

    get scaleY() {
      return this._scy;
    }

    set scaleY(value) {
      this._scy = value;
      this._pc();
    }
  }

  /**
   * A versatile way to update and draw your sprites. It can handle simple rectangles, images, and sprite sheet animations. It can be used for your main player object as well as tiny particles in a particle engine.
   * @class Sprite
   * @extends GameObject
   *
   * @param {Object} [properties] - Properties of the sprite.
   * @param {String} [properties.color] - Fill color for the game object if no image or animation is provided.
   * @param {HTMLImageElement|HTMLCanvasElement} [properties.image] - Use an image to draw the sprite.
   * @param {{[name: String] : Animation}} [properties.animations] - An object of [Animations](api/animation) from a [Spritesheet](api/spriteSheet) to animate the sprite.
   */
  class Sprite extends GameObject {
    /**
     * @docs docs/api_docs/sprite.js
     */

    init({
      /**
       * The color of the game object if it was passed as an argument.
       * @memberof Sprite
       * @property {String} color
       */

      /**
       * The image the sprite will use when drawn if passed as an argument.
       * @memberof Sprite
       * @property {HTMLImageElement|HTMLCanvasElement} image
       */
      image,

      /**
       * The width of the sprite. If the sprite is a [rectangle sprite](api/sprite#rectangle-sprite), it uses the passed in value. For an [image sprite](api/sprite#image-sprite) it is the width of the image. And for an [animation sprite](api/sprite#animation-sprite) it is the width of a single frame of the animation.
       * @memberof Sprite
       * @property {Number} width
       */
      width = image ? image.width : undefined,

      /**
       * The height of the sprite. If the sprite is a [rectangle sprite](api/sprite#rectangle-sprite), it uses the passed in value. For an [image sprite](api/sprite#image-sprite) it is the height of the image. And for an [animation sprite](api/sprite#animation-sprite) it is the height of a single frame of the animation.
       * @memberof Sprite
       * @property {Number} height
       */
      height = image ? image.height : undefined,

      ...props
    } = {}) {
      super.init({
        image,
        width,
        height,
        ...props
      });
    }

    /**
     * An object of [Animations](api/animation) from a [SpriteSheet](api/spriteSheet) to animate the sprite. Each animation is named so that it can can be used by name for the sprites [playAnimation()](api/sprite#playAnimation) function.
     *
     * ```js
     * import { Sprite, SpriteSheet } from 'kontra';
     *
     * let spriteSheet = SpriteSheet({
     *   // ...
     *   animations: {
     *     idle: {
     *       frames: 1,
     *       loop: false,
     *     },
     *     walk: {
     *       frames: [1,2,3]
     *     }
     *   }
     * });
     *
     * let sprite = Sprite({
     *   x: 100,
     *   y: 200,
     *   animations: spriteSheet.animations
     * });
     *
     * sprite.playAnimation('idle');
     * ```
     * @memberof Sprite
     * @property {{[name: String] : Animation}} animations
     */
    get animations() {
      return this._a;
    }

    set animations(value) {
      let prop, firstAnimation;
      // a = animations
      this._a = {};

      // clone each animation so no sprite shares an animation
      for (prop in value) {
        this._a[prop] = value[prop].clone();

        // default the current animation to the first one in the list
        firstAnimation = firstAnimation || this._a[prop];
      }

      /**
       * The currently playing Animation object if `animations` was passed as an argument.
       * @memberof Sprite
       * @property {Animation} currentAnimation
       */
      this.currentAnimation = firstAnimation;
      this.width = this.width || firstAnimation.width;
      this.height = this.height || firstAnimation.height;
    }

    /**
     * Set the currently playing animation of an animation sprite.
     *
     * ```js
     * import { Sprite, SpriteSheet } from 'kontra';
     *
     * let spriteSheet = SpriteSheet({
     *   // ...
     *   animations: {
     *     idle: {
     *       frames: 1
     *     },
     *     walk: {
     *       frames: [1,2,3]
     *     }
     *   }
     * });
     *
     * let sprite = Sprite({
     *   x: 100,
     *   y: 200,
     *   animations: spriteSheet.animations
     * });
     *
     * sprite.playAnimation('idle');
     * ```
     * @memberof Sprite
     * @function playAnimation
     *
     * @param {String} name - Name of the animation to play.
     */
    playAnimation(name) {
      this.currentAnimation?.stop();
      this.currentAnimation = this.animations[name];
      this.currentAnimation.start();
    }

    advance(dt) {
      super.advance(dt);
      this.currentAnimation?.update(dt);
    }

    draw() {
      if (this.image) {
        this.context.drawImage(
          this.image,
          0,
          0,
          this.image.width,
          this.image.height
        );
      }

      if (this.currentAnimation) {
        this.currentAnimation.render({
          x: 0,
          y: 0,
          width: this.width,
          height: this.height,
          context: this.context
        });
      }

      if (this.color) {
        this.context.fillStyle = this.color;

        if (this.radius) {
          this.context.beginPath();
          this.context.arc(
            this.radius,
            this.radius,
            this.radius,
            0,
            Math.PI * 2
          );
          this.context.fill();
          return;
        }

        this.context.fillRect(0, 0, this.width, this.height);
      }
    }
  }

  function factory$8() {
    return new Sprite(...arguments);
  }

  let fontSizeRegex = /(\d+)(\w+)/;

  function parseFont(font) {
    if (!font) return { computed: 0 };

    let match = font.match(fontSizeRegex);

    // coerce string to number
    // @see https://github.com/jed/140bytes/wiki/Byte-saving-techniques#coercion-to-test-for-types
    let size = +match[1];
    let unit = match[2];
    let computed = size;

    return {
      size,
      unit,
      computed
    };
  }

  /**
   * An object for drawing text to the screen. Supports newline characters as well as automatic new lines when setting the `width` property.
   *
   * You can also display RTL languages by setting the attribute `dir="rtl"` on the main canvas element. Due to the limited browser support for individual text to have RTL settings, it must be set globally for the entire game.
   *
   * @example
   * // exclude-code:start
   * let { Text } = kontra;
   * // exclude-code:end
   * // exclude-script:start
   * import { Text } from 'kontra';
   * // exclude-script:end
   *
   * let text = Text({
   *   text: 'Hello World!\nI can even be multiline!',
   *   font: '32px Arial',
   *   color: 'white',
   *   x: 300,
   *   y: 100,
   *   anchor: {x: 0.5, y: 0.5},
   *   textAlign: 'center'
   * });
   * // exclude-code:start
   * text.context = context;
   * // exclude-code:end
   *
   * text.render();
   * @class Text
   * @extends GameObject
   *
   * @param {Object} properties - Properties of the text.
   * @param {String} properties.text - The text to display.
   * @param {String} [properties.font] - The [font](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/font) style. Defaults to the main context font.
   * @param {String} [properties.color] - Fill color for the text. Defaults to the main context fillStyle.
   * @param {Number} [properties.width] - Set a fixed width for the text. If set, the text will automatically be split into new lines that will fit the size when possible.
   * @param {String} [properties.textAlign='left'] - The [textAlign](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textAlign) for the context. If the `dir` attribute is set to `rtl` on the main canvas, the text will automatically be aligned to the right, but you can override that by setting this property.
   * @param {Number} [properties.lineHeight=1] - The distance between two lines of text.
   * @param {String} [properties.strokeColor] - Stroke color for the text.
   * @param {number} [properties.lineWidth] - Stroke line width for the text.
   */
  class Text extends GameObject {
    init({
      // --------------------------------------------------
      // defaults
      // --------------------------------------------------

      /**
       * The string of text. Use newline characters to create multi-line strings.
       * @memberof Text
       * @property {String} text
       */
      text = '',

      /**
       * The text alignment.
       * @memberof Text
       * @property {String} textAlign
       */
      textAlign = '',

      /**
       * The distance between two lines of text. The value is multiplied by the texts font size.
       * @memberof Text
       * @property {Number} lineHeight
       */
      lineHeight = 1,

      /**
       * The font style.
       * @memberof Text
       * @property {String} font
       */
      font = getContext()?.font,

      /**
       * The color of the text.
       * @memberof Text
       * @property {String} color
       */

      ...props
    } = {}) {
      // cast to string
      text = '' + text;

      super.init({
        text,
        textAlign,
        lineHeight,
        font,
        ...props
      });

      // p = prerender
      if (this.context) {
        this._p();
      }

      on$1('init', () => {
        this.font ??= getContext().font;
        this._p();
      });
    }

    // keep width and height getters/settings so we can set _w and _h
    // and not trigger infinite call loops
    get width() {
      // w = width
      return this._w;
    }

    set width(value) {
      // d = dirty
      this._d = true;
      this._w = value;

      // fw = fixed width
      this._fw = value;
    }

    get text() {
      return this._t;
    }

    set text(value) {
      this._d = true;
      this._t = '' + value;
    }

    get font() {
      return this._f;
    }

    set font(value) {
      this._d = true;
      this._f = value;
      this._fs = parseFont(value).computed;
    }

    get lineHeight() {
      // lh = line height
      return this._lh;
    }

    set lineHeight(value) {
      this._d = true;
      this._lh = value;
    }

    render() {
      if (this._d) {
        this._p();
      }
      super.render();
    }

    /**
     * Calculate the font width, height, and text strings before rendering.
     */
    _p() {
      // s = strings
      this._s = [];
      this._d = false;
      let context = this.context;
      let text = [this.text];

      context.font = this.font;




      if (!this._s.length) {
        this._s.push(this.text);
        this._w = this._fw || context.measureText(this.text).width;
      }

      this.height =
        this._fs + (this._s.length - 1) * this._fs * this.lineHeight;
      this._uw();
    }

    draw() {
      let alignX = 0;
      let textAlign = this.textAlign;
      let context = this.context;


      alignX =
        textAlign == 'right'
          ? this.width
          : textAlign == 'center'
          ? (this.width / 2) | 0
          : 0;

      this._s.map((str, index) => {
        context.textBaseline = 'top';
        context.textAlign = textAlign;
        context.fillStyle = this.color;
        context.font = this.font;



        context.fillText(
          str,
          alignX,
          this._fs * this.lineHeight * index
        );
      });
    }
  }

  function factory$7() {
    return new Text(...arguments);
  }

  /**
   * A simple pointer API. You can use it move the main sprite or respond to a pointer event. Works with both mouse and touch events.
   *
   * Pointer events can be added on a global level or on individual sprites or objects. Before an object can receive pointer events, you must tell the pointer which objects to track and the object must haven been rendered to the canvas using `object.render()`.
   *
   * After an object is tracked and rendered, you can assign it an `onDown()`, `onUp()`, `onOver()`, or `onOut()` functions which will be called whenever a pointer down, up, over, or out event happens on the object.
   *
   * ```js
   * import { initPointer, track, Sprite } from 'kontra';
   *
   * // this function must be called first before pointer
   * // functions will work
   * initPointer();
   *
   * let sprite = Sprite({
   *   onDown: function() {
   *     // handle on down events on the sprite
   *   },
   *   onUp: function() {
   *     // handle on up events on the sprite
   *   },
   *   onOver: function() {
   *     // handle on over events on the sprite
   *   },
   *   onOut: function() {
   *     // handle on out events on the sprite
   *   }
   * });
   *
   * track(sprite);
   * sprite.render();
   * ```
   *
   * By default, the pointer is treated as a circle and will check for collisions against objects assuming they are rectangular (have a width and height property).
   *
   * If you need to perform a different type of collision detection, assign the object a `collidesWithPointer()` function and it will be called instead. The function is passed the pointer object. Use this function to determine how the pointer circle should collide with the object.
   *
   * ```js
   * import { Sprite } from 'kontra';
   *
   * let sprite = Srite({
   *   x: 10,
   *   y: 10,
   *   radius: 10
   *   collidesWithPointer: function(pointer) {
   *     // perform a circle v circle collision test
   *     let dx = pointer.x - this.x;
   *     let dy = pointer.y - this.y;
   *     return Math.sqrt(dx * dx + dy * dy) < this.radius;
   *   }
   * });
   * ```
   * @sectionName Pointer
   */

  /**
   * Below is a list of buttons that you can use. If you need to extend or modify this list, you can use the [pointerMap](api/gamepad#pointerMap) property.
   *
   * - left, middle, right
   * @sectionName Available Buttons
   */

  // save each object as they are rendered to determine which object
  // is on top when multiple objects are the target of an event.
  // we'll always use the last frame's object order so we know
  // the finalized order of all objects, otherwise an object could ask
  // if it's being hovered when it's rendered first even if other
  // objects would block it later in the render order
  let pointers = new WeakMap();
  let callbacks$1 = {};
  let pressedButtons = {};

  /**
   * A map of pointer button indices to button names. Modify this object to expand the list of [available buttons](api/pointer#available-buttons).
   *
   * ```js
   * import { pointerMap, pointerPressed } from 'kontra';
   *
   * pointerMap[2] = 'buttonWest';
   *
   * if (pointerPressed('buttonWest')) {
   *   // handle west face button
   * }
   * ```
   * @property {{[key: Number]: String}} pointerMap
   */
  let pointerMap = {
    0: 'left',
    1: 'middle',
    2: 'right'
  };

  /**
   * Get the pointer object which contains the `radius`, current `x` and `y` position of the pointer relative to the top-left corner of the canvas, and which `canvas` the pointer applies to.
   *
   * ```js
   * import { initPointer, getPointer } from 'kontra';
   *
   * initPointer();
   *
   * console.log(getPointer());  //=> { x: 100, y: 200, radius: 5, canvas: <canvas> };
   * ```
   *
   * @function getPointer
   *
   * @param {HTMLCanvasElement} [canvas] - The canvas which maintains the pointer. Defaults to [core.getCanvas()](api/core#getCanvas).
   *
   * @returns {{x: Number, y: Number, radius: Number, canvas: HTMLCanvasElement, touches: Object}} pointer with properties `x`, `y`, and `radius`. If using touch events, also has a `touches` object with keys of the touch identifier and the x/y position of the touch as the value.
   */
  function getPointer(canvas = getCanvas()) {
    return pointers.get(canvas);
  }

  /**
   * Get the first on top object that the pointer collides with.
   *
   * @param {Object} pointer - The pointer object
   *
   * @returns {Object} First object to collide with the pointer.
   */
  function getCurrentObject(pointer) {
    // if pointer events are required on the very first frame or
    // without a game loop, use the current frame
    let renderedObjects = pointer._lf.length
      ? pointer._lf
      : pointer._cf;

    for (let i = renderedObjects.length - 1; i >= 0; i--) {
      let object = renderedObjects[i];
      let collides = object.collidesWithPointer
        ? object.collidesWithPointer(pointer)
        : circleRectCollision(pointer, object);

      if (collides) {
        return object;
      }
    }
  }

  /**
   * Get the style property value.
   */
  function getPropValue(style, value) {
    return parseFloat(style.getPropertyValue(value)) || 0;
  }

  /**
   * Calculate the canvas size, scale, and offset.
   *
   * @param {Object} The pointer object
   *
   * @returns {Object} The scale and offset of the canvas
   */
  function getCanvasOffset(pointer) {
    // we need to account for CSS scale, transform, border, padding,
    // and margin in order to get the correct scale and offset of the
    // canvas
    let { canvas, _s } = pointer;
    let rect = canvas.getBoundingClientRect();

    // @see https://stackoverflow.com/a/53405390/2124254
    let transform =
      _s.transform != 'none'
        ? _s.transform.replace('matrix(', '').split(',')
        : [1, 1, 1, 1];
    let transformScaleX = parseFloat(transform[0]);
    let transformScaleY = parseFloat(transform[3]);

    // scale transform applies to the border and padding of the element
    let borderWidth =
      (getPropValue(_s, 'border-left-width') +
        getPropValue(_s, 'border-right-width')) *
      transformScaleX;
    let borderHeight =
      (getPropValue(_s, 'border-top-width') +
        getPropValue(_s, 'border-bottom-width')) *
      transformScaleY;

    let paddingWidth =
      (getPropValue(_s, 'padding-left') +
        getPropValue(_s, 'padding-right')) *
      transformScaleX;
    let paddingHeight =
      (getPropValue(_s, 'padding-top') +
        getPropValue(_s, 'padding-bottom')) *
      transformScaleY;

    return {
      scaleX: (rect.width - borderWidth - paddingWidth) / canvas.width,
      scaleY:
        (rect.height - borderHeight - paddingHeight) / canvas.height,
      offsetX:
        rect.left +
        (getPropValue(_s, 'border-left-width') +
          getPropValue(_s, 'padding-left')) *
          transformScaleX,
      offsetY:
        rect.top +
        (getPropValue(_s, 'border-top-width') +
          getPropValue(_s, 'padding-top')) *
          transformScaleY
    };
  }

  /**
   * Execute the onDown callback for an object.
   *
   * @param {MouseEvent|TouchEvent} evt
   */
  function pointerDownHandler(evt) {
    // touchstart should be treated like a left mouse button
    let button = evt.button != null ? pointerMap[evt.button] : 'left';
    pressedButtons[button] = true;
    pointerHandler(evt, 'onDown');
  }

  /**
   * Execute the onUp callback for an object.
   *
   * @param {MouseEvent|TouchEvent} evt
   */
  function pointerUpHandler(evt) {
    let button = evt.button != null ? pointerMap[evt.button] : 'left';
    pressedButtons[button] = false;
    pointerHandler(evt, 'onUp');
  }

  /**
   * Track the position of the mousevt.
   *
   * @param {MouseEvent|TouchEvent} evt
   */
  function mouseMoveHandler(evt) {
    pointerHandler(evt, 'onOver');
  }

  /**
   * Reset pressed buttons.
   *
   * @param {MouseEvent|TouchEvent} evt
   */
  function blurEventHandler$2(evt) {
    let pointer = pointers.get(evt.target);
    pointer._oo = null;
    pressedButtons = {};
  }

  /**
   * Call a pointer callback function
   *
   * @param {Object} pointer
   * @param {String} eventName
   * @param {MouseEvent|TouchEvent} evt
   */
  function callCallback(pointer, eventName, evt) {
    // Trigger events
    let object = getCurrentObject(pointer);
    if (object && object[eventName]) {
      object[eventName](evt);
    }

    if (callbacks$1[eventName]) {
      callbacks$1[eventName](evt, object);
    }

    // handle onOut events
    if (eventName == 'onOver') {
      if (object != pointer._oo && pointer._oo && pointer._oo.onOut) {
        pointer._oo.onOut(evt);
      }

      pointer._oo = object;
    }
  }

  /**
   * Find the first object for the event and execute it's callback function
   *
   * @param {MouseEvent|TouchEvent} evt
   * @param {string} eventName - Which event was called.
   */
  function pointerHandler(evt, eventName) {
    evt.preventDefault();

    let canvas = evt.target;
    let pointer = pointers.get(canvas);
    let { scaleX, scaleY, offsetX, offsetY } = getCanvasOffset(pointer);
    let isTouchEvent = evt.type.includes('touch');

    if (isTouchEvent) {
      // track new touches
      Array.from(evt.touches).map(
        ({ clientX, clientY, identifier }) => {
          let touch = pointer.touches[identifier];
          if (!touch) {
            touch = pointer.touches[identifier] = {
              start: {
                x: (clientX - offsetX) / scaleX,
                y: (clientY - offsetY) / scaleY
              }
            };
            pointer.touches.length++;
          }

          touch.changed = false;
        }
      );

      // handle only changed touches
      Array.from(evt.changedTouches).map(
        ({ clientX, clientY, identifier }) => {
          let touch = pointer.touches[identifier];
          touch.changed = true;
          touch.x = pointer.x = (clientX - offsetX) / scaleX;
          touch.y = pointer.y = (clientY - offsetY) / scaleY;

          callCallback(pointer, eventName, evt);
          emit('touchChanged', evt, pointer.touches);

          // remove touches
          if (eventName == 'onUp') {
            delete pointer.touches[identifier];
            pointer.touches.length--;

            if (!pointer.touches.length) {
              emit('touchEnd');
            }
          }
        }
      );
    } else {
      // translate the scaled size back as if the canvas was at a
      // 1:1 scale
      pointer.x = (evt.clientX - offsetX) / scaleX;
      pointer.y = (evt.clientY - offsetY) / scaleY;

      callCallback(pointer, eventName, evt);
    }
  }

  /**
   * Initialize pointer event listeners. This function must be called before using other pointer functions.
   *
   * If you need to use multiple canvas, you'll have to initialize the pointer for each one individually as each canvas maintains its own pointer object.
   * @function initPointer
   *
   * @param {Object} [options] - Pointer options.
   * @param {Number} [options.radius=5] - Radius of the pointer.
   * @param {HTMLCanvasElement} [options.canvas] - The canvas that event listeners will be attached to. Defaults to [core.getCanvas()](api/core#getCanvas).
   *
   * @returns {{x: Number, y: Number, radius: Number, canvas: HTMLCanvasElement, touches: Object}} The pointer object for the canvas.
   */
  function initPointer({
    radius = 5,
    canvas = getCanvas()
  } = {}) {
    let pointer = pointers.get(canvas);
    if (!pointer) {
      let style = window.getComputedStyle(canvas);

      pointer = {
        x: 0,
        y: 0,
        radius,
        touches: { length: 0 },
        canvas,

        // cf = current frame, lf = last frame, o = objects,
        // oo = over object, _s = style
        _cf: [],
        _lf: [],
        _o: [],
        _oo: null,
        _s: style
      };
      pointers.set(canvas, pointer);
    }

    // if this function is called multiple times, the same event
    // won't be added multiple times
    // @see https://stackoverflow.com/questions/28056716/check-if-an-element-has-event-listener-on-it-no-jquery/41137585#41137585
    canvas.addEventListener('mousedown', pointerDownHandler);
    canvas.addEventListener('touchstart', pointerDownHandler);
    canvas.addEventListener('mouseup', pointerUpHandler);
    canvas.addEventListener('touchend', pointerUpHandler);
    canvas.addEventListener('touchcancel', pointerUpHandler);
    canvas.addEventListener('blur', blurEventHandler$2);
    canvas.addEventListener('mousemove', mouseMoveHandler);
    canvas.addEventListener('touchmove', mouseMoveHandler);

    // however, the tick event should only be registered once
    // otherwise it completely destroys pointer events
    if (!pointer._t) {
      pointer._t = true;

      // reset object render order on every new frame
      on$1('tick', () => {
        pointer._lf.length = 0;

        pointer._cf.map(object => {
          pointer._lf.push(object);
        });

        pointer._cf.length = 0;
      });
    }

    return pointer;
  }

  /**
   * Clear the canvas.
   */
  function clear(context) {
    let canvas = context.canvas;
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  /**
   * The game loop updates and renders the game every frame. The game loop is stopped by default and will not start until the loops `start()` function is called.
   *
   * The game loop uses a time-based animation with a fixed `dt` to [avoid frame rate issues](http://blog.sklambert.com/using-time-based-animation-implement/). Each update call is guaranteed to equal 1/60 of a second.
   *
   * This means that you can avoid having to do time based calculations in your update functions and instead do fixed updates.
   *
   * ```js
   * import { Sprite, GameLoop } from 'kontra';
   *
   * let sprite = Sprite({
   *   x: 100,
   *   y: 200,
   *   width: 20,
   *   height: 40,
   *   color: 'red'
   * });
   *
   * let loop = GameLoop({
   *   update: function(dt) {
   *     // no need to determine how many pixels you want to
   *     // move every second and multiple by dt
   *     // sprite.x += 180 * dt;
   *
   *     // instead just update by how many pixels you want
   *     // to move every frame and the loop will ensure 60FPS
   *     sprite.x += 3;
   *   },
   *   render: function() {
   *     sprite.render();
   *   }
   * });
   *
   * loop.start();
   * ```
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
  function GameLoop({
    fps = 60,
    clearCanvas = true,
    update = noop,
    render,
    context = getContext(),
    blur = false
  } = {}) {
    // check for required functions

    // animation variables
    let accumulator = 0;
    let delta = 1e3 / fps; // delta between performance.now timings (in ms)
    let step = 1 / fps;
    let clearFn = clearCanvas ? clear : noop;
    let last, rAF, now, dt, loop;
    let focused = true;

    if (!blur) {
      window.addEventListener('focus', () => {
        focused = true;
      });
      window.addEventListener('blur', () => {
        focused = false;
      });
    }

    on$1('init', () => {
      loop.context ??= getContext();
    });

    /**
     * Called every frame of the game loop.
     */
    function frame() {
      rAF = requestAnimationFrame(frame);

      // don't update the frame if tab isn't focused
      if (!focused) return;

      now = performance.now();
      dt = now - last;
      last = now;

      // prevent updating the game with a very large dt if the game
      // were to lose focus and then regain focus later
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

    // game loop object
    loop = {
      /**
       * Called every frame to update the game. Put all of your games update logic here.
       * @memberof GameLoop
       * @function update
       *
       * @param {Number} [dt] - The fixed dt time of 1/60 of a frame.
       */
      update,

      /**
       * Called every frame to render the game. Put all of your games render logic here.
       * @memberof GameLoop
       * @function render
       */
      render,

      /**
       * If the game loop is currently stopped.
       *
       * ```js
       * import { GameLoop } from 'kontra';
       *
       * let loop = GameLoop({
       *   // ...
       * });
       * console.log(loop.isStopped);  //=> true
       *
       * loop.start();
       * console.log(loop.isStopped);  //=> false
       *
       * loop.stop();
       * console.log(loop.isStopped);  //=> true
       * ```
       * @memberof GameLoop
       * @property {Boolean} isStopped
       */
      isStopped: true,

      /**
       * The context the game loop will clear. Defaults to [core.getContext()](api/core#getCcontext).
       *
       * @memberof GameLoop
       * @property {CanvasRenderingContext2D} context
       */
      context,

      /**
       * Start the game loop.
       * @memberof GameLoop
       * @function start
       */
      start() {
        if (this.isStopped) {
          last = performance.now();
          this.isStopped = false;
          requestAnimationFrame(frame);
        }
      },

      /**
       * Stop the game loop.
       * @memberof GameLoop
       * @function stop
       */
      stop() {
        this.isStopped = true;
        cancelAnimationFrame(rAF);
      },

      // expose properties for testing
    };

    return loop;
  }

  /**
   * Parse a string of consecutive frames.
   *
   * @param {Number|String} frames - Start and end frame.
   *
   * @returns {Number|Number[]} List of frames.
   */
  function parseFrames(consecutiveFrames) {
    // return a single number frame
    // @see https://github.com/jed/140bytes/wiki/Byte-saving-techniques#coercion-to-test-for-types
    if (+consecutiveFrames == consecutiveFrames) {
      return consecutiveFrames;
    }

    let sequence = [];
    let frames = consecutiveFrames.split('..');

    // coerce string to number
    // @see https://github.com/jed/140bytes/wiki/Byte-saving-techniques#coercion-to-test-for-types
    let start = +frames[0];
    let end = +frames[1];
    let i = start;

    // ascending frame order
    if (start < end) {
      for (; i <= end; i++) {
        sequence.push(i);
      }
    }
    // descending order
    else {
      for (; i >= end; i--) {
        sequence.push(i);
      }
    }

    return sequence;
  }

  /**
   * A sprite sheet to animate a sequence of images. Used to create [animation sprites](api/sprite#animation-sprite).
   *
   * <figure>
   *   <a href="assets/imgs/character_walk_sheet.png">
   *     <img src="assets/imgs/character_walk_sheet.png" width="266" height="512" alt="11 frames of a walking pill-like alien wearing a space helmet.">
   *   </a>
   *   <figcaption>Sprite sheet image courtesy of <a href="https://kenney.nl/assets">Kenney</a>.</figcaption>
   * </figure>
   *
   * Typically you create a sprite sheet just to create animations and then use the animations for your sprite.
   *
   * ```js
   * import { Sprite, SpriteSheet } from 'kontra';
   *
   * let image = new Image();
   * image.src = 'assets/imgs/character_walk_sheet.png';
   * image.onload = function() {
   *   let spriteSheet = SpriteSheet({
   *     image: image,
   *     frameWidth: 72,
   *     frameHeight: 97,
   *     animations: {
   *       // create a named animation: walk
   *       walk: {
   *         frames: '0..9',  // frames 0 through 9
   *         frameRate: 30
   *       }
   *     }
   *   });
   *
   *   let sprite = Sprite({
   *     x: 200,
   *     y: 100,
   *
   *     // use the sprite sheet animations for the sprite
   *     animations: spriteSheet.animations
   *   });
   * };
   * ```
   * @class SpriteSheet
   *
   * @param {Object} properties - Properties of the sprite sheet.
   * @param {HTMLImageElement|HTMLCanvasElement} properties.image - The sprite sheet image.
   * @param {Number} properties.frameWidth - The width of a single frame.
   * @param {Number} properties.frameHeight - The height of a single frame.
   * @param {Number} [properties.spacing=0] - The amount of whitespace between each frame.
   * @param {Number} [properties.margin=0] - The amount of whitespace border around the entire image.
   * @param {Object} [properties.animations] - Animations to create from the sprite sheet using [Animation](api/animation). Passed directly into the sprite sheets [createAnimations()](api/spriteSheet#createAnimations) function.
   */
  class SpriteSheet {
    constructor({
      image,
      frameWidth,
      frameHeight,
      spacing = 0,
      margin = 0,
      animations
    } = {}) {

      /**
       * An object of named [Animation](api/animation) objects. Typically you pass this object into [Sprite](api/sprite) to create an [animation sprites](api/spriteSheet#animation-sprite).
       * @memberof SpriteSheet
       * @property {{[name: String] : Animation}} animations
       */
      this.animations = {};

      /**
       * The sprite sheet image.
       * @memberof SpriteSheet
       * @property {HTMLImageElement|HTMLCanvasElement} image
       */
      this.image = image;

      /**
       * An object that defines properties of a single frame in the sprite sheet. It has properties of `width`, `height`, `spacing`, and `margin`.
       *
       * `width` and `height` are the width of a single frame, while `spacing` defines the amount of whitespace between each frame, and `margin` defines the amount of whitespace border around the image.
       * @memberof SpriteSheet
       * @property {{width: Number, height: Number, spacing: Number, margin: Number}} frame
       */
      this.frame = {
        width: frameWidth,
        height: frameHeight,
        spacing,
        margin
      };

      // f = framesPerRow
      this._f = ((image.width - margin) / frameWidth) | 0;

      this.createAnimations(animations);
    }

    /**
     * Create named animations from the sprite sheet. Called from the constructor if the `animations` argument is passed.
     *
     * This function populates the sprite sheets `animations` property with [Animation](api/animation) objects. Each animation is accessible by its name.
     *
     * ```js
     * import { Sprite, SpriteSheet } from 'kontra';
     *
     * let image = new Image();
     * image.src = 'assets/imgs/character_walk_sheet.png';
     * image.onload = function() {
     *
     *   let spriteSheet = SpriteSheet({
     *     image: image,
     *     frameWidth: 72,
     *     frameHeight: 97,
     *
     *     // this will also call createAnimations()
     *     animations: {
     *       // create 1 animation: idle
     *       idle: {
     *         // a single frame
     *         frames: 1
     *       }
     *     }
     *   });
     *
     *   spriteSheet.createAnimations({
     *     // create 4 animations: jump, walk, moonWalk, attack
     *     jump: {
     *       // sequence of frames (can be non-consecutive)
     *       frames: [1, 10, 1],
     *       frameRate: 10,
     *       loop: false,
     *     },
     *     walk: {
     *       // ascending consecutive frame animation (frames 2-6, inclusive)
     *       frames: '2..6',
     *       frameRate: 20
     *     },
     *     moonWalk: {
     *       // descending consecutive frame animation (frames 6-2, inclusive)
     *       frames: '6..2',
     *       frameRate: 20
     *     },
     *     attack: {
     *       // you can also mix and match, in this case frames [8,9,10,13,10,9,8]
     *       frames: ['8..10', 13, '10..8'],
     *       frameRate: 10,
     *       loop: false,
     *     }
     *   });
     * };
     * ```
     * @memberof SpriteSheet
     * @function createAnimations
     *
     * @param {Object} animations - Object of named animations to create from the sprite sheet.
     * @param {Number|String|Number[]|String[]} animations.<name>.frames - The sequence of frames to use from the sprite sheet. It can either be a single frame (`1`), a sequence of frames (`[1,2,3,4]`), or a consecutive frame notation (`'1..4'`). Sprite sheet frames are `0` indexed.
     * @param {Number} animations.<name>.frameRate - The number frames to display per second.
     * @param {Boolean} [animations.<name>.loop=true] - If the animation should loop back to the beginning once completed.
     */
    createAnimations(animations) {
      let sequence, name;

      for (name in animations) {
        let { frames, frameRate, loop } = animations[name];

        // array that holds the order of the animation
        sequence = [];


        // add new frames to the end of the array
        [].concat(frames).map(frame => {
          sequence = sequence.concat(parseFrames(frame));
        });

        this.animations[name] = factory$b({
          spriteSheet: this,
          frames: sequence,
          frameRate,
          loop,
          name
        });
      }
    }
  }

  function factory$1() {
    return new SpriteSheet(...arguments);
  }

  const // Sound player -- returns a AudioBufferSourceNode
      zzfxP = (...t) => { let e = zzfxX.createBufferSource(), f = zzfxX.createBuffer(t.length, t[0].length, zzfxR); t.map((d, i) => f.getChannelData(i).set(d)), e.buffer = f, e.connect(zzfxX.destination), e.start(); return e },

      // Sound generator -- returns an array of sample data
      zzfxG = (q = 1, k = .05, c = 220, e = 0, t = 0, u = .1, r = 0, F = 1, v = 0, z = 0, w = 0, A = 0, l = 0, B = 0, x = 0, G = 0, d = 0, y = 1, m = 0, C = 0) => { let b = 2 * Math.PI, H = v *= 500 * b / zzfxR ** 2, I = (0 < x ? 1 : -1) * b / 4, D = c *= (1 + 2 * k * Math.random() - k) * b / zzfxR, Z = [], g = 0, E = 0, a = 0, n = 1, J = 0, K = 0, f = 0, p, h; e = 99 + zzfxR * e; m *= zzfxR; t *= zzfxR; u *= zzfxR; d *= zzfxR; z *= 500 * b / zzfxR ** 3; x *= b / zzfxR; w *= b / zzfxR; A *= zzfxR; l = zzfxR * l | 0; for (h = e + m + t + u + d | 0; a < h; Z[a++] = f)++K % (100 * G | 0) || (f = r ? 1 < r ? 2 < r ? 3 < r ? Math.sin((g % b) ** 3) : Math.max(Math.min(Math.tan(g), 1), -1) : 1 - (2 * g / b % 2 + 2) % 2 : 1 - 4 * Math.abs(Math.round(g / b) - g / b) : Math.sin(g), f = (l ? 1 - C + C * Math.sin(2 * Math.PI * a / l) : 1) * (0 < f ? 1 : -1) * Math.abs(f) ** F * q * zzfxV * (a < e ? a / e : a < e + m ? 1 - (a - e) / m * (1 - y) : a < e + m + t ? y : a < h - d ? (h - a - d) / u * y : 0), f = d ? f / 2 + (d > a ? 0 : (a < h - d ? 1 : (h - a) / d) * Z[a - d | 0] / 2) : f), p = (c += v += z) * Math.sin(E * x - I), g += p - p * B * (1 - 1E9 * (Math.sin(a) + 1) % 2), E += p - p * B * (1 - 1E9 * (Math.sin(a) ** 2 + 1) % 2), n && ++n > A && (c += w, D += w, n = 0), !l || ++J % l || (c = D, v = H, n = n || 1); return Z },

      // Global volume
      zzfxV = 0.1,

      // Global sample rate
      zzfxR = 44100,

      // Common audio context
      zzfxX = new (window.AudioContext || webkitAudioContext),

      // ZzFXM (v2.0.3) | (C) Keith Clark | MIT | https://github.com/keithclark/ZzFXM
      zzfxM = (n, f, t, e = 125) => { let l, o, z, r, g, h, x, a, u, c, i, m, p, G, M = 0, R = [], b = [], j = [], k = 0, q = 0, s = 1, v = {}, w = zzfxR / e * 60 >> 2; for (; s; k++)R = [s = a = m = 0], t.map((e, d) => { for (x = f[e][k] || [0, 0, 0], s |= !!f[e][k], G = m + (f[e][0].length - 2 - !a) * w, p = d == t.length - 1, o = 2, r = m; o < x.length + p; a = ++o) { for (g = x[o], u = o == x.length + p - 1 && p || c != (x[0] || 0) | g | 0, z = 0; z < w && a; z++ > w - 99 && u ? i += (i < 1) / 99 : 0)h = (1 - i) * R[M++] / 2 || 0, b[r] = (b[r] || 0) - h * q + h, j[r] = (j[r++] || 0) + h * q + h; g && (i = g % 1, q = x[1] || 0, (g |= 0) && (R = v[[c = x[M = 0] || 0, g]] = v[[c, g]] || (l = [...n[c]], l[2] *= 2 ** ((g - 12) / 12), g > 0 ? zzfxG(...l) : []))); } m = G; }); return [b, j] },

      eat = zzfxG(...[, , 381, .06, .21, .24, 1, .5, -3, -1, , , , , , , , .69, .21]),
      evolve = zzfxG(...[,,448,.02,.27,.15,,4,,-220,492,.15,,,,.1,,.79,.22]),
      explosion = zzfxG(...[, , 333, .01, 0, .9, 4, 1.9, , , , , , .5, , .6]),
      song = zzfxM(...[[[,0,31,,.15,.2,3,5],[.4,0,976,,,.15,2,.2,-0.1,-0.15,9,.02,,.1,.12,,.23],[,0,247,.01,.14,.15,2,,,,,,154.87,.3,,,.25],[3.5,0,84,,,,,.7,,,,.5,,6.7,1,.05],[,0,655,,,.11,2,1.65,,,,,,3.8,-0.1,.1],[.9,0,4e3,,,.03,2,1.25,,,,,.02,6.8,-0.3,,.5],[.3,0,124,.15,.2,.5,3]],[[[,,15,,,,15,,,,15,,,15,,,14,,12,,,,12,,,,12,,,12,,,10,,7,,,,7,,,,7,,,7,,,14,,7,,,,7,,,,10,,,12,,,14,,],[2,,,,,22,,,19,,,,,22,,,19,,,,,22,,,24,,,,,22,,,24,,,,,22,,,21,,,,,22,,,21,,,,,27,,,26,,,,,24,,,22,,],[4,,,,,,13,,,,,,,,13,,,,,,,,13,,,,,,,,13,,,,,,,,13,,,,,,,,13,,,,,,,,13,,,,,,,1,13,,25,,],[5,,,,13,13,,,13,13,,13,13,,,,13,13,,,13,13,,,13,13,,13,13,,,,13,13,,,13,13,,,13,13,,13,13,,,,13,13,,,13,13,,,13,13,,13,13,,,,13,13]],[[,,15,,,,15,,,,15,,,15,,,14,,12,,,,12,,,,12,,,12,,,10,,7,,,,7,,,,7,,,7,,,14,,7,,,,7,,,,10,,,12,,,14,,],[1,1,10,,15,,14,,15,,10,,15,,14,,15,,12,,15,,14,,15,,12,,15,,14,,15,,10,,15,,14,,15,,10,,15,,14,,15,,10,,15,,14,,15,,10,,15,,14,,15,,],[2,,,,,22,,,19,,,,,22,,,19,,,,,22,,,24,,,,,22,,,24,,,,,22,,,21,,,,,22,,,21,,,,,27,,,26,,,,,24,,,22,,],[3,,13,,,,13,,,,13,,,,13,,,,13,,,,13,,,,13,,,,13,,,,13,,,,13,,,,13,,,,13,,,,13,,,,13,,,,13,,,,13,,,,],[4,,,,,,13,,,,,,,,13,,,,,,,,13,,,,,,,,13,,,,,,,,13,,,,,,,,13,,,,,,,,13,,,,,,,1,13,,25,,],[5,-1,,,13,13,,,13,13,,13,13,,,,13,13,,,13,13,,,13,13,,13,13,,,,13,13,,,13,13,,,13,13,,13,13,,,,13,13,,,13,13,,,13,13,,13,13,,,,13,13],[6,-0.3,15,,,,,,,,,,,,17,,,,15,,,,,,,,,,,,17,,,,14,12,10,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,],[6,.3,19,,,,,,,,,,,,22,,,,19,,,,,,,,,,,,20,,,,17,15,14,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,]]],[0,0,1,1,1,1],118,{"title":"Song","instruments":["Dig Dug","Flute","Hall Brass","Bass Drum","Claps","Hihat","Piano"],"patterns":["Intro","Main"]}]);

  var audio = {
      eat,
      evolve,
      explosion,
      song,
      zzfxP
  };

  /* global document, Image, clearTimeout, localStorage, setTimeout, window */
  /* eslint-disable new-cap, no-extra-parens, no-mixed-operators */

  let
      resizeTimeout = null,
      zoomFactor = 1;
  const
      {
          canvas
      } = init$1(),
      ANIMATIONS = {
          asleep: {
              frameRate: 2,
              frames: [6, 7]
          },
          awakeleft: {
              frameRate: 10,
              frames: [8, 9, 10, 11]
          },
          awakeright: {
              frameRate: 10,
              frames: [2, 3, 4, 5]
          },
          eating: {
              frameRate: 2,
              frames: [12, 13]
          },
          exhaustedleft: {
              frameRate: 5,
              frames: [8, 9]
          },
          exhaustedright: {
              frameRate: 5,
              frames: [2, 3]
          },
          idle: {
              frameRate: 5,
              frames: [0, 1]
          }
      },
      // CSS classes for different modes
      CLASS_LIGHTNING = 'lightning',
      CLASS_STORM = 'storm',
      // Debounce delay for resize events in milliseconds
      DEBOUNCE_DELAY = 100,
      KITTEN = 'kitten',
      // Level dimensions in tiles
      LEVEL_HEIGHT = 10,
      LEVEL_WIDTH = 22,
      // Minimum zoom factor to ensure visibility
      MIN_ZOOM = 1,
      ORDER = 'order',
      // Size of each tile in pixels
      TILE_SIZE = 32,
      // Function to calculate distance between two points
      calcDistance = (x1, y1, x2, y2) => {
          const
              dx = x1 - x2,
              dy = y1 - y2;

          // Calculate Euclidean distance
          return Math.sqrt(dx * dx + dy * dy);
      },
      // Clamp a value between a minimum and maximum
      clamp = (value, min, max) => Math.max(min, Math.min(max, value)),
      // Function to draw a sprite with scaling and pixel art handling
      drawSprite = (sprite, scale = 1) => {
          // Disable image smoothing for pixel art
          sprite.context.imageSmoothingEnabled = false;
          sprite.setScale(zoomFactor * scale);
          sprite.draw();
      },
      // Function to format time in seconds to MM:SS
      formatTime = (timeInSeconds) => {
          const
              minutes = Math.floor(timeInSeconds / 60),
              seconds = Math.floor(timeInSeconds % 60);

          // eslint-disable-next-line prefer-template
          return minutes + ':' + seconds.toString().padStart(2, '0');
      },
      // Main game object to hold state and methods
      game = {
          createSheet (name, config) {
              this.sheets[name] = factory$1(config);
          },
          gameTime: 0,
          intro: true,
          muted: false,
          over: false,
          sheets: {}
      },
      getSceneText = (message, action) => `${message}\n\nPRESS ENTER TO ${action || 'CONTINUE'}…`,
      // Function to load images asynchronously
      load = (path, assets) => new Promise((resolve, reject) => {
          const images = {};

          // Create all image loading promises in one go
          Promise.all(assets.map((name) => new Promise((resolveImage) => {
              const img = new Image();

              // Set successful handler first (most common case)
              img.onload = () => {
                  // Store image with key derived from filename (without extension)
                  images[name.split('.')[0]] = img;
                  resolveImage();
              };
              // Handle error case
              img.onerror = () => reject(new Error(`Failed to load: ${path}${name}`));
              // Set source to trigger loading
              img.src = `${path}${name}`;
          }))).
              then(() => resolve(images)).
              catch(reject);
      }),
      // Music controller to manage background music playback
      music = (function () {
          let player = null;

          return {
              start () {
                  if (player) {
                      player.start();
                  } else {
                      player = audio.zzfxP(...audio.song);
                      player.loop = true;
                  }
              },
              stop () {
                  player.stop();
                  player = null;
              }
          };
      }()),
      // Helper to add event listeners
      on = (element, eventType, callback) => element.addEventListener(eventType, callback),
      // Function to randomly position the couch
      positionCouch = () => {
          // Ensure couch is within bounds and not too close to edges
          const
              margin = 2 * TILE_SIZE * zoomFactor,
              maxX = canvas.width - game.couch.width * zoomFactor - margin,
              maxY = canvas.height - game.couch.height * zoomFactor - margin;

          game.couch.x = margin + Math.random() * maxX;
          game.couch.y = margin + Math.random() * maxY;
      },
      // Function to position the food bowl away from couch
      positionFood = () => {
          const
              margin = TILE_SIZE * zoomFactor,
              maxX = canvas.width - game.food.width * zoomFactor - margin,
              maxY = canvas.height - game.food.height * zoomFactor - margin,
              // Minimum distance from couch to food bowl
              minDistance = TILE_SIZE * 4;
          let
              attempts = 0,
              // eslint-disable-next-line init-declarations
              foodX, foodY, toCouch;

          // Try up to 20 times to find a valid position
          do {
              foodX = margin + Math.random() * maxX;
              foodY = margin + Math.random() * maxY;
              toCouch = calcDistance(foodX, foodY, game.couch.x, game.couch.y);
              attempts += 1;
          } while (toCouch < minDistance && attempts < 20);

          // Set the position
          game.food.x = foodX;
          game.food.y = foodY;
          game.food.isVisible = true;
      },
      // Simple query selector helper
      query = (selector) => document.querySelector(selector),
      // Calculate new meter value based on recovery rate
      recoveryRateCalculation = (meter, rate, dt, multiplier = 1) => Math.max(0, meter - rate * multiplier * dt),
      // Function to render title screen, cutscenes and game messages
      renderScene = (text, options = {}) => {
          // Clear any existing objects in the game.scene
          game.scene.objects = [];
          options.animation ||= 'idle';
          options.sheet ||= ORDER;

          // Add a rectangle background
          game.scene.objects.push(factory$8({
              color: options.background || '#F00',
              render () {
                  this.width = canvas.width;
                  this.height = canvas.height / 3;
                  this.y = (canvas.height - this.height) / 2;
                  this.bottom = this.y + this.height;
                  this.draw();
              },
              x: 0
          }));
          // Add the text
          game.scene.objects.push(factory$7({
              color: options.color || '#FFF',
              lineHeight: 1.2,
              render () {
                  const
                      fontSize = zoomFactor === 1 ? 12 : 24,
                      lineHeight = fontSize * 1.2,
                      lines = text.split('\n'),
                      rectHeight = canvas.height / 3,
                      rectY = (canvas.height - rectHeight) / 2,
                      totalTextHeight = lines.length * lineHeight;

                  this.font = `bold ${fontSize}px Courier New`;
                  this.width = canvas.width * 0.5;
                  this.x = canvas.width * 0.4;
                  this.y = rectY + (rectHeight - totalTextHeight) / 2;
                  this.draw();
              },
              text,
              textAlign: 'left'
          }));
          // Add the sprite animation
          game.scene.objects.push(factory$8({
              animations: game.sheets[options.sheet].animations,
              playing: false,
              render () {
                  // Set y postion at the bottom of the red rectangle
                  this.y = game.scene.objects[0].bottom - (this.height * (zoomFactor * 6));
                  // Draw the sprite
                  drawSprite(this, 6);
              },
              update (dt) {
                  if (!this.playing) {
                      this.playAnimation(options.animation);
                  }
                  this.advance(dt);
              }
          }));
          game.scene.start();
      },
      // Function to reset idle and outside range timers
      resetTimers = (obj) => {
          obj.idleTimer = 0;
          obj.outsideRangeTimer = 0;
      },
      // Function to set canvas mode classes
      setCanvasMode = (mode) => {
          canvas.classList.remove(CLASS_STORM, CLASS_LIGHTNING);
          if (mode) {
              canvas.classList.add(mode);
          }
      },
      // Calculate centered position for an object of size 'b' within a dimension 'a'
      setPosition = (a, b) => (a - (b * zoomFactor)) / 2,
      // Calculate and set the appropriate zoom factor based on window dimensions
      setZoomFactor = () => {
          // Calculate the zoom factor based on the window size and level dimensions
          const
              horizontalZoom = Math.floor(window.innerWidth / (LEVEL_WIDTH * TILE_SIZE)),
              verticalZoom = Math.floor((window.innerHeight * 0.8) / (LEVEL_HEIGHT * TILE_SIZE));

          // Calculate the zoom factor based on the window size and level dimensions
          zoomFactor = Math.max(Math.min(horizontalZoom, verticalZoom), MIN_ZOOM);
          // Set the canvas dimensions based on the zoom factor
          canvas.height = LEVEL_HEIGHT * TILE_SIZE * zoomFactor;
          canvas.width = LEVEL_WIDTH * TILE_SIZE * zoomFactor;
      },
      // Function to play sound effects
      soundFx = (effect) => {
          if (audio[effect]) {
              audio.zzfxP(audio[effect]);
          }
      },
      // Function to track and display the best time using localStorage
      trackBestTime = (elapsedSeconds) => {
          const storageKey = 'ootcdBest';
          let bestTime = parseFloat(localStorage.getItem(storageKey)) || Infinity;

          if (elapsedSeconds) {
              // Compare current time with best time and update if better
              if (elapsedSeconds < bestTime) {
                  bestTime = elapsedSeconds;
                  localStorage.setItem(storageKey, bestTime);
              }
          }

          // Update the display if we have a valid best time
          if (bestTime !== Infinity) {
              query('#time t').innerHTML = formatTime(bestTime);
          }
      };

  // Initialize the pointer API
  initPointer();
  // Set the initial zoom factor and canvas dimensions
  setZoomFactor();
  // Display the best time if available
  trackBestTime();
  // Set image path and load assets
  load('images/', ['cat.webp', 'couch.webp', 'food.webp', 'kitten.webp', 'order.webp']).then((imageAssets) => {
      const
          // Base distances in tile units
          BASE_ACTIVATION_DISTANCE = 3 * TILE_SIZE,
          // Maximum distance before cat stops following
          BASE_MAX_FOLLOW_DISTANCE = 6 * TILE_SIZE,
          // Minimum distance to start moving toward the pointer
          BASE_MIN_DISTANCE = 0.125 * TILE_SIZE,
          // Closer distance required to re-engage the cat
          BASE_REENGAGEMENT_DISTANCE = TILE_SIZE,
          // Cat states
          CAT_STATES = {
              ASLEEP: 'asleep',
              AWAKE: 'awake',
              EATING: 'eating',
              EXHAUSTED: 'exhausted',
              IDLE: 'idle',
              SEEKING_COUCH: 'seekingCouch'
          },
          // Distance threshold to consider cat has reached the couch
          COUCH_THRESHOLD = 10,
          // Time in seconds for eating animation
          EATING_DURATION = 3,
          // Evolution constants
          EVOLUTION_BASE_TIME = 20,
          // Rate at which the cat gets tired from movement
          EXHAUST_FACTOR = 0.1,
          // Threshold for exhausted state before falling asleep
          EXHAUST_THRESHOLD = 333,
          // Distance threshold to consider cat has reached the food
          FOOD_THRESHOLD = TILE_SIZE,
          // Time in seconds for idle behavior
          IDLE_TIMEOUT = 1,
          // Time in seconds before cat falls asleep after being idle
          IDLE_TO_SLEEP_TIMEOUT = 10,
          // Evolution level names
          LEVEL = [KITTEN, 'cat', CLASS_STORM, ORDER],
          // Rate at which the exhaust meter recovers
          RECOVERY_RATE = 5,
          // Sleep duration in seconds
          SLEEP_DURATION = 10,
          // Sleep threshold for the exhaust meter
          SLEEP_THRESHOLD = 500;

      // Define the kitten sprite sheet and animations
      game.createSheet(KITTEN, {
          animations: ANIMATIONS,
          frameHeight: TILE_SIZE,
          frameWidth: TILE_SIZE,
          image: imageAssets.kitten
      });

      game.createSheet('cat', {
          animations: ANIMATIONS,
          frameHeight: TILE_SIZE,
          frameWidth: TILE_SIZE,
          image: imageAssets.cat
      });
      game.sheets.cat.animations.idle.frameRate = 2;
      // Reuse cat sheet for storm level
      game.sheets.storm = game.sheets.cat;

      // Define the order sprite sheet and animations
      game.createSheet(ORDER, {
          animations: {
              ascended: {
                  frameRate: 2,
                  frames: [2, 3]
              },
              captured: {
                  frameRate: 0,
                  frames: [4]
              },
              idle: {
                  frameRate: 2,
                  frames: [0, 1]
              }
          },
          frameHeight: TILE_SIZE,
          frameWidth: TILE_SIZE,
          image: imageAssets.order
      });

      // Couch sprite
      game.couch = factory$8({
          image: imageAssets.couch,
          render () {
              drawSprite(this);
          }
      });
      // Position the couch randomly
      positionCouch();

      // Food bowl sprite
      game.food = factory$8({
          image: imageAssets.food,
          // Start invisible until exhausted
          isVisible: false,
          render () {
              if (!this.isVisible) {
                  return;
              }
              drawSprite(this);
          }
      });

      // Cat sprite
      game.cat = factory$8({
          animations: game.sheets.kitten.animations,
          // Method to position the cat on the couch or food bowl
          centerOn (targetObject, xOffset = 0, yOffset = 0) {
              const
                  catScaled = this.scaled(),
                  targetScaled = {
                      height: targetObject.height * zoomFactor,
                      width: targetObject.width * zoomFactor
                  };

              // Position cat in the center of the target object with optional offsets
              this.x = targetObject.x + (targetScaled.width - catScaled.width) / 2 + xOffset;
              this.y = targetObject.y + (targetScaled.height - catScaled.height) / 2 + yOffset;
          },
          // Store the current animation state
          current: {
              facing: null,
              state: null
          },
          // To track movement distance for exhaust meter
          distanceMoved: 0,
          // Timer for eating animation
          eatingTimer: 0,
          // Evolution properties
          evolutionLevel: 0,
          evolutionTargetTime: EVOLUTION_BASE_TIME,
          evolutionTimer: 0,
          // Handles the evolution process
          evolve () {
              let options = {},
                  text = getSceneText('SO… THE KITTEN HAS BECOME A CAT\nYOUR PAWS GROW SWIFT, YOUR EYES SHARP\nBUT THE CRIMSON DOT STILL ELUDES YOU…');

              game.loop.stop();
              this.evolutionLevel += 1;
              this.animations = game.sheets[LEVEL[this.evolutionLevel]].animations;
              soundFx('evolve');
              this.evolutionTargetTime = EVOLUTION_BASE_TIME * (this.evolutionLevel + 1);
              this.happinessMeter -= (this.evolutionLevel * 25);
              // Reposition couch for new level
              positionCouch();
              if (this.evolutionLevel > 2) {
                  game.ascended = true;
                  setCanvasMode();
                  text = getSceneText('AT LAST, THE CRIMSON DOT IS YOURS!');
                  trackBestTime(game.gameTime);
                  options = {
                      animation: 'captured',
                      background: '#BBB',
                      color: '#000'
                  };
              } else if (this.evolutionLevel > 1) {
                  setCanvasMode(CLASS_STORM);
                  text = getSceneText('IMPRESSIVE, BUT BEFORE YOU CAN ASCEND SMALL\nCREATURE, YOU MUST WEATHER THE STORM…');
              }
              // Render the cutscene
              renderScene(text, options);
          },
          // Exhaust meter (0 to SLEEP_THRESHOLD)
          exhaustMeter: 0,
          // Set initial facing direction (default is left)
          facingRight: false,
          // Method to determine the correct animation based on state and direction
          getAnimation () {
              let state = this.state === CAT_STATES.SEEKING_COUCH
                  ? CAT_STATES.EXHAUSTED
                  : this.state;

              // Add facing direction suffix for awake and exhausted states
              if (state === CAT_STATES.AWAKE || state === CAT_STATES.EXHAUSTED) {
                  state += this.facingRight ? 'right' : 'left';
              }

              return this.animations[state];
          },
          // Get evolution progress as a percentage string
          getEvolutionPercent () {
              return this.evolutionTargetTime > 0
                  // eslint-disable-next-line prefer-template
                  ? Math.min(100, Math.floor((this.evolutionTimer / this.evolutionTargetTime) * 100)).toFixed(0) + '%'
                  : '0%';
          },
          // Get stamina as a percentage string (inverted exhaust meter)
          getStaminaPercent () {
              return Math.max(0, (100 - (this.exhaustMeter / 5)));
          },
          // Happiness meter (0 to HAPPINESS_MAX)
          happinessMeter: 0,
          // Time counter for idle behavior
          idleTimer: 0,
          // Store the last pointer position to detect movement
          lastPointerX: 0,
          lastPointerY: 0,
          // To track if the pointer is outside range
          outsideRangeTimer: 0,
          // Called every frame to render the game
          render () {
              drawSprite(this);
          },
          // Return scaled dimensions of the cat sprite
          scaled () {
              return {
                  height: this.height * zoomFactor,
                  width: this.width * zoomFactor
              };
          },
          // Method to update the visual meters
          setMeter (name, value) {
              query(`#${name} b`).style.width = value;
              query(`#${name} v`).innerHTML = value;
          },
          // Method to put the cat to sleep
          sleep (centerOnCouch = true) {
              this.state = CAT_STATES.ASLEEP;
              resetTimers(this);
              this.sleepTimer = 0;
              // Hide food
              game.food.isVisible = false;
              // Center the cat on the couch for sleeping
              if (centerOnCouch) {
                  this.centerOn(game.couch, 0, 0);
              }
          },
          // Sleep timer in seconds
          sleepTimer: 0,
          // Method to start eating
          startEating () {
              this.state = CAT_STATES.EATING;
              resetTimers(this);
              this.eatingTimer = 0;
              this.eatingSoundTimer = 0;
              // Center the cat on the food bowl
              this.centerOn(game.food, -10 * zoomFactor, -5 * zoomFactor);
              soundFx('eat');
          },
          // Method to start seeking the couch
          startSeekingCouch () {
              this.state = CAT_STATES.SEEKING_COUCH;
              resetTimers(this);
          },
          // Current state of the cat
          state: CAT_STATES.AWAKE,
          // Called every frame to update the game
          update (dt) {
              const
                  // Scale distances according to zoom factor
                  activationDistance = BASE_ACTIVATION_DISTANCE * zoomFactor,
                  evolutionMeter = query('#happiness i'),
                  evolutionSpeedBoost = 1 + this.evolutionLevel * 0.1,
                  maxFollowDistance = BASE_MAX_FOLLOW_DISTANCE * zoomFactor,
                  maxSpeed = 5,
                  minDistance = BASE_MIN_DISTANCE * zoomFactor,
                  minSpeed = 0.5,
                  pointer = getPointer(),
                  pointerMoved =
                      Math.abs(pointer.x - this.lastPointerX) > 0.5 ||
                      Math.abs(pointer.y - this.lastPointerY) > 0.5,
                  // Store previous position to calculate distance moved
                  prevX = this.x,
                  prevY = this.y,
                  reengagementDistance = BASE_REENGAGEMENT_DISTANCE * zoomFactor,
                  scaled = this.scaled(),
                  /* eslint-disable sort-vars */
                  dx = (pointer.x / 2) - (this.x / 2),
                  dy = (pointer.y / 2) - (this.y / 2),
                  distance = calcDistance(pointer.x / 2, pointer.y / 2, this.x / 2, this.y / 2),
                  // Add safe check for division by zero
                  directionX = distance ? dx / distance : 0,
                  directionY = distance ? dy / distance : 0,
                  // Check if cat is engaged (in a position where it would move toward the pointer)
                  isEngaged = distance > minDistance && distance < maxFollowDistance &&
                             this.state !== CAT_STATES.SEEKING_COUCH &&
                             this.state !== CAT_STATES.EATING,
                  isOutsideRange = distance >= maxFollowDistance;
                  /* eslint-enable sort-vars */

              // Update the current animation based on state and facing direction
              this.currentAnimation = this.getAnimation();
              this.advance(dt);

              // Update the last pointer position
              this.lastPointerX = pointer.x;
              this.lastPointerY = pointer.y;

              // Evolution timer - only increment when happiness is at 100%
              if (this.happinessMeter >= 100) {
                  this.evolutionTimer += dt;

                  // Check if evolution criteria is met
                  if (this.evolutionTimer >= this.evolutionTargetTime) {
                      this.evolutionTimer = 0;
                      query('#happiness t').innerHTML = 'Happiness…';
                      evolutionMeter.style.width = this.getEvolutionPercent();
                      evolutionMeter.innerHTML = this.getEvolutionPercent();
                      this.evolve();
                  }
              }

              // Update facing direction based on pointer position or couch position if seeking couch
              if (this.state === CAT_STATES.SEEKING_COUCH) {
                  // Face towards the couch
                  const toCouchX = game.couch.x - this.x;

                  if (toCouchX !== 0) {
                      this.facingRight = toCouchX > 0;
                  }
              } else if (dx !== 0 && this.state !== CAT_STATES.EATING) {
                  this.facingRight = dx > 0;
              }

              // Update meters
              this.setMeter('happiness', `${this.happinessMeter.toFixed(0)}%`);
              this.setMeter('exhaust', `${this.getStaminaPercent().toFixed(0)}%`);
              if (this.happinessMeter >= 100) {
                  query('#happiness t').innerHTML = 'Evolving…';
                  evolutionMeter.style.width = this.getEvolutionPercent();
                  evolutionMeter.innerHTML = this.getEvolutionPercent();
              } else {
                  query('#happiness t').innerHTML = 'Happiness';
              }
              query('#time v').innerHTML = formatTime(game.gameTime);
              query('#level').innerHTML = LEVEL[this.evolutionLevel];

              // Handle eating state
              if (this.state === CAT_STATES.EATING) {
                  this.eatingTimer += dt;
                  // Increase happiness while eating
                  this.happinessMeter = Math.min(100, this.happinessMeter + 5 * dt);

                  // Check if eating is complete
                  if (this.eatingTimer >= EATING_DURATION) {
                      this.eatingSoundTimer = 0;
                      // Reset exhaust meter
                      this.exhaustMeter = 0;
                      // Return to awake state
                      this.state = CAT_STATES.AWAKE;
                      // Hide food bowl
                      game.food.isVisible = false;
                  }
                  this.eatingSoundTimer += dt;
                  if (this.eatingSoundTimer >= 1) {
                      soundFx('eat');
                      this.eatingSoundTimer = 0;
                  }

                  // Don't process any other logic while eating
                  return;
              }

              // Handle seeking couch state
              if (this.state === CAT_STATES.SEEKING_COUCH) {
                  // Calculate direction to couch
                  const
                      couchX = game.couch.x - this.x,
                      couchY = game.couch.y - this.y,
                      distanceToCouch = calcDistance(game.couch.x, game.couch.y, this.x, this.y),
                      moveSpeed = minSpeed + (maxSpeed - minSpeed) * 0.25,
                      // Add safe check for division by zero
                      toCouchX = distanceToCouch ? couchX / distanceToCouch : 0,
                      toCouchY = distanceToCouch ? couchY / distanceToCouch : 0;

                  // Continue decreasing happiness while moving to couch
                  this.happinessMeter = Math.max(0, this.happinessMeter - dt);

                  // Check if cat has reached the couch
                  if (distanceToCouch <= COUCH_THRESHOLD) {
                      // Cat has reached the couch, now start sleeping
                      this.sleep();

                      return;
                  }

                  // Move towards couch at a moderate speed
                  this.x = clamp(this.x + toCouchX * moveSpeed, 0, canvas.width - scaled.width);
                  this.y = clamp(this.y + toCouchY * moveSpeed, 0, canvas.height - scaled.height);

                  // Don't process any other logic while seeking couch
                  return;
              }

              // Handle asleep state
              if (this.state === CAT_STATES.ASLEEP) {
                  this.sleepTimer += dt;
                  this.happinessMeter = Math.max(0, this.happinessMeter - dt);
                  if (this.sleepTimer >= SLEEP_DURATION) {
                      this.state = CAT_STATES.AWAKE;
                      this.sleepTimer = 0;
                      // Reduce happiness by 10% when waking up from sleep
                      this.happinessMeter = Math.max(0, this.happinessMeter * 0.90);
                      // Reset exhaust meter based on evolution level
                      this.exhaustMeter = 50 * (this.evolutionLevel + (this.bored ? 2 : 1));
                      this.bored = false;
                  }

                  // Don't process any other logic while asleep
                  return;
              }

              // Check if cat is close to food (when food is visible)
              if (game.food.isVisible && this.state !== CAT_STATES.SEEKING_COUCH) {
                  const toFood = calcDistance(game.food.x, game.food.y, this.x, this.y);

                  // If cat is close enough to food, start eating
                  if (toFood <= FOOD_THRESHOLD) {
                      this.startEating();

                      return;
                  }
              }

              // Increment idle timers
              if (!pointerMoved || isOutsideRange) {
                  this.idleTimer += dt;
                  if (isOutsideRange) {
                      this.outsideRangeTimer += dt;
                  } else {
                      this.outsideRangeTimer = 0;
                  }
              } else if (isEngaged) {
                  // Only reset timers if the cat is actually engaged with the pointer
                  resetTimers(this);
              }

              // If exhausted or idle, require very close proximity to re-engage
              if (this.state === CAT_STATES.EXHAUSTED || this.state === CAT_STATES.IDLE) {
                  // Check if cat should fall asleep after being idle for too long
                  if (this.state === CAT_STATES.IDLE && this.idleTimer >= IDLE_TO_SLEEP_TIMEOUT) {
                      this.bored = true;
                      this.sleep(false);

                      return;
                  }
                  // Check if cat should re-engage
                  if (distance < reengagementDistance && pointerMoved) {
                      this.state = CAT_STATES.AWAKE;
                      resetTimers(this);
                  } else {
                      // Check if cat should become idle (from exhausted)
                      if (this.idleTimer >= IDLE_TIMEOUT || this.outsideRangeTimer >= IDLE_TIMEOUT) {
                          this.state = CAT_STATES.IDLE;
                      }

                      // Handle exhaust meter recovery based on state
                      if (this.exhaustMeter > 0) {
                          if (this.state === CAT_STATES.IDLE) {
                              // Recover energy at a faster rate when idle
                              this.exhaustMeter = recoveryRateCalculation(this.exhaustMeter, RECOVERY_RATE, dt, 1.5);
                          } else {
                              // Recover energy at the normal rate for other states
                              this.exhaustMeter = recoveryRateCalculation(this.exhaustMeter, RECOVERY_RATE, dt);
                          }
                      }

                      // Decrease happiness based on state
                      if (this.state === CAT_STATES.IDLE) {
                          this.happinessMeter = Math.max(0, this.happinessMeter - 2 * dt);
                      } else if (this.state === CAT_STATES.EXHAUSTED) {
                          this.happinessMeter = Math.max(0, this.happinessMeter - 4 * dt);
                      }

                      // Cat stays in current state
                      return;
                  }
              }

              // Check if cat should become idle
              if (this.idleTimer >= IDLE_TIMEOUT || this.outsideRangeTimer >= IDLE_TIMEOUT) {
                  this.state = CAT_STATES.IDLE;

                  return;
              }

              // Only move if we're far enough from the pointer BUT not too far
              if (isEngaged) {
                  // Adjust speed based on distance (closer -> faster)
                  let speed = minSpeed;

                  if (distance < activationDistance) {
                      // Calculate normalized distance (0 = closest, 1 = farthest)
                      const normalizedDistance = distance / activationDistance;

                      /*
                       * Use a non-linear curve for more aggressive acceleration at closer distances
                       * Square the normalized distance to create a steeper curve
                       * This will make the cat accelerate more dramatically as it approaches the pointer
                       */
                      speed = (minSpeed + (maxSpeed - minSpeed) * (1 - normalizedDistance * normalizedDistance)) * evolutionSpeedBoost;
                  }

                  // Update cat's position and clamp to screen bounds
                  this.x = clamp(this.x + directionX * speed, 0, canvas.width - scaled.width);
                  this.y = clamp(this.y + directionY * speed, 0, canvas.height - scaled.height);

                  // Calculate actual distance moved if cat is not idle or asleep
                  if (this.state !== CAT_STATES.IDLE && this.state !== CAT_STATES.ASLEEP) {
                      const distanceMoved = calcDistance(this.x, this.y, prevX, prevY);

                      /*
                       * Increase exhaust meter based on movement distance
                       * Using a factor to convert pixel distance to exhaust units
                       */
                      this.exhaustMeter += distanceMoved * EXHAUST_FACTOR;

                      // Increase happiness when cat is moving and interacting with the pointer
                      if (pointerMoved && distanceMoved > 0) {
                          this.happinessMeter = Math.min(100, this.happinessMeter + 6 * dt);
                      }

                      // Check exhaust thresholds
                      if (this.exhaustMeter >= SLEEP_THRESHOLD) {
                          // Start seeking couch instead of immediately sleeping
                          this.startSeekingCouch();
                      } else if (this.exhaustMeter >= 433 && !game.food.isVisible) {
                          positionFood();
                      } else if (this.exhaustMeter >= EXHAUST_THRESHOLD && this.state !== CAT_STATES.EXHAUSTED) {
                          this.state = CAT_STATES.EXHAUSTED;
                      }
                  }
              }
              // When close to pointer or too far, do nothing - stay at current position

              // Gradually reduce exhaust meter when not moving (only when not sleeping)
              if (this.state !== CAT_STATES.ASLEEP && this.exhaustMeter > 0) {
                  // Recover energy at a slow rate when not moving
                  this.exhaustMeter = recoveryRateCalculation(this.exhaustMeter, RECOVERY_RATE, dt);
              }
          },
          // Initialize position to center of canvas
          x: setPosition(canvas.width, TILE_SIZE * zoomFactor),
          y: setPosition(canvas.height, TILE_SIZE * zoomFactor)
      });

      // Setup the game loop
      game.loop = GameLoop({
          render () {
              // Render couch first so it appears behind the cat
              if (game.cat.evolutionLevel !== 2 || canvas.classList.contains(CLASS_LIGHTNING)) {
                  game.couch.render();
                  // Render food bowl if visible
                  if (game.food.isVisible) {
                      game.food.render();
                  }
              }
              game.cat.render();
          },
          update (dt) {
              game.gameTime += dt;
              game.cat.update(dt);

              // Add lightning effect for storm evolution
              if (game.cat.evolutionLevel === 2) {
                  game.lightningTimer ||= 0;
                  // Count down the timer
                  game.lightningTimer -= dt;

                  if (game.lightningTimer <= 0) {
                      if (canvas.classList.contains(CLASS_LIGHTNING)) {
                          // End the lightning flash
                          setCanvasMode(CLASS_STORM);
                          // Set cooldown until next potential lightning (2-6 seconds)
                          game.lightningTimer = 2 + Math.random() * 4;
                      } else if (Math.random() < 0.33) {
                          // Create a lightning effect
                          setCanvasMode(CLASS_LIGHTNING);
                          soundFx('explosion');
                          // Set duration for this lightning to almost 1 second
                          game.lightningTimer = 0.83;
                      }
                  }
              }
          }
      });

      // Setup the scene manager
      game.scene = GameLoop({
          render () {
              game.scene.objects.forEach((object) => {
                  object.render();
              });
          },
          update () {
              game.scene.objects.forEach((object) => {
                  object.update();
              });
          }
      });

      // Start with the intro scene
      renderScene(getSceneText('NOTHING MAKES THIS LITTLE KITTEN HAPPIER\nTHAN CHASING THE LITTLE RED DOT :)'), {
          background: '#BBB',
          color: '#000',
          sheet: KITTEN
      });

      // Update the zoom factor and canvas dimensions on window resize
      on(window, 'resize', () => {
          clearTimeout(resizeTimeout);
          // Debounce the resize event to avoid excessive calculations
          resizeTimeout = setTimeout(() => {
              setZoomFactor();
              if (game.cat) {
                  game.cat.x = setPosition(canvas.width, game.cat.width);
                  game.cat.y = setPosition(canvas.height, game.cat.height);
              }
              if (game.couch) {
                  positionCouch();
              }
          }, DEBOUNCE_DELAY);
      });

      // Setup keyboard controls
      on(document, 'keyup', (event) => {
          const key = event.key;

          // Stop the scene if running
          if (!game.scene.isStopped) {
              game.scene.stop();
          }
          // Handle pause and unpause
          if (key === 'Escape' || key === 'Enter') {
              if (game.loop.isStopped) {
                  if (game.intro) {
                      game.intro = false;
                      renderScene(getSceneText('A WISE OLD CAT APPEARS BEFORE YOU…\n“IT HAS BEEN EONS SINCE CATS HAVE CLASPED\nTHE CRIMSON DOT IN THEIR CLAWS… DO YOU\nHAVE WHAT IT TAKES TO JOIN THE ORDER?”', 'BEGIN'));
                  } else if (game.ascended) {
                      game.ascended = false;
                      game.intro = true;
                      game.over = true;
                      renderScene(getSceneText(`YOU ASCENDED IN ${formatTime(game.gameTime)}\nTHE ORDER WELCOMES YOU, BUT\nCHALLENGES YOU TO DO BETTER…`, 'TRY AGAIN'), {
                          animation: 'ascended'
                      });
                  } else {
                      if (game.over) {
                          // Reset game state for a new game
                          game.cat.animations = game.sheets.kitten.animations;
                          game.cat.evolutionLevel = 0;
                          game.cat.evolutionTargetTime = EVOLUTION_BASE_TIME;
                          game.cat.evolutionTimer = 0;
                          game.cat.distanceMoved = 0;
                          game.cat.exhaustMeter = 0;
                          game.cat.happinessMeter = 0;
                          game.cat.state = CAT_STATES.AWAKE;
                          game.food.isVisible = false;
                          game.gameTime = 0;
                          game.over = false;
                      }
                      game.loop.start();
                      if (!game.musicPlaying) {
                          game.musicPlaying = true;
                          music.start();
                      }
                  }
              } else {
                  game.loop.stop();
                  {
                      game.musicPlaying = false;
                      music.stop();
                  }
                  // Pause scene
                  renderScene(getSceneText('GAME PAWSED'), {
                      background: '#BBB',
                      color: '#000',
                      sheet: LEVEL[game.cat.evolutionLevel]
                  });
              }
          }
      });
  });

})();
