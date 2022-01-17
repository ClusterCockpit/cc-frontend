<script>
    import { createEventDispatcher, getContext } from 'svelte'
    import { Button, ListGroup, ListGroupItem,
             Modal, ModalBody, ModalHeader, ModalFooter } from 'sveltestrap'
    import DoubleRangeSlider from './DoubleRangeSlider.svelte'

    const clusters = getContext('clusters'),
          initialized = getContext('initialized'),
          dispatch = createEventDispatcher()

    export let cluster = null
    export let isModified = false
    export let isOpen = false
    export let numNodes = { from: null, to: null }
    export let numHWThreads = { from: null, to: null }
    export let numAccelerators = { from: null, to: null }

    let pendingNumNodes = numNodes, pendingNumHWThreads = numHWThreads, pendingNumAccelerators = numAccelerators
    $: isModified = pendingNumNodes.from != numNodes.from || pendingNumNodes.to != numNodes.to
        || pendingNumHWThreads.from != numHWThreads.from || pendingNumHWThreads.to != numHWThreads.to
        || pendingNumAccelerators.from != numAccelerators.from || pendingNumAccelerators.to != numAccelerators.to

    let minNumNodes = 1, maxNumNodes = 0, minNumHWThreads = 1, maxNumHWThreads = 0, minNumAccelerators = 0, maxNumAccelerators = 0
    $: {
        if ($initialized) {
            if (cluster != null) {
                const ranges = clusters.find(c => c.name == cluster).filterRanges
                minNumNodes = ranges.numNodes.from
                maxNumNodes = ranges.numNodes.to
                // minNumHWThreads = ranges.numHWThreads.from
                // maxNumHWThreads = ranges.numHWThreads.to
                // minNumAccelerators = ranges.numAccelerators.from
                // maxNumAccelerators = ranges.numAccelerators.to
            } else if (clusters.length > 0) {
                let r = clusters[0].filterRanges
                minNumNodes = r.numNodes.from
                maxNumNodes = r.numNodes.to
                // minNumHWThreads = r.numHWThreads.from
                // maxNumHWThreads = r.numHWThreads.to
                // minNumAccelerators = r.numAccelerators.from
                // maxNumAccelerators = r.numAccelerators.to
                for (let cluster of clusters) {
                    let r = cluster.filterRanges
                    minNumNodes = Math.min(minNumNodes, r.numNodes.from)
                    maxNumNodes = Math.max(maxNumNodes, r.numNodes.to)
                    // minNumHWThreads = Math.min(minNumHWThreads, r.numHWThreads.from)
                    // maxNumHWThreads = Math.max(maxNumHWThreads, r.numHWThreads.to)
                    // minNumAccelerators = Math.min(minNumAccelerators, r.numAccelerators.from)
                    // maxNumAccelerators = Math.max(maxNumAccelerators, r.numAccelerators.to)
                }
            }
        }
    }

    $: {
        if (isOpen && $initialized && pendingNumNodes.from == null && pendingNumNodes.to == null) {
            pendingNumNodes = { from: 0, to: maxNumNodes }
        }
    }
</script>

<Modal isOpen={isOpen} toggle={() => (isOpen = !isOpen)}>
    <ModalHeader>
        Select Number of Nodes, HWThreads and Accelerators
    </ModalHeader>
    <ModalBody>
        <h4>Number of Nodes</h4>
        <DoubleRangeSlider
            on:change={({ detail }) => (pendingNumNodes = { from: detail[0], to: detail[1] })}
            min={minNumNodes} max={maxNumNodes}
            firstSlider={pendingNumNodes.from} secondSlider={pendingNumNodes.to} />
        <!-- <DoubleRangeSlider
            on:change={({ detail }) => (pendingNumHWThreads = { from: detail[0], to: detail[1] })}
            min={minNumHWThreads} max={maxNumHWThreads}
            firstSlider={pendingNumHWThreads.from} secondSlider={pendingNumHWThreads.to} />
        {#if maxNumAccelerators != null && maxNumAccelerators > 1}
            <DoubleRangeSlider
                on:change={({ detail }) => (pendingNumAccelerators = { from: detail[0], to: detail[1] })}
                min={minNumAccelerators} max={maxNumAccelerators}
                firstSlider={pendingNumAccelerators.from} secondSlider={pendingNumAccelerators.to} />
        {/if} -->
    </ModalBody>
    <ModalFooter>
        <Button color="primary"
            disabled={pendingNumNodes.from == null || pendingNumNodes.to == null}
            on:click={() => {
                isOpen = false
                numNodes = { from: pendingNumNodes.from, to: pendingNumNodes.to }
                numHWThreads = { from: pendingNumHWThreads.from, to: pendingNumHWThreads.to }
                numAccelerators = { from: pendingNumAccelerators.from, to: pendingNumAccelerators.to }
                dispatch('update', { numNodes })
            }}>
            Close & Apply
        </Button>
        <Button color="danger" on:click={() => {
            isOpen = false
            pendingNumNodes = { from: null, to: null }
            pendingNumHWThreads = { from: null, to: null }
            pendingNumAccelerators = { from: null, to: null }
        }}>Reset</Button>
        <Button on:click={() => (isOpen = false)}>Close</Button>
    </ModalFooter>
</Modal>
