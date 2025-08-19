/* global document */
/* eslint-disable func-style */

export function save (canvas) {

    const
        body = document.body,
        dataURL = canvas.toDataURL('image/png'),
        downloadLink = document.createElement('a');

    downloadLink.href = dataURL;
    downloadLink.download = 'cat.png';
    body.appendChild(downloadLink);
    downloadLink.click();
    body.removeChild(downloadLink);
}
