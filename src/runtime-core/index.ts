export { h } from "./h";
export { renderSlots } from "./helpers/renderSlots";
export { createTextVNode } from "./vnode";
export { getCurrentInstance } from "./component";
export { provide, inject } from "./apiInject";
export { createRenderer } from "./render";

// reactive 响应式
export {
  // core
  reactive,
  ref,
  readonly,
  // utilities
  unRef,
  proxyRefs,
  isReadonly,
  isReactive,
  isProxy,
  isRef,
  // advanced
  shallowReadonly,
  // effect
  effect,
  stop,
  computed,
} from "../reactivity"