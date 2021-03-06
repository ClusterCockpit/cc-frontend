import {} from './header.entrypoint.js'
import Systems from './Systems.root.svelte'

new Systems({
    target: document.getElementById('svelte-app'),
    props: {
        cluster: infos.cluster,
        from: infos.from,
        to: infos.to
    },
    context: new Map([
            ['cc-config', clusterCockpitConfig]
    ])
})
