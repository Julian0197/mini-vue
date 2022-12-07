import { hasOwn } from "../shared";

// 利用map对象保存$el,$data等属性
const publicPropertiesMap = {
  // 写成函数形式
  $el: (i) => i.vnode.el,
  $slots: (i) => i.slots
}


export const PublicInstanceProxyHandlers = {
  get({_: instance}, key) {
    // setupState
    const { setupState, props } = instance;
    
    // hasOwn判断当前key在不在setupState或者props上
    if (hasOwn(setupState, key)) {
      return setupState[key]
    } else if (hasOwn(props, key)) {
      return props[key]
    }

    const publicGetter = publicPropertiesMap[key]
    if (publicGetter) {
      return publicGetter(instance)
    }
  }
}

