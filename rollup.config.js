import kontra from 'rollup-plugin-kontra';

export default {
    input: 'src/js/script.js',
    output: {
        file: 'src/js/script.bundle.js',
        format: 'iife',
        name: 'bundle'
    },
    plugins: [
        kontra({
            gameObject: {
                anchor: true,
                radius: true,
                rotation: true,
                scale: true,
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

// Run npx rollup -c
