/* global document, Image, clearTimeout, localStorage, setTimeout, window */
/* eslint-disable new-cap, no-extra-parens, no-mixed-operators */
import {
    GameLoop,
    Sprite,
    SpriteSheet,
    Text,
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
    CLASS_LIGHTNING = 'lightning',
    CLASS_STORM = 'storm',
    DEBOUNCE_DELAY = 100,
    // Level dimensions in tiles
    LEVEL_HEIGHT = 10,
    LEVEL_WIDTH = 22,
    // Minimum zoom factor to ensure visibility
    MIN_ZOOM = 1,
    // Size of each tile in pixels
    TILE_SIZE = 32,
    calcDistance = (x1, y1, x2, y2) => {
        const
            dx = x1 - x2,
            dy = y1 - y2;

        // Calculate Euclidean distance
        return Math.sqrt(dx * dx + dy * dy);
    },
    clamp = (value, min, max) => Math.max(min, Math.min(max, value)),
    drawSprite = (sprite, scale = 1) => {
        // Disable image smoothing for pixel art
        sprite.context.imageSmoothingEnabled = false;
        sprite.setScale(zoomFactor * scale);
        sprite.draw();
    },
    formatTime = (timeInSeconds) => {
        const
            minutes = Math.floor(timeInSeconds / 60),
            seconds = Math.floor(timeInSeconds % 60);

        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    },
    game = {
        createSheet (name, config) {
            this.sheets[name] = SpriteSheet(config);
        },
        gameTime: 0,
        muted: false,
        over: false,
        sheets: {}
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
    query = (selector) => document.querySelector(selector),
    recoveryRateCalculation = (meter, rate, dt, multiplier = 1) => Math.max(0, meter - rate * multiplier * dt),
    renderScene = (text, options) => {
        // Clear any existing objects in the game.scene
        game.scene.objects = [];

        // Add a red rectangle background
        game.scene.objects.push(Sprite({
            color: '#F00',
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
        game.scene.objects.push(Text({
            color: '#FFF',
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
        game.scene.objects.push(Sprite({
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
    resetTimers = (obj) => {
        obj.idleTimer = 0;
        obj.outsideRangeTimer = 0;
    },
    setCanvasMode = (mode) => {
        canvas.classList.remove(CLASS_STORM, CLASS_LIGHTNING);
        if (mode) {
            canvas.classList.add(mode);
        }
    },
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
load('images/', ['couch.webp', 'food.webp', 'kitten.png', 'order.webp']).then((imageAssets) => {
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
        LEVEL = ['kitten', 'cat', CLASS_STORM, 'order'],
        // Rate at which the exhaust meter recovers
        RECOVERY_RATE = 5,
        // Sleep duration in seconds
        SLEEP_DURATION = 10,
        // Sleep threshold for the exhaust meter
        SLEEP_THRESHOLD = 500;

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

    game.createSheet('kitten', {
        animations: {
            asleep: {
                frameRate: 2,
                frames: [7, 8]
            },
            awakeleft: {
                frameRate: 10,
                frames: [9, 10, 11, 12]
            },
            awakeright: {
                frameRate: 10,
                frames: [3, 4, 5, 6]
            },
            eating: {
                frameRate: 10,
                // Temporarily use idle animations for eating
                frames: [0, 1, 2]
            },
            exhaustedleft: {
                frameRate: 5,
                frames: [9, 10]
            },
            exhaustedright: {
                frameRate: 5,
                frames: [3, 4]
            },
            idle: {
                frameRate: 10,
                frames: [0, 1, 2]
            }
        },
        frameHeight: 32,
        frameWidth: 32,
        image: imageAssets.kitten
    });

    // TODO: Replace with actual cat sprite sheet
    game.sheets.cat = game.sheets.kitten;
    game.sheets.storm = game.sheets.cat;

    game.createSheet('order', {
        animations: {
            ascended: {
                frameRate: 2,
                frames: [2, 3]
            },
            idle: {
                frameRate: 2,
                frames: [0, 1]
            }
        },
        frameHeight: 32,
        frameWidth: 32,
        image: imageAssets.order
    });

    // Couch sprite
    game.couch = Sprite({
        image: imageAssets.couch,
        render () {
            drawSprite(this);
        }
    });
    // Position the couch randomly
    positionCouch();

    // Food bowl sprite
    game.food = Sprite({
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
    game.cat = Sprite({
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
            let text = 'IT HAS BEEN EONS SINCE ONE OF OUR KIND\nHAS CLASPED THE CRIMSON DOT IN THIER CLAWS…\n\nPRESS ENTER TO CONTINUE…';

            game.loop.stop();
            this.evolutionLevel += 1;
            soundFx('evolve');
            this.evolutionTimer = 0;
            this.evolutionTargetTime = EVOLUTION_BASE_TIME * (this.evolutionLevel + 1);
            // Reposition couch for new level
            positionCouch();
            if (this.evolutionLevel > 2) {
                game.over = true;
                setCanvasMode();
                text = `YOU HAVE CLAIMED THE CRIMSON DOT IN ${formatTime(game.gameTime)}\nTHE ORDER CHALLENGES YOU TO DO BETTER…\n\nPRESS ENTER TO PLAY AGAIN…`;
                trackBestTime(game.gameTime);
            } else if (this.evolutionLevel > 1) {
                setCanvasMode(CLASS_STORM);
                text = 'YOU ARE READY TO ASCEND SMALL CREATURE,\nBUT FIRST, YOU MUST WEATHER THE STORM…\n\nPRESS ENTER TO CONTINUE…';
            }
            // Render the cutscene
            renderScene(text, {
                animation: game.over ? 'ascended' : 'idle',
                sheet: 'order'
            });
        },
        // Exhaust meter (0 to SLEEP_THRESHOLD)
        exhaustMeter: 0,
        // Set initial facing direction (default is left)
        facingRight: false,
        getAnimation () {
            const suffix = this.facingRight ? 'right' : 'left';
            let state = 'asleep';

            if (this.state === CAT_STATES.EATING) {
                state = 'eating';
            } else if (this.state === CAT_STATES.EXHAUSTED || this.state === CAT_STATES.SEEKING_COUCH) {
                // eslint-disable-next-line prefer-template
                state = 'exhausted' + suffix;
            } else if (this.state === CAT_STATES.IDLE) {
                state = 'idle';
            } else if (this.state !== CAT_STATES.ASLEEP) {
                // eslint-disable-next-line prefer-template
                state = 'awake' + suffix;
            }

            return this.animations[state];
        },
        getEvolutionPercent () {
            return this.evolutionTargetTime > 0
                // eslint-disable-next-line prefer-template
                ? Math.min(100, Math.floor((this.evolutionTimer / this.evolutionTargetTime) * 100)).toFixed(0) + '%'
                : '0%';
        },
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
        render () {
            drawSprite(this);
        },
        scaled () {
            return {
                height: this.height * zoomFactor,
                width: this.width * zoomFactor
            };
        },
        setMeter (name, value) {
            query(`#${name} b`).style.width = value;
            query(`#${name} v`).innerHTML = value;
        },
        sleep (centerOnCouch = true) {
            this.state = CAT_STATES.ASLEEP;
            resetTimers(this);
            this.sleepTimer = 0;
            // Hide food
            game.food.isVisible = false;
            // Center the cat on the couch for sleeping

            if (centerOnCouch) {
                this.centerOn(game.couch, 8 * zoomFactor, -2 * zoomFactor);
            }
        },
        // Sleep timer in seconds
        sleepTimer: 0,
        startEating () {
            this.state = CAT_STATES.EATING;
            resetTimers(this);
            this.eatingTimer = 0;
            this.eatingSoundTimer = 0;
            // Center the cat on the food bowl
            this.centerOn(game.food, -10 * zoomFactor, -5 * zoomFactor);
            soundFx('eat');
        },
        startSeekingCouch () {
            this.state = CAT_STATES.SEEKING_COUCH;
            resetTimers(this);
        },
        state: CAT_STATES.AWAKE,
        update (dt) {
            const
                // Scale distances according to zoom factor
                activationDistance = BASE_ACTIVATION_DISTANCE * zoomFactor,
                evolutionSpeedBoost = 1 + this.evolutionLevel * 0.25,
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
                const evolution = query('#happiness i');

                query('#happiness t').innerHTML = 'Evolving…';
                evolution.style.width = this.getEvolutionPercent();
                evolution.innerHTML = this.getEvolutionPercent();
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
                // Initialize lightning properties if they don't exist
                if (!game.lightningTimer) {
                    game.lightningTimer = 0;
                    game.lightningDuration = 0;
                    // Initial cooldown before first lightning
                    game.lightningCooldown = 3;
                }

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
                        game.lightningDuration = 0.83;
                        game.lightningTimer = game.lightningDuration;
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
    renderScene('SO… YOU THINK YOU HAVE WHAT IT TAKES\nTO JOIN THE ORDER OF THE CRIMSON DOT?\n\nTHEN PRESS ENTER TO BEGIN…', {
        animation: 'idle',
        sheet: 'order'
    });

    // Setup keyboard controls
    on(document, 'keyup', (event) => {
        const key = event.key;

        if (!game.scene.isStopped) {
            game.scene.stop();
        }
        if (key === 'Escape' || key === 'Enter') {
            if (game.loop.isStopped) {
                if (game.over) {
                    game.cat.evolutionLevel = 0;
                    game.cat.evolutionTargetTime = EVOLUTION_BASE_TIME;
                    game.cat.evolutionTimer = 0;
                    game.cat.distanceMoved = 0;
                    game.cat.exhaustMeter = 0;
                    game.cat.happinessMeter = 25;
                    game.gameTime = 0;
                    game.over = false;
                }
                game.loop.start();
                if (!game.muted && !game.musicPlaying) {
                    game.musicPlaying = true;
                    music.start();
                }
            } else {
                game.loop.stop();
                if (!game.muted) {
                    game.musicPlaying = false;
                    music.stop();
                }
                renderScene('Game pawsed.\nPress ENTER to resume...', {
                    animation: 'idle',
                    sheet: LEVEL[game.cat.evolutionLevel]
                });
            }
        }
        if (key === 'm') {
            game.muted = !game.muted;
            if (game.muted) {
                game.musicPlaying = false;
                music.stop();
            } else if (game.loop.isStopped || !game.musicPlaying) {
                game.musicPlaying = true;
                music.start();
            }
        }
    });
});
