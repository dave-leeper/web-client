// TODO: two-way binding.
class Component {
    static msgs = {
        BEFORE_INITIALIZATION: `COMPONENT_BEFORE_INITIALIZATION`,
        AFTER_INITIALIZATION: `COMPONENT_AFTER_INITIALIZATION`,
        BEFORE_MOUNT: `COMPONENT_BEFORE_MOUNT`,
        AFTER_MOUNT: `COMPONENT_AFTER_MOUNT`,
        BEFORE_UNMOUNT: `COMPONENT_BEFORE_UNMOUNT`,
        AFTER_UNMOUNT: `COMPONENT_AFTER_UNMOUNT`,
        CHILDREN_MOUNTED: `COMPONENT_CHILDREN_MOUNTED`,
        DESCENDANTS_MOUNTED: `COMPONENT_DESCENDANTS_MOUNTED`,
        BEFORE_DESTRUCTION: `COMPONENT_BEFORE_DESTRUCTION`,
        AFTER_DESTRUCTION: `COMPONENT_AFTER_DESTRUCTION`,
        BEFORE_SLOT_LOADED: `COMPONENT_BEFORE_SLOT_LOADED`,
        AFTER_SLOT_LOADED: `COMPONENT_AFTER_SLOT_LOADED`,
    }

