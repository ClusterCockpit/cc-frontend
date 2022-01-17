<!-- 
    @component

    Properties:
    - job: GraphQL.Job
    - jobTags: Defaults to job.tags, usefull for dynamically updating the tags.
 -->

<script>
    import Tag from '../Tag.svelte';
    import { Badge } from 'sveltestrap';

    export let job;
    export let jobTags = job.tags;

    function formatDuration(duration) {
        const hours = Math.floor(duration / 3600);
        duration -= hours * 3600;
        const minutes = Math.floor(duration / 60);
        duration -= minutes * 60;
        const seconds = duration;
        return `${hours}:${('0' + minutes).slice(-2)}:${('0' + seconds).slice(-2)}`;
    }

    const getUserUrl = typeof USERVIEW_URL !== 'undefined'
        ? USERVIEW_URL
        : userId => `/monitoring/user/${userId}`;
</script>

<div>
    <div class="fw-bold">
        <a href="/monitoring/job/{job.id}" target="_blank">{job.jobId}</a> ({job.cluster})
    </div>

    <div class="fst-italic">
        <a href="/monitoring/user/{job.user}" target="_blank">{job.user}</a>
        {#if job.project && job.project != 'no project'}
            ({job.project})
        {/if}
    </div>

    <p>
        {job.numNodes} node{job.numNodes == 1 ? '' : 's'}
    </p>

    <div>Started at:</div>
    <p class="fw-bold">{(new Date(job.startTime)).toLocaleString()}</p>

    <div>Duration:</div>
    <p class="fw-bold">
        {formatDuration(job["duration"])}
        {#if job.state == 'running'}
            <Badge color="success">running</Badge>
        {:else if job.state != 'completed'}
            <Badge color="danger">{job.state}</Badge>
        {/if}
    </p>

    <p>
        {#each jobTags as tag}
            <Tag tag={tag}/>
        {/each}
    </p>
</div>
