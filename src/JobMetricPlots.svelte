<script>
    import { Card, Spinner } from 'sveltestrap';
    import { operationStore, query } from '@urql/svelte';
    import Plot from './Plot.svelte';

    export let jobId;
    export let selectedMetrics;

    const jobDataQuery = operationStore(`
        query($jobId: String!, $selectedMetrics: [String]!) {
            jobAvailableMetricsById(
                jobId: $jobId,
                selectMetrics: $selectedMetrics
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
    `, { jobId, selectedMetrics });

    function sortQueryData(data) {
        const obj = data.reduce((obj, e) => {
            obj[e['name']] = e['metric'];
            return obj;
        }, {});

        return selectedMetrics.map((name) =>
            obj[name] ? obj[name] : null);
    }

    export function selectedMetricsChanged(newlySelectedMetrics) {
        /*
         * TODO/FIXME:
         * The assignment below will cause Svelte to
         * refetch and rerender everything. This can be done
         * much better by only fetching and rendering
         * the added metrics and removing what was removed.
         */
        $jobDataQuery.variables.selectedMetrics = newlySelectedMetrics;
        selectedMetrics = newlySelectedMetrics;
    }

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
    {#each sortQueryData($jobDataQuery.data.jobAvailableMetricsById) as metric}
        <td>
            {#if metric}
                <Plot fetchData={() => Promise.resolve(metric)} />
            {:else}
                <span class="badge badge-warning">Missing Data</span>
            {/if}
        </td>
    {/each}
{/if}
