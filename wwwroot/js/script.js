/* global Image, window*/
/* eslint-disable new-cap */
import {
    Sprite,
    init
} from 'https://unpkg.com/kontra@10.0.2/kontra.mjs';

let
    cat = null,
    zoomFactor = 1;
const
    {
        canvas,
        context
    } = init('game'),
    // Level dimensions in tiles
    LEVEL_HEIGHT = 10,
    LEVEL_WIDTH = 20,
    // Minimum zoom factor to ensure visibility
    MIN_ZOOM = 1,
    // Size of each tile in pixels
    TILE_SIZE = 16,
    image = new Image(),
    // Calculate and set the appropriate zoom factor based on window dimensions
    setZoomFactor = function () {
        // Calculate the zoom factor based on the window size and level dimensions
        const
            horizontalZoom = Math.floor(window.innerWidth / (LEVEL_WIDTH * TILE_SIZE)),
            // eslint-disable-next-line no-extra-parens
            verticalZoom = Math.floor((window.innerHeight * 0.8) / (LEVEL_HEIGHT * TILE_SIZE));

        // Calculate the zoom factor based on the window size and level dimensions
        zoomFactor = Math.max(Math.min(horizontalZoom, verticalZoom), MIN_ZOOM);
        // Set the canvas dimensions based on the zoom factor
        canvas.height = LEVEL_HEIGHT * TILE_SIZE * zoomFactor;
        canvas.width = LEVEL_WIDTH * TILE_SIZE * zoomFactor;
    };

// Set the initial zoom factor and canvas dimensions
setZoomFactor();
// Disable image smoothing for pixel art
context.imageSmoothingEnabled = false;
// Update the zoom factor and canvas dimensions on window resize
window.addEventListener('resize', () => {
    setZoomFactor();
    if (cat) {
        // Update the sprite size based on the new zoom factor
        cat.setScale(zoomFactor);
        cat.render();
    }
});

// Load the image and create a sprite
image.src = 'images/cat.png';
image.onload = function () {
    cat = Sprite({
        image,
        render () {
            // Disable image smoothing for pixel art
            this.context.imageSmoothingEnabled = false;
            //  Draw the sprite as usual
            this.draw();
        },
        x: 100,
        y: 100
    });

    // Set the sprite size based on the zoom factor
    cat.setScale(zoomFactor);
    cat.render();
};
