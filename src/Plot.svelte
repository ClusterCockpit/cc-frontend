<div bind:this={plotWrapper} bind:clientWidth={w} bind:clientHeight={h} class="cc-plot">
</div>

<style>
    .cc-plot {
        height: 200px;
    }
</style>

<script>
    import { onMount, onDestroy } from "svelte";
    import uPlot from "uplot";

    export let data;
    let w;
    let h;

    let plotWrapper;
    let uplot = null;

    const colors = [ '#00bfff', '#0000ff', '#ff00ff', '#ff0000', '#ff8000', '#ffff00', '#80ff00' ];

    function render(data) {
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
            width: w,
            height: h,
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
        render(data);
        mounted = true;
    });

    onDestroy(() => {
        if (uplot)
            uplot.destroy();
    });

    function onDataChange(data) {
        if (mounted)
            render(data);
    }

    $: onDataChange(data);

</script>
