'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVNode(type, props, children) {
    // ?表示可选参数
    const vnode = {
        type,
        props,
        children,
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
    $slots: (i) => i.slots
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

function createRenderer(options) {
    // 解构渲染函数（create,setAtt,append)
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, } = options;
    function render(vnode, container) {
        // 调用patch方法（方便后续递归处理）
        patch(null, vnode, container, null);
    }
    // n1 -> 旧的vnode
    // n2 -> 新的vnode
    function patch(n1, n2, container, parentComponent) {
        const { type, shapeFlag } = n2;
        // Fragment => 只渲染 children
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                // 判断vnode是element还是component
                if (shapeFlag & 1 /* ELEMENT */) {
                    // 处理element（vnode.type = div）
                    processElement(n1, n2, container, parentComponent);
                }
                else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                    // 处理组件
                    processComponent(n1, n2, container, parentComponent);
                }
        }
    }
    function processFragment(n1, n2, container, parentComponent) {
        // 将所有children渲染出来
        mountChildren(n2, container, parentComponent);
    }
    function processText(n1, n2, container) {
        const { children } = n2;
        const textNode = (n2.el = document.createTextNode(children));
        container.append(textNode);
    }
    function processElement(n1, n2, container, parentComponent) {
        if (!n1) {
            // init
            mountElement(n2, container, parentComponent);
        }
        else {
            // update
            patchElement(n1, n2);
        }
    }
    const EMPTY_OBJ = {};
    function patchElement(n1, n2, container) {
        console.log("update");
        console.log("n1", n1);
        console.log("n2", n2);
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        // 旧vnode具有属性el，在mountElement中挂载，新vnode没有el
        const el = (n2.el = n1.el);
        patchProps(el, oldProps, newProps);
        // children
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
    function mountElement(vnode, container, parentComponent) {
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
            mountChildren(vnode, el, parentComponent);
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
        hostInsert(el, container);
    }
    function mountChildren(vnode, container, parentComponent) {
        // array里每一个都是虚拟节点
        vnode.children.forEach((v) => {
            patch(null, v, container, parentComponent);
        });
    }
    function processComponent(n1, n2, container, parentComponent) {
        mountComponent(n2, container, parentComponent);
    }
    function mountComponent(initialVnode, container, parentComponent) {
        // 创建组件实例
        const instance = createComponentInstance(initialVnode, parentComponent);
        // 处理setup
        setupComponent(instance);
        // 处理render
        setupRenderEffect(instance, initialVnode, container);
    }
    function setupRenderEffect(instance, initialVnode, container) {
        // 依赖收集
        effect(() => {
            // 判断有没有完成初始化
            if (!instance.isMounted) {
                // init
                const { proxy } = instance;
                // 执行render函数
                const subTree = (instance.subTree = instance.render.call(proxy));
                // 由于执行render后返回依然是一个vnode对象，继续递归调用patch处理
                patch(null, subTree, container, instance);
                // patch对h函数返回的vnode进行处理（这里就是subTree）
                // 在执行mountElement后，subTree.el已经赋好值了，这个时候再把值给vnode.el
                initialVnode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                // update
                const { proxy } = instance;
                const subTree = instance.render.call(proxy);
                const prevSubTree = instance.subTree;
                instance.subTree = subTree;
                patch(prevSubTree, subTree, container, instance);
            }
        });
    }
    return {
        // 将render传递给createApi，createApi又包装了一层createApp，返回的是createApp函数
        createApp: createAppAPI(render),
    };
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
function insert(el, parent) {
    parent.append(el);
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
});
function createApp(...args) {
    return renderer.createApp(...args);
}

exports.computed = computed;
exports.createApp = createApp;
exports.createRenderer = createRenderer;
exports.createTextVNode = createTextVNode;
exports.effect = effect;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.isProxy = isProxy;
exports.isReactive = isReactive;
exports.isReadonly = isReadonly;
exports.isRef = isRef;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.reactive = reactive;
exports.readonly = readonly;
exports.ref = ref;
exports.renderSlots = renderSlots;
exports.shallowReadonly = shallowReadonly;
exports.stop = stop;
exports.unRef = unRef;
