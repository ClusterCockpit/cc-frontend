<div bind:this={plotWrapper} class="cc-plot">
</div>

<style>
    .cc-plot {
        height: 200px;
        border-radius: 5px;
    }
</style>

<script context="module">
    /* TODO: Make all of this customizable... */
    const resizeSleepTime = 250;
    const lineWidth = 1 * window.devicePixelRatio;
    const lineColors = [ '#00bfff', '#0000ff', '#ff00ff', '#ff0000', '#ff8000', '#ffff00', '#80ff00' ];
    const backgroundColors = {
        normal:  'rgba(255, 255, 255, 1.0)',
        caution: 'rgba(255, 128,   0, 0.3)',
        alert:   'rgba(255,   0,   0, 0.3)'
    };

    function getTotalAvg(data) {
        let avg = 0;
        for (let series of data.series)
            avg += series.statistics.avg;

        return avg / data.series.length;
    }

    function getBackgroundColor(data, metricConfig) {
        if (!metricConfig || !metricConfig.alert || !metricConfig.caution)
            return backgroundColors.normal;

        let cond = metricConfig.alert < metricConfig.caution
            ? (a, b) => a <= b
            : (a, b) => a >= b;

        let avg = getTotalAvg(data);
        if (Number.isNaN(avg))
            return backgroundColors.normal;

        if (metricConfig.alert && cond(avg, metricConfig.alert))
            return backgroundColors.alert;

        if (metricConfig.caution && cond(avg, metricConfig.caution))
            return backgroundColors.caution;

        return backgroundColors.normal;
    }

</script>

<script>
    import { onMount, onDestroy, getContext } from "svelte";
    import uPlot from "uplot";

    export let metric;
    export let clusterId;
    export let data;
    export let width;
    export let height;

    const metricConfig = getContext('metric-config')[clusterId][metric];

    let plotWrapper;
    let uplot = null;
    let timeoutId = null;

    let prevWidth = null, prevHeight = null, prevData = null;

    function render() {
        if (!width || Number.isNaN(width) || width < 0)
            return;

        /* Prevent unnecessary rerenders */
        if (prevWidth != null && Math.abs(prevWidth - width) < 10 && data == prevData)
            return;

        if (prevData != data) {
            let bg = getBackgroundColor(data, metricConfig);
            plotWrapper.style.backgroundColor = bg;
        }

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
                width: lineWidth,
                stroke: lineColors[i % lineColors.length]
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
