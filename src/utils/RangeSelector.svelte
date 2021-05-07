<script>
    import DoubleRangeSlider from './DoubleRangeSlider.svelte';
    import { createEventDispatcher } from "svelte";

    export let min;
    export let max;
    export let from;
    export let to;

    let firstSlider, secondSlider, firstValue, secondValue;
    $: {
        firstSlider = (from - min) / (max - min);
        firstValue = from;
    }
    $: {
        secondSlider = (to - min) / (max - min);
        secondValue = to;
    }

    const dispatch = createEventDispatcher();

    function valueChanged() {
        firstValue  = Math.floor(min + firstSlider  * (max - min));
        secondValue = Math.floor(min + secondSlider * (max - min));
        if (Number.isNaN(firstValue) || Number.isNaN(secondValue)) {
            firstValue = from;
            secondValue = to;
        }

        dispatch('change', { from: firstValue, to: secondValue });
    }

    $: valueChanged(firstSlider, secondSlider);
</script>

<style media="screen">
    div > span {
        width: 100%;
    }

    /* span.left, span.right { display: inline-block; } */

    span.left {
        display: inline-block;
        width: 5em;
        float: left;
        text-align: center;
    }
    span.right {
        float: right;
        text-align: center;
    }

    :global(.double-range-container > .slider) {
        border-radius: 5px;
    }
</style>

<div>
    <span>
        <span class="left">
            {firstValue} - {secondValue}
        </span>
        <span class="right">
            Full Range: <b>{min}</b> - <b>{max}</b>
        </span>
    </span>
    <br>
    <span>
        <DoubleRangeSlider bind:start={firstSlider} bind:end={secondSlider}/>
    </span>
</div>
