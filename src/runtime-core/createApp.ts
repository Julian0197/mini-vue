import { render } from "./render";
import { createVNode } from "./vnode";

export function createApp(rootComponent) {

  return {
    mount(rootContainer) {
      // 先把所有东西转化为虚拟节点vnode
      // 后续所有逻辑操作基于 vnode 处理

      const vnode = createVNode(rootComponent)

      render(vnode, rootContainer);
    }
  }
}


