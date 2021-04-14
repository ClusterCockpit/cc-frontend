<script>
    export let job;

    function formatDuration(duration) {
        const hours = Math.floor(duration / 3600);
        duration -= hours * 3600;
        const minutes = Math.floor(duration / 60);
        duration -= minutes * 60;
        const seconds = duration;
        return `${hours}:${('0' + minutes).slice(-2)}:${('0' + seconds).slice(-2)}`;
    }
</script>

<div class="fw-bold">{job["jobId"]}</div>
<div class="fst-italic">{job["userId"]}</div>
<p>{job["numNodes"]} nodes</p>
<div>Started at:</div>
<p class="fw-bold">{job["startTime"]}</p>
<div>Duration:</div>
<p class="fw-bold">{formatDuration(job["duration"])}</p>
