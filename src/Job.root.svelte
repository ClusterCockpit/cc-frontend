<script>
    import { init, groupByScope, fetchMetricsStore } from './utils.js'
    import { Row, Col, Card, Spinner, TabContent, TabPane } from 'sveltestrap'
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
            SMT, exclusive, partition, subCluster, arrayJobId,
            monitoringStatus, state,
            tags { id, type, name },
            resources { hostname, hwthreads, accelerators },
            metaData
            userData { name, email }
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
                    .find(c => c.name == $initq.data.job.cluster).subClusters
                    .find(sc => sc.name == $initq.data.job.subCluster)}
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
                    subCluster={$initq.data.job.subCluster}
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
        {#if $initq.data}
        <TabContent>
            <TabPane tabId="stats" tab="Statistics Table" active>
                {#if $jobMetrics.data}
                    <StatsTable job={$initq.data.job} jobMetrics={$jobMetrics.data.jobMetrics} />
                {/if}
            </TabPane>
            <TabPane tabId="job-script" tab="Job Script">
                <div class="pre-wrapper">
                    {#if $initq.data.job.metaData?.jobScript}
                        <pre><code>{$initq.data.job.metaData?.jobScript}</code></pre>
                    {:else}
                        <Card body color="warning">No job script available</Card>
                    {/if}
                </div>
            </TabPane>
            <TabPane tabId="slurm-info" tab="Slurm Info">
                <div class="pre-wrapper">
                    {#if $initq.data.job.metaData?.slurmInfo}
                        <pre><code>{$initq.data.job.metaData?.slurmInfo}</code></pre>
                    {:else}
                        <Card body color="warning">No additional slurm information available</Card>
                    {/if}
                </div>
            </TabPane>
        </TabContent>
        {/if}
    </Col>
</Row>

<style>
    .pre-wrapper {
        font-size: 1.1rem;
        margin: 10px;
        border: 1px solid #bbb;
        border-radius: 5px;
        padding: 5px;
    }
</style>
