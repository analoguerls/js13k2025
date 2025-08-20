/* eslint-disable func-style */
export function textToArray (text) {
    const
        array = [],
        upper = text.toUpperCase();

    // Process each character in the text
    for (let i = 0; i < text.length; i += 1) {
        let code = upper.charCodeAt(i);

        if (code === 32) {
            // Space character
            code = 0;
        } else if (code === 39) {
            // Apostrophe
            code = 90;
        } else if (code === 45) {
            // Hyphen
            code = 91;
        } else if (code === 8230) {
            // Ellipsis character
            code = 92;
        } else {
            // Convert A-Z to 1-26 range
            code -= 64;
        }
        array.push(code);
    }

    return array;
}
