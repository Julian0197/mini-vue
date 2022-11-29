import { mutableHandlers, readonlyHandlers } from "./baseHandlers";

// 抽离is_reactive变量
export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
}

export function reactive(raw) {
  return createActiveObject(raw, mutableHandlers);
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
  return createActiveObject(raw, readonlyHandlers);
}

// 再封装一下
function createActiveObject(raw: any, baseHandlers) {
  return new Proxy(raw, baseHandlers);
}
