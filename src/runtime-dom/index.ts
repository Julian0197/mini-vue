import { createRenderer } from "../runtime-core";

function createElement(type) {
  return document.createElement(type);
}

function patchProp(el, key, prevVal, nextVal) {
  // 确认规范 on + Event name，使用正则表达式
  const isOn = (key: string) => /^on[A-Z]/.test(key);
  if (isOn(key)) {
    // 'onClick'第二位之后的是event name
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, nextVal);
  } else {
    // 删除元素
    if (nextVal === undefined || nextVal === null) {
      el.removeAttribute(key)
    } else {
      // 赋值元素
      el.setAttribute(key, nextVal);
    } 
  }
}

function insert(el, parent) {
  parent.append(el);
}

const renderer: any = createRenderer({
  createElement,
  patchProp,
  insert,
});

export function createApp(...args) {
  return renderer.createApp(...args);
}

export * from "../runtime-core";
