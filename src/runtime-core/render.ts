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
        while (i <= e2) {
          patch(null, c2[i], container, parentComponent, anchor);
          i++;
        }
      }
    } else if (i > e2) {
      // 4.老的比新的多
      while (i <= e1) {
        hostRemove(c1[i].el);
        i++;
      }
    } else {
      // 中间对比
      // i是中间部分的起始索引
      let s1 = i;
      let s2 = i;

      const toBePatched = e2 - s2 + 1; // 新array children中需要被patch的个数
      let patched = 0; // patch完一次，+1

      // 建立新children array中，中间不同元素的key和索引值的映射关系
      const keyToNewIndexMap = new Map();

      // 建立索引顺序映射
      const newIndexToOldIndexMap = new Array(toBePatched);
      let moved = false;
      let maxNewIndexSoFar = 0;

      for (let i = 0; i < toBePatched; i++) {
        newIndexToOldIndexMap[i] = 0;
      }

      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i];
        keyToNewIndexMap.set(nextChild.key, i);
      }

      // 遍历c1中间部分
      for (let i = s1; i <= e1; i++) {
        const prevChild = c1[i];
        let newIndex;

        if (patched >= toBePatched) {
          hostRemove(prevChild.el);
          continue;
        }

        // null || undefined
        if (prevChild.key !== null) {
          newIndex = keyToNewIndexMap.get(prevChild.key);
        } else {
          // 没有key只能循环遍历新children array查找有没有旧children array的元素
          for (let j = s2; j <= e2; j++) {
            if (isSomeVNodeType(prevChild, c2[j])) {
              newIndex = j;
              break;
            }
          }
        }
        // newIndex不存在，说明在新array children中没找到，需要删除
        if (newIndex === undefined) {
          hostRemove(prevChild.el);
        } else {
          // 判断是否需要移动
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex;
          } else {
            moved = true;
          }
          // 在c2中找到了，和c1中想同key的元素
          // newIndex是c1中的相同元素在c2中的索引，newIndex-s2将中间部分从0开始计数
          // i + 1值为，在c1中的索引，由于初始值0代表没有的元素，要区分开
          // 比如: c1中 c d e z，c2中 d c y e
          // 【1+1 0+1 0 2+1】
          newIndexToOldIndexMap[newIndex - s2] = i + 1;
          // newIndex存在，继续patch深度对比修改（children）
          patch(prevChild, c2[newIndex], container, parentComponent, null);
          patched++;
        }
      }
      // 【1+1 0+1 0 2+1】=> [1 3]这里1 3是最长递增子序列的索引
      const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : [];

      // 从后向前遍历，插入时不会报错
      let j = increasingNewIndexSequence.length - 1;
      for (let i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = i + s2;
        const nextChild = c2[nextIndex];
        const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null;

        // 老的不存在，新的存在，需要重新创建
        if (newIndexToOldIndexMap[i] === 0) {
          patch(null, nextChild, container, parentComponent, anchor)
        }

        if (moved) {
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            hostInsert(nextChild.el, container, anchor);
          } else {
            j--;
          }
        }
      }
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

// 记录完下标后
// newIndexToOldIndexMap = [4, 3, 0, 5]

// 这也就对应了
// [D, C, Y, E]
// [4, 3, 0, 5]
// Y为0，代表新增
// 其他分别代表在旧的vnode中的下标位置
function getSequence(arr) {
  const p = arr.slice();
  const result = [0];
  let i, j, u, v, c;
  const len = arr.length;
  for (i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      j = result[result.length - 1];
      if (arr[j] < arrI) {
        p[i] = j;
        result.push(i);
        continue;
      }
      u = 0;
      v = result.length - 1;
      while (u < v) {
        c = (u + v) >> 1;
        if (arr[result[c]] < arrI) {
          u = c + 1;
        } else {
          v = c;
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1];
        }
        result[u] = i;
      }
    }
  }
  u = result.length;
  v = result[u - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }
  return result;
}
