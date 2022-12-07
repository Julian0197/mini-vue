import { mutableHandlers, readonlyHandlers, shallowReadonlyHandlers } from "./baseHandlers";
import { isObject } from "./shared";

// 抽离is_reactive变量
export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
}

export function reactive(raw) {
  return createReactiveObject(raw, mutableHandlers);
}

export function isReactive(value) {
  // 先触发get，根据get中的isReadonly变量判断是否是reactive对象
  // !!转化为布尔值，如果没有触发getter，返回undefined
  return !!value[ReactiveFlags.IS_REACTIVE];
}

export function isReadonly(value) {
  return !!value[ReactiveFlags.IS_READONLY]
}

export function readonly(raw) {
  return createReactiveObject(raw, readonlyHandlers);
}

export function shallowReadonly(raw) {
  return createReactiveObject(raw, shallowReadonlyHandlers)
}

export function isProxy(value) {
  return isReactive(value) || isReadonly(value)
}

// 再封装一下
function createReactiveObject(target: any, baseHandlers) {
  // 判断传入的target是不是对象
  if (!isObject(target)) {
    console.warn(`target ${target} 必须是一个对象`)
    return target
  }

  return new Proxy(target, baseHandlers);
}

