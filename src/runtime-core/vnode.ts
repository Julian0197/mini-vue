

export function createVNode(type, props?, children?) { // ?表示可选参数
  const vnode = {
    type,
    props,
    children,
    el: null,
  };

  return vnode
}

