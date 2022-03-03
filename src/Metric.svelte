<!-- 
    @component
    A single plot in the job view.

    TODO:
    - Allow selection of specific node
 -->
<script>
    import { getContext } from 'svelte';
    import { InputGroup, InputGroupText } from 'sveltestrap'
    import Timeseries from './plots/MetricPlot.svelte'
    import { maxScope, minScope } from './utils.js'

    export let hosts
    export let cluster
    export let metric
    export let atAllScopes
    export let width
    export let height = 300

    const metricConfig = getContext('metrics'),
          clusters = getContext('clusters'),
          avaliableScopes = [...new Set(atAllScopes.map(item => item.scope))]

    let plot, host = null, selectedScope = hosts.length > 1 ? maxScope(avaliableScopes) : minScope(avaliableScopes)
    $: data = atAllScopes.find(metric => metric.scope == selectedScope)
    $: series = host == null ? data.series : data.series.filter(s => s.hostname == host)

    export function setTimeRange(from, to) {
        if (plot != null)
            plot.setTimeRange(from, to)
    }
</script>

<InputGroup>
    <InputGroupText style="min-width: 150px;">
        {metric} ({metricConfig(cluster, metric)?.unit})
    </InputGroupText>
    <select class="form-select" bind:value={selectedScope} disabled={avaliableScopes.length == 1}>
        {#each avaliableScopes as scope}
            <option value={scope}>{scope}</option>
        {/each}
    </select>
    {#if hosts.length > 1}
        <select class="form-select" bind:value={host}>
            <option value={null}>All Hosts</option>
            {#each hosts as host}
                <option value={host}>{host}</option>
            {/each}
        </select>
    {/if}
</InputGroup>
{#key series}
    <Timeseries
        bind:this={plot}
        useStatsSeries={false}
        width={width} height={height}
        cluster={clusters.find(c => c.name == cluster)} metric={metric}
        timestep={data.timestep}
        series={series}
        statisticsSeries={data.statisticsSeries} />
{/key}
<br/>
