import { mutableHandlers, readonlyHandlers } from "./baseHandlers";

export function reactive(raw) {
  return createActiveObject(raw, mutableHandlers);
}

export function readonly(raw) {
  return createActiveObject(raw, readonlyHandlers);
}

// 再封装一下
function createActiveObject(raw: any, baseHandlers) {
  return new Proxy(raw, baseHandlers);
}
