const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVNode(type, props, children) {
    // ?表示可选参数
    const vnode = {
        type,
        props,
        children,
        component: null,
        key: props && props.key,
        shapeFlag: getShapeFlag(type),
        el: null,
    };
    // children
    if (typeof children === "string") {
        vnode.shapeFlag |= 4 /* TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ARRAY_CHILDREN */;
    }
    // 组件 + children是object
    if (vnode.shapeFlag & 2 /* STATEFUL_COMPONENT */) {
        if (typeof children === "object") {
            vnode.shapeFlag |= 16 /* SLOT_CHILDREN */;
        }
    }
    return vnode;
}
// 之前都采用if (typeof vnode.type === "string") 判断类型
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ELEMENT */
        : 2 /* STATEFUL_COMPONENT */;
}
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        if (typeof slot === 'function') {
            return createVNode(Fragment, {}, slot(props));
        }
    }
}

const extend = Object.assign;
const isObject = (val) => {
    return val !== null && typeof val === "object";
};
const hasChanged = (val, newVal) => {
    return Object.is(val, newVal);
};
// hasOwn判断当前key在不在obj上
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
// 首字母大写 add => Add
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
// 转化为驼峰命名格式 add-foo => addFoo
const camelize = (str) => {
    // _是"-foo"，c是"foo"，就是把-foo替换为Foo
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : "";
    });
};
const toHandlerKey = (str) => {
    return str ? "on" + capitalize(str) : "";
};

let activeEffect;
let shouldTrack;
class ReactiveEffect {
    // ?表示可有可无的参数 public外部可以获取到
    constructor(fn, scheduler) {
        this.scheduler = scheduler;
        this.deps = [];
        this.active = true;
        this._fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        // run方法会收集依赖
        // 用shouldTrack全局变量来做区分，是否能够触发依赖
        if (!this.active) {
            // 表明当前是effect对象是stop状态，不用收集依赖
            return this._fn();
        }
        shouldTrack = true;
        // this指向当前的实例对象_effect
        activeEffect = this;
        const result = this._fn();
        shouldTrack = false; // reset
        return result;
    }
    stop() {
        if (this.active) {
            cleanupEffect(this);
            if (this.onStop) {
                this.onStop();
            }
            this.active = false;
        }
    }
}
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        // dep是target[key]的Set()
        // 要删除所有dep库中的当前_effect对象
        dep.delete(effect);
    });
    effect.deps.length = 0;
}
// 依赖收集
const targetMap = new Map();
function track(target, key) {
    if (!isTracking())
        return;
    // target -> key -> dep(里面装依赖key的属性)
    // const dep = new Set()
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffects(dep);
}
// 重构针对ref和reactive对象都可以使用
function trackEffects(dep) {
    // // 如果当前依赖已经收集，不需要再收集了
    if (dep.has(activeEffect))
        return;
    dep.add(activeEffect);
    // 反向收集，用effect收集dep
    activeEffect.deps.push(dep);
}
// 抽离effect.stop后的几个逻辑
function isTracking() {
    return shouldTrack && activeEffect !== undefined;
    // if (!activeEffect) return; // 当前没有执行过effect，没有收集依赖
    // if (!shouldTrack) return; // 当前收集依赖通过stop方法暂停了
}
// 依赖触发
function trigger(target, key) {
    let depsMap = targetMap.get(target);
    let dep = depsMap.get(key);
    triggerEffects(dep);
}
function triggerEffects(dep) {
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}
function effect(fn, options = {}) {
    // options写成对象因为还有很多其他配置
    const _effect = new ReactiveEffect(fn, options.scheduler);
    // _effect.onStop = options.onStop;
    // Object.assign(_effect, options);
    extend(_effect, options);
    _effect.run();
    // 以当前的effect实例作为this
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
}
function stop(runner) {
    runner.effect.stop();
}

