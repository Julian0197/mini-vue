import { shallowReadonly } from "../reactive";
import { emit } from "./componentEmit";
import { initProps } from "./componentProps";
import { PublicInstanceProxyHandlers } from "./componentPublicInstance";
import { initSlots } from "./componentSlots";

export function createComponentInstance(vnode) {
  const component = {
    vnode,
    type: vnode.type,
    setupState: {},
    props: {},
    slots: {},
    emit: () => {},
  };

  // 使用bind预先传入insance，emit函数只需要传入对应事件
  component.emit = emit.bind(null, component) as any;

  return component;
}

export function setupComponent(instance) {
  initProps(instance, instance.vnode.props)
  initSlots(instance, instance.vnode.children)
  setupStatefulComponent(instance);
}

function setupStatefulComponent(instance: any) {
  // 先拿setup的返回值
  const Component = instance.type;

  instance.proxy = new Proxy(
    {_: instance}, 
    PublicInstanceProxyHandlers
  )

  const { setup } = Component;

  if (setup) {
    // 拿到当前的组件实例对象
    setCurrentInstance(instance)

    // setup可以返回obj或者function
    // 这里传入props
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit,
    });  

    setCurrentInstance(null);

    handleSetupResult(instance, setupResult);
  }
}

function handleSetupResult(instance, setupResult: any) {
  // 基于function 或 object
  // TODO function
  if (typeof setupResult === "object") {
    instance.setupState = setupResult;
  }

  finishComponentSetup(instance);
}

function finishComponentSetup(instance: any) {
  const Component = instance.type;
  
  instance.render = Component.render;
}

let currentInstance = null;

export function getCurrentInstance() {
  return currentInstance
}

export function setCurrentInstance(instance) {
  currentInstance = instance
}