    static getFragment(componentClass) {
        if (!componentClass) { 
            console.error(`getFragment: No component fragment id provided.`)
            return null 
        }
        if (!ComponentLifecycle.fragmentRegistry?.has(componentClass)) { 
            console.error(`getFragment: Component fragment ${componentClass} is not registered.`)
            return null 
        }
        
        let fragment = ComponentLifecycle.fragmentRegistry.get(componentClass)
        return fragment
    }
    static isObjectRegistered(componentObjectId) {
        if (!componentObjectId) { 
            console.error(`getObject: No component object id provided.`)
            return null 
        }
        return ComponentLifecycle.objectRegistry?.has(componentObjectId)
    }
    static getObject(componentObjectId) {
        if (!componentObjectId) { 
            console.error(`getObject: No component object id provided.`)
            return null 
        }
        if (!ComponentLifecycle.objectRegistry?.has(componentObjectId)) { 
            console.error(`getObject: Component object ${componentObjectId} is not registered.`)
            return null 
        }
        
        let componentObjectInfo = ComponentLifecycle.objectRegistry.get(componentObjectId)
        return componentObjectInfo.componentObject
    }
    static createComponentInclude(includeIn, src, componentClass, componentId, props, vars) {
        let newInclude = document.createElement(`include-html`, { })

        newInclude.setAttribute(`include-in`, includeIn)
        newInclude.setAttribute(`include-src`, src)
        newInclude.setAttribute(`component-class`, componentClass)
        newInclude.setAttribute(`component-id`, componentId)

        if (props) {
            let newIncludeProps = document.createElement(`include-props`, { })

            newIncludeProps.innerText = JSON.stringify(props)
            newInclude.appendChild(newIncludeProps)
        }
        if (vars) {
            let newIncludeVars = document.createElement(`include-vars`, { })

            newIncludeVars.innerText = JSON.stringify(vars)
            newInclude.appendChild(newIncludeVars)
        }
        return newInclude
    }
    className() {return this.constructor.name }
    initialize(id) { 
        Queue.broadcast(Component.msgs.BEFORE_INITIALIZATION, this)
        this.id = id
        Queue.register(this, Component.msgs.AFTER_MOUNT, (message) => {
            const childComponents = ComponentLifecycle.childComponentRegistry.get(this.className())

            if (!message.id || !childComponents ) { return }

            const objectInfo = ComponentLifecycle.objectRegistry.get(this.id)

            if (!objectInfo) { return }
            if (this.haveChildrenMounted() && !objectInfo.hasBroadcastChildrenMounted) {
                objectInfo.hasBroadcastChildrenMounted = true
                ComponentLifecycle.objectRegistry.set(this.id, objectInfo)
                this.onChildrenMounted()
            }
            if (this.haveDescendantsMounted() && !objectInfo.hasBroadcastDescendantsMounted) {
                objectInfo.hasBroadcastDescendantsMounted = true
                ComponentLifecycle.objectRegistry.set(this.id, objectInfo)
                this.onDescendantsMounted()
            }

            if (!childComponents.length) {
                if (!objectInfo.hasBroadcastChildrenMounted) {
                    objectInfo.hasBroadcastChildrenMounted = true
                    ComponentLifecycle.objectRegistry.set(this.id, objectInfo)
                    this.onChildrenMounted()
                }
                if (!objectInfo.hasBroadcastDescendantsMounted) {
                    objectInfo.hasBroadcastDescendantsMounted = true
                    ComponentLifecycle.objectRegistry.set(this.id, objectInfo)
                    this.onDescendantsMounted()
                }
                return
            }

            const truncatedMessageId = message.id.replace(this.id, ``)
            const rebuiltMessageId = this.id + truncatedMessageId

            if (objectInfo.mountedChildComponents.includes(message.id)) { return }
            if (rebuiltMessageId !== message.id) { return }

            if (childComponents.includes(truncatedMessageId) && !objectInfo.hasBroadcastChildrenMounted) {
                objectInfo.mountedChildComponents.push(message.id)
                if (childComponents.length === objectInfo.mountedChildComponents.length) {
                    objectInfo.hasBroadcastChildrenMounted = true
                    ComponentLifecycle.objectRegistry.set(this.id, objectInfo)
                    this.onChildrenMounted()
                }
            }

            if (this.haveDescendantsMounted() && !objectInfo.hasBroadcastDescendantsMounted) {
                objectInfo.hasBroadcastDescendantsMounted = true
                ComponentLifecycle.objectRegistry.set(this.id, objectInfo)
                this.onDescendantsMounted()
            }
        })
    }
    haveChildrenMounted() {
        const childComponents = ComponentLifecycle.childComponentRegistry.get(this.className())
        const objectInfo = ComponentLifecycle.objectRegistry.get(this.id)

        if (!childComponents || 0 === childComponents.length) { return true }
        return childComponents.length === objectInfo.mountedChildComponents.length
    }
    haveDescendantsMounted() {
        if (!this.haveChildrenMounted()) { return false }

        const childComponents = ComponentLifecycle.childComponentRegistry.get(this.className())

        if (!childComponents || 0 === childComponents.length) { return true }

        for (let childComponentId of childComponents) {
            if (!Component.isObjectRegistered(`${this.id}${childComponentId}`)) { return false }
            if (!Component.getObject(`${this.id}${childComponentId}`).haveDescendantsMounted()) { 
                return false 
            }
        }
        return true
    }
    mount() { ComponentLifecycle.mount(this.id) }
    beforeMount() { Queue.broadcast(Component.msgs.BEFORE_MOUNT, this )}
    afterMount() { 
        Queue.broadcast(Component.msgs.AFTER_MOUNT, this )
    }
    unmount() { ComponentLifecycle.unmount(this.id) }
    beforeUnmount() { 
        Queue.broadcast(Component.msgs.BEFORE_UNMOUNT, this )

        const childComponents = ComponentLifecycle.childComponentRegistry.get(this.className())

        if (!childComponents || 0 === childComponents.length) { return }

        for (let childComponentId of childComponents) {
            if (!Component.isObjectRegistered(`${this.id}${childComponentId}`)) { continue }
            
            const child = Component.getObject(`${this.id}${childComponentId}`)
            
            child.unmount()
        }
    }
    afterUnmount() { Queue.broadcast(Component.msgs.AFTER_UNMOUNT, this )}
    isMounted() {
        if (!ComponentLifecycle.objectRegistry?.has(this.id)) { return false }
        return ComponentLifecycle.objectRegistry.get(this.id).mounted
    }
    onChildrenMounted() {
        Loader.addChildComponentGettersToComponentObject(this.className(), this.id)
        Queue.broadcast(Component.msgs.CHILDREN_MOUNTED, this )
    }
    onDescendantsMounted() { Queue.broadcast(Component.msgs.DESCENDANTS_MOUNTED, this )}
    isMounted() { return ComponentLifecycle.objectRegistry.get(this.id).mounted } 
    beforeSlotLoaded(slot) { Queue.broadcast(Component.msgs.BEFORE_SLOT_LOADED, { component: this, slot })}
    afterSlotLoaded(slot) { Queue.broadcast(Component.msgs.AFTER_SLOT_LOADED, { component: this, slot } )}
    destroy() { 
        Queue.broadcast(Component.msgs.BEFORE_DESTRUCTION, this)

        const childComponents = ComponentLifecycle.childComponentRegistry.get(this.className())

        if (childComponents && 0 !== childComponents.length) {
            for (let childComponentId of childComponents) {
                if (!Component.isObjectRegistered(`${this.id}${childComponentId}`)) { continue }
                
                const child = Component.getObject(`${this.id}${childComponentId}`)
                
                child.destroy()
            }
        }
        if (ComponentLifecycle.objectRegistry?.has(this.id)) { ComponentLifecycle.destroyComponentObject(`${this.id}`) }
        Queue.broadcast(Component.msgs.AFTER_DESTRUCTION, this)
    }
    get Parent() {
        let element = document.getElementById(this.id)
        let walkUpTree = (element) => {
            while (element.parentElement) {
                if (element.parentElement.id) {
                    let parentComponent = ComponentLifecycle.objectRegistry?.get(element.parentElement.id)
    
                    if (parentComponent) { 
                        return parentComponent.componentObject
                    } 
                }
                element = element.parentElement
            }
            return null
        }

        if (!element) { return null }
        return walkUpTree(element)
    }
}