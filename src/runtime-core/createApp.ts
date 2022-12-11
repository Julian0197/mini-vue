import { createVNode } from "./vnode";

export function createAppAPI(render) {
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
