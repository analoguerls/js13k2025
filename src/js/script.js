/* global document, window*/
let zoomFactor = 1;
const
    LEVEL_HEIGHT = 10,
    LEVEL_WIDTH = 20,
    // TILE_SIZE is the size of each tile in pixels
    TILE_SIZE = 16,
    canvas = document.getElementById('game'),
    setZoomFactor = function () {
        zoomFactor = Math.min(
            Math.floor(window.innerWidth / (LEVEL_WIDTH * TILE_SIZE)),
            // eslint-disable-next-line no-extra-parens
            Math.floor((window.innerHeight * 0.8) / (LEVEL_HEIGHT * TILE_SIZE))
        );
        canvas.height = LEVEL_HEIGHT * TILE_SIZE * zoomFactor;
        canvas.width = LEVEL_WIDTH * TILE_SIZE * zoomFactor;
    };

setZoomFactor();
window.addEventListener('resize', () => {
    setZoomFactor();
});
