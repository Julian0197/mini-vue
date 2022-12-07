import { isObject } from "../shared";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container) {
  // 调用patch方法（方便后续递归处理）
  patch(vnode, container);
}

function patch(vnode, container) {
  const { shapeFlag } = vnode;
  // 判断vnode是element还是component
  if (shapeFlag & ShapeFlags.ELEMENT) {
    // 处理element（vnode.type = div）
    processElement(vnode, container);
  } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    // 处理组件
    processComponent(vnode, container);
  }
}

function processElement(vnode: any, container: any) {
  mountElement(vnode, container);
}

function mountElement(vnode: any, container: any) {
  // 创建一个element,保存到vnode中
  const el = (vnode.el = document.createElement(vnode.type));

  // string array    children是render函数返回的第三个参数
  const { children, shapeFlag } = vnode;
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children;
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(vnode, el);
  }

  // props
  const { props } = vnode;
  for (const key in props) {
    const val = props[key];

    // 确认规范 on + Event name，使用正则表达式
    const isOn = (key: string) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
      // 'onClick'第二位之后的是event name
      const event = key.slice(2).toLowerCase();
      el.addEventListener(event, val);
    } else {
      el.setAttribute(key, val);
    }
  }

  container.append(el);
}

function mountChildren(vnode: any, container: any) {
  // array里每一个都是虚拟节点
  vnode.children.forEach((v) => {
    patch(v, container);
  });
}

function processComponent(vnode: any, container: any) {
  mountComponent(vnode, container);
}

function mountComponent(initialVnode: any, container: any) {
  // 创建组件实例
  const instance = createComponentInstance(initialVnode);
  // 处理setup
  setupComponent(instance);
  // 处理render
  setupRenderEffect(instance, initialVnode, container);
}

function setupRenderEffect(instance: any, initialVnode: any, container: any) {
  const { proxy } = instance;

  // 执行render函数
  const subTree = instance.render.call(proxy);
  // 由于执行render后返回依然是一个vnode对象，继续递归调用patch处理
  patch(subTree, container);
  // patch对h函数返回的vnode进行处理（这里就是subTree）
  // 在执行mountElement后，subTree.el已经赋好值了，这个时候再把值给vnode.el
  initialVnode.el = subTree.el;
}
