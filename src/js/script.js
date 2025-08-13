/* global document, window*/
let zoomFactor = 1;
const
    // Level dimensions in tiles
    LEVEL_HEIGHT = 10,
    LEVEL_WIDTH = 20,
    MIN_ZOOM = 1,
    // TILE_SIZE is the size of each tile in pixels
    TILE_SIZE = 16,
    canvas = document.getElementById('game'),
    // Set the scaling factor for the game canvas
    setZoomFactor = function () {
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
window.addEventListener('resize', () => {
    setZoomFactor();
});
