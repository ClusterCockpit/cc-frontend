# cc-svelte-datatable

A frontend for [ClusterCockpit](https://github.com/ClusterCockpit/ClusterCockpit) and [cc-jobarchive](https://github.com/ClusterCockpit/cc-jobarchive). Backend specific configuration can de done using the constants defined in the `intro` section in `./rollup.config.js`.

There are two entry points:
* `./src/joblist.js`:
    - Uses the `Datatable` component as root
    - Shows a list of all jobs with selected metrics plotted and support for sorting, filters, ...
* `./src/jobview.js`:
    - Uses the `JobView` component as root
    - Plots of all available metrics for a specific job
    - Displays Roofline Plot and Spider Plot
    - Table with statistics for all metrics per node

Some UI elements can be configured using the file `public/config.json`.
PHP ClusterCockpit has its own way of injecting the configuration and does not use that file.

Builds on:
* [Svelte](https://svelte.dev/)
* [SvelteStrap](https://sveltestrap.js.org/)
* [Bootstrap 5](https://getbootstrap.com/)
* [urql](https://github.com/FormidableLabs/urql)

## Get started

[Yarn](https://yarnpkg.com/) is recommended for package management.
Due to an issue with Yarn v2 you have to stick to Yarn v1.

Install the dependencies...

```bash
yarn install
```

...then start [Rollup](https://rollupjs.org):

```bash
yarn run dev
```

Navigate to [localhost:5000](http://localhost:5000). You should see your app running. Edit a component file in `src`, save it, and reload the page to see your changes.
Usually on save of source files the page should reload automatically.
