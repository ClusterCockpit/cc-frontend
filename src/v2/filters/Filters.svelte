<!-- 
    @component

    Properties:
    - menuText:      String? (Optional text to show in the dropdown menu)
    - filterPresets: Object? (Optional predefined filter values)
    Events:
    - 'update': The detail's 'filters' prop are new filter items to be applied
    Functions:
    - void update(additionalFilters: Object?): Triggers an update
 -->
<script>
    import { Row, Col, Dropdown, DropdownItem, DropdownMenu,
             DropdownToggle, ButtonDropdown, Icon } from 'sveltestrap'
    import { createEventDispatcher } from 'svelte'
    import Info from './InfoBox.svelte'
    import Cluster from './Cluster.svelte'
    import JobStates from './JobStates.svelte'
    import StartTime from './StartTime.svelte'
    import Tags from './Tags.svelte'
    import Tag from '../Tag.svelte'
    import Duration from './Duration.svelte'
    import Resources from './Resources.svelte'
    import Statistics from './Stats.svelte'

    const dispatch = createEventDispatcher(),
          allJobStates = ['running', 'completed', 'failed', 'canceled', 'stopped', 'timeout']

    export let menuText = null
    export let filterPresets = {}

    let filters = {
        projectMatch: filterPresets.projectMatch || 'contains',
        userMatch:    filterPresets.userMatch    || 'contains',

        cluster:    filterPresets.cluster    || null,
        partition:  filterPresets.partition  || null,
        states:     filterPresets.states     || filterPresets.state ? [filterPresets.state] : allJobStates,
        startTime:  filterPresets.startTime  || { from: null, to: null },
        tags:       filterPresets.tags       || [],
        duration:   filterPresets.duration   || { from: null, to: null },
        jobId:      filterPresets.jobId      || '',
        arrayJobId: filterPresets.arrayJobId || null,
        user:       filterPresets.user       || '',
        project:    filterPresets.project    || '',

        numNodes:         filterPresets.numNodes         || { from: null, to: null },
        numHWThreads:     filterPresets.numHWThreads     || { from: null, to: null },
        numAccelerators:  filterPresets.numAccelerators  || { from: null, to: null },

        stats: [],
    }

    let isClusterOpen = false,
        isJobStatesOpen = false,
        isStartTimeOpen = false,
        isTagsOpen = false,
        isDurationOpen = false,
        isResourcesOpen = false,
        isStatsOpen = false

    // Can be called from the outside to trigger a 'update' event from this component.
    export function update(additionalFilters = null) {
        if (additionalFilters != null)
            for (let key in additionalFilters)
            filters[key] = additionalFilters[key]

        let items = []
        if (filters.cluster)
            items.push({ cluster: { eq: filters.cluster } })
        if (filters.partition)
            items.push({ partition: { eq: filters.partition } })
        if (filters.states.length != allJobStates.length)
            items.push({ state: filters.states })
        if (filters.startTime.from || filters.startTime.to)
            items.push({ startTime: { from: filters.startTime.from, to: filters.startTime.to } })
        if (filters.tags.length != 0)
            items.push({ tags: filters.tags })
        if (filters.duration.from || filters.duration.to)
            items.push({ duration: { from: filters.duration.from, to: filters.duration.to } })
        if (filters.jobId)
            items.push({ jobId: { eq: filters.jobId } })
        if (filters.arrayJobId != null)
            items.push({ arrayJobId: filters.arrayJobId })
        if (filters.numNodes.from != null || filters.numNodes.to != null)
            items.push({ numNodes: { from: filters.numNodes.from, to: filters.numNodes.to } })
        if (filters.numHWThreads.from != null || filters.numHWThreads.to != null)
            items.push({ numHWThreads: { from: filters.numHWThreads.from, to: filters.numHWThreads.to } })
        if (filters.numAccelerators.from != null || filters.numAccelerators.to != null)
            items.push({ numAccelerators: { from: filters.numAccelerators.from, to: filters.numAccelerators.to } })
        if (filters.user)
            items.push({ user: { [filters.userMatch]: filters.user } })
        if (filters.project)
            items.push({ project: { [filters.projectMatch]: filters.project } })
        for (let stat of filters.stats)
            items.push({ [stat.field]: { from: stat.from, to: stat.to } })

        dispatch('update', { filters: items })
        return items
    }
</script>

