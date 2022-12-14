import { effect } from "../reactivity";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { createAppAPI } from "./createApp";
import { Fragment, Text } from "./vnode";

export function createRenderer(options) {
  // 解构渲染函数（create,setAtt,append)
  const { createElement, patchProp, insert } = options;

  function render(vnode, container) {
    // 调用patch方法（方便后续递归处理）
    patch(null, vnode, container, null);
  }

  // n1 -> 旧的vnode
  // n2 -> 新的vnode
  function patch(n1: any, n2: any, container: any, parentComponent: any) {
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
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 处理element（vnode.type = div）
          processElement(n1, n2, container, parentComponent);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          // 处理组件
          processComponent(n1, n2, container, parentComponent);
        }
    }
  }

  function processFragment(n1: any, n2: any, container: any, parentComponent: any) {
    // 将所有children渲染出来
    mountChildren(n2, container, parentComponent);
  }

  function processText(n1: any, n2: any, container: any) {
    const { children } = n2;
    const textNode = (n2.el = document.createTextNode(children));
    container.append(textNode);
  }

  function processElement(n1: any, n2: any, container: any, parentComponent: any) {
    if (!n1) {
      // init
      mountElement(n2, container, parentComponent);
    } else {
      // update
      patchElement(n1, n2, container);
    }
  }

  function patchElement(n1, n2, container) {
    console.log("update");
    
    console.log("n1", n1);
    console.log("n2", n2); 
    
    // props
    // children
  }


  function mountElement(vnode: any, container: any, parentComponent: any) {
    // 创建一个element,保存到vnode中
    // const el = (vnode.el = document.createElement(vnode.type));
    // DOM中创建真实元素，封装起来
    const el = (vnode.el = createElement(vnode.type));

    // string array    children是render函数返回的第三个参数
    const { children, shapeFlag } = vnode;
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
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
      patchProp(el, key, val);
    }

    // container.append(el);
    // DOM中添加真实元素，也封装起来
    insert(el, container);
  }

  function mountChildren(vnode: any, container: any, parentComponent: any) {
    // array里每一个都是虚拟节点
    vnode.children.forEach((v) => {
      patch(null, v, container, parentComponent);
    });
  }

  function processComponent(n1: any, n2: any, container: any, parentComponent: any) {
    mountComponent(n2, container, parentComponent);
  }

  function mountComponent(
    initialVnode: any,
    container: any,
    parentComponent: any
  ) {
    // 创建组件实例
    const instance = createComponentInstance(initialVnode, parentComponent);
    // 处理setup
    setupComponent(instance);
    // 处理render
    setupRenderEffect(instance, initialVnode, container);
  }

  function setupRenderEffect(instance: any, initialVnode: any, container: any) {
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
      } else {
        // update
        const { proxy } = instance;
        const subTree = instance.render.call(proxy)
        const prevSubTree = instance.subTree
        instance.subTree = subTree;
        patch(prevSubTree, subTree, container, instance)        
      }
    });
  }

  return {
    // 将render传递给createApi，createApi又包装了一层createApp，返回的是createApp函数
    createApp: createAppAPI(render),
  };
}
