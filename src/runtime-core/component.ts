import { shallowReadonly } from "../reactive";
import { initProps } from "./componentProps";
import { PublicInstanceProxyHandlers } from "./componentPublicInstance";

export function createComponentInstance(vnode) {
  const component = {
    vnode,
    type: vnode.type,
    setupState: {},
  };

  return component;
}

export function setupComponent(instance) {
  // TODO
  // initSlots()
  initProps(instance, instance.vnode.props)
  
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
    // setup可以返回obj或者function
    // 这里传入props
    const setupResult = setup(shallowReadonly(instance.props));  // 这里对于app，props是undeifned
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
