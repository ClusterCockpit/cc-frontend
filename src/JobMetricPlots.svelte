<script>
    import { Card, Spinner } from 'sveltestrap';
    import { operationStore, query, getClient } from '@urql/svelte';
    import Plot from './Plot.svelte';

    export let jobId;
    export let width;
    export let selectedMetrics;

    const rawQuery = `
        query($jobId: String!, $metrics: [String]!) {
            jobMetrics(
                jobId: $jobId,
                metrics: $metrics
            ) {
                name,
                metric {
                    unit,
                    scope,
                    timestep,
                    series { node_id, data }
                }
            }
        }
    `;

    const jobDataQuery = operationStore(rawQuery, {
        jobId,
        metrics: selectedMetrics
    });

    function sortQueryData(data) {
        const obj = data.reduce((obj, e) => {
            obj[e['name']] = e['metric'];
            return obj;
        }, {});

        return selectedMetrics.map((name) => ({ name, data: obj[name] }));
    }

    let oldSelectedMetrics = selectedMetrics.slice();
    let oldQueryData = null;

    function prepareData(initialQueryData) {
        /* The jobId changed:  */
        if (oldSelectedMetrics == null) {
            oldSelectedMetrics = selectedMetrics.slice();
            return sortQueryData($jobDataQuery.data.jobMetrics);
        }

        if (oldQueryData == null)
            oldQueryData = initialQueryData;

        let data = [...oldQueryData];

        selectedMetrics
            .filter(metric => !oldSelectedMetrics.includes(metric))
            .map(metric => getClient()
                .query(rawQuery, { jobId, metrics: [metric] })
                .toPromise()
                .then(res => {

                    if (res.error || res.data.jobMetrics.length != 1) {
                        data.push({ name: metric, error: res.error });
                        return;
                    }

                    data.push({
                        name: metric,
                        metric: res.data.jobMetrics[0].metric
                    });
                }));

        oldSelectedMetrics = selectedMetrics;
        oldQueryData = data;
        return sortQueryData(data);
    }

    function jobIdChanged() {
        $jobDataQuery.variables.jobId = jobId
        oldSelectedMetrics = null;
        oldQueryData = null;
    }

    $: jobIdChanged(jobId);

    query(jobDataQuery);
</script>

{#if $jobDataQuery.fetching}
    <td colspan="{selectedMetrics.length}">
        <Spinner secondary />
    </td>
{:else if $jobDataQuery.error}
    <td colspan="{selectedMetrics.length}">
        <Card body color="danger" class="mb-3">Error: {$jobDataQuery.error.message}</Card>
    </td>
{:else}
    {#each prepareData($jobDataQuery.data.jobMetrics, selectedMetrics) as metric}
        <td class="cc-plot-{jobId.replace('.', '_')}-{metric.name}">
            {#if metric.data}
                <Plot data={metric.data} width={width / selectedMetrics.length}/>
            {:else if metric.error}
                <span class="badge badge-danger">{metric.error.message}</span>
            {:else}
                <span class="badge badge-warning">Missing Data</span>
            {/if}
        </td>
    {/each}
{/if}
