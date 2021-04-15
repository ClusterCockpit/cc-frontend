<script>
    import { Card, Spinner } from 'sveltestrap';
    import { operationStore, query, getClient } from '@urql/svelte';
    import Plot from './Plot.svelte';

    export let jobId;
    export let selectedMetrics;

    const metrics = selectedMetrics.slice();
    let addedMetrics = [];

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

    const jobDataQuery = operationStore(rawQuery, { jobId, metrics });

    function sortQueryData(data) {
        const obj = data.reduce((obj, e) => {
            obj[e['name']] = e['metric'];
            return obj;
        }, {});

        return metrics.map((name) => ({ name, data: obj[name] }));
    }

    /*
     * Svelte would refetch and rerender every plot if
     * we would directly assign to metrics and
     * jobDataQuery.variables.metrics (even if
     * we only remove something).
     *
     * Instead, we do this slightly more compilacted stuff
     * so that we only fetch/render the plot that was added.
     */
    export function selectedMetricsChanged(newlySelectedMetrics) {
        metrics
            .filter(metric => !newlySelectedMetrics.includes(metric))
            .map(metric => {
                const selector = `.cc-plot-${jobId.replace('.', '_')}-${metric}`;
                const td = document.querySelector(selector);
                td.remove();
                for (let i = 0; i < addedMetrics.length; i++) {
                    if (addedMetrics[i].name == metric) {
                        addedMetrics.splice(i, 1);
                        break;
                    }
                }
            });

        newlySelectedMetrics
            .filter(metric => !metrics.includes(metric))
            .map(metric => {
                const client = getClient();

                client.query(rawQuery, {
                    jobId, metrics: [metric]
                }).toPromise().then(res => {
                    if (res.error || res.data.jobMetrics.length != 1) {
                        addedMetrics = [...addedMetrics, { name: metric, error: res.error }];
                        return;
                    }

                    addedMetrics = [...addedMetrics, {
                        name: metric,
                        data: res.data.jobMetrics[0].metric
                    }];
                });
            });

        metrics.splice(0, metrics.length);
        metrics.push(...newlySelectedMetrics);
    }

    $: $jobDataQuery.variables.jobId = jobId;
    $: selectedMetricsChanged(selectedMetrics);

    query(jobDataQuery);
</script>

{#if $jobDataQuery.fetching}
    <td colspan="{metrics.length}">
        <Spinner secondary />
    </td>
{:else if $jobDataQuery.error}
    <td colspan="{metrics.length}">
        <Card body color="danger" class="mb-3">Error: {$jobDataQuery.error.message}</Card>
    </td>
{:else}
    {#each sortQueryData($jobDataQuery.data.jobMetrics) as metric}
        <td class="cc-plot-{jobId.replace('.', '_')}-{metric.name}">
            {#if metric.data}
                <Plot data={metric.data} />
            {:else}
                <span class="badge badge-warning">Missing Data</span>
            {/if}
        </td>
    {/each}
    {#each addedMetrics as metric}
        <td class="cc-plot-{jobId.replace('.', '_')}-{metric.name}">
            {#if metric.data}
                <Plot data={metric.data} />
            {:else if metric.error}
                <span class="badge badge-danger">Error: {metric.error.message}</span>
            {:else}
                <span class="badge badge-warning">Missing Data</span>
            {/if}
        </td>
    {/each}
{/if}
