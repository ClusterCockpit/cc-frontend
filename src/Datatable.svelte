<script>
    import { initClient, operationStore, query } from '@urql/svelte';
    import Chart from 'chart.js';
    import { Col, Row, FormGroup,
        Label,
        Table, Icon, Badge,
        Button,
        Card, CardBody,
        Spinner,
        ListGroup, ListGroupItem,
        Modal, ModalBody, ModalHeader, ModalFooter, Input } from 'sveltestrap';
    import Pagination from './Pagination.svelte';

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
    let limit = 25;
    let offset = 0;
    let filter = { "list": [
        {"duration": {"from": 60, "to": 84600}}]};
    let sorting = { field: "start_time", order: "DESC" };
    let paging = { limit: limit, offset: offset };
    let selected = [];
    let columns = ['jobId','userId','projectId','clusterId','startTime','duration','numNodes'];
    let activeColumns = ['jobId','userId','startTime','duration'];
    let sortedColumns = {
        startTime: {type: "numeric", direction: ["down","up"], order: ["DESC","ASC"], field: "start_time", current: 0},
        duration: {type: "numeric", direction: ["down","up"], order: ["DESC","ASC"], field: "duration", current: 2},
        numNodes: {type: "numeric", direction: ["down","up"], order: ["DESC","ASC"], field: "num_nodes", current: 2},
    };

    let date;
    let showFilters = false;
    let showStats = false;
    let open = false;
    const toggleConfig = () => (open = !open);
    const toggleFilter = () => (showFilters = !showFilters);

    initClient({ url: 'http://localhost:8080/query' });

    const jobsStats = operationStore(`
    query($filter: JobFilterList!){
       jobsStatistics(
       filter: $filter
       ) {
           totalJobs
           histNumNodes {
              count
              value
          }
        }
     }
     `,{filter});

    query(jobsStats);

    const jobQuery = operationStore(`
    query($filter: JobFilterList!, $sorting: OrderByInput!, $paging: PageRequest! ){
       jobs(
       filter: $filter
       orderBy: $sorting
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
           }
           count
         }
     }
`, {filter, sorting, paging});

    query(jobQuery);

    function handlePaging( event ) {
        limit = event.detail.limit;
        offset = event.detail.offset;
        $jobQuery.variables.paging = {limit: limit, offset: offset };
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

                console.log(sortedColumns[key].current);
                $jobQuery.variables.sorting = {
                    field: sortedColumns[key].field,
                    order: sortedColumns[key].order[sortedColumns[key].current]
                };
            } else {
                sortedColumns[key].current = 2;
            }
        });
    }

    function buildFilter( ) {
        let filterItems = [];
        const keys = Object.keys(filters);

        keys.forEach((key, index) => {
            switch(key) {
                case "numNodes":
                    filterItems.push({numNodes: {"from": filters["numNodes"]["from"], to:  filters["numNodes"]["to"]}});
                    break;
                case "startTime":
                    break;
                case "duration":
                    var from = filters["duration"]["from"]["hours"] * 3600 + filters["duration"]["from"]["min"] * 60;
                    var to = filters["duration"]["to"]["hours"] * 3600 + filters["duration"]["to"]["min"] * 60;
                    filterItems.push({duration: {from: from , to: to }});
                    break;
                case "userId":
                    filterItems.push({userId: {contains: filters["userId"] }});
            }
        });

        $jobQuery.variables.filter = { "list": filterItems };
    }
</script>

<style>
   .sort {
        position: relative;
        border: none;
        margin: 0;
        padding: 0;
        background: 0 0;
        transition: all 70ms;
    }
   .active {
       background-color: #bbb;
   }
</style>

