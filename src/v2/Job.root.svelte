<script>
    import { init, groupByScope } from './utils.js'
    import { operationStore, query } from '@urql/svelte'
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

    const { } = init()
    const ccconfig = getContext('cc-config'),
          clusters = getContext('clusters'),
          initialized = getContext('initialized')

    const job = operationStore(`query {
        job(id: "${dbid}") {
            id, jobId, user, project, cluster, startTime,
            duration, numNodes, numHWThreads, numAcc,
            SMT, exclusive, partition, arrayJobId,
            monitoringStatus, state,
            tags { id, type, name },
            resources { hostname, hwthreads, accelerators }
        }
    }`)

    const jobMetrics = operationStore(`query($scopes: [MetricScope!]) {
        jobMetrics(id: "${dbid}", scopes: $scopes) {
            name
            metric {
                unit, scope, timestep
                statisticsSeries { min, mean, max }
                series {
                    hostname, id, data
                    statistics { min, avg, max }
                }
            }
        }
    }`, {
        scopes: ["node", "core"]
    })

    query(job)

    query(jobMetrics)

    let plots = {}
    let jobTags
    let fullWidth
    $: polarPlotSize = Math.min(fullWidth / 3 - 10, 300)
</script>

<div class="row" bind:clientWidth={fullWidth}></div>
<Row>
    <Col>
        {#if $job.error}
            <Card body color="danger">{$job.error.message}</Card>
        {:else if $job.data}
            <JobInfo job={$job.data.job} jobTags={jobTags}/>
        {:else}
            <Spinner secondary/>
        {/if}
    </Col>
    {#if $jobMetrics.data && $job.data && $initialized}
        <Col>
            <PolarPlot
                width={polarPlotSize} height={polarPlotSize}
                metrics={ccconfig.job_view_polarPlotMetrics}
                cluster={$job.data.job.cluster}
                jobMetrics={$jobMetrics.data.jobMetrics} />
        </Col>
        <Col>
            <Roofline
                width={fullWidth / 3} height={polarPlotSize}
                cluster={clusters
                    .find(c => c.name == $job.data.job.cluster).partitions
                    .find(p => p.name == $job.data.job.partition)}
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
        {#if $job.data}
            <TagManagement job={$job.data.job} bind:jobTags={jobTags}/>
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
        {:else if $initialized && $jobMetrics.data && $job.data}
            <PlotTable
                let:item
                let:width
                items={groupByScope($jobMetrics.data.jobMetrics)}
                itemsPerRow={ccconfig.plot_view_plotsPerRow}>
                <Metric
                    bind:this={plots[item[0].name]}
                    job={$job.data.job}
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
        {#if $initialized && $jobMetrics.data && $job.data}
            <StatsTable job={$job.data.job} jobMetrics={$jobMetrics.data.jobMetrics} />
        {/if}
    </Col>
</Row>
