<script>
    import { init } from './utils.js'
    import { getContext, onMount } from 'svelte'
    import { operationStore, query } from '@urql/svelte'
    import { Row, Col, Button, Icon, Spinner, Card, InputGroup, InputGroupText } from 'sveltestrap'
    import Filters from './filters/Filters.svelte'


    const { query: initq } = init()

    export let filterPresets

    let cluster
    let filters
    const ccconfig = getContext('cc-config'),
          clusters = getContext('clusters')

    getContext('on-init')(({ data }) => {
        if (data != null) {
            cluster = data.clusters.find(c => c.name == filterPresets.cluster)
            console.assert(cluster != null, `This cluster could not be found: ${filterPresets.cluster}`)
        }

        console.log(cluster)
    })


    const statsQuery = operationStore(`
        query($filter: [JobFilter!]!, $metrics: [String!]!) {
            jobsFootprints(filter: $filter, metrics: $metrics) {
                name,
                footprints
            }
        }
    `, {
        filter: [], metrics: []
    }, { pause: true });





    query(statsQuery)
    onMount(() => filters.update())
</script>

<Row>
    <Col xs="auto">
        {#if $initq.fetching}
            <Spinner/>
        {:else if $initq.error}
            <Card body color="danger">{$initq.error.message}</Card>
        {:else}
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
    <Col xs="auto">
        <Filters
            bind:this={filters}
            filterPresets={filterPresets}
            disableClusterSelection={true}
            on:update={({ detail }) => {
                // TODO:
                console.log('TODO:', detail.filters)
            }} />
    </Col>
</Row>
