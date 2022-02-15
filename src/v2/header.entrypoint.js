import Header from './Header.svelte'

new Header({
    target: document.getElementById('svelte-header'),
    props: { ...header },
})
