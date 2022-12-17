import { effect } from "../reactivity";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { createAppAPI } from "./createApp";
import { Fragment, Text } from "./vnode";

export function createRenderer(options) {
  // 解构渲染函数（create,setAtt,append)
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
  } = options;

  function render(vnode, container) {
    // 调用patch方法（方便后续递归处理）
    patch(null, vnode, container, null, null);
  }

  // n1 -> 旧的vnode
  // n2 -> 新的vnode
  function patch(
    n1: any,
    n2: any,
    container: any,
    parentComponent: any,
    anchor: any
  ) {
    const { type, shapeFlag } = n2;

    // Fragment => 只渲染 children
    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent, anchor);
        break;
      case Text:
        processText(n1, n2, container);
        break;

      default:
        // 判断vnode是element还是component
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 处理element（vnode.type = div）
          processElement(n1, n2, container, parentComponent, anchor);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          // 处理组件
          processComponent(n1, n2, container, parentComponent, anchor);
        }
    }
  }

  function processFragment(
    n1: any,
    n2: any,
    container: any,
    parentComponent: any,
    anchor: any
  ) {
    // 将所有children渲染出来
    mountChildren(n2.children, container, parentComponent, anchor);
  }

  function processText(n1: any, n2: any, container: any) {
    const { children } = n2;
    const textNode = (n2.el = document.createTextNode(children));
    container.append(textNode);
  }

  function processElement(
    n1: any,
    n2: any,
    container: any,
    parentComponent: any,
    anchor: any
  ) {
    if (!n1) {
      // init
      mountElement(n2, container, parentComponent, anchor);
    } else {
      // update
      patchElement(n1, n2, container, parentComponent, anchor);
    }
  }

  const EMPTY_OBJ = {};
  function patchElement(n1, n2, container, parentComponent, anchor) {
    console.log("update");

    console.log("n1", n1);
    console.log("n2", n2);

    const oldProps = n1.props || EMPTY_OBJ;
    const newProps = n2.props || EMPTY_OBJ;

    // 旧vnode具有属性el，在mountElement中挂载，新vnode没有el
    const el = (n2.el = n1.el);

    patchChildren(n1, n2, el, parentComponent, anchor);
    patchProps(el, oldProps, newProps);
  }

  function patchChildren(n1, n2, container, parentComponent, anchor) {
    const prevShapeFlag = n1.shapeFlag;
    const c1 = n1.children;
    const { shapeFlag } = n2;
    const c2 = n2.children;

    // ToText
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // ArrayToText
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 清空老的 children（array）
        unMountChildren(n1.children);
      }
      // TextToText
      if (c1 !== c2) {
        // 设置新children（text）
        hostSetElementText(container, c2);
      }
    } else {
      // ToArray
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        // TextToArray
        hostSetElementText(container, "");
        mountChildren(c2, container, parentComponent, anchor);
      } else {
        // ArrayToArray
        patchKeyedChildren(c1, c2, container, parentComponent, anchor);
      }
    }
  }

  function patchKeyedChildren(
    c1,
    c2,
    container,
    parentComponent,
    parentAnchor
  ) {
    const l2 = c2.length;
    let i = 0; // 队头指针
    // 队尾指针
    let e1 = c1.length - 1;
    let e2 = l2 - 1;

    // 判断n1,n2是否一样
    function isSomeVNodeType(n1, n2) {
      // 基于 type 和 key判断是否一致
      return n1.type === n2.type && n1.key === n2.key;
    }

    // 1.左侧
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];
      // 判断type和key是否一致
      if (isSomeVNodeType(n1, n2)) {
        // 调用patch递归对比（有可能内部children不一样）
        patch(n1, n2, container, parentComponent, parentAnchor);
      } else {
        break;
      }
      i++;
    }

    // 2.右侧
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if (isSomeVNodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, parentAnchor);
      } else {
        break;
      }
      e1--;
      e2--;
    }

    // 3.新的比老的多 创建
    if (i > e1) {
      if (i <= e2) {
        // debugger;
        const nextPos = e2 + 1;
        const anchor = nextPos < l2 ? c2[nextPos].el : null;
        // 传入anchor，是为了在某个el前插入元素
        // 在parent的最后插入元素直接传null，等同于append
        while( i <= e2) {
          patch(null, c2[i], container, parentComponent, anchor);
          i++
        }
      }
    } else if (i > e2) {
      // 4.老的比新的多
      while(i <= e1) {
        hostRemove(c1[i].el)
        i++
      }
    } else {
      // 乱序部分

    }
  }

  function unMountChildren(children) {
    // 每个children[i]都是h函数生成的vnode
    for (let i = 0; i < children.length; i++) {
      const el = children[i].el;
      // remove
      hostRemove(el);
    }
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

  function mountElement(
    vnode: any,
    container: any,
    parentComponent: any,
    anchor: any
  ) {
    // 创建一个element,保存到vnode中
    // const el = (vnode.el = document.createElement(vnode.type));
    // DOM中创建真实元素，封装起来
    const el = (vnode.el = hostCreateElement(vnode.type));

    // string array    children是render函数返回的第三个参数
    const { children, shapeFlag } = vnode;
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode.children, el, parentComponent, anchor);
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
    hostInsert(el, container, anchor);
  }

  function mountChildren(
    children: any,
    container: any,
    parentComponent: any,
    anchor: any
  ) {
    // array里每一个都是虚拟节点
    children.forEach((v) => {
      patch(null, v, container, parentComponent, anchor);
    });
  }

  function processComponent(
    n1: any,
    n2: any,
    container: any,
    parentComponent: any,
    anchor: any
  ) {
    mountComponent(n2, container, parentComponent, anchor);
  }

  function mountComponent(
    initialVnode: any,
    container: any,
    parentComponent: any,
    anchor: any
  ) {
    // 创建组件实例
    const instance = createComponentInstance(initialVnode, parentComponent);
    // 处理setup
    setupComponent(instance);
    // 处理render
    setupRenderEffect(instance, initialVnode, container, anchor);
  }

  function setupRenderEffect(
    instance: any,
    initialVnode: any,
    container: any,
    anchor: any
  ) {
    // 依赖收集
    effect(() => {
      // 判断有没有完成初始化
      if (!instance.isMounted) {
        // init
        const { proxy } = instance;
        // 执行render函数
        const subTree = (instance.subTree = instance.render.call(proxy));
        // 由于执行render后返回依然是一个vnode对象，继续递归调用patch处理
        patch(null, subTree, container, instance, anchor);
        // patch对h函数返回的vnode进行处理（这里就是subTree）
        // 在执行mountElement后，subTree.el已经赋好值了，这个时候再把值给vnode.el
        initialVnode.el = subTree.el;

        instance.isMounted = true;
      } else {
        // update
        const { proxy } = instance;
        const subTree = instance.render.call(proxy);
        const prevSubTree = instance.subTree;
        instance.subTree = subTree;
        patch(prevSubTree, subTree, container, instance, anchor);
      }
    });
  }

  return {
    // 将render传递给createApi，createApi又包装了一层createApp，返回的是createApp函数
    createApp: createAppAPI(render),
  };
}
