<!-- 
    @component

    Properties:
    - width:          Number
    - height:         Number
    - data:           GraphQL.JobMetric (Must be constant after initialization!)
    - cluster:        GraphQL.Cluster
    - metric:         String
    - useStatsSeries: Boolean
    Functions:
    - setTimeRange(from, to): Void

    // TODO: Move helper functions to module context?
 -->
<script>
    import uPlot from 'uplot'
    import { formatNumber } from '../utils.js'
    import { getContext, onMount, onDestroy } from 'svelte'

    export let width
    export let height
    export let data
    export let cluster
    export let metric
    export let useStatsSeries = null

    if (useStatsSeries == null)
        useStatsSeries = data.statisticsSeries != null

    if (useStatsSeries == false && data.series == null)
        useStatsSeries = true

    const metricConfig = getContext('metrics')(cluster, metric)
    const clusterCockpitConfig = getContext('cc-config')
    const resizeSleepTime = 250
    const peakLineColor = '#000000'
    const lineWidth = clusterCockpitConfig.plot_general_lineWidth / window.devicePixelRatio
    const lineColors = clusterCockpitConfig.plot_general_colorscheme
    const backgroundColors = { normal:  'rgba(255, 255, 255, 1.0)', caution: 'rgba(255, 128, 0, 0.3)', alert: 'rgba(255, 0, 0, 0.3)' }

    function formatTime(t) {
        let h = Math.floor(t / 3600)
        let m = Math.floor((t % 3600) / 60)
        if (h == 0)
            return `${m}m`
        else if (m == 0)
            return `${h}h`
        else
            return `${h}:${m}h`
    }

    function timeIncrs() {
        let incrs = []
        for (let t = data.timestep; t < maxX; t *= 10)
            incrs.push(t, t * 2, t * 3, t * 5)

        return incrs
    }

    function backgroundColor() {
        if (clusterCockpitConfig.plot_general_colorBackground == false
            || !metricConfig
            || !(data.series && data.series.every(s => s.statistics != null)))
            return backgroundColors.normal

        let cond = metricConfig.alert < metricConfig.caution
            ? (a, b) => a <= b
            : (a, b) => a >= b

        let avg = data.series.reduce((sum, series) => sum + series.statistics.avg) / data.series.length

        if (Number.isNaN(avg))
            return backgroundColors.normal

        if (cond(avg, metricConfig.alert))
            return backgroundColors.alert

        if (cond(avg, metricConfig.caution))
            return backgroundColors.caution

        return backgroundColors.normal
    }

    function lineColor(i, n) {
        if (n >= lineColors.length)
            return lineColors[i % lineColors.length];
        else
            return lineColors[Math.floor((i / n) * lineColors.length)];
    }

    const longestSeries = useStatsSeries
        ? data.statisticsSeries.mean.length
        : data.series.reduce((n, series) => Math.max(n, series.data.length), 0)
    const maxX = longestSeries * data.timestep
    const maxY = metricConfig != null
        ? useStatsSeries
            ? (data.statisticsSeries.max.reduce((max, x) => Math.max(max, x), metricConfig.peak) || metricConfig.peak)
            : (data.series.reduce((max, series) => Math.max(max, series.statistics?.max), metricConfig.peak) || metricConfig.peak)
        : null
    const plotSeries = [{}]
    const plotData = [new Array(longestSeries)]
    for (let i = 0; i < longestSeries; i++)
        plotData[0][i] = i * data.timestep

    let plotBands = undefined
    if (useStatsSeries) {
        plotData.push(data.statisticsSeries.min)
        plotData.push(data.statisticsSeries.mean)
        plotData.push(data.statisticsSeries.max)
        plotSeries.push({ scale: 'y', width: lineWidth, stroke: 'green' })
        plotSeries.push({ scale: 'y', width: lineWidth, stroke: 'black' })
        plotSeries.push({ scale: 'y', width: lineWidth, stroke: 'red' })
        plotBands = [
            { series: [3,2], fill: 'rgba(255,0,0,0.1)' },
            { series: [2,1], fill: 'rgba(0,255,0,0.1)' }
        ];
    } else {
        for (let i = 0; i < data.series.length; i++) {
            plotData.push(data.series[i].data)
            plotSeries.push({
                scale: 'y',
                width: lineWidth,
                stroke: lineColor(i, data.series.length)
            })
        }
    }

    const opts = {
        width,
        height,
        series: plotSeries,
        axes: [
            {
                scale: 'x',
                space: 35,
                incrs: timeIncrs(),
                values: (_, vals) => vals.map(v => formatTime(v))
            },
            {
                scale: 'y',
                grid: { show: true },
                labelFont: 'sans-serif',
                values: (u, vals) => vals.map(v => formatNumber(v))
            }
        ],
        bands: plotBands,
        padding: [5, 10, -20, 0],
        hooks: {
            draw: [(u) => {
                if (!metricConfig)
                    return

                let y = u.valToPos(metricConfig.peak, 'y', true)
                u.ctx.lineWidth = lineWidth
                u.ctx.strokeStyle = peakLineColor
                u.ctx.setLineDash([5, 5])
                u.ctx.beginPath()
                u.ctx.moveTo(u.bbox.left, y)
                u.ctx.lineTo(u.bbox.left + u.bbox.width, y)
                u.ctx.stroke()
                u.ctx.setLineDash([])
            }]
        },
        scales: {
            x: { time: false },
            y: maxY ? { range: [0., maxY * 1.1] } : {}
        },
        cursor: { show: false },
        legend: { show: false, live: false }
    }

    // console.log(opts)

    let plotWrapper = null
    let uplot = null
    let timeoutId = null
    let prevWidth = null, prevHeight = null

    function render() {
        if (!width || Number.isNaN(width) || width < 0)
            return

        if (prevWidth != null && Math.abs(prevWidth - width) < 10)
            return

        prevWidth = width
        prevHeight = height

        if (!uplot) {
            opts.width = width
            opts.height = height
            uplot = new uPlot(opts, plotData, plotWrapper)
        } else {
            uplot.setSize({ width, height })
        }
    }

    function onSizeChange() {
        if (!uplot)
            return

        if (timeoutId != null)
            clearTimeout(timeoutId)

        timeoutId = setTimeout(() => {
            timeoutId = null
            render()
        }, resizeSleepTime)
    }

    $: onSizeChange(width, height)

    onMount(() => {
        plotWrapper.style.backgroundColor = backgroundColor()
        render()
    })

    onDestroy(() => {
        if (uplot)
            uplot.destroy()

        if (timeoutId != null)
            clearTimeout(timeoutId)
    })

    // `from` and `to` must be numbers between 0 and 1.
    export function setTimeRange(from, to) {
        if (!uplot || from > to)
            return false

        uplot.setScale('x', { min: from * maxX, max: to * maxX })
        return true
    }
</script>

<div bind:this={plotWrapper} class="cc-plot"></div>
<style>
    .cc-plot {
        border-radius: 5px;
    }
</style>
