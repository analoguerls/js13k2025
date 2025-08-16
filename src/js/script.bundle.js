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
  function clamp(min, max, value) {
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


    // account for anchor
    if (obj.anchor) {
      x -= width * obj.anchor.x;
      y -= height * obj.anchor.y;
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
  function on(event, callback) {
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



        ...props
      });

      // di = done init
      this._di = true;
      this._uw();


      // rf = render function
      this._rf = render;

      // uf = update function
      this._uf = update;

      on('init', () => {
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


      // 5) translate to the anchor so (0,0) is the top left corner
      // for the render function
      let width = this.width;
      let height = this.height;


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

      } = this.parent || {};

      // wx = world x, wy = world y
      this._wx = this.x;
      this._wy = this.y;

      // ww = world width, wh = world height
      this._ww = this.width;
      this._wh = this.height;




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



        rotation: this._wrot,

      };
    }

    // --------------------------------------------------
    // group
    // --------------------------------------------------


    // --------------------------------------------------
    // radius
    // --------------------------------------------------


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


        this.context.fillRect(0, 0, this.width, this.height);
      }
    }
  }

  function factory$8() {
    return new Sprite(...arguments);
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
      on('tick', () => {
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

    on('init', () => {
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

  /* global Image, clearTimeout, setTimeout, window */
  /* eslint-disable new-cap, no-extra-parens, no-mixed-operators */

  let
      resizeTimeout = null,
      zoomFactor = 1;
  const
      {
          canvas
      } = init$1('game'),
      DEBOUNCE_DELAY = 100,
      // Level dimensions in tiles
      LEVEL_HEIGHT = 10,
      LEVEL_WIDTH = 20,
      // Minimum zoom factor to ensure visibility
      MIN_ZOOM = 1,
      POINTER_OFFSET = 4,
      // Size of each tile in pixels
      TILE_SIZE = 16,
      game = {},
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
      setPosition = (a, b) => (a - (b * zoomFactor)) / 2,
      // Calculate and set the appropriate zoom factor based on window dimensions
      setZoomFactor = function () {
          // Calculate the zoom factor based on the window size and level dimensions
          const
              horizontalZoom = Math.floor(window.innerWidth / (LEVEL_WIDTH * TILE_SIZE)),
              verticalZoom = Math.floor((window.innerHeight * 0.8) / (LEVEL_HEIGHT * TILE_SIZE));

          // Calculate the zoom factor based on the window size and level dimensions
          zoomFactor = Math.max(Math.min(horizontalZoom, verticalZoom), MIN_ZOOM);
          // Set the canvas dimensions based on the zoom factor
          canvas.height = LEVEL_HEIGHT * TILE_SIZE * zoomFactor;
          canvas.width = LEVEL_WIDTH * TILE_SIZE * zoomFactor;
      };

  // Initialize the pointer API
  initPointer();
  // Set the initial zoom factor and canvas dimensions
  setZoomFactor();
  // Set image path and load assets
  load('images/', ['cat.png', 'catRight.png', 'idle.png', 'tired.png', 'sleep.png']).then((imageAssets) => {
      const
          // Base distances in tile units
          BASE_ACTIVATION_DISTANCE = 3 * TILE_SIZE,
          BASE_MAX_FOLLOW_DISTANCE = 6 * TILE_SIZE,
          BASE_MIN_DISTANCE = 0.125 * TILE_SIZE,
          // Closer distance required to re-engage the cat
          BASE_REENGAGEMENT_DISTANCE = TILE_SIZE,
          CAT_STATES = {
              ASLEEP: 'asleep',
              AWAKE: 'awake',
              IDLE: 'idle',
              TIRED: 'tired'
          },
          // Time in seconds for idle behavior
          IDLE_TIMEOUT = 10,
          // Tiredness thresholds (in arbitrary energy units)
          RECOVERY_RATE = 0.5,
          // Sleep duration in seconds
          SLEEP_DURATION = 15,
          SLEEP_THRESHOLD = 300,
          TIRED_FACTOR = 0.1,
          // Threshold for tired state before falling asleep
          TIRED_THRESHOLD = 150,
          cat = factory$8({
              current: {
                  facing: null,
                  state: null
              },
              // To track movement distance for tired meter
              distanceMoved: 0,
              // Set initial facing direction (default is left)
              facingRight: false,
              // Time counter for idle behavior
              idleTimer: 0,
              image: imageAssets.cat,
              // Store the last pointer position to detect movement
              lastPointerX: 0,
              lastPointerY: 0,
              // To track if the pointer is outside range
              outsideRangeTimer: 0,
              render () {
                  // Disable image smoothing for pixel art
                  this.context.imageSmoothingEnabled = false;
                  this.setScale(zoomFactor);

                  // Only update image when state or facing direction changes
                  if (this.state !== this.current.state ||
                      (this.state === CAT_STATES.AWAKE && this.facingRight !== this.current.facing)) {

                      this.current.state = this.state;
                      this.current.facing = this.facingRight;

                      if (this.state === CAT_STATES.IDLE) {
                          this.image = imageAssets.idle;
                      } else if (this.state === CAT_STATES.ASLEEP) {
                          this.image = imageAssets.sleep;
                      } else if (this.state === CAT_STATES.TIRED) {
                          this.image = imageAssets.tired;
                      } else if (this.state === CAT_STATES.AWAKE && this.facingRight) {
                          this.image = imageAssets.catRight;
                      } else {
                          this.image = imageAssets.cat;
                      }
                  }

                  // Draw the sprite
                  this.draw();
              },
              scaled () {
                  return {
                      height: this.height * zoomFactor,
                      width: this.width * zoomFactor
                  };
              },
              // Sleep timer in seconds
              sleepTimer: 0,
              state: CAT_STATES.AWAKE,
              // Tiredness meter (0 to SLEEP_THRESHOLD)
              tiredMeter: 0,
              update (dt) {
                  const
                      // Scale distances according to zoom factor
                      activationDistance = BASE_ACTIVATION_DISTANCE * zoomFactor,
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
                      distance = Math.sqrt(dx * dx + dy * dy),
                      // Add safe check for division by zero
                      directionX = distance ? dx / distance : 0,
                      directionY = distance ? dy / distance : 0,
                      isOutsideRange = distance >= maxFollowDistance;
                      /* eslint-enable sort-vars */

                  // Update the last pointer position
                  this.lastPointerX = pointer.x;
                  this.lastPointerY = pointer.y;

                  // Handle asleep state
                  if (this.state === CAT_STATES.ASLEEP) {
                      this.sleepTimer += dt;
                      if (this.sleepTimer >= SLEEP_DURATION) {
                          this.state = CAT_STATES.AWAKE;
                          this.sleepTimer = 0;
                          // Reset tired meter when waking up
                          this.tiredMeter = 0;
                      }

                      // Don't process any other logic while asleep
                      return;
                  }

                  /*
                   * Update facing direction based on pointer position
                   * If dx is positive, pointer is to the right of the cat
                   * If dx is negative, pointer is to the left of the cat
                   */
                  if (dx !== 0) {
                      this.facingRight = dx > 0;
                  }

                  // If idle or tired, require very close proximity to re-engage
                  if (this.state === CAT_STATES.IDLE || this.state === CAT_STATES.TIRED) {
                      if (distance < reengagementDistance && pointerMoved) {
                          this.state = CAT_STATES.AWAKE;
                          this.idleTimer = 0;
                          this.outsideRangeTimer = 0;
                      } else {
                          // Cat stays in current state
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
                  } else {
                      // Reset timers if there's movement within range
                      this.idleTimer = 0;
                      this.outsideRangeTimer = 0;
                  }

                  // Check if cat should become idle
                  if (this.idleTimer >= IDLE_TIMEOUT || this.outsideRangeTimer >= IDLE_TIMEOUT) {
                      this.state = CAT_STATES.IDLE;

                      return;
                  }

                  // Only move if we're far enough from the pointer BUT not too far
                  if (distance > minDistance && distance < maxFollowDistance) {
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
                          speed = minSpeed + (maxSpeed - minSpeed) * (1 - normalizedDistance * normalizedDistance);
                      }

                      // Update cat's position
                      this.x += directionX * speed;
                      this.y += directionY * speed;

                      // Clamp x position (left and right bounds)
                      this.x = Math.max(0, Math.min(canvas.width - scaled.width, this.x));

                      // Clamp y position (top and bottom bounds)
                      this.y = Math.max(0, Math.min(canvas.height - scaled.height, this.y));

                      // Calculate actual distance moved if cat is not idle or asleep
                      if (this.state !== CAT_STATES.IDLE && this.state !== CAT_STATES.ASLEEP) {
                          const
                              moveX = this.x - prevX,
                              moveY = this.y - prevY,
                              // eslint-disable-next-line sort-vars
                              distanceMoved = Math.sqrt(moveX * moveX + moveY * moveY);

                          /*
                           * Increase tired meter based on movement distance
                           * Using a factor to convert pixel distance to tired units
                           */
                          this.tiredMeter += distanceMoved * TIRED_FACTOR;

                          // Check tired thresholds
                          if (this.tiredMeter >= SLEEP_THRESHOLD) {
                              this.state = CAT_STATES.ASLEEP;
                              this.sleepTimer = 0;
                          } else if (this.tiredMeter >= TIRED_THRESHOLD && this.state !== CAT_STATES.TIRED) {
                              this.state = CAT_STATES.TIRED;
                          }
                      }
                  }
                  // When close to pointer or too far, do nothing - stay at current position

                  // Gradually reduce tired meter when not moving (only when not already tired or sleeping)
                  if (this.state === CAT_STATES.AWAKE && this.tiredMeter > 0) {
                      // Recover energy at a slow rate when not moving
                      this.tiredMeter = Math.max(0, this.tiredMeter - RECOVERY_RATE * dt);
                  }
              },
              x: setPosition(canvas.width, imageAssets.cat.width),
              y: setPosition(canvas.height, imageAssets.cat.height)
          }),
          point = factory$8({
              color: 'red',
              radius: 3,
              render () {
                  this.context.fillStyle = this.color;
                  this.context.beginPath();
                  this.context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                  this.context.fill();
              },
              update () {
                  const pointer = getPointer();

                  // Position the point directly above the pointer
                  this.x = pointer.x / 2;
                  this.y = (pointer.y / 2) - POINTER_OFFSET;
              },
              x: 0,
              y: 0
          });

      // Update the zoom factor and canvas dimensions on window resize
      window.addEventListener('resize', () => {
          clearTimeout(resizeTimeout);
          // Debounce the resize event to avoid excessive calculations
          resizeTimeout = setTimeout(() => {
              setZoomFactor();
              if (cat) {
                  cat.x = setPosition(canvas.width, cat.width);
                  cat.y = setPosition(canvas.height, cat.height);
              }
          }, DEBOUNCE_DELAY);
      });

      // Setup the game loop
      game.loop = GameLoop({
          render () {
              cat.render();
              point.render();
          },
          update (dt) {
              cat.update(dt);
              point.update();
          }
      });
      // Start the game loop
      game.loop.start();
  });

})();
