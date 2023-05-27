/*
    FRAGRMENT STATE             FRAGMENT STATE                      NOTES
    (Transitions flow down)     (Transitions flow left/right)
    -------------------------   ----------------------------------  ---------------------------------------------------------
    Compile                                                         Creates document fragment from text.
    Register Dom Fragment       <--> Unregister Dom Fragment        Document fragment put in registry, script tags moved to <HEAD>.

    COMPONENT STATE             COMPONENT STATE                     NOTES
    (Transitions flow down)     (Transitions flow left/right)
    -------------------------   ----------------------------------  ---------------------------------------------------------
    Create Component Object                                         Object instantiated from the class representing the component.
                                                                    Object initialized. Vars and props are wrapped. Node values and
                                                                    attribute values are replaced for the first time.
    Register Component Object   <--> Unregister Component Object    Object placed in registery. Has a unique ID and knows the id
                                                                    of its associated fragment.
    mount                       <--> unmount                        Component placed in DOM, rendered to screen.
    children mounted                                                The child components of a component have mounted.
    descendants mounted                                             All descendant components of a component have mounted.
    update                                                          Not truely a lifecycle state. This is when you'll set vars to replace
                                                                    node and attribute values.
    destroy                                                         The object is unmounted, unregistereed, and it's marker is removed
                                                                    from the DOM.
*/
class ComponentLifecycle {
    static msgs = {
        VAR_VALUE_CHANGED: `VAR_VALUE_CHANGED`
    }
    static objectFragmentRegistry = new Map()
    static fragmentRegistry = new Map()
    static objectRegistry = new Map()
    static childComponentRegistry = new Map()
    static initialize() { }
    static saveOriginalNodeValues(node) {
        if (node.nodeValue) {
            if (!node.originalNodeValue) { node.originalNodeValue = node.nodeValue }
        }
        for (let child of node.childNodes) {
            ComponentLifecycle.saveOriginalNodeValues(child)
        }
    }
    static saveOriginalNodeAttributes(node) {
        if (node.attributes) {
            for (let attr of node.attributes) {
                if (!attr.originalAttributeValue) { attr.originalAttributeValue = attr.value }
            }
        }
        for (let child of node.childNodes) {
            ComponentLifecycle.saveOriginalNodeAttributes(child)
        }
    }
    static copyOriginalNodeValues(srcNode, destNode){
        if (srcNode.nodeValue) {
            if (srcNode.originalNodeValue && !destNode.originalNodeValue) { 
                destNode.originalNodeValue = srcNode.originalNodeValue
            }
        }
        for (let loop = 0; loop < srcNode.childNodes.length; loop++) {
            let srcChildNode = srcNode.childNodes[loop]
            let destChildNode = destNode.childNodes[loop]
            ComponentLifecycle.copyOriginalNodeValues(srcChildNode, destChildNode)
        }
    }
    static copyOriginalNodeAttributes(srcNode, destNode) {
        if (srcNode.attributes) {
            for (let loop = 0; loop < srcNode.attributes.length; loop++) {
                let srcAttribute = srcNode.attributes[loop]
                let destAttribute = destNode.attributes[srcAttribute.name]

                if (srcAttribute.originalAttributeValue && !destAttribute.originalAttributeValue) { 
                    destAttribute.originalAttributeValue = srcAttribute.originalAttributeValue 
                }
            }
        }
        for (let loop = 0; loop < srcNode.childNodes.length; loop++) {
            let srcChildNode = srcNode.childNodes[loop]
            let destChildNode = destNode.childNodes[loop]
            ComponentLifecycle.copyOriginalNodeAttributes(srcChildNode, destChildNode)
        }
    }
    static replaceNodeValue(node, data, member) {
        if (node.nodeValue) {
            if (!node.originalNodeValue) { node.originalNodeValue = node.nodeValue }
            if (!node.replacementData) { node.replacementData = new Map() }

            const formattedMember = `{${member}}`
            const matches = -1 !== node.originalNodeValue.indexOf(formattedMember)
            let newValue = node.originalNodeValue

            if (matches) {
                // TODO: Thoroughly test this with multiple replacements in a single node value.
                try {
                    const memberData = data[member].toString()
                    const replaceFunc =  (value, key, map) => {
                        const formattedKey = `{${key}}`

                        newValue = newValue.replaceAll(formattedKey, value)
                    }

                    node.replacementData.set(member, memberData)
                    node.replacementData.forEach(replaceFunc)
                    node.nodeValue = newValue
                } catch (e) {
                    console.warn(`Unable to replace node value containing ${member}. It's replacement value is ${data[member]}. Node id is ${node.id}`)
                }
            }
        }
        for (let child of node.childNodes) {
            ComponentLifecycle.replaceNodeValue(child, data, member)
        }
    }
    static replaceAttributeValue(node, data, member) {
            if (node.attributes) {
            for (let attr of node.attributes) {
                if (!attr.originalAttributeValue) { attr.originalAttributeValue = attr.value }
                if (!attr.replacementData) { attr.replacementData = new Map() }

                const formattedMember = `{${member}}`
                const matches = -1 !== attr.originalAttributeValue.indexOf(formattedMember)
                let newValue = attr.originalAttributeValue

                if (matches) {
                    // TODO: Thoroughly test this with multiple replacements in a single attribute value.
                    try {
                        let memberData = data[member].toString()
                        const replaceFunc =  (value, key, map) => {
                            const formattedKey = `{${key}}`
    
                            newValue = newValue.replaceAll(formattedKey, value)
                        }

                        attr.replacementData.set(member, memberData)
                        attr.replacementData.forEach(replaceFunc)
                        attr.value = newValue
                        if (`newsPhotoURL` === member && -1 !== attr.originalAttributeValue.indexOf(`{newsPhotoURL}`)) {
                            const x = 1
                        }        
                    } catch (e) {
                        console.warn(`Unable to replace attribute containing ${member}. It's replacement value is ${data[member]}. Node id is ${node.id}`)
                    }
                }
            }
        }
        for (let child of node.children) {
            ComponentLifecycle.replaceAttributeValue(child, data, member)
        }
    }
    static wrapProps(componentObject) {
        if (!componentObject.props) {return}
        let members = Object.getOwnPropertyNames(componentObject.props)

        componentObject.props.$propsStore = {...componentObject.props}
        for (let member of members) {
            if (`$propsStore` === member) { continue }
            Object.defineProperty(componentObject.props, member, {
                get: function() {
                    return componentObject.props.$propsStore[member]
                },
                set: function(newValue) {
                    console.error(`wrapProps: Cannot set ${member}.`)
                }
            })

            ComponentLifecycle.replaceNodeValue(componentObject.ObjectFragment, componentObject.props, member)
            ComponentLifecycle.replaceAttributeValue(componentObject.ObjectFragment, componentObject.props, member)
        }
    }
    static wrapVars(componentObject) {
        if (!componentObject.vars) {return}
        let members = Object.getOwnPropertyNames(componentObject.vars)

        componentObject.vars.$varsStore = {...componentObject.vars}
        for (let member of members) {

            if (`$varsStore` === member) { continue }
            Object.defineProperty(componentObject.vars, member, {
                get: function() {
                    return componentObject.vars.$varsStore[member]
                },
                set: function(newValue) {
                    const oldValue = componentObject.vars.$varsStore[member]

                    componentObject.vars.$varsStore[member] = newValue
                    ComponentLifecycle.replaceNodeValue(componentObject.ObjectFragment, componentObject.vars, member)
                    ComponentLifecycle.replaceAttributeValue(componentObject.ObjectFragment, componentObject.vars, member)
                    Queue.broadcast(ComponentLifecycle.msgs.VAR_VALUE_CHANGED, { componentObject, member, oldValue, newValue})
                }
            })

            ComponentLifecycle.replaceNodeValue(componentObject.ObjectFragment, componentObject.vars, member)
            ComponentLifecycle.replaceAttributeValue(componentObject.ObjectFragment, componentObject.vars, member)
        }
    }
    static compile(html) {
        let fragment = document.createDocumentFragment()

        fragment.append(...new DOMParser().parseFromString(html, `text/html`).body.childNodes)
        return fragment
    }
    static registerDOMFragment(componentClass, componentObjectId, componentFragment, includeTest) {
        if (!componentClass) { 
            console.error(`registerDOMFragment: No component class provided for DOM fragment registration.`)
            return false 
        }
        if (!componentObjectId) { 
            console.error(`registerDOMFragment: No component object id provided for DOM fragment registration.`)
            return false 
        }
        if (!componentFragment) { 
            console.error(`registerDOMFragment: No DOM fragment provided for DOM fragment registration.`)
            return false 
        }
        if (ComponentLifecycle.fragmentRegistry.has(componentClass)) { 
            console.info(`registerDOMFragment: DOM Fragment ${componentClass} is already registered.`)
            return true 
        }

        let scripts = componentFragment.querySelectorAll(`script`)
        let tests = componentFragment.querySelectorAll(`test-script`)
        let styles = componentFragment.querySelectorAll(`style`)
        let markup = componentFragment.querySelectorAll(`component-markup`)

        if (0 === scripts.length) {
            console.error(`registerDOMFragment: Fragment must contain at least one component script tag.`)
            return false
        }
        if (1 !== markup.length) {
            console.error(`registerDOMFragment: Fragment must contain one and only one component markup tag.`)
            return false
        }
        if (1 < styles.length) {
            console.error(`registerDOMFragment: Fragment can contain no more than one component style tag.`)
            return false
        }
        if (includeTest) {
            if (1 < tests.length) {
                console.error(`registerDOMFragment: Fragment can contain no more than one component test tag.`)
                return false
            }   
        }
        
        let scriptTag = document.createElement(`script`)

        scriptTag.type = `text/javascript`
        scriptTag.id = `ScriptTag${componentClass}`
        scripts[0].remove()
        try {
            eval(`new ${componentClass}`)
            scriptTag.appendChild(document.createTextNode(``))
        } catch (e) {
            scriptTag.appendChild(document.createTextNode(scripts[0].innerText))
        }
        document.head.appendChild(scriptTag);

        if (styles.length && !document.getElementById(`StyleTag${componentClass}`)) {
            let styleTag = document.createElement(`style`)

            styleTag.id = `StyleTag${componentClass}`
            styleTag.appendChild(document.createTextNode(styles[0].innerText))
            styles[0].remove()
            document.head.appendChild(styleTag);
        }
        if (tests.length) {
            if (includeTest) {
                let tests = componentFragment.querySelectorAll(`test-script`)
                let testTag = document.createElement(`test-script`)

                testTag.type = 'text/javascript'
                testTag.id = `TestTag${componentClass}`
                testTag.appendChild(document.createTextNode(tests[0].innerText))
                document.head.appendChild(testTag);
            }
            tests[0].remove()
        }
        ComponentLifecycle.saveOriginalNodeValues(componentFragment)
        ComponentLifecycle.saveOriginalNodeAttributes(componentFragment)
        ComponentLifecycle.fragmentRegistry.set(componentClass, { componentFragment, componentObjectId })

        return true
    }
    static unregisterDOMFragment(componentClass) {
        if (!componentClass) { 
            console.error(`unregisterDOMFragment: No component class provided for unregistration.`)
            return false 
        }
        if (!ComponentLifecycle.fragmentRegistry?.has(componentClass)) { 
            console.error(`unregisterDOMFragment: DOM Fragment ${componentClass} was not in registery.`)
            return false 
        }
        let componentScriptTag = document.getElementById(`ScriptTag${componentClass}`)
        let componentStyleTag = document.getElementById(`StyleTag${componentClass}`)
        let componentTestTag = document.getElementById(`TestTag${componentClass}`)
        
        if (componentScriptTag) { componentScriptTag.remove() }
        if (componentStyleTag) { componentStyleTag.remove() }
        if (componentTestTag) { componentTestTag.remove() }
        ComponentLifecycle.fragmentRegistry.delete(componentClass)
        return true
    }
    static createComponentObject(componentClass, componentObjectId, includeElement){
        if (!componentClass) { 
            console.error(`createComponentObject: No component class provided for createComponentObject.`)
            return false 
        }
        if (!componentObjectId) { 
            console.error(`createComponentObject: No component object id provided for createComponentObject.`)
            return false 
        }
        if (!includeElement) { 
            console.error(`createComponentObject: No includeComponentElement provided for createComponentObject.`)
            return false 
        }

        if (`ReviewList` === componentObjectId) {
            const x = 1
        }
        const componentObject = eval(`new ${componentClass}()`)
        const markerIdBegin = `-ComponentBeginMarker${componentObjectId}`
        const markerIdEnd = `-ComponentEndMarker${componentObjectId}`
        const marker = document.getElementById(markerIdBegin)
        const template = ComponentLifecycle.fragmentRegistry.get(componentClass)?.componentFragment
        const fragment = template.cloneNode(true)
        const markup = fragment.querySelector(`component-markup`)

        if (!markup) { 
            console.error(`registerComponentObject: Markup for ${componentObjectId} not found.`)
            return false 
        }
        if (!marker) {
            const marker = document.createElement(`script`)

            marker.id = markerIdBegin
            marker.type = `text/javascript`
            // TODO: Do not replace child until repeat is done.
            includeElement.parentNode.replaceChild(marker, includeElement);
        }
    
        const htmlTag = markup.children[0]
        const propsElements = includeElement.getElementsByTagName(`include-props`)
        const varsElements = includeElement.getElementsByTagName(`include-vars`)

        ComponentLifecycle.objectFragmentRegistry.set(componentObjectId, fragment)
        if (propsElements.length) {
            if (1 < propsElements.length) { 
                console.error(`createComponentObject: Only one include-props tag is allowed.`)
                return false 
            }
            
            let jsonText = `(` + DOMPurify.sanitize(propsElements[0].innerText) + `)`
            let propsObject = eval(jsonText)

            componentObject.props = {...componentObject.props, ...propsObject}
        }
        if (varsElements.length) {
            if (1 < varsElements.length) { 
                console.error(`createComponentObject: Only one include-vars tag is allowed.`)
                return false 
            }

            let jsonText = `(` + DOMPurify.sanitize(varsElements[0].innerText) + `)`
            let varsObject = eval(jsonText)

            componentObject.vars = {...componentObject.vars, ...varsObject}
        }
        Object.defineProperty(componentObject, `ObjectFragment`, {
            get: function() { return htmlTag },
            set: function(newValue) { console.error(`${componentObject.className()}.${componentObject.id}: Cannot set ObjectFragment.`) }
        })

        if (componentObject.initialize) { componentObject.initialize(componentObjectId) }

        ComponentLifecycle.wrapProps(componentObject)
        ComponentLifecycle.wrapVars(componentObject)
        ComponentLifecycle.replaceNodeValue(markup, componentObject, `id`)
        ComponentLifecycle.replaceAttributeValue(markup, componentObject, `id`)

        if (componentObject.props) {
            let members = Object.getOwnPropertyNames(componentObject.props)

            for (let member of members) {
                ComponentLifecycle.replaceNodeValue(markup, componentObject.props, member)
                ComponentLifecycle.replaceAttributeValue(markup, componentObject.props, member)
            }
        }

        if (componentObject.vars) {
            let members = Object.getOwnPropertyNames(componentObject.vars)

            for (let member of members) {
                ComponentLifecycle.replaceNodeValue(markup, componentObject.vars, member)
                ComponentLifecycle.replaceAttributeValue(markup, componentObject.vars, member)
            }
        }

        for (let loop = markup.children.length - 1; loop >= 0; loop--) {
            const child = markup.children[loop]
            const addElementGettersToComponentObject = (element, componentObject) => {
                for (let child of element.children) {
                    addElementGettersToComponentObject(child, componentObject)
                }
                if (!element.id || -1 !== element.tagName.indexOf(`-`)) { return }
                let getterName = element.id.replace(` `, `_`).replace(componentObject.id, ``).replace(`{id}`, ``)
    
                getterName += `Element`
                if (!componentObject.hasOwnProperty(getterName)) {
                    Object.defineProperty(componentObject, getterName, {
                        get: function() { return document.getElementById(element.id) },
                        set: function(newValue) { console.error(`createComponentObject: Cannot set ${getterName}.`) }
                    })
                }
            }
            const addConvenienceMethodsToElement = (element) => {
                const show = () => { if (element.classList.contains(`display-none`)) { element.classList.remove(`display-none`) }}
                const hide = () => { if (!element.classList.contains(`display-none`)) { element.classList.add(`display-none`) }}
                const isVisible = () => { return !element.classList.contains(`display-none`) }
                const toggleVisibility = () => { if (element.isVisible()) { element.hide() } else {element.show() }}
                const removeChildren = () => { while (element.firstChild) { element.removeChild(element.firstChild) }}

                element.show = show
                element.hide = hide
                element.isVisible = isVisible
                element.toggleVisibility = toggleVisibility
                element.removeChildren = removeChildren
                for (let elementChild of element.children) {
                    addConvenienceMethodsToElement(elementChild)
                }
            }
            const copyAttributes = (includeElementSrc, elementDest) => {
                for (let attributeLoop = 0; attributeLoop < includeElementSrc.attributes.length; attributeLoop++) {
                    let attribute = includeElementSrc.attributes[attributeLoop]
                    if (`include-in` === attribute.name) { continue }
                    if (`include-src` === attribute.name) { continue }
                    if (`component-class` === attribute.name) { continue }
                    if (`component-id` === attribute.name) { continue }
                    if (`include-repeat` === attribute.name) { continue }

                    let attributeValue = ``

                    if (elementDest.hasAttribute(attribute.name)) { attributeValue = elementDest.getAttribute(attribute.name) }
                    elementDest.setAttribute(attribute.name, attributeValue + attribute.value)
                }
            }
            const setEventHandlers = (node) => {
                const events = [`onblur`, `onchange`, `oncontextmenu`, `onfocus`, `oninput`, `oninvalid`, `onreset`, `onsearch`, `onselect`, `onsubmit`, `onkeydown`, `onkeyup`, `onclick`,
                    `ondblclick`, `onmousedown`, `onmousemove`, `onmouseout`, `onmouseover`, `onmouseup`, `onwheel`, `ondrag`, `ondragend`, `ondragenter`, `ondragleave`, `ondragover`,
                    `ondragstart`, `ondrop`, `onscroll`, `oncopy`, `oncut`, `onpaste`, `onabort`, `oncanplay`, `oncanplaythrough`, `oncuechange`, `ondurationchange`, `onemptied`, `onended`,
                    `onerror`, `onloadeddata`, `onloadedmetadata`, `onloadstart`, `onpause`, `onplay`, `onplaying`, `onprogress`, `onratechange`, `onseeked`, `onseeking`, `onstalled`,
                    `onsuspend`, `ontimeupdate`, `onvolumechange`, `onwaiting`, `ontoggle`]
                const setEventHandler = (node, event) => {
                    let eventHandlerText = node.getAttribute(event)
    
                    if (eventHandlerText && -1 !== eventHandlerText.indexOf(`$obj.`)) {
                        eventHandlerText = eventHandlerText.replaceAll(`$obj.`, `Component.getObject('${componentObjectId}').`)
                        node.setAttribute(event, eventHandlerText)
                    }
                    for (let nodeChild of node.children) {
                        setEventHandler(nodeChild, event)
                    }
                }
    
                for (let event of events) {
                    setEventHandler(node, event)
                }
            }

            if (0 === loop) { copyAttributes(includeElement, child) }
            setEventHandlers(child)
            addElementGettersToComponentObject(child, componentObject)
            addConvenienceMethodsToElement(child)

            let photoElement = null
            let srcAttr = null
            if (`News` === child.id) {

                photoElement = child.querySelector(`#NewsNewsPhoto`)
                srcAttr = photoElement.getAttribute(`src`)
                console.dir(srcAttr)
            }
        }
        return componentObject
    }
    static registerComponentObject(componentClass, componentObjectId, componentObject) {
        if (!componentObjectId) { 
            console.error(`registerComponentObject: No component object id provided for component object registration.`)
            return false 
        }
        if (!componentObject) { 
            console.error(`registerComponentObject: No component object provided for component object registration.`)
            return false 
        }
        if (!componentClass) { 
            console.error(`registerComponentObject: No fragment id provided for component object registration.`)
            return false 
        }
        if (ComponentLifecycle.objectRegistry.has(componentObjectId)) { 
            console.error(`registerComponentObject: Component object ${componentObjectId} is already registered.`)
            return false 
        }

        ComponentLifecycle.objectRegistry.set(componentObjectId, { componentObject, componentClass, mounted: false, mountedChildComponents: [], hasBroadcastChildrenMounted: false, hasBroadcastDescendantsMounted: false })
        return true
    }
    static unregisterComponentObject(componentObjectID) {
        if (!componentObjectID) { 
            console.error(`unregisterComponentObject: No component object id provided for registration.`)
            return false 
        }
        if (!ComponentLifecycle.objectRegistry.has(componentObjectID)) { 
            console.error(`unregisterComponentObject: Component object ${componentObjectID} was not in registery.`)
            return false 
        }
        if (ComponentLifecycle.objectRegistry.get(componentObjectID).mounted) { 
            console.error(`unregisterComponentObject: Cannot unregister a mounted component, ${componentObjectID}.`)
            return false 
        }
        ComponentLifecycle.objectRegistry.delete(componentObjectID)
        ComponentLifecycle.objectFragmentRegistry.delete(componentObjectID)
        return true
    }
    static mount(componentObjectId) {
        if (!componentObjectId) { 
            console.error(`mount: No component object id provided for mount.`)
            return false 
        }
        if (!ComponentLifecycle.objectRegistry?.has(componentObjectId)) { 
            console.error(`mount: Component object ${componentObjectId} was not in registery.`)
            return false 
        }

        let componentObjectInfo = ComponentLifecycle.objectRegistry.get(componentObjectId)
        let fragment = ComponentLifecycle.objectFragmentRegistry.get(componentObjectId)
        let customComponentElement = fragment.querySelector(`custom-component`)
        let componentMarkupElement = customComponentElement?.querySelector(`component-markup`)
        let markerId = `-ComponentBeginMarker${componentObjectId}`
        let marker = document.getElementById(markerId)

        if (!fragment) { 
            console.error(`mount: DOM fragment ${componentObjectInfo.componentClass} is not in registery.`)
            return false 
        }
        if (!customComponentElement) { 
            console.error(`mount: Custom component element for ${componentObjectInfo.componentClass} was not provided.`)
            return false 
        }
        if (!componentMarkupElement) { 
            console.error(`mount: Component markup element for ${componentObjectInfo.componentClass} was not provided.`)
            return false 
        }
        if (!componentObjectInfo.componentObject) { 
            console.error(`mount: Component object ${componentObjectId} is not in registery.`)
            return false 
        }
        if (componentObjectInfo.mounted) { 
            console.error(`mount: Component object ${componentObjectId} is already mounted.`)
            return false 
        }
        if (!marker) { 
            console.error(`mount: Marker for ${componentObjectId} is not in DOM.`)
            return false 
        }
        let photoElement = null
        let srcAttr = null

        if (componentObjectInfo.componentObject.beforeMount) { componentObjectInfo.componentObject.beforeMount() }

        for (let child of componentMarkupElement.children) {
            if (`News` === child.id) {

                photoElement = child.querySelector(`#NewsNewsPhoto`)
                srcAttr = photoElement.getAttribute(`src`)
            }
            marker.after(child)
        }
        

        componentObjectInfo.mounted = true
        ComponentLifecycle.objectRegistry.set(componentObjectId, componentObjectInfo)
        try {
            if (componentObjectInfo.componentObject.afterMount) { componentObjectInfo.componentObject.afterMount() }
        } catch (e) {
            console.error(`mount: Exception thrown when calling afterMount for ${componentObjectId}.`)
        }
        return true
    }
    static unmount(componentObjectId) {
        if (!componentObjectId) { 
            console.error(`Unmount: No component object id provided for mount.`)
            return false 
        }
        if (!ComponentLifecycle.objectRegistry?.has(componentObjectId)) { 
            console.error(`Unmount: Component object ${componentObjectId} is not in registery.`)
            return false 
        }

        let componentObjectInfo = ComponentLifecycle.objectRegistry?.get(componentObjectId)

        if (!componentObjectInfo?.componentObject) { 
            console.error(`Unmount: Component object ${componentObjectId} is not in registery.`)
            return false 
        }
        if (!componentObjectInfo.mounted) { 
            console.error(`Unmount: Component object ${componentObjectId} was not mounted.`)
            return false 
        }

        let fragment = ComponentLifecycle.objectFragmentRegistry.get(componentObjectId)
        let markerId = `-ComponentBeginMarker${componentObjectId}`
        let marker = document.getElementById(markerId)
        let markup = fragment.querySelector(`component-markup`)

        if (!fragment) { 
            console.error(`Unmount: Fragment ${componentObjectInfo.componentClass} is not in registery.`)
            return false 
        }
        if (!marker) { 
            console.error(`Unmount: Marker for ${componentObjectId}, ${markerId}, not in DOM.`)
            return false 
        }
        if (!markup) { 
            console.error(`Unmount: Markup for ${componentObjectId} not found.`)
            return false 
        }

        if (componentObjectInfo.componentObject.beforeMount) { componentObjectInfo.componentObject.beforeUnmount() }        
        for (let loop = markup.children.length - 1; loop >= 0; loop--) {
            marker.nextSibling.remove()
        }
        componentObjectInfo.mounted = false
        ComponentLifecycle.objectRegistry.set(componentObjectId, componentObjectInfo)
        if (componentObjectInfo.componentObject.afterMount) { componentObjectInfo.componentObject.afterUnmount() }
        return true
    }
    static destroyComponentObject(componentObjectId) {
        let markerId = `-ComponentBeginMarker${componentObjectId}`
        let marker = document.getElementById(markerId)
        let component = Component.getObject(componentObjectId)

        if (component && component.isMounted()) { ComponentLifecycle.unmount(componentObjectId) }
        ComponentLifecycle.unregisterComponentObject(componentObjectId)
        if (marker) { marker.remove() }
    }
}