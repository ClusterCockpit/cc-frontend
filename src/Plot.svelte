<div class="cc-plot">

    <div class="cc-plot-wrapper {uplot ? 'visible' : 'hidden'}" bind:this={plotWrapper}></div>
    {#await render()}
        <div class="spinner-border" role="status">
            <span class="sr-only">Loading...</span>
        </div>
    {:catch err}
        <div class="alert alert-danger" role="alert">
            {err.toString()}
        </div>
    {/await}

</div>

<script>
    import { createEventDispatcher } from "svelte";
    import uPlot from "uplot";

    export let width = 300;
    export let height = 200;
    export let title = null;
    export let fetchData;

    let plotWrapper;
    let uplot = null;

    let colorIndex = 0;
    const colors = [ '#00bfff', '#0000ff', '#ff00ff', '#ff0000', '#ff8000', '#ffff00', '#80ff00' ];
    function getColor() {
        const c = colors[colorIndex++];
        if (colorIndex >= colors.length)
            colorIndex = 0;
        return c;
    }

    async function render() {
        const rawdata = await fetchData();

        const longestSeries = rawdata.series.reduce(
            (n, series) => Math.max(n, series.data.length), 0);

        const data = [ new Array(longestSeries) ];
        const plotSeries = [ { label: "Time", width: 1 / devicePixelRatio, stroke: 'black' } ];

        // Time-Axis/Data:
        for (let i = 0; i < longestSeries; i++) {
            data[0][i] = i * rawdata.timestep;
        }

        for (let series of rawdata['series']) {
            data.push(series.data);
            plotSeries.push({
                label: series.node_id,
                scale: rawdata.unit,
                width: 1.5 / devicePixelRatio,
                stroke: getColor()
            });
        }

        const opts = {
            title,
            width,
            height,
            series: plotSeries,
            axes: [
                {},
                {
                    scale: rawdata.unit,
                    grid: { show: true }
                }
            ],
            scales: {
                x: { time: false }
            },
            cursor: { show: false },
            legend: { show: false, live: false }
        };

        uplot = new uPlot(opts, data, plotWrapper);
    }

</script>
