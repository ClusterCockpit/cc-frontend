<script>
    import { init, groupByScope, fetchMetricsStore } from './utils.js'
    import { Row, Col, Card, Spinner } from 'sveltestrap'
    import PlotTable from './PlotTable.svelte'
    import Metric from './Metric.svelte'
    import PolarPlot from './plots/Polar.svelte'
    import Roofline from './plots/Roofline.svelte'
    import JobInfo from './joblist/JobInfo.svelte'
    import TagManagement from './TagManagement.svelte'
    import Zoom from './Zoom.svelte'
    import StatsTable from './StatsTable.svelte'
    import { getContext } from 'svelte'

    export let dbid

    const { query: initq } = init(`
        job(id: "${dbid}") {
            id, jobId, user, project, cluster, startTime,
            duration, numNodes, numHWThreads, numAcc,
            SMT, exclusive, partition, arrayJobId,
            monitoringStatus, state,
            tags { id, type, name },
            resources { hostname, hwthreads, accelerators }
        }
    `)

    const ccconfig = getContext('cc-config'),
          clusters = getContext('clusters')

    const jobMetrics = fetchMetricsStore({ id: dbid }, null, ["node", "core"]);

    let plots = {}
    let jobTags
    let fullWidth
    $: polarPlotSize = Math.min(fullWidth / 3 - 10, 300)
    $: document.title = $initq.fetching ? 'Loading...' : ($initq.error ? 'Error' : `Job ${$initq.data.job.jobId} - ClusterCockpit`)
</script>

<div class="row" bind:clientWidth={fullWidth}></div>
<Row>
    <Col>
        {#if $initq.error}
            <Card body color="danger">{$initq.error.message}</Card>
        {:else if $initq.data}
            <JobInfo job={$initq.data.job} jobTags={jobTags}/>
        {:else}
            <Spinner secondary/>
        {/if}
    </Col>
    {#if $jobMetrics.data && $initq.data}
        <Col>
            <PolarPlot
                width={polarPlotSize} height={polarPlotSize}
                metrics={ccconfig.job_view_polarPlotMetrics}
                cluster={$initq.data.job.cluster}
                jobMetrics={$jobMetrics.data.jobMetrics} />
        </Col>
        <Col>
            <Roofline
                width={fullWidth / 3 - 10} height={polarPlotSize}
                cluster={clusters
                    .find(c => c.name == $initq.data.job.cluster).partitions
                    .find(p => p.name == $initq.data.job.partition)}
                flopsAny={$jobMetrics.data.jobMetrics.find(m => m.name == 'flops_any' && m.metric.scope == 'node').metric}
                memBw={$jobMetrics.data.jobMetrics.find(m => m.name == 'mem_bw' && m.metric.scope == 'node').metric} />
        </Col>
    {:else}
        <Col></Col>
        <Col></Col>
    {/if}
</Row>
<br/>
<Row>
    <Col xs="auto">
        {#if $initq.data}
            <TagManagement job={$initq.data.job} bind:jobTags={jobTags}/>
        {/if}
    </Col>
    <Col xs="auto">
        <Zoom timeseriesPlots={plots} />
    </Col>
</Row>
<br/>
<Row>
    <Col>
        {#if $jobMetrics.error}
            <Card body color="danger">{$jobMetrics.error.message}</Card>
        {:else if $jobMetrics.data && $initq.data}
            <PlotTable
                let:item
                let:width
                items={groupByScope($jobMetrics.data.jobMetrics)}
                itemsPerRow={ccconfig.plot_view_plotsPerRow}>
                <Metric
                    bind:this={plots[item[0].name]}
                    hosts={$initq.data.job.resources.map(r => r.hostname)}
                    cluster={$initq.data.job.cluster}
                    metric={item[0].name}
                    atAllScopes={item.map(x => x.metric)}
                    width={width}/>
            </PlotTable>
        {/if}
    </Col>
</Row>
<br/>
<Row>
    <Col>
        {#if $jobMetrics.data && $initq.data}
            <StatsTable job={$initq.data.job} jobMetrics={$jobMetrics.data.jobMetrics} />
        {/if}
    </Col>
</Row>
