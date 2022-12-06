const isObject = (val) => {
    return val !== null && typeof val === 'object';
};

function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
    };
    return component;
}
function setupComponent(instance) {
    // TODO
    // initProps()
    // initSlots()
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    // 先拿setup的返回值
    const Component = instance.type;
    const { setup } = Component;
    if (setup) {
        // setup可以返回obj或者function
        const setupResult = setup();
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    // 基于function 或 object
    // TODO function
    if (typeof setupResult === "object") {
        instance.setupState = setupResult;
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    instance.render = Component.render;
}

function render(vnode, container) {
    // 调用patch方法（方便后续递归处理）
    patch(vnode, container);
}
function patch(vnode, container) {
    // 判断vnode是element还是component
    if (typeof vnode.type === "string") {
        // 处理element（vnode.type = div）
        processElement(vnode, container);
    }
    else if (isObject(vnode.type)) {
        // 处理组件
        processComponent(vnode, container);
    }
}
function processElement(vnode, container) {
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    // 创建一个element
    const el = document.createElement(vnode.type);
    // string array children是render函数返回的第三个参数
    const { children } = vnode;
    if (typeof children === 'string') {
        el.textContent = children;
    }
    else if (Array.isArray(children)) {
        mountChildren(vnode, el);
    }
    // props
    const { props } = vnode;
    for (const key in props) {
        const val = props[key];
        el.setAttribute(key, val);
    }
    container.append(el);
}
function mountChildren(vnode, container) {
    // array里每一个都是虚拟节点
    vnode.children.forEach((v) => {
        patch(v, container);
    });
}
function processComponent(vnode, container) {
    mountComponent(vnode, container);
}
function mountComponent(vnode, container) {
    // 创建组件实例
    const instance = createComponentInstance(vnode);
    // 处理setup
    setupComponent(instance);
    // 处理render
    setupRenderEffect(instance, container);
}
function setupRenderEffect(instance, container) {
    // 执行render函数
    const subTree = instance.render();
    // 由于执行render后返回依然是一个vnode对象，继续递归调用patch处理
    patch(subTree, container);
}

function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children
    };
    return vnode;
}

function createApp(rootComponent) {
    return {
        mount(rootContainer) {
            // 先把所有东西转化为虚拟节点vnode
            // 后续所有逻辑操作基于 vnode 处理
            const vnode = createVNode(rootComponent);
            render(vnode, rootContainer);
        }
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

export { createApp, h };
