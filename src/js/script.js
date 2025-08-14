/* global window */
/* eslint-disable new-cap, no-extra-parens */
import {
    GameLoop,
    Sprite,
    getPointer,
    imageAssets,
    init,
    initPointer,
    load,
    setImagePath
} from 'kontra';

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
load('cat.png').then(() => {
    const
        cat = Sprite({
            image: imageAssets.cat,
            render () {
                // Disable image smoothing for pixel art
                this.context.imageSmoothingEnabled = false;
                this.setScale(zoomFactor);
                // Draw the sprite as usual
                this.draw();
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
        update () {
            const pointer = getPointer();

            // Position the point directly above the pointer
            point.x = pointer.x / 2;
            point.y = (pointer.y / 2) - pointerOffset;
        }
    });
    // Start the game loop
    game.loop.start();
});
