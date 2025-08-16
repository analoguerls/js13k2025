/* global Image */
/* eslint-disable no-unused-vars */

const load = (path, assets) => new Promise((resolve, reject) => {
    // Use a single object to track images and promise resolution
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
        // Handle error case - simplified
        img.onerror = () => reject(new Error(`Failed to load: ${path}${name}`));
        // Set source to trigger loading
        img.src = `${path}${name}`;
    }))).
        then(() => resolve(images)).
        catch(reject);
});

/*
 * Example usage
 *
 * load('images/', ['image-1.png', 'image-2.png', 'image-3.png']).then((imageAssets) => {
 *      // Do nothing, just for demonstration
 *   });
 *
 */
