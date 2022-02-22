<!-- 
    @component

    Events:
    - 'reload': When fired, the parent component shoud refresh its contents
 -->
<script>
    import { createEventDispatcher } from 'svelte'
    import { Button, Icon, InputGroup } from 'sveltestrap'

    const dispatch = createEventDispatcher()

    let refreshInterval = null;
    let refreshIntervalId = null;
    function refreshIntervalChanged() {
        if (refreshIntervalId != null)
            clearInterval(refreshIntervalId);

        if (refreshInterval == null)
            return;

        refreshIntervalId = setInterval(() => dispatch("reload"), refreshInterval);
    }
</script>

<InputGroup>
    <Button outline on:click={() => dispatch("reload")} disabled={refreshInterval != null}>
        <Icon name="arrow-clockwise" /> Reload
    </Button>
    <select class="form-select" bind:value={refreshInterval} on:change={refreshIntervalChanged}>
        <option value={null}>No periodic reload</option>
        <option value={    30 * 1000}>Reload every 30 seconds</option>
        <option value={    60 * 1000}>Reload every minute</option>
        <option value={5 * 60 * 1000}>Reload every 5 minutes</option>
    </select>
</InputGroup>