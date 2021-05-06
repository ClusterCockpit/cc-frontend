<script context="module">
    /* The values in here are only
     * used while the GraphQL clusters
     * query is still loading. After that,
     * the values are replaced.
     */
    export const defaultFilters = {
        numNodes: {
            from: 0, to: 0
        },
        duration: {
            from: { hours: 0, min: 0 },
            to: { hours: 0, min: 0 }
        },
        startTime: {
            from: { date: "0000-00-00" , time: "00:00"},
            to: { date:  "0000-00-00", time: "00:00"}
        },
        cluster: null,
        tags: {}
    };

    function toRFC3339({ date, time }) {
        return `${date}T${time}:00Z`;
    }

    function getFilterItems(filters) {
        let filterItems = [];

        filterItems.push({ numNodes: {
            from: filters["numNodes"]["from"],
            to:   filters["numNodes"]["to"]
        }});

        filterItems.push({ startTime: {
            from: toRFC3339(filters["startTime"]["from"]),
            to:   toRFC3339(filters["startTime"]["to"])
        }});

        let from = filters["duration"]["from"]["hours"] * 3600
                + filters["duration"]["from"]["min"] * 60;
        let to = filters["duration"]["to"]["hours"] * 3600
                + filters["duration"]["to"]["min"] * 60;
        filterItems.push({ duration: { from: from , to: to } });

        if (filters["cluster"] != null)
            filterItems.push({ clusterId: { eq: filters["cluster"] } });

        let tags = Object.keys(filters["tags"]);
        if (tags.length > 0)
            filterItems.push({ tags });

        return filterItems;
    }

    export const defaultFilterItems = [];
</script>

<script>
    import { getColorForTag } from './utils.js';
    import { createEventDispatcher } from "svelte";
    import { Col, Row, FormGroup, Button, Input,
             ListGroup, ListGroupItem, Card, Spinner } from 'sveltestrap';
    import { operationStore, query } from '@urql/svelte';

    function deepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    let filters = deepCopy(defaultFilters);

    let tagsQuery = operationStore(`
        query {
            tags {
                id,
                tagName,
                tagType
            }
        }
    `);

    query(tagsQuery);

    export let showFilters = false;
    export let clusters;
    export let filterRanges; /* Global filter ranges for all clusters */
    const dispatch = createEventDispatcher();

    let tagFilterTerm = '';
    let projectFilterTerm = '';
    let filteredTags = [];
    let currentRanges = { numNodes: { from: 0, to: 500 } };
    let appliedFilters = defaultFilters;

    function fuzzyMatch(term, string) {
        return string.toLowerCase().includes(term);
    }

    function fuzzySearchTags(term, tags) {
        if (!tags)
            return;

        let results = [];
        for (let tag of tags) {
            if (fuzzyMatch(term, tag.tagType) ||
                fuzzyMatch(term, tag.tagName))
                results.push(tag);
        }
        filteredTags = results;
    }

    $: fuzzySearchTags(tagFilterTerm, $tagsQuery.data && $tagsQuery.data.tags);

    function fromRFC3339(rfc3339) {
        let parts = rfc3339.split('T');
        return {
            date: parts[0],
            time: parts[1].split(':', 2).join(':')
        };
    }

    function secondsToHours(duration) {
        const hours = Math.floor(duration / 3600);
        duration -= hours * 3600;
        const min = Math.floor(duration / 60);
        return { hours, min };
    }

    /* Gets called when a cluster is selected
     * and once the filterRanges have been loaded (via GraphQL).
     */
    function updateRanges() {
        if (!filterRanges || !clusters)
            return;

        let ranges = filters.cluster
            ? clusters.find(c => c.clusterID == filters.cluster).filterRanges
            : filterRanges;

        currentRanges.numNodes = ranges.numNodes;

        // function clamp(x, { from, to }) {
        //     return x < from ? from : (x < to ? x : to);
        // }

        // TODO: Clamp values instead?
        filters.numNodes.from = ranges.numNodes.from;
        filters.numNodes.to = ranges.numNodes.to;
        filters.startTime.from = fromRFC3339(ranges.startTime.from);
        filters.startTime.to = fromRFC3339(ranges.startTime.to);
        filters.duration.from = secondsToHours(ranges.duration.from);
        filters.duration.to = secondsToHours(ranges.duration.to);
    }

    /* Later used for 'Reset' button: */
    function setDefaultFilters() {
        if (!filterRanges)
            return null;

        defaultFilters.numNodes.from = filterRanges.numNodes.from;
        defaultFilters.numNodes.to = filterRanges.numNodes.to;

        defaultFilters.startTime.from = fromRFC3339(filterRanges.startTime.from);
        defaultFilters.startTime.to = fromRFC3339(filterRanges.startTime.to);

        defaultFilters.duration.from = secondsToHours(filterRanges.duration.from);
        defaultFilters.duration.to = secondsToHours(filterRanges.duration.to);

        appliedFilters = defaultFilters;
        filters = deepCopy(defaultFilters);
    }

    $: setDefaultFilters(filterRanges);
    $: updateRanges(filterRanges, clusters);

    function formatDuration({ hours, min }) {
        hours = hours.toString().padStart(2, '0');
        min = min.toString().padStart(2, '0');
        return `${hours}:${min}h`
    }

    function handleReset( ) {
        tagFilterTerm = '';
        projectFilterTerm = '';
        filters = deepCopy(defaultFilters);
        appliedFilters = defaultFilters;
        handleApply();
    }

    function handleTagSelection(tag) {
        if (filters["tags"][tag.id])
            delete filters["tags"][tag.id];
        else
            filters["tags"][tag.id] = tag;

        filteredTags = filteredTags;
    }

    function handleApply( ) {
        let filterItems = getFilterItems(filters);

        if (projectFilterTerm)
            filterItems.push({ projectId: { contains: projectFilterTerm } });

        appliedFilters = deepCopy(filters);
        dispatch("update", { filterItems });
    }
