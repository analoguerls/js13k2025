/* global document, Image, clearTimeout, setTimeout, window */
/* eslint-disable new-cap, no-extra-parens, no-mixed-operators */
import {
    GameLoop,
    Sprite,
    getPointer,
    init,
    initPointer
} from '../../node_modules/kontra/kontra';
import audio from './zzFx.js';

let
    resizeTimeout = null,
    zoomFactor = 1;
const
    {
        canvas
    } = init(),
    DEBOUNCE_DELAY = 100,
    // Level dimensions in tiles
    LEVEL_HEIGHT = 10,
    LEVEL_WIDTH = 20,
    // Minimum zoom factor to ensure visibility
    MIN_ZOOM = 1,
    POINTER_OFFSET = 12,
    // Size of each tile in pixels
    TILE_SIZE = 16,
    clamp = (value, min, max) => Math.max(min, Math.min(max, value)),
    game = {
        muted: false
    },
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
    on = (element, eventType, callback) => element.addEventListener(eventType, callback),
    recoveryRateCalculation = (meter, rate, dt, multiplier = 1) => Math.max(0, meter - rate * multiplier * dt),
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
    soundFx = (effect) => {
        if (audio[effect]) {
            audio.zzfxP(audio[effect]);
        }
    };

// Initialize the pointer API
initPointer();
// Set the initial zoom factor and canvas dimensions
setZoomFactor();
// Set image path and load assets
load('images/', [
    'cat.png',
    'catRight.png',
    'exhausted.png',
    'food.webp',
    'idle.png',
    'pointer.webp',
    'sleep.png'
]).then((imageAssets) => {
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
            EXHAUSTED: 'exhausted',
            IDLE: 'idle'
        },
        // Evolution constants
        EVOLUTION_BASE_TIME = 15,
        // Rate at which the cat gets tired from movement
        EXHAUST_FACTOR = 0.1,
        // Threshold for exhausted state before falling asleep
        EXHAUST_THRESHOLD = 250,
        // Time in seconds for idle behavior
        IDLE_TIMEOUT = 10,
        // Time in seconds before cat falls asleep after being idle
        IDLE_TO_SLEEP_TIMEOUT = 20,
        // Rate at which the exhaust meter recovers
        RECOVERY_RATE = 1.5,
        // Sleep duration in seconds
        SLEEP_DURATION = 15,
        // Sleep threshold for the exhaust meter
        SLEEP_THRESHOLD = 500,
        cat = Sprite({
            current: {
                facing: null,
                state: null
            },
            // To track movement distance for exhaust meter
            distanceMoved: 0,
            // Evolution properties
            evolutionLevel: 1,
            evolutionTargetTime: EVOLUTION_BASE_TIME,
            evolutionTimer: 0,
            evolve () {
                this.evolutionLevel += 1;
                // Use existing effect or add a specific evolution sound
                soundFx('explosion');
                this.evolutionTimer = 0;
                this.evolutionTargetTime = EVOLUTION_BASE_TIME * this.evolutionLevel;
            },
            // Exhaust meter (0 to SLEEP_THRESHOLD)
            exhaustMeter: 0,
            // Set initial facing direction (default is left)
            facingRight: false,
            getCatImage () {
                switch (this.state) {
                case CAT_STATES.IDLE:
                    return imageAssets.idle;
                case CAT_STATES.ASLEEP:
                    return imageAssets.sleep;
                case CAT_STATES.EXHAUSTED:
                    return imageAssets.exhausted;
                default:
                    return this.facingRight ? imageAssets.catRight : imageAssets.cat;
                }
            },
            // Happiness meter (0 to HAPPINESS_MAX)
            happinessMeter: 25,
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
                    this.image = this.getCatImage();
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
            sleep () {
                this.state = CAT_STATES.ASLEEP;
                this.idleTimer = 0;
                this.outsideRangeTimer = 0;
                this.sleepTimer = 0;
            },
            // Sleep timer in seconds
            sleepTimer: 0,
            state: CAT_STATES.AWAKE,
            update (dt) {
                const
                    // Scale distances according to zoom factor
                    activationDistance = BASE_ACTIVATION_DISTANCE * zoomFactor,
                    evolutionSpeedBoost = 1 + (this.evolutionLevel - 1) * 0.25,
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
                    // Check if cat is engaged (in a position where it would move toward the pointer)
                    isEngaged = distance > minDistance && distance < maxFollowDistance,
                    isOutsideRange = distance >= maxFollowDistance;
                    /* eslint-enable sort-vars */

                // Update the last pointer position
                this.lastPointerX = pointer.x;
                this.lastPointerY = pointer.y;

                // Evolution timer - only increment when happiness is at 100%
                if (this.happinessMeter >= 100) {
                    this.evolutionTimer += dt;

                    // Check if evolution criteria is met
                    if (this.evolutionTimer >= this.evolutionTargetTime) {
                        this.evolve();
                    }
                }

                /*
                 * Update facing direction based on pointer position
                 * If dx is positive, pointer is to the right of the cat
                 * If dx is negative, pointer is to the left of the cat
                 */
                if (dx !== 0) {
                    this.facingRight = dx > 0;
                }

                // @ifdef DEBUG
                document.getElementById('state').innerHTML = cat.state;
                document.getElementById('happinessMeter').innerHTML = cat.happinessMeter.toFixed(2);
                document.getElementById('exhaustMeter').innerHTML = cat.exhaustMeter.toFixed(2);
                document.getElementById('distanceMoved').innerHTML = cat.distanceMoved.toFixed(2);
                document.getElementById('idleTimer').innerHTML = cat.idleTimer.toFixed(2);
                document.getElementById('outsideRangeTimer').innerHTML = cat.outsideRangeTimer.toFixed(2);
                document.getElementById('sleepTimer').innerHTML = cat.sleepTimer.toFixed(2);
                document.getElementById('evolutionTimer').innerHTML = cat.evolutionTimer.toFixed(2);
                document.getElementById('evolutionLevel').innerHTML = cat.evolutionLevel;
                // @endif

                // Handle asleep state
                if (this.state === CAT_STATES.ASLEEP) {
                    this.sleepTimer += dt;
                    if (this.sleepTimer >= SLEEP_DURATION) {
                        this.state = CAT_STATES.AWAKE;
                        this.sleepTimer = 0;
                        // Reset exhaust meter when waking up
                        this.exhaustMeter = 0;
                        // Decrease happiness by 10% upon waking
                        this.happinessMeter *= 0.9;
                    }

                    // Don't process any other logic while asleep
                    return;
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
                    this.idleTimer = 0;
                    this.outsideRangeTimer = 0;
                }

                // If exhausted or idle, require very close proximity to re-engage
                if (this.state === CAT_STATES.EXHAUSTED || this.state === CAT_STATES.IDLE) {
                    // Check if cat should fall asleep after being idle for too long
                    if (this.state === CAT_STATES.IDLE && this.idleTimer >= IDLE_TO_SLEEP_TIMEOUT) {
                        this.sleep();

                        return;
                    }

                    if (distance < reengagementDistance && pointerMoved) {
                        this.state = CAT_STATES.AWAKE;
                        this.idleTimer = 0;
                        this.outsideRangeTimer = 0;
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
                        const
                            moveX = this.x - prevX,
                            moveY = this.y - prevY,
                            // eslint-disable-next-line sort-vars
                            distanceMoved = Math.sqrt(moveX * moveX + moveY * moveY);

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
                            this.sleep();
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
            x: setPosition(canvas.width, imageAssets.cat.width),
            y: setPosition(canvas.height, imageAssets.cat.height)
        }),
        point = Sprite({
            image: imageAssets.pointer,
            update () {
                const pointer = getPointer();

                // Position the point directly above the pointer
                this.x = pointer.x;
                this.y = pointer.y - POINTER_OFFSET;
            },
            x: 0,
            y: 0
        });

    // Update the zoom factor and canvas dimensions on window resize
    on(window, 'resize', () => {
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

    on(document, 'keyup', (event) => {
        const key = event.key;

        if (key === 'Escape' || key === 'Enter') {
            if (game.loop.isStopped) {
                game.loop.start();
                if (!game.muted) {
                    music.start();
                }
            } else {
                game.loop.stop();
                if (!game.muted) {
                    music.stop();
                }
            }
        }
        if (key === 'm') {
            game.muted = !game.muted;
            if (game.muted) {
                music.stop();
            } else if (game.loop.isStopped) {
                music.start();
            }
        }
        // @ifdef DEBUG
        if (key === 'e') {
            soundFx('explosion');
        }
        // @endif
    });
});
