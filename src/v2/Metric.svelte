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


    export let job
    export let metric
    export let atAllScopes
    export let width
    export let height = 300

    const metricConfig = getContext('metrics')
    const cluster = getContext('clusters').find(c => c.name == job.cluster)
    const avaliableScopes = [...new Set(atAllScopes.map(item => item.scope))]

    let selectedScope = "node", plot
    $: data = atAllScopes.find(metric => metric.scope == selectedScope)

    export function setTimeRange(from, to) {
        if (plot != null)
            plot.setTimeRange(from, to)
    }
</script>

<InputGroup>
    <InputGroupText style="min-width: 150px;">
        {metric} ({metricConfig(job.cluster, metric)?.unit})
    </InputGroupText>
    <select class="form-select" bind:value={selectedScope} disabled={avaliableScopes.length == 1}>
        {#each avaliableScopes as scope}
            <option value={scope}>{scope}</option>
        {/each}
    </select>
</InputGroup>
<br>
{#key data}
    <Timeseries
        bind:this={plot}
        useStatsSeries={false}
        width={width} height={height}
        cluster={cluster} metric={metric}
        data={data} />
{/key}

