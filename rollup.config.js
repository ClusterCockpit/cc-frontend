import svelte from 'rollup-plugin-svelte';
import replace from "@rollup/plugin-replace";
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import css from 'rollup-plugin-css-only';

const production = !process.env.ROLLUP_WATCH;

function serve() {
	let server;

	function toExit() {
		if (server) server.kill(0);
	}

	return {
		writeBundle() {
			if (server) return;
			server = require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
				stdio: ['ignore', 'inherit', 'inherit'],
				shell: true
			});

			process.on('SIGTERM', toExit);
			process.on('exit', toExit);
		}
	};
}

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

	// In dev mode, call `npm run start` once
	// the bundle has been generated
	!production && serve(),

	// Watch the `public` directory and refresh the
	// browser on changes when not in production
	!production && livereload('public'),

	// If we're building for production (npm run build
	// instead of npm run dev), minify
	production && terser(),

	replace({
		"process.env.NODE_ENV": JSON.stringify("development"),
		preventAssignment: true
	})
];

const entrypoint = name => ({
	input: `src/${name}.js`,
	output: {
		sourcemap: true,
		format: 'iife',
		name: 'app',
		file: `public/build/${name}.js`,

		// Used so that the svelte components can be used
		// with or without the ClusterCockpit PHP Backend:
		intro:
			"const GRAPHQL_BACKEND = `http://localhost:8080/query`;\n" +
			"const JOBVIEW_URL = job => `/jobview.html?id=${job.id}&jobId=${job.jobId}&clusterId=${job.clusterId}`;\n"
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

export default [ entrypoint('joblist'), entrypoint('jobview') ];