<Modal isOpen={open} {toggleConfig}>
    <ModalHeader>
        Configure columns
    </ModalHeader>
    <ModalBody>
        <ListGroup>
            {#each columns as col, i }
                <ListGroupItem>
                    {#if activeColumns.includes(col) }
                        <input type="checkbox" bind:group={activeColumns} value={col} checked>
                    {:else }
                        <input type="checkbox" bind:group={activeColumns} value={col} >
                    {/if}
                    {col}
                </ListGroupItem>
            {/each}
        </ListGroup>
    </ModalBody>
    <ModalFooter>
        <Button color="primary" on:click={toggleConfig}>Close</Button>
    </ModalFooter>
</Modal>

{#if showFilters}
    <Row>
        <Col>
            <Row>
                <Col>
                    <h5>Start time</h5>
                </Col>
            </Row>
            <p>From</p>
            <Row>
                <FormGroup class="col">
                <Input type="date" name="date"  bind:value={filters["startTime"]["from"]["date"]}  placeholder="datetime placeholder" />
                </FormGroup>
                <FormGroup class="col">
                    <Input type="time" name="date"  bind:value={filters["startTime"]["from"]["time"]}  placeholder="datetime placeholder" />
                </FormGroup>
            </Row>
            <p>To</p>
            <Row>
                <FormGroup class="col">
                <Input type="date" name="date"  bind:value={filters["startTime"]["to"]["date"]}  placeholder="datetime placeholder" />
                </FormGroup>
                <FormGroup class="col">
                    <Input type="time" name="date"  bind:value={filters["startTime"]["to"]["time"]}  placeholder="datetime placeholder" />
                </FormGroup>
            </Row>
        </Col>
        <Col>
            <Row>
                <Col>
                    <h5>Duration</h5>
                </Col>
            </Row>
            <p>Between</p>
            <Row>
                <Col>
                    <div class="input-group mb-2 mr-sm-2">
                        <input type="number" class="form-control"  bind:value={filters["duration"]["from"]["hours"]} >
                        <div class="input-group-append">
                            <div class="input-group-text">h</div>
                        </div>
                    </div>
                </Col>
                <Col>
                    <div class="input-group mb-2 mr-sm-2">
                        <input type="number" class="form-control" bind:value={filters["duration"]["from"]["min"]} >
                        <div class="input-group-append">
                            <div class="input-group-text">m</div>
                        </div>
                    </div>
                </Col>
                <p>and</p>
                <Col>
                    <div class="input-group mb-2 mr-sm-2">
                        <input type="number" class="form-control" bind:value={filters["duration"]["to"]["hours"]}  >
                        <div class="input-group-append">
                            <div class="input-group-text">h</div>
                        </div>
                    </div>
                </Col>
                <Col>
                    <div class="input-group mb-2 mr-sm-2">
                        <input type="number" class="form-control" bind:value={filters["duration"]["to"]["min"]}  >
                        <div class="input-group-append">
                            <div class="input-group-text">m</div>
                        </div>
                    </div>
                </Col>
            </Row>
            <Row>
                <Col>
                    <h5>Number of nodes</h5>
                </Col>
            </Row>
            <p>Between</p>
            <Row>
                <FormGroup class="col">
                    <Input type=number bind:value={filters["numNodes"]["from"]} min=1 max=64 />
                    <Input type=range bind:value={filters["numNodes"]["from"]} min=1 max=64 />
                </FormGroup>
                <p>and</p>
                <FormGroup class="col">
                    <Input type=number bind:value={filters["numNodes"]["to"]} min=1 max=64 />
                    <Input type=range bind:value={filters["numNodes"]["to"]} min=1 max=64 />
                </FormGroup>
            </Row>
        </Col>
    </Row>
    <div class="d-flex flex-row justify-content-center">
        <div class="p-2">
            <Button color=secondary on:click={() => { $jobQuery.variables.filter=filter; }} >Reset</Button>
        </div>
        <div class="p-2">
            <Button color=primary on:click={buildFilter} >Apply</Button>
        </div>
    </div>
{/if}

<div class="d-flex flex-row justify-content-between">
    <div>
        <Button outline color=success  on:click={toggleFilter}><Icon name="filter" /></Button>
    </div>
    <div class="input-group w-75 mb-2 mr-sm-2">
        <div class="input-group-prepend">
            <div class="input-group-text"><Icon name="search" /></div>
        </div>
        <input type="search" bind:value={filters["userId"]} on:change={buildFilter} class="form-control"  placeholder="Filter userId">
      </div>
    <div>
        <Button outline color=info on:click={toggleStatistics}><Icon name="graph-up" /></Button>
        <Button outline on:click={toggleConfig}><Icon name="gear" /></Button>
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
        <Col>
            <Table>
                <thead class="thead-light">
                    <tr>
                        {#each activeColumns as col}
                            <th>
                                {col}
                                {#if col in sortedColumns}
                                        {#if sortedColumns[col].current == 2}
                                     <button class="sort" id="{col}" on:click={handleSorting} role="button" type="button" >
                                        <Icon name="sort-{sortedColumns[col].type}-{sortedColumns[col].direction[0]}"/>
                                    </button>
                                        {:else}
                                     <button class="sort active" id="{col}" on:click={handleSorting} role="button" type="button" >
                                        <Icon name="sort-{sortedColumns[col].type}-{sortedColumns[col].direction[sortedColumns[col].current]}"/>
                                    </button>
                                        {/if}
                                {/if}
                            </th>
                        {/each}
                    </tr>
                </thead>
                <tbody>
                    {#each $jobQuery.data.jobs.items as row}
                        <tr>
                            {#each activeColumns as col}
                                <td>{row[col]}</td>
                            {/each}
                        </tr>
                    {/each}
                </tbody>
            </Table>
        </Col>
    </Row>

    <Pagination
        {offset}
        {limit}
        itemText="Jobs"
        totalItems={$jobQuery.data.jobs.count}
        on:update={handlePaging}
        />
{/if}