// 缓存get和set方法，只需要初始化时调用一次
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
// 抽离get
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key) {
        if (key === "__v_isReactive" /* IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* IS_READONLY */) {
            return isReadonly;
        }
        const res = Reflect.get(target, key);
        if (shallow) {
            return res;
        }
        if (!isReadonly) {
            // 依赖收集
            track(target, key);
        }
        // 看看res是不是object
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
// 抽离set
function createSetter() {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value);
        // 触发依赖
        trigger(target, key);
        return res;
    };
}
const mutableHandlers = {
    get,
    set
};
const readonlyHandlers = {
    get: readonlyGet,
    set(target, key, value) {
        console.warn(`key:${key} set 失败，因为${target}是readonly`);
        return true;
    }
};
// extend 相当于Object.assign(),后面可以覆盖
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet,
});

function reactive(raw) {
    return createReactiveObject(raw, mutableHandlers);
}
function isReactive(value) {
    // 先触发get，根据get中的isReadonly变量判断是否是reactive对象
    // !!转化为布尔值，如果没有触发getter，返回undefined
    return !!value["__v_isReactive" /* IS_REACTIVE */];
}
function isReadonly(value) {
    return !!value["__v_isReadonly" /* IS_READONLY */];
}
function readonly(raw) {
    return createReactiveObject(raw, readonlyHandlers);
}
function shallowReadonly(raw) {
    return createReactiveObject(raw, shallowReadonlyHandlers);
}
function isProxy(value) {
    return isReactive(value) || isReadonly(value);
}
// 再封装一下
function createReactiveObject(target, baseHandlers) {
    // 判断传入的target是不是对象
    if (!isObject(target)) {
        console.warn(`target ${target} 必须是一个对象`);
        return target;
    }
    return new Proxy(target, baseHandlers);
}

class RefImpl {
    constructor(value) {
        this.__v_isRef = true;
        this._rawValue = value;
        // 看看value是不是对象，是的话需要reactive包裹
        this._value = convert(value);
        this.dep = new Set();
    }
    get value() {
        // 如果没有触发effect()，activeEffect为undefined
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        // 判断newValue是否和旧的value不一样
        // 这里对比新旧值，是两个object对比，有可能一个是proxy
        if (!hasChanged(this._rawValue, newValue)) {
            this._rawValue = newValue;
            this._value = convert(newValue);
            triggerEffects(this.dep);
        }
    }
}
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
function trackRefValue(ref) {
    // 如果没有触发effect()，activeEffect为undefined
    if (isTracking()) {
        trackEffects(ref.dep);
    }
}
function ref(value) {
    return new RefImpl(value);
}
function isRef(value) {
    return !!value.__v_isRef;
}
function unRef(ref) {
    // 看看是不是ref，是的话返回ref.value，不是直接返回值
    return isRef(ref) ? ref.value : ref;
}
function proxyRefs(objectWithRefs) {
    return new Proxy(objectWithRefs, {
        get(target, key) {
            // get => 如果ref就返回它的.value
            // not ref => 直接返回它
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            if (isRef(target[key]) && !isRef(value)) {
                return target[key].value = value;
            }
            else {
                return Reflect.set(target, key, value);
            }
        }
    });
}

class ComputedRefImpl {
    constructor(getter) {
        this._dirty = true;
        this._getter = getter;
        this._effect = new ReactiveEffect(getter, () => {
            // 如果有scheduler，trigger不会执行effect，会执行scheduler
            if (!this._dirty) {
                this._dirty = true;
            }
        });
    }
    get value() {
        if (this._dirty) {
            this._dirty = false;
            this._value = this._effect.run();
        }
        return this._value;
    }
}
function computed(getter) {
    return new ComputedRefImpl(getter);
}

const emit = (instance, event, ...args) => {
    const { props } = instance;
    // 子组件中调用emit('add')，传入add，实际调用的是onAdd
    // 子组件中调用emit('add-foo')，传入add-foo，实际调用的是onAddFoo
    const handlerName = toHandlerKey(camelize(event));
    const handler = props[handlerName];
    handler && handler(...args);
};

function initProps(instance, rawProps) {
    // app组件没有父组件传入的props，此时会报错
    instance.props = rawProps || {};
    // TODO attrs
}

// 利用map对象保存$el,$data等属性
const publicPropertiesMap = {
    // 写成函数形式
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
    $props: (i) => i.props,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        // setupState
        const { setupState, props } = instance;
        // hasOwn判断当前key在不在setupState或者props上
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    }
};

