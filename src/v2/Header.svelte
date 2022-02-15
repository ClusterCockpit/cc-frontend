<script>
    import {
        Navbar, NavbarBrand, Nav, NavItem, NavLink, NavbarToggler, Icon,
        Collapse, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'sveltestrap'

    export let username // empty string if auth. is disabled, otherwise the username as string
    export let isAdmin // boolean
    export let clusters // array of names
    export let currentView = null // One of: "job", "jobs", "user", "users", "analysis", "systems", "tags", ...

    let isOpen = false

    const views = [
        { view: 'jobs',     title: 'Jobs',     adminOnly: false, href: '/monitoring/jobs/',            icon: 'card-list' },
        { view: null,       title: 'My Jobs',  adminOnly: false, href: `/monitoring/user/${username}`, icon: 'bar-chart-line-fill' },
        { view: 'users',    title: 'Users',    adminOnly: true,  href: '/monitoring/users/',           icon: 'people-fill' },
        { view: 'projects', title: 'Projects', adminOnly: true,  href: '/monitoring/projects/',        icon: 'folder' },
        { view: 'tags',     title: 'Tags',     adminOnly: false, href: '/monitoring/tags/',            icon: 'tags' }
    ]
    const viewsPerCluster = [
        { view: 'analysis', title: 'Analysis', adminOnly: true,  href: '/monitoring/analysis/', icon: 'graph-up' },
        { view: 'systems',  title: 'Systems',  adminOnly: true,  href: '/monitoring/systems/',  icon: 'cpu' }
    ]

    console.log('header comp.:', { username, isAdmin, clusters, currentView })
</script>

<Navbar color="light" light expand="md">
    <NavbarBrand href="/">
        <img alt="ClusterCockpit Logo" src="/img/logo.png" height="30rem">
    </NavbarBrand>
    <NavbarToggler on:click={() => (isOpen = !isOpen)} />
    <Collapse {isOpen} navbar expand="md" on:update={({ detail }) => (isOpen = detail.isOpen)}>
        <Nav class="ms-auto" navbar>
            {#each views as item}
                <NavLink href={item.href} active={currentView === item.view}><Icon name={item.icon}/> {item.title}</NavLink>
            {/each}
            {#each viewsPerCluster as item}
                <NavItem active={currentView === item.view}>
                    <Dropdown nav inNavbar>
                        <DropdownToggle nav caret>
                            <Icon name={item.icon}/> {item.title}
                        </DropdownToggle>
                        <DropdownMenu>
                            {#each clusters as cluster}
                                <DropdownItem href={item.href + cluster}>{cluster}</DropdownItem>
                            {/each}
                        </DropdownMenu>
                    </Dropdown>
                </NavItem>
            {/each}
        </Nav>
    </Collapse>
</Navbar>