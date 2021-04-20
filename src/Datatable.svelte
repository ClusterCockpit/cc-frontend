<script>
    import { initClient, operationStore, query } from '@urql/svelte';
    import { Col, Row, FormGroup,
        Label,
        Table, Icon, Badge,
        Button,
        Card, CardBody,
        Spinner,
        ListGroup, ListGroupItem,
        Modal, ModalBody, ModalHeader, ModalFooter, Input } from 'sveltestrap';
    import Pagination from './Pagination.svelte';
    import Filter from './FilterConfig.svelte';
    import JobMeta from './JobMeta.svelte';
    import JobMetricPlots from './JobMetricPlots.svelte';

    let filters = {
        numNodes: {
            from: 1, to: 64
        },
        duration: {
            from: { hours: 0, min: 10 },
            to: { hours: 24, min: 0 }
        },
        startTime: {
            from: { date: "2014-01-01" , time: "12:00"},
            to: { date:  "2021-03-30", time: "23:00"}
        }
    };
    let itemsPerPage = 25;
    let page = 1;
    let filterItems = [];
    let userFilter;
    let filter = { "list": [{"duration": {"from": 60, "to": 84600}}]};
    let sorting = { field: "start_time", order: "DESC" };
    let paging = { itemsPerPage: itemsPerPage, page: page };
    let sortedColumns = {
        startTime:   {type: "numeric", direction: ["down","up"], order: ["DESC","ASC"], field: "start_time",    current: 0},
        duration:    {type: "numeric", direction: ["down","up"], order: ["DESC","ASC"], field: "duration",      current: 2},
        numNodes:    {type: "numeric", direction: ["down","up"], order: ["DESC","ASC"], field: "num_nodes",     current: 2},
        memUsedMax:  {type: "numeric", direction: ["down","up"], order: ["DESC","ASC"], field: "mem_used_max",  current: 2},
        flopsAnyAvg: {type: "numeric", direction: ["down","up"], order: ["DESC","ASC"], field: "flops_any_avg", current: 2},
        memBwAvg:    {type: "numeric", direction: ["down","up"], order: ["DESC","ASC"], field: "mem_bw_avg",    current: 2},
        netBwAvg:    {type: "numeric", direction: ["down","up"], order: ["DESC","ASC"], field: "net_bw_avg",    current: 2},
    };

    /* TODO: Fetch those from the backend */
    let metrics = ['cpu_load', 'mem_used', 'flops_any', 'flops_dp', 'flops_sp', 'mem_bw', 'cpi', 'clock', 'rapl_power'];
    let unorderedSelectedMetrics = ['flops_any', 'cpu_load', 'mem_bw', 'mem_used'];

    /* Svelte's bind:group does not care about order, so reorder here */
    let selectedMetrics = [];
    $: selectedMetrics = metrics.filter(metric =>
        unorderedSelectedMetrics.includes(metric));

    let date;
    let showStats = false;
    let columnConfigOpen = false;
    let sortConfigOpen = false;
    let showFilters = false;
    const toggleColumnConfig = () => (columnConfigOpen = !columnConfigOpen);
    const toggleSortConfig = () => (sortConfigOpen = !sortConfigOpen);
    const toggleFilter = () => (showFilters = !showFilters);

    let tableWidth;
    let jobMetaWidth = 300;  // TODO: Read actuall width/height
    let jobMetaHeight = 200;

    initClient({ url: 'http://localhost:8080/query' });

    const jobQuery = operationStore(`
    query($filter: JobFilterList!, $sorting: OrderByInput!, $paging: PageRequest! ){
       jobs(
       filter: $filter
       order: $sorting
       page: $paging
       ) {
           items {
             jobId
             userId
             projectId
             clusterId
             startTime
             duration
             numNodes
             hasProfile
           }
           count
         }
     }
     `, {filter, sorting, paging});

    query(jobQuery);

    function handleFilter( event ) {
        filterItems = event.detail.filterItems;
        $jobQuery.variables.filter = { "list": filterItems};
    }

    function handlePaging( event ) {
        itemsPerPage = event.detail.itemsPerPage;
        page = event.detail.page;
        $jobQuery.variables.paging = {itemsPerPage: itemsPerPage, page: page };
    }

    function handleUserFilter ( event ) {
        filterItems.push({userId: {contains: userFilter }});
        $jobQuery.variables.filter = { "list": filterItems};
    }

    function handleSorting( event ) {
        let nextActiveCol = event.currentTarget.id;
        const keys = Object.keys(sortedColumns);

        keys.forEach((key) => {
            if ( key === nextActiveCol ) {
                if (sortedColumns[key].current == 2) {
                    sortedColumns[key].current = 0;
                } else {
                    if (sortedColumns[key].current == 0) {
                        sortedColumns[key].current = 1;
                    } else {
                        sortedColumns[key].current = 0;
                    }
                }

                $jobQuery.variables.sorting = {
                    field: sortedColumns[key].field,
                    order: sortedColumns[key].order[sortedColumns[key].current]
                };
            } else {
                sortedColumns[key].current = 2;
            }
        });
    }