</script>

<style>
    .cc-tag.badge.rounded-pill {
        cursor: pointer;
    }

    .tags-list {
        height: 10em;
        overflow: scroll;
        border: 1px solid #ccc;
    }

    .tags-search-input {
        width: 100%;
        margin-top: 20px;
    }

    .applied-filters {
        margin-bottom: 10px;
    }
</style>

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
        </Col>
        <Col>
            <Row>
                <Col>
                    <h5>Number of nodes</h5>
                </Col>
            </Row>
            <p>Between</p>
            <Row>
                <FormGroup class="col">
                    <Input type=number bind:value={filters["numNodes"]["from"]}
                        min="{currentRanges.numNodes.from}" max="{currentRanges.numNodes.to}" />
                    <Input type=range bind:value={filters["numNodes"]["from"]}
                        min="{currentRanges.numNodes.from}" max="{currentRanges.numNodes.to}" />
                </FormGroup>
                <p>and</p>
                <FormGroup class="col">
                    <Input type=number bind:value={filters["numNodes"]["to"]}
                        min="{currentRanges.numNodes.from}" max="{currentRanges.numNodes.to}" />
                    <Input type=range bind:value={filters["numNodes"]["to"]}
                        min="{currentRanges.numNodes.from}" max="{currentRanges.numNodes.to}" />
                </FormGroup>
            </Row>
        </Col>
    </Row>
    <Row>
        <Col>
            <Row>
                <Col>
                    <h5>Tags</h5>
                </Col>
            </Row>
            <Row>
                <Col>
                    {#if $tagsQuery.fetching}
                        <div class="d-flex justify-content-center">
                            <Spinner secondary />
                        </div>
                    {:else if $tagsQuery.error}
                        <Card body color="danger" class="mb-3"><h2>Error: {$tagsQuery.error.message}</h2></Card>
                    {:else}
                        <ul class="list-group tags-list">
                            {#each filteredTags as tag}
                                <ListGroupItem class="{filters["tags"][tag.id] ? 'active' : ''}">
                                    <span class="cc-tag badge rounded-pill {getColorForTag(tag)}" on:click={_ => handleTagSelection(tag)}>
                                        {tag.tagType}: {tag.tagName}
                                    </span>
                                </ListGroupItem>
                            {/each}
                        </ul>
                        <input
                            class="tags-search-input" type="text"
                            placeholder="Search Tags (Click to Select)"
                            bind:value={tagFilterTerm}>
                    {/if}
                </Col>
            </Row>
        </Col>
        <Col>
            <Row>
                <Col>
                    <h5>Clusters</h5>
                </Col>
            </Row>
            <Row>
                <Col>
                    <ListGroup>
                        <ListGroupItem>
                            <input type="radio" value={null}
                                bind:group={filters["cluster"]}
                                on:change={updateRanges} />
                            All
                        </ListGroupItem>
                        {#each (clusters || []) as cluster}
                            <ListGroupItem>
                                <input type="radio" value={cluster.clusterID}
                                    bind:group={filters["cluster"]}
                                    on:change={updateRanges} />
                                {cluster.clusterID}
                            </ListGroupItem>
                        {/each}
                    </ListGroup>
                </Col>
            </Row>
        </Col>
        <Col>
            <Row>
                <Col>
                    <h5>Project ID</h5>
                </Col>
            </Row>
            <Row>
                <Col>
                    <input type="text"
                        bind:value={projectFilterTerm}
                        placeholder="Filter"
                        style="width: 100%;">
                </Col>
            </Row>
        </Col>
    </Row>
    <div class="d-flex flex-row justify-content-center">
        <div class="p-2">
            <Button color=secondary on:click={handleReset}>Reset</Button>
        </div>
        <div class="p-2">
            <Button color=primary on:click={handleApply}>Apply</Button>
        </div>
    </div>
{/if}

<div class="applied-filters d-flex flex-row justify-content-between">
    <div>
        <b>Applied Filters:</b>
    </div>
    <div>
        Clusters:
        <br>
        {appliedFilters["cluster"] == null
            ? (clusters || []).map(c => c.clusterID).join(', ')
            : appliedFilters["cluster"]}
    </div>
    <div>
        Tags:
        {#each Object.values(appliedFilters["tags"]) as tag}
            <br>
            <span class="cc-tag badge rounded-pill {getColorForTag(tag)}">
                {tag.tagType}: {tag.tagName}
            </span>
        {:else}
            -
        {/each}
    </div>
    <div>
        Nodes:
        <br>
        {appliedFilters["numNodes"]["from"]} - {appliedFilters["numNodes"]["to"]}
    </div>
    <div>
        Duration:
        <br>
        {formatDuration(appliedFilters["duration"]["from"])} -
        {formatDuration(appliedFilters["duration"]["to"])}
    </div>
    <div>
        Start Time:
        <br>
        {appliedFilters["startTime"]["from"]["date"]}
        {appliedFilters["startTime"]["from"]["time"]}
        -
        {appliedFilters["startTime"]["to"]["date"]}
        {appliedFilters["startTime"]["to"]["time"]}
    </div>
</div>
