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
			"const JOBVIEW_URL = job => `/job.html?id=${job.id}&jobId=${job.jobId}&clusterId=${job.clusterId}`;\n" +
			"const USERVIEW_URL = userId => `/user.html?userId=${userId}`;\n" +
			"const TAG_URL = tag => `/jobs.html?tagId=${tag.id}`;\n"
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
	entrypoint('jobs', 'src/JobList/entrypoint.js'),
	entrypoint('job', 'src/JobView/entrypoint.js'),
	entrypoint('users', 'src/UserList/entrypoint.js'),
	entrypoint('user', 'src/UserView/entrypoint.js'),
	entrypoint('analysis', 'src/AnalysisView/entrypoint.js')
];