</script>

<style>
    .sort {
        border: none;
        margin: 0;
        padding: 0;
        background: 0 0;
        transition: all 70ms;
    }

    .active {
        background-color: #bbb;
    }

    .cc-table-wrapper {
        overflow: initial;
    }

    :global(.cc-table-wrapper > table) {
        border-collapse: separate;
    }

    th.position-sticky.top-0 {
        background-color: white;
        z-index: 1000;
        border-bottom: 1px solid black;
    }

</style>

<Modal isOpen={columnConfigOpen} toggle={toggleColumnConfig}>
    <ModalHeader>
        Configure columns
    </ModalHeader>
    <ModalBody>
        <ListGroup>
            {#each metrics as metric}
                <ListGroupItem>
                    {#if unorderedSelectedMetrics.includes(metric) }
                        <input type="checkbox" bind:group={unorderedSelectedMetrics} value={metric} checked>
                    {:else }
                        <input type="checkbox" bind:group={unorderedSelectedMetrics} value={metric}>
                    {/if}
                    {metric}
                </ListGroupItem>
            {/each}
        </ListGroup>
    </ModalBody>
    <ModalFooter>
        <Button color="primary" on:click={toggleColumnConfig}>Close</Button>
    </ModalFooter>
</Modal>

<Modal isOpen={sortConfigOpen} toggle={toggleSortConfig}>
    <ModalHeader>
        Sort rows
    </ModalHeader>
    <ModalBody>
        <ListGroup>
            {#each Object.keys(sortedColumns) as col}
                <ListGroupItem>
                    {#if sortedColumns[col].current == 2}
                        <button type="button" class="sort" id="{col}" on:click={handleSorting}>
                             <Icon name="sort-{sortedColumns[col].type}-{sortedColumns[col].direction[0]}"/>
                        </button>
                    {:else}
                        <button type="button" class="sort active" id="{col}" on:click={handleSorting}>
                            <Icon name="sort-{sortedColumns[col].type}-{sortedColumns[col].direction[sortedColumns[col].current]}"/>
                        </button>
                    {/if}
                    {sortedColumns[col].field}
                </ListGroupItem>
            {/each}
        </ListGroup>
    </ModalBody>
    <ModalFooter>
        <Button color="primary" on:click={toggleSortConfig}>Close</Button>
    </ModalFooter>
</Modal>

<Filter {showFilters} on:update={handleFilter} />
<div class="d-flex flex-row justify-content-between">
    <div>
        <Button outline color=success  on:click={toggleFilter}><Icon name="filter" /></Button>
    </div>
    <div class="input-group w-75 mb-2 mr-sm-2">
        <div class="input-group-prepend">
            <div class="input-group-text"><Icon name="search" /></div>
        </div>
        <input type="search" bind:value={userFilter} on:change={handleUserFilter} class="form-control"  placeholder="Filter userId">
      </div>
    <div>
        <Button outline on:click={toggleSortConfig}><Icon name="sort-down" /></Button>
        <Button outline on:click={toggleColumnConfig}><Icon name="gear" /></Button>
    </div>
</div>

{#if $jobQuery.fetching}
    <div class="d-flex justify-content-center">
        <Spinner secondary />
    </div>
{:else if $jobQuery.error}
    <Card body color="danger" class="mb-3"><h2>Error: {$jobQuery.error.message}</h2></Card>
{:else}
    <Row>
        <div class="col cc-table-wrapper" bind:clientWidth={tableWidth}>
            <Table>
                <thead>
                    <tr>
                        <th class="position-sticky top-0" scope="col">
                            Job Info
                        </th>
                        {#each selectedMetrics as metric}
                            <th class="position-sticky top-0 text-center" scope="col">
                                {metric}
                            </th>
                        {/each}
                    </tr>
                </thead>
                <tbody>
                    {#each $jobQuery.data.jobs.items as row, i}
                        <tr>
                            <td style="width: {jobMetaWidth}px; height: {jobMetaHeight}px;">
                                <JobMeta job={row} />
                            </td>
                            {#if row["hasProfile"]}
                                <JobMetricPlots
                                    jobId={row["jobId"]}
                                    width={tableWidth - jobMetaWidth - 50}
                                    height={jobMetaHeight}
                                    selectedMetrics={selectedMetrics} />
                            {:else}
                                <td colspan="{selectedMetrics.length}">
                                    <Card body color="warning">No Profiling Data</Card>
                                </td>
                            {/if}
                        </tr>
                    {/each}
                </tbody>
            </Table>
        </div>
    </Row>

    <Pagination
        {page}
        {itemsPerPage}
        itemText="Jobs"
        totalItems={$jobQuery.data.jobs.count}
        on:update={handlePaging}
        />
{/if}
