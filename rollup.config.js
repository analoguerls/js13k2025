import kontra from 'rollup-plugin-kontra';

export default {
    input: 'src/js/kontra.js',
    output: {
        file: 'src/js/kontra.bundle.js',
        format: 'esm'
    },
    plugins: [
        kontra({
            gameObject: {
                anchor: true,
                rotation: true,
                velocity: true
            },
            sprite: {
                animation: true,
                image: true
            },
            text: {
                align: true
            }
        })
    ]
};
