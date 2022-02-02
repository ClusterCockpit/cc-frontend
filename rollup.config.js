import svelte from 'rollup-plugin-svelte';
import replace from "@rollup/plugin-replace";
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import css from 'rollup-plugin-css-only';

const production = !process.env.ROLLUP_WATCH;

const plugins = [
	svelte({
		compilerOptions: {
			// enable run-time checks when not in production
			dev: !production
		}
	}),

	// If you have external dependencies installed from
	// npm, you'll most likely need these plugins. In
	// some cases you'll need additional configuration -
	// consult the documentation for details:
	// https://github.com/rollup/plugins/tree/master/packages/commonjs
	resolve({
		browser: true,
		dedupe: ['svelte']
	}),
	commonjs(),

	// If we're building for production (npm run build
	// instead of npm run dev), minify
	production && terser(),

	replace({
		"process.env.NODE_ENV": JSON.stringify("development"),
		preventAssignment: true
	})
];

const entrypoint = (name, path) => ({
	input: path,
	output: {
		sourcemap: true,
		format: 'iife',
		name: 'app',
		file: `public/build/${name}.js`,

		// Used so that the svelte components can be used
		// with or without the ClusterCockpit PHP Backend:
		intro:
			process.env.CCFRONTEND_ROLLUP_INTRO != null
				? process.env.CCFRONTEND_ROLLUP_INTRO
				: "const JOBVIEW_URL = job => `/monitoring/job/${job.id}`;\n"+
				  "const USERVIEW_URL = user => `/monitoring/user/${user}`;\n"+
				  "const TAG_URL = tag => `/monitoring/jobs/?tag=${tag.id}`;\n"
	},
	plugins: [
		...plugins,

		// we'll extract any component CSS out into
		// a separate file - better for performance
		css({ output: `${name}.css` }),
	],
	watch: {
		clearScreen: false
	}
});

export default [
	entrypoint('jobs',    'src/v2/jobs.entrypoint.js'),
	entrypoint('user',    'src/v2/user.entrypoint.js'),
	entrypoint('list',    'src/v2/list.entrypoint.js'),
	entrypoint('job',     'src/v2/job.entrypoint.js'),
	entrypoint('systems', 'src/v2/systems.entrypoint.js'),
	entrypoint('node',    'src/v2/node.entrypoint.js')
];