<Row>
    <Col>
        <ButtonDropdown class="cc-dropdown-on-hover">
            <DropdownToggle outline caret color="primary">
                <Icon name="sliders"/>
                Filters
            </DropdownToggle>
            <DropdownMenu>
                <DropdownItem header>
                    Manage Filters
                </DropdownItem>
                {#if menuText}
                    <DropdownItem disabled>{menuText}</DropdownItem>
                    <DropdownItem divider />
                {/if}
                <DropdownItem on:click={() => (isClusterOpen = true)}>
                    <Icon name="cpu"/> Cluster/Partition
                </DropdownItem>
                <DropdownItem on:click={() => (isJobStatesOpen = true)}>
                    <Icon name="gear-fill"/> Job States
                </DropdownItem>
                <DropdownItem on:click={() => (isStartTimeOpen = true)}>
                    <Icon name="calendar-range"/> Start Time
                </DropdownItem>
                <DropdownItem on:click={() => (isDurationOpen = true)}>
                    <Icon name="stopwatch"/> Duration
                </DropdownItem>
                <DropdownItem on:click={() => (isTagsOpen = true)}>
                    <Icon name="tags"/> Tags
                </DropdownItem>
                <DropdownItem on:click={() => (isResourcesOpen = true)}>
                    <Icon name="hdd-stack"/> Nodes/Accelerators
                </DropdownItem>
                <DropdownItem on:click={() => (isStatsOpen = true)}>
                    <Icon name="bar-chart" on:click={() => (isStatsOpen = true)}/> Statistics
                </DropdownItem>
            </DropdownMenu>
        </ButtonDropdown>

        {#if filters.cluster}
            <Info icon="cpu" on:click={() => (isClusterOpen = true)}>
                {filters.cluster}
                {#if filters.partition}
                    ({filters.partition})
                {/if}
            </Info>
        {/if}

        {#if filters.states.length != allJobStates.length}
            <Info icon="gear-fill" on:click={() => (isJobStatesOpen = true)}>
                {filters.states.join(', ')}
            </Info>
        {/if}

        {#if filters.startTime.from || filters.startTime.to}
            <Info icon="calendar-range" on:click={() => (isStartTimeOpen = true)}>
                {new Date(filters.startTime.from).toLocaleString()} - {new Date(filters.startTime.to).toLocaleString()}
            </Info>
        {/if}

        {#if filters.duration.from || filters.duration.to}
            <Info icon="stopwatch" on:click={() => (isDurationOpen = true)}>
                {Math.floor(filters.duration.from / 3600)}h:{Math.floor(filters.duration.from % 3600 / 60)}m
                -
                {Math.floor(filters.duration.to / 3600)}h:{Math.floor(filters.duration.to % 3600 / 60)}m
            </Info>
        {/if}

        {#if filters.tags.length != 0}
            <Info icon="tags" on:click={() => (isTagsOpen = true)}>
                {#each filters.tags as tagId}
                    <Tag id={tagId} clickable={false} />                    
                {/each}
            </Info>
        {/if}

        {#if filters.numNodes.from != null || filters.numNodes.to != null}
            <Info icon="hdd-stack" on:click={() => (isResourcesOpen = true)}>
                Nodes: {filters.numNodes.from} - {filters.numNodes.to}
            </Info>
        {/if}

        {#if filters.stats.length > 0}
            <Info icon="bar-chart" on:click={() => (isStatsOpen = true)}>
                {filters.stats.map(stat => `${stat.text}: ${stat.from} - ${stat.to}`).join(', ')}
            </Info>
        {/if}
    </Col>
</Row>

<Cluster
    bind:isOpen={isClusterOpen}
    bind:cluster={filters.cluster}
    bind:partition={filters.partition}
    on:update={() => update()} />

<JobStates
    bind:isOpen={isJobStatesOpen}
    bind:states={filters.states}
    on:update={() => update()} />
    
<StartTime
    bind:isOpen={isStartTimeOpen}
    bind:from={filters.startTime.from}
    bind:to={filters.startTime.to}
    on:update={() => update()} />

<Duration
    bind:isOpen={isDurationOpen}
    bind:from={filters.duration.from}
    bind:to={filters.duration.to}
    on:update={() => update()} />

<Tags
    bind:isOpen={isTagsOpen}
    bind:tags={filters.tags}
    on:update={() => update()} />

<Resources cluster={filters.cluster}
    bind:isOpen={isResourcesOpen}
    bind:numNodes={filters.numNodes}
    bind:numHWThreads={filters.numHWThreads}
    bind:numAccelerators={filters.numAccelerators}
    on:update={() => update()} />

<Statistics cluster={filters.cluster}
    bind:isOpen={isStatsOpen}
    bind:stats={filters.stats}
    on:update={() => update()} />

<style>
    :global(.cc-dropdown-on-hover:hover .dropdown-menu) {
        display: block;
        margin-top: 0px;
        padding-top: 0px;
        transform: none !important;
    }
</style>
