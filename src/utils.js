import { expiringCacheExchange } from './cache-exchange.js'
import { initClient } from '@urql/svelte'
import { setContext, getContext, hasContext, onDestroy, tick } from 'svelte'
import { dedupExchange, fetchExchange } from '@urql/core'
import { readable } from 'svelte/store'

/*
 * Call this function only at component initialization time!
 *
 * It does several things:
 * - Initialize the GraphQL client
 * - Creates a readable store 'initialization' which indicates when the values below can be used. 
 * - Adds 'tags' to the context (list of all tags)
 * - Adds 'clusters' to the context (object with cluster names as keys)
 * - Adds 'metrics' to the context, a function that takes a cluster and metric name and returns the MetricConfig (or undefined)
 */
export function init(extraInitQuery = '') {
    const jwt = hasContext('jwt')
        ? getContext('jwt')
        : getContext('cc-config')['jwt']

    const client = initClient({
        url: `${window.location.origin}/query`,
        fetchOptions: jwt != null
            ? { headers: { 'Authorization': `Bearer ${jwt}` } } : {},
        exchanges: [
            dedupExchange,
            expiringCacheExchange({
                ttl: 5 * 60 * 1000,
                maxSize: 150,
            }),
            fetchExchange
        ]
    })

    const query = client.query(`query {
        clusters {
            name,
            metricConfig {
                name, unit, peak,
                normal, caution, alert,
                timestep, scope
            }
            filterRanges {
                duration  { from, to }
                numNodes  { from, to }
                startTime { from, to }
            }
            partitions {
                name, processorType
                socketsPerNode
                coresPerSocket
                threadsPerCore
                flopRateScalar
                flopRateSimd
                memoryBandwidth
                topology { accelerators { id } }
            }
        }
        tags { id, name, type }
        ${extraInitQuery}
    }`).toPromise()

    let state = { fetching: true, error: null, data: null }
    let subscribers = []
    const subscribe = (callback) => {
        callback(state)
        subscribers.push(callback)
        return () => {
            subscribers = subscribers.filter(cb => cb != callback)
        }
    };

    const tags = [], clusters = []
    setContext('tags', tags)
    setContext('clusters', clusters)
    setContext('metrics', (cluster, metric) => {
        if (typeof cluster !== 'object')
            cluster = clusters.find(c => c.name == cluster)

        return cluster.metricConfig.find(m => m.name == metric)
    })
    setContext('on-init', callback => state.fetching
        ? subscribers.push(callback)
        : callback(state))
    setContext('initialized', readable(false, (set) =>
        subscribers.push(() => set(true))))

    query.then(({ error, data }) => {
        state.fetching = false
        if (error != null) {
            console.error(error)
            state.error = error
            return
        }

        for (let tag of data.tags)
            tags.push(tag)
        
        for (let cluster of data.clusters)
            clusters.push(cluster)

        state.data = data
        tick().then(() => subscribers.forEach(cb => cb(state)))
    })

    return {
        query: { subscribe },
        tags,
        clusters,
    }
}

export function formatNumber(x) {
    let suffix = ''
    if (x >= 1000000000) {
        x /= 1000000
        suffix = 'G'
    } else if (x >= 1000000) {
        x /= 1000000
        suffix = 'M'
    } else if (x >= 1000) {
        x /= 1000
        suffix = 'k'
    }

    return `${(Math.round(x * 100) / 100)}${suffix}`
}

// Use https://developer.mozilla.org/en-US/docs/Web/API/structuredClone instead?
export function deepCopy(x) {
    return JSON.parse(JSON.stringify(x))
}

function fuzzyMatch(term, string) {
    return string.toLowerCase().includes(term)
}

export function fuzzySearchTags(term, tags) {
    if (!tags)
        return []

    let results = []
    let termparts = term.split(':').map(s => s.trim()).filter(s => s.length > 0)

    if (termparts.length == 0) {
        results = tags.slice()
    } else if (termparts.length == 1) {
        for (let tag of tags)
            if (fuzzyMatch(termparts[0], tag.type)
                || fuzzyMatch(termparts[0], tag.name))
                results.push(tag)
    } else if (termparts.length == 2) {
        for (let tag of tags)
            if (fuzzyMatch(termparts[0], tag.type)
                && fuzzyMatch(termparts[1], tag.name))
                results.push(tag)
    }

    return results.sort((a, b) => {
        if (a.type < b.type) return -1
        if (a.type > b.type) return  1
        if (a.name < b.name) return -1
        if (a.name > b.name) return  1
        return 0
    })
}

export function groupByScope(jobMetrics) {
    let metrics = new Map()
    for (let metric of jobMetrics) {
        if (metrics.has(metric.name))
            metrics.get(metric.name).push(metric)
        else
            metrics.set(metric.name, [metric])
    }

    return [...metrics.values()]
}

const scopeGranularity = {
    "node": 10,
    "socket": 5,
    "accelerator": 5,
    "core": 2,
    "hwthread": 1
};

export function maxScope(scopes) {
    console.assert(scopes.length > 0 && scopes.every(x => scopeGranularity[x] != null))
    let sm = scopes[0], gran = scopeGranularity[scopes[0]]
    for (let scope of scopes) {
        let otherGran = scopeGranularity[scope]
        if (otherGran > gran) {
            sm = scope
            gran = otherGran
        }
    }
    return sm
}

export function minScope(scopes) {
    console.assert(scopes.length > 0 && scopes.every(x => scopeGranularity[x] != null))
    let sm = scopes[0], gran = scopeGranularity[scopes[0]]
    for (let scope of scopes) {
        let otherGran = scopeGranularity[scope]
        if (otherGran < gran) {
            sm = scope
            gran = otherGran
        }
    }
    return sm
}

export async function fetchMetrics(job, metrics, scopes) {
    if (job.monitoringStatus == 0)
        return null

    let query = []
    if (metrics != null) {
        for (let metric of metrics) {
            query.push(`metric=${metric}`)
        }
    }
    if (scopes != null) {
        for (let scope of scopes) {
            query.push(`scope=${scope}`)
        }
    }

    try {
        let res = await fetch(`/api/jobs/metrics/${job.id}${(query.length > 0) ? '?' : ''}${query.join('&')}`)
        if (res.status != 200) {
            return { error: { status: res.status, message: await res.text() } }
        }
    
        return await res.json()
    } catch (e) {
        return { error: e }
    }
}

export function fetchMetricsStore(job, metrics, scopes) {
    return readable({
        fetching: true,
        error: null,
        data: null
    }, (set) => {
        fetchMetrics(job, metrics, scopes).then(res => {
            set({
                fetching: false,
                error: res.error,
                data: res.data
            })
        })
    })
}

export function stickyHeader(datatableHeaderSelector, updatePading) {
    const header = document.querySelector('header > nav.navbar')
    if (!header)
        return

    let ticking = false, datatableHeader = null
    const onscroll = event => {
        if (ticking)
            return

        ticking = true
        window.requestAnimationFrame(() => {
            ticking = false
            if (!datatableHeader)
                datatableHeader = document.querySelector(datatableHeaderSelector)

            const top = datatableHeader.getBoundingClientRect().top
            updatePading(top < header.clientHeight
                ? (header.clientHeight - top) + 10
                : 10)
        })
    }

    document.addEventListener('scroll', onscroll)
    onDestroy(() => document.removeEventListener('scroll', onscroll))
}
