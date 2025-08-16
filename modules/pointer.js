/* global window */
/* eslint-disable func-style, no-underscore-dangle */
import {getCanvas} from 'init.js';
import {on} from 'events.js';

const pointers = new WeakMap();

export function getPointer (canvas = getCanvas()) {
    return pointers.get(canvas);
}
function getPropValue (style, value) {
    return parseFloat(style.getPropertyValue(value)) || 0;
}
function getCanvasOffset (pointer) {

    /*
     * We need to account for CSS scale, transform, border, padding,
     * and margin in order to get the correct scale and offset of the
     * canvas
     */
    const {
            canvas,
            _s
        } = pointer,
        rect = canvas.getBoundingClientRect(),
        transform = _s.transform === 'none'
            ? [1, 1, 1, 1]
            : _s.transform.replace('matrix(', '').split(','),
        transformScaleX = parseFloat(transform[0]),
        transformScaleY = parseFloat(transform[3]);
    let
        borderHeight = getPropValue(_s, 'border-top-width') + getPropValue(_s, 'border-bottom-width'),
        borderWidth = getPropValue(_s, 'border-left-width') + getPropValue(_s, 'border-right-width'),
        paddingHeight = getPropValue(_s, 'padding-top') + getPropValue(_s, 'padding-bottom'),
        paddingWidth = getPropValue(_s, 'padding-left') + getPropValue(_s, 'padding-right');

    // Scale transform applies to the border and padding of the element
    if (_s.transform !== 'none') {
        borderHeight *= transformScaleY;
        borderWidth *= transformScaleX;
        paddingHeight *= transformScaleY;
        paddingWidth *= transformScaleX;
    }

    return {
        // eslint-disable-next-line no-mixed-operators
        offsetX: rect.left + (getPropValue(_s, 'border-left-width') + getPropValue(_s, 'padding-left')) * transformScaleX,
        // eslint-disable-next-line no-mixed-operators
        offsetY: rect.top + (getPropValue(_s, 'border-top-width') + getPropValue(_s, 'padding-top')) * transformScaleY,
        scaleX: (rect.width - borderWidth - paddingWidth) / canvas.width,
        scaleY: (rect.height - borderHeight - paddingHeight) / canvas.height
    };
}

function mouseMoveHandler (evt) {
    evt.preventDefault();
    const
        canvas = evt.target,
        pointer = pointers.get(canvas),
        {
            offsetX,
            offsetY,
            scaleX,
            scaleY
        } = getCanvasOffset(pointer);

    pointer.x = (evt.clientX - offsetX) / scaleX;
    pointer.y = (evt.clientY - offsetY) / scaleY;
}

export function initPointer ({
    radius = 5,
    canvas = getCanvas()
} = {}) {
    let pointer = pointers.get(canvas);

    if (!pointer) {
        const style = window.getComputedStyle(canvas);

        pointer = {
            // Current frame
            _cf: [],
            // Last frame
            _lf: [],
            // Objects
            _o: [],
            // Over object
            _oo: null,
            // Style
            _s: style,
            canvas,
            radius,
            touches: {
                length: 0
            },
            x: 0,
            y: 0
        };
        pointers.set(canvas, pointer);
        canvas.addEventListener('mousemove', mouseMoveHandler);
        if (!pointer._t) {
            pointer._t = true;

            // Reset object render order on every new frame
            on('tick', () => {
                pointer._lf = [...pointer._cf];
                pointer._cf = [];
            });
        }
    }

    return pointer;
}
