/* global window */
/* eslint-disable new-cap, no-extra-parens, no-mixed-operators */
import {
    GameLoop,
    Sprite,
    getPointer,
    imageAssets,
    init,
    initPointer,
    load,
    setImagePath
} from 'https://unpkg.com/kontra@10.0.2/kontra.mjs';

let
    zoomFactor = 1;
const
    {
        canvas
    } = init('game'),
    // Level dimensions in tiles
    LEVEL_HEIGHT = 10,
    LEVEL_WIDTH = 20,
    // Minimum zoom factor to ensure visibility
    MIN_ZOOM = 1,
    // Size of each tile in pixels
    TILE_SIZE = 16,
    game = {},
    pointerOffset = 10,
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
setImagePath('images/');
load('cat.png', 'idle.png', 'sleep.png').then(() => {
    const
        // Base distances in tile units
        BASE_ACTIVATION_DISTANCE = 3 * TILE_SIZE,
        BASE_MAX_FOLLOW_DISTANCE = 6 * TILE_SIZE,
        BASE_MIN_DISTANCE = 0.125 * TILE_SIZE,
        // Closer distance required to re-engage the cat
        BASE_REENGAGEMENT_DISTANCE = TILE_SIZE,
        CAT_STATES = {
            AWAKE: 'awake',
            IDLE: 'idle',
            SLEEPING: 'sleeping',
            TIRED: 'tired'
        },
        // Time in seconds for idle behavior
        IDLE_TIMEOUT = 15,
        cat = Sprite({
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

                // Use different images based on cat state
                if (this.state === CAT_STATES.IDLE) {
                    this.image = imageAssets.idle;
                } else {
                    this.image = imageAssets.cat;
                }

                // Set horizontal flip based on facingRight property
                const originalWidth = this.image.width * zoomFactor;

                this.width = this.facingRight ? originalWidth : -originalWidth;
                console.log(`Cat width set to ${this.width} (facing ${this.facingRight ? 'right' : 'left'})`);
                // Draw the sprite as usual
                this.draw();
            },
            scaled () {
                return {
                    height: this.height * zoomFactor,
                    width: this.width * zoomFactor
                };
            },
            state: CAT_STATES.AWAKE,
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
                        pointer.x !== this.lastPointerX ||
                        pointer.y !== this.lastPointerY,
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

                /*
                 * Update facing direction based on pointer position
                 * If dx is positive, pointer is to the right of the cat
                 * If dx is negative, pointer is to the left of the cat
                 */
                if (dx !== 0) {
                    this.facingRight = dx > 0;
                }

                // If idle, require very close proximity to re-engage
                if (this.state === CAT_STATES.IDLE) {
                    if (distance < reengagementDistance && pointerMoved) {
                        this.state = CAT_STATES.AWAKE;
                        this.idleTimer = 0;
                        this.outsideRangeTimer = 0;
                    } else {
                        // Cat stays idle
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
                }
                // When close to pointer or too far, do nothing - stay at current position
            },
            x: setPosition(canvas.width, imageAssets.cat.width),
            y: setPosition(canvas.height, imageAssets.cat.height)
        }),
        point = Sprite({
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
                this.y = (pointer.y / 2) - pointerOffset;
            },
            x: 0,
            y: 0
        });

    // Update the zoom factor and canvas dimensions on window resize
    window.addEventListener('resize', () => {
        setZoomFactor();
        if (cat) {
            cat.x = setPosition(canvas.width, cat.width);
            cat.y = setPosition(canvas.height, cat.height);
        }
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