function initSlots(instance, children) {
    const { vnode } = instance;
    // 判断是否有slots权限
    if (vnode.shapeFlag & 16 /* SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
}
function normalizeObjectSlots(children, slots) {
    for (const key in children) {
        const value = children[key];
        // 使用函数包裹，因为要为slots传递参数
        // createVNode中的第三个参数children需要包裹成数组的形式
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
function normalizeSlotValue(value) {
    // 将执行结果包裹为数组
    return Array.isArray(value) ? value : [value];
}

function createComponentInstance(vnode, parent) {
    // console.log("createComponentInstance", parent);
    const component = {
        vnode,
        type: vnode.type,
        next: null,
        setupState: {},
        props: {},
        slots: {},
        provides: parent ? parent.provides : {},
        parent,
        isMounted: false,
        subTree: {},
        emit: () => { },
    };
    // 使用bind预先传入insance，emit函数只需要传入对应事件
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    // 先拿setup的返回值
    const Component = instance.type;
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    const { setup } = Component;
    if (setup) {
        // 拿到当前的组件实例对象
        setCurrentInstance(instance);
        // setup可以返回obj或者function
        // 这里传入props
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        });
        setCurrentInstance(null);
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    // 基于function 或 object
    // TODO function
    // proxyRefs先将setup结果变成proxy，如果对象中的数据是ref直接返回.value
    if (typeof setupResult === "object") {
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    instance.render = Component.render;
}
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}

function provide(key, value) {
    // 父组件存储数据
    const currentInstance = getCurrentInstance(); // 只有在setup内部使用
    if (currentInstance) {
        // ES6对象结构，创建一个新变量provides，浅拷贝对象的属性
        let { provides } = currentInstance;
        // 拿到父亲的provides
        const parentProvides = currentInstance.parent.provides;
        // 初始化状态：说明当前provides还没有赋值
        if (provides === parentProvides) {
            // 当前组件provides变成了一个空对象，且原型指向parentProvides
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    // 子孙组件获取数据
    const currentInstance = getCurrentInstance();
    // 这个if判断当前是在setup中
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides;
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else if (defaultValue) {
            if (typeof defaultValue === 'function') {
                return defaultValue();
            }
            else {
                return defaultValue;
            }
        }
    }
}

function shouldUpdateComponent(prevVNode, nextVNode) {
    const { props: prevProps } = prevVNode;
    const { props: nextProps } = nextVNode;
    for (const key in nextProps) {
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
    }
    return false;
}

function createAppAPI(render) {
    // createApp依赖render，我们把最底层的render包装成适用于多平台（DOM、canvas等）的createRenderer
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                // 先把所有东西转化为虚拟节点vnode
                // 后续所有逻辑操作基于 vnode 处理
                const vnode = createVNode(rootComponent);
                render(vnode, rootContainer);
            },
        };
    };
}

const queue = [];
// 定义是否添加任务的状态
// 每次添加job，都要创建一次Promise.resolve
// 现在设置一个状态isFlushPending，默认为false表示还没有创建过promise
// 创建完Promise立刻将状态设置为true，期间queue中如果添加了其他job，都不会再创建Promise
// 所有的job都将在一个Promise.resolve中执行
// 当前Promise执行完后，再把状态重新设置为false
let isFlushPending = false;
// 定义一个状态为成功的promise状态
const p = Promise.resolve();
// nextTick就是用Promise包裹当前fn，异步执行fn
function nextTick(fn) {
    return fn ? p.then(fn) : p;
}
function queueJobs(job) {
    // 添加任务，实际上是添加当前effect的fn，只需要添加一次
    if (!queue.includes(job)) {
        queue.push(job);
    }
    queueFlush();
}
function queueFlush() {
    if (isFlushPending)
        return;
    isFlushPending = true;
    nextTick(flushJobs);
}
function flushJobs() {
    isFlushPending = false;
    let job;
    while ((job = queue.shift())) {
        job && job();
    }
}

function createRenderer(options) {
    // 解构渲染函数（create,setAtt,append)
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText, } = options;
    function render(vnode, container) {
        // 调用patch方法（方便后续递归处理）
        patch(null, vnode, container, null, null);
    }
    // n1 -> 旧的vnode
    // n2 -> 新的vnode
    function patch(n1, n2, container, parentComponent, anchor) {
        const { type, shapeFlag } = n2;
        // Fragment => 只渲染 children
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent, anchor);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                // 判断vnode是element还是component
                if (shapeFlag & 1 /* ELEMENT */) {
                    // 处理element（vnode.type = div）
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                    // 处理组件
                    processComponent(n1, n2, container, parentComponent, anchor);
                }
        }
    }
    function processFragment(n1, n2, container, parentComponent, anchor) {
        // 将所有children渲染出来
        mountChildren(n2.children, container, parentComponent, anchor);
    }
    function processText(n1, n2, container) {
        const { children } = n2;
        const textNode = (n2.el = document.createTextNode(children));
        container.append(textNode);
    }
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            // init
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
            // update
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    const EMPTY_OBJ = {};
    function patchElement(n1, n2, container, parentComponent, anchor) {
        console.log("update");
        // console.log("n1", n1);
        // console.log("n2", n2);
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        // 旧vnode具有属性el，在mountElement中挂载，新vnode没有el
        const el = (n2.el = n1.el);
        patchChildren(n1, n2, el, parentComponent, anchor);
        patchProps(el, oldProps, newProps);
    }
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        const prevShapeFlag = n1.shapeFlag;
        const c1 = n1.children;
        const { shapeFlag } = n2;
        const c2 = n2.children;
        // ToText
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            // ArrayToText
            if (prevShapeFlag & 8 /* ARRAY_CHILDREN */) {
                // 清空老的 children（array）
                unMountChildren(n1.children);
            }
            // TextToText
            if (c1 !== c2) {
                // 设置新children（text）
                hostSetElementText(container, c2);
            }
        }
        else {
            // ToArray
            if (prevShapeFlag & 4 /* TEXT_CHILDREN */) {
                // TextToArray
                hostSetElementText(container, "");
                mountChildren(c2, container, parentComponent, anchor);
            }
            else {
                // ArrayToArray
                patchKeyedChildren(c1, c2, container, parentComponent, anchor);
            }
        }
    }
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        const l2 = c2.length;
        let i = 0; // 队头指针
        // 队尾指针
        let e1 = c1.length - 1;
        let e2 = l2 - 1;
        // 判断n1,n2是否一样
        function isSomeVNodeType(n1, n2) {
            // 基于 type 和 key判断是否一致
            return n1.type === n2.type && n1.key === n2.key;
        }
        // 1.左侧
        while (i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = c2[i];
            // 判断type和key是否一致
            if (isSomeVNodeType(n1, n2)) {
                // 调用patch递归对比（有可能内部children不一样）
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            i++;
        }
        // 2.右侧
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = c2[e2];
            if (isSomeVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        // 3.新的比老的多 创建
        if (i > e1) {
            if (i <= e2) {
                // debugger;
                const nextPos = e2 + 1;
                const anchor = nextPos < l2 ? c2[nextPos].el : null;
                // 传入anchor，是为了在某个el前插入元素
                // 在parent的最后插入元素直接传null，等同于append
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, anchor);
                    i++;
                }
            }
        }
        else if (i > e2) {
            // 4.老的比新的多
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
        else {
            // 中间对比
            // i是中间部分的起始索引
            let s1 = i;
            let s2 = i;
            const toBePatched = e2 - s2 + 1; // 新array children中需要被patch的个数
            let patched = 0; // patch完一次，+1
            // 建立新children array中，中间不同元素的key和索引值的映射关系
            const keyToNewIndexMap = new Map();
            // 建立索引顺序映射
            const newIndexToOldIndexMap = new Array(toBePatched);
            let moved = false;
            let maxNewIndexSoFar = 0;
            for (let i = 0; i < toBePatched; i++) {
                newIndexToOldIndexMap[i] = 0;
            }
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i];
                keyToNewIndexMap.set(nextChild.key, i);
            }
            // 遍历c1中间部分
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i];
                let newIndex;
                if (patched >= toBePatched) {
                    hostRemove(prevChild.el);
                    continue;
                }
                // null || undefined
                if (prevChild.key !== null) {
                    newIndex = keyToNewIndexMap.get(prevChild.key);
                }
                else {
                    // 没有key只能循环遍历新children array查找有没有旧children array的元素
                    for (let j = s2; j <= e2; j++) {
                        if (isSomeVNodeType(prevChild, c2[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                // newIndex不存在，说明在新array children中没找到，需要删除
                if (newIndex === undefined) {
                    hostRemove(prevChild.el);
                }
                else {
                    // 判断是否需要移动
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    // 在c2中找到了，和c1中想同key的元素
                    // newIndex是c1中的相同元素在c2中的索引，newIndex-s2将中间部分从0开始计数
                    // i + 1值为，在c1中的索引，由于初始值0代表没有的元素，要区分开
                    // 比如: c1中 c d e z，c2中 d c y e
                    // 【1+1 0+1 0 2+1】
                    newIndexToOldIndexMap[newIndex - s2] = i + 1;
                    // newIndex存在，继续patch深度对比修改（children）
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    patched++;
                }
            }
            // 【1+1 0+1 0 2+1】=> [1 3]这里1 3是最长递增子序列的索引
            const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : [];
            // 从后向前遍历，插入时不会报错
            let j = increasingNewIndexSequence.length - 1;
            for (let i = toBePatched - 1; i >= 0; i--) {
                const nextIndex = i + s2;
                const nextChild = c2[nextIndex];
                const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null;
                // 老的不存在，新的存在，需要重新创建
                if (newIndexToOldIndexMap[i] === 0) {
                    patch(null, nextChild, container, parentComponent, anchor);
                }
                if (moved) {
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        hostInsert(nextChild.el, container, anchor);
                    }
                    else {
                        j--;
                    }
                }
            }
        }
    }
    function unMountChildren(children) {
        // 每个children[i]都是h函数生成的vnode
        for (let i = 0; i < children.length; i++) {
            const el = children[i].el;
            // remove
            hostRemove(el);
        }
    }
    function patchProps(el, oldProps, newProps) {
        // 新旧完全一样，就不需要对比了
        if (oldProps !== newProps) {
            // 遍历新props，更新元素或者删除undefined
            for (const key in newProps) {
                const prevProp = oldProps[key];
                const nextProp = newProps[key];
                if (prevProp !== nextProp) {
                    // runtime-dom里面处理props的函数
                    hostPatchProp(el, key, prevProp, nextProp);
                }
            }
            if (oldProps !== EMPTY_OBJ) {
                // 遍历旧props，判断有没有需要删除的元素
                for (const key in oldProps) {
                    if (!(key in newProps)) {
                        hostPatchProp(el, key, oldProps[key], null);
                    }
                }
            }
        }
    }
    function mountElement(vnode, container, parentComponent, anchor) {
        // 创建一个element,保存到vnode中
        // const el = (vnode.el = document.createElement(vnode.type));
        // DOM中创建真实元素，封装起来
        const el = (vnode.el = hostCreateElement(vnode.type));
        // string array    children是render函数返回的第三个参数
        const { children, shapeFlag } = vnode;
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ARRAY_CHILDREN */) {
            mountChildren(vnode.children, el, parentComponent, anchor);
        }
        // props
        const { props } = vnode;
        for (const key in props) {
            const val = props[key];
            // 确认规范 on + Event name，使用正则表达式
            // const isOn = (key: string) => /^on[A-Z]/.test(key);
            // if (isOn(key)) {
            //   // 'onClick'第二位之后的是event name
            //   const event = key.slice(2).toLowerCase();
            //   el.addEventListener(event, val);
            // } else {
            //   el.setAttribute(key, val);
            // }
            // 上述代码全是DOM API上的操作，封装起来
            hostPatchProp(el, key, null, val);
        }
        // container.append(el);
        // DOM中添加真实元素，也封装起来
        hostInsert(el, container, anchor);
    }
    function mountChildren(children, container, parentComponent, anchor) {
        // array里每一个都是虚拟节点
        children.forEach((v) => {
            patch(null, v, container, parentComponent, anchor);
        });
    }
    function processComponent(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            mountComponent(n2, container, parentComponent, anchor);
        }
        else {
            updateComponent(n1, n2);
        }
    }
    function updateComponent(n1, n2) {
        // 获取component实例
        const instance = (n2.component = n1.component);
        // 判断是否需要更新组件
        if (shouldUpdateComponent(n1, n2)) {
            instance.next = n2; // 下次要更新的vnode
            instance.update(); // 继续调用effect的fn,更新DOM
        }
        else {
            // 不需要更新则复用el
            n2.el = n1.el;
            instance.vnode = n2;
        }
    }
    function mountComponent(initialVnode, container, parentComponent, anchor) {
        // 创建组件实例
        // 将组件实例挂载到initialVnode中的component属性中
        const instance = (initialVnode.component = createComponentInstance(initialVnode, parentComponent));
        // 处理setup
        setupComponent(instance);
        // 处理render
        setupRenderEffect(instance, initialVnode, container, anchor);
    }
    function setupRenderEffect(instance, initialVnode, container, anchor) {
        // 依赖收集
        // 将effect函数返回得到的runnner函数赋值给当前实例的update变量
        // 返回的runner就是执行传入的箭头函数
        instance.update = effect(() => {
            // 判断有没有完成初始化
            if (!instance.isMounted) {
                // init
                const { proxy } = instance;
                // 执行render函数
                const subTree = (instance.subTree = instance.render.call(proxy));
                // 由于执行render后返回依然是一个vnode对象，继续递归调用patch处理
                patch(null, subTree, container, instance, anchor);
                // patch对h函数返回的vnode进行处理（这里就是subTree）
                // 在执行mountElement后，subTree.el已经赋好值了，这个时候再把值给vnode.el
                initialVnode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                // update
                // 还要更新组件的props
                const { next, vnode } = instance;
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }
                const { proxy } = instance;
                // 重新调render函数，返回新的vnode
                const subTree = instance.render.call(proxy);
                const prevSubTree = instance.subTree;
                instance.subTree = subTree;
                patch(prevSubTree, subTree, container, instance, anchor);
            }
        }, {
            scheduler() {
                console.log("scheduler");
                queueJobs(instance.update);
            }
        });
    }
    return {
        // 将render传递给createApi，createApi又包装了一层createApp，返回的是createApp函数
        createApp: createAppAPI(render),
    };
}
function updateComponentPreRender(instance, nextVNode) {
    instance.vnode = nextVNode;
    instance.next = null;
    // 这一步是在mountComponent中的setupComponent中的initProps实现的，而update操作需要单独更新props
    instance.props = nextVNode.props;
}
// 记录完下标后
// newIndexToOldIndexMap = [4, 3, 0, 5]
// 这也就对应了
// [D, C, Y, E]
// [4, 3, 0, 5]
// Y为0，代表新增
// 其他分别代表在旧的vnode中的下标位置
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, prevVal, nextVal) {
    // 确认规范 on + Event name，使用正则表达式
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        // 'onClick'第二位之后的是event name
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextVal);
    }
    else {
        // 删除元素
        if (nextVal === undefined || nextVal === null) {
            el.removeAttribute(key);
        }
        else {
            // 赋值元素
            el.setAttribute(key, nextVal);
        }
    }
}
function insert(child, parent, anchor) {
    // parent.append(el);
    // anchor为null，默认会添加到最后
    parent.insertBefore(child, anchor || null);
}
function remove(child) {
    // parentNode为DOM节点原生属性
    // removeChild为DOM节点原生属性
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
function setElementText(el, text) {
    el.textContent = text;
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText,
});
function createApp(...args) {
    return renderer.createApp(...args);
}

export { computed, createApp, createRenderer, createTextVNode, effect, getCurrentInstance, h, inject, isProxy, isReactive, isReadonly, isRef, nextTick, provide, proxyRefs, reactive, readonly, ref, renderSlots, shallowReadonly, stop, unRef };
