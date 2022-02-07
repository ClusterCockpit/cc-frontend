<script>
    import { init } from './utils.js'
    import { getContext, onMount } from 'svelte'
    import { operationStore, query } from '@urql/svelte'
    import { Row, Col, Icon, Spinner, Card, InputGroup, InputGroupText, Table } from 'sveltestrap'
    import Filters from './filters/Filters.svelte'
    import PlotSelection from './PlotSelection.svelte'
    import Histogram, { binsFromFootprint } from './plots/Histogram.svelte'
    import ScatterPlot from './plots/Scatter.svelte'
    import PlotTable from './PlotTable.svelte'

    const { query: initq } = init()

    export let filterPresets

    let cluster
    let filters
    let histoWidth1, histoWidth2
    let numBins = 50
    const ccconfig = getContext('cc-config'),
          clusters = getContext('clusters'),
          metricConfig = getContext('metrics')

    let metricsInHistograms = ccconfig.analysis_view_histogramMetrics,
        metricsInScatterplots = ccconfig.analysis_view_scatterPlotMetrics

    $: metrics = [...new Set([...metricsInHistograms, ...metricsInScatterplots.flat()])]

    getContext('on-init')(({ data }) => {
        if (data != null) {
            cluster = data.clusters.find(c => c.name == filterPresets.cluster)
            console.assert(cluster != null, `This cluster could not be found: ${filterPresets.cluster}`)
        }
    })

    const statsQuery = operationStore(`
        query($filter: [JobFilter!]!) {
            stats: jobsStatistics(filter: $filter) {
                totalJobs
                shortJobs
                totalWalltime
                totalCoreHours
                histWalltime { count, value }
                histNumNodes { count, value }
            }
        }
    `, { filter: [] }, { pause: true })

    const footprintsQuery = operationStore(`
        query($filter: [JobFilter!]!, $metrics: [String!]!) {
            footprints: jobsFootprints(filter: $filter, metrics: $metrics) {
                name,
                footprints
            }
        }
    `, { filter: [], metrics }, { pause: true })
    $: $footprintsQuery.variables = { ...$footprintsQuery.variables, metrics }

    query(statsQuery)
    query(footprintsQuery)
    onMount(() => filters.update())
</script>

<Row>
    {#if $initq.fetching || $statsQuery.fetching || $footprintsQuery.fetching}
        <Col xs="auto">
            <Spinner />
        </Col>
    {/if}
    <Col xs="auto">
        {#if $initq.error}
            <Card body color="danger">{$initq.error.message}</Card>
        {:else if $initq.data}
            <InputGroup>
                <InputGroupText><Icon name="clipboard-check"/></InputGroupText>
                <InputGroupText>Analysis</InputGroupText>
                <select class="form-select" bind:value={filterPresets.cluster} on:change={(e) => 
                    document.location.href = `/monitoring/analysis/${filterPresets.cluster}`}>
                    {#each clusters as cluster}
                        <option value={cluster.name}>{cluster.name}</option>
                    {/each}
                </select>
            </InputGroup>
        {/if}
    </Col>
    {#if cluster}
        <Col xs="auto">
            <PlotSelection
                availableMetrics={cluster.metricConfig.map(mc => mc.name)}
                bind:metricsInHistograms={metricsInHistograms}
                bind:metricsInScatterplots={metricsInScatterplots} />
        </Col>
    {/if}
    <Col xs="auto">
        <Filters
            bind:this={filters}
            filterPresets={filterPresets}
            disableClusterSelection={true}
            on:update={({ detail }) => {
                $statsQuery.context.pause = false
                $statsQuery.variables = { filter: detail.filters }
                $footprintsQuery.context.pause = false
                $footprintsQuery.variables = { metrics, filter: detail.filters }
            }} />
    </Col>
</Row>

<br/>
{#if $statsQuery.error}
    <Row>
        <Col>
            <Card body color="danger">{$statsQuery.error.message}</Card>
        </Col>
    </Row>
{:else if $statsQuery.data}
    <Row>
        <Col xs="4">
            <Table>
                <tr>
                    <th scope="col">Total Jobs</th>
                    <td>{$statsQuery.data.stats[0].totalJobs}</td>
                </tr>
                <tr>
                    <th scope="col">Short Jobs (&#60; 2m)</th>
                    <td>{$statsQuery.data.stats[0].shortJobs}</td>
                </tr>
                <tr>
                    <th scope="col">Total Walltime</th>
                    <td>{$statsQuery.data.stats[0].totalWalltime}</td>
                </tr>
                <tr>
                    <th scope="col">Total Core Hours</th>
                    <td>{$statsQuery.data.stats[0].totalCoreHours}</td>
                </tr>
            </Table>
        </Col>
        <div class="col-4" bind:clientWidth={histoWidth1}>
            {#key $statsQuery.data.stats[0].histWalltime}
                <h4>Walltime Distribution</h4>
                <Histogram
                    width={histoWidth1 - 25} height={250}
                    data={$statsQuery.data.stats[0].histWalltime} />
            {/key}
        </div>
        <div class="col-4" bind:clientWidth={histoWidth2}>
            {#key $statsQuery.data.stats[0].histNumNodes}
                <h4>Number of Nodes Distribution</h4>
                <Histogram
                    width={histoWidth2 - 25} height={250}
                    data={$statsQuery.data.stats[0].histNumNodes} />
            {/key}
        </div>
    </Row>
{/if}

<br/>
{#if $footprintsQuery.error}
    <Row>
        <Col>
            <Card body color="danger">{$footprintsQuery.error.message}</Card>
        </Col>
    </Row>
{:else if $footprintsQuery.data}
    <Row>
        <Col>
            <PlotTable
                let:item
                let:width
                items={metricsInHistograms.map(metric => ({ metric, ...binsFromFootprint(
                    $footprintsQuery.data.footprints.find(f => f.name == metric).footprints, numBins) }))}
                itemsPerRow={ccconfig.plot_view_plotsPerRow}>
                <h4>{item.metric} [{metricConfig(cluster.name, item.metric)?.unit}]</h4>

                <Histogram
                    width={width} height={250}
                    min={item.min} max={item.max}
                    data={item.bins} label={item.label} />
            </PlotTable>
        </Col>
    </Row>
    <br/>
    <Row>
        <Col>
            <PlotTable
                let:item
                let:width
                items={metricsInScatterplots.map(([m1, m2]) => ({
                    m1, f1: $footprintsQuery.data.footprints.find(f => f.name == m1).footprints,
                    m2, f2: $footprintsQuery.data.footprints.find(f => f.name == m2).footprints
                }))}
                itemsPerRow={ccconfig.plot_view_plotsPerRow}>

                <ScatterPlot
                    width={width} height={250}
                    xLabel={`${item.m1} [${metricConfig(cluster.name, item.m1)?.unit}]`}
                    yLabel={`${item.m2} [${metricConfig(cluster.name, item.m2)?.unit}]`}
                    X={item.f1} Y={item.f2} />
            </PlotTable>
        </Col>
    </Row>
{/if}


