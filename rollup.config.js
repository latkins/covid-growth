import resolve from 'rollup-plugin-node-resolve';

export default {
  input: 'src/index.js',
  output: {
    compact: true,
    file: 'static/lib/index.js',
    format: 'esm',
  },
  plugins: [resolve()],
  onwarn: function(warning, warn) {
    if (warning.code === 'CIRCULAR_DEPENDENCY') return;
    warn(warning);
  },
};
