<div bind:this={plotWrapper} class="cc-plot">
</div>

<style>
    .cc-plot {
        height: 200px;
    }
</style>

<script>
    import { onMount, onDestroy } from "svelte";
    import uPlot from "uplot";

    // console.log('new plot component');

    export let data;
    export let width;
    export let height;

    let plotWrapper;
    let uplot = null;
    let timeoutId = null;
    const resizeSleepTime = 250;
    const colors = [ '#00bfff', '#0000ff', '#ff00ff', '#ff0000', '#ff8000', '#ffff00', '#80ff00' ];

    let prevWidth = null, prevHeight = null, prevData = null;

    function render() {
        if (!width || Number.isNaN(width) || width < 0)
            return;

        /* Prevent unnecessary rerenders */
        if (prevWidth != null && Math.abs(prevWidth - width) < 10 && data == prevData)
            return;

        // console.log(`rerender: width: ${width}, height: ${height}`);

        prevWidth = width;
        prevHeight = height;
        prevData = data;

        const longestSeries = data.series.reduce(
            (n, series) => Math.max(n, series.data.length), 0);

        const plotData = [ new Array(longestSeries) ];
        const plotSeries = [ { label: "Time", width: 1 / devicePixelRatio, stroke: 'black' } ];

        // Time-Axis/Data:
        for (let i = 0; i < longestSeries; i++) {
            plotData[0][i] = i * data.timestep;
        }

        for (let i = 0; i < data.series.length; i++) {
            const series = data.series[i];
            plotData.push(series.data);
            plotSeries.push({
                /* label: series.node_id, */
                scale: data.unit,
                width: 1,
                stroke: colors[i % colors.length]
            });
        }

        const opts = {
            title: null,
            width,
            height,
            series: plotSeries,
            axes: [
                { /* label: 'Time (s)' */ },
                {
                    scale: data.unit,
                    grid: { show: true },
                    /* label: `${title} (${data.unit})`, */
                    labelFont: 'sans-serif'
                }
            ],
            scales: {
                x: { time: false }
            },
            cursor: { show: false },
            legend: { show: false, live: false }
        };

        if (uplot)
            uplot.destroy();

        uplot = new uPlot(opts, plotData, plotWrapper);
    }

    let mounted = false;
    onMount(() => {
        render();
        mounted = true;
    });

    onDestroy(() => {
        if (uplot)
            uplot.destroy();

        if (timeoutId != null)
            clearTimeout(timeoutId);
    });

    function onChange() {
        if (mounted)
            setTimeout(render, 0);
    }

    function onWidthChange() {
        if (!mounted)
            return;

        if (timeoutId != null)
            clearTimeout(timeoutId);

        timeoutId = setTimeout(onChange, resizeSleepTime);
    }

    $: onChange(data);
    $: onWidthChange(width);

</script>
