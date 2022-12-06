import { isObject } from "../shared";
import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container) {
  // 调用patch方法（方便后续递归处理）
  patch(vnode, container);
}

function patch(vnode, container) {
  // 判断vnode是element还是component
  if (typeof vnode.type === "string") {
    // 处理element（vnode.type = div）
    processElement(vnode, container);
  } else if (isObject(vnode.type)) {
    // 处理组件
    processComponent(vnode, container);
  }
}

function processElement(vnode: any, container: any) {
  mountElement(vnode, container)
}

function mountElement(vnode: any, container: any) {
  // 创建一个element
  const el = document.createElement(vnode.type)

  // string array children是render函数返回的第三个参数
  const {children} = vnode;
  if (typeof children === 'string') {
    el.textContent = children;
  } else if (Array.isArray(children)) {
    mountChildren(vnode, el)
  }

  // props
  const {props} = vnode;
  for (const key in props) {
    const val = props[key];
    el.setAttribute(key, val)
  }

  container.append(el)
}

function mountChildren(vnode: any, container: any) {
      // array里每一个都是虚拟节点
      vnode.children.forEach((v) => {
        patch(v, container)
      })
}



function processComponent(vnode: any, container: any) {
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


