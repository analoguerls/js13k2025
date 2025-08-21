export function splitmix32(t){return function(){let i=(t=(t|=0)+2654435769|0)^t>>>16;return i=Math.imul(i,569420461),i^=i>>>15,i=Math.imul(i,1935289751),((i^=i>>>15)>>>0)/4294967296}}

/*
 * Example usage
 *
 * const prng = splitmix32((Math.random() * 2 ** 32) >>> 0);
 * for (let i = 0; i < 10; i += 1) {
 *      window.console.log(prng());
 * }
 *
 */
