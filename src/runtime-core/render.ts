import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container) {
  // 调用patch方法（方便后续递归处理）
  patch(vnode, container);
}

function patch(vnode, container) {
  // 处理组件
  processComponent(vnode, container);
}

function processComponent(vnode: any, container: any) {
  mountComponent(vnode, container);
}

function mountComponent(vnode, container) {
  // 创建组件实例
  const instance = createComponentInstance(vnode);
  // 处理setup
  setupComponent(instance)
  // 处理render
  setupRenderEffect(instance, container)
}

function setupRenderEffect(instance, container) {
  // 执行render函数
  const subTree = instance.render()
  // 由于执行render后返回依然是一个vnode对象，继续递归调用patch处理
  patch(subTree, container)
}

