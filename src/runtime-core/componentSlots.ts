import { ShapeFlags } from "../shared/ShapeFlags";

export function initSlots(instance, children) {
  const { vnode } = instance;
  // 判断是否有slots权限
  if (vnode.shapeFlag & ShapeFlags.SLOT_CHILDREN) {
    normalizeObjectSlots(children, instance.slots);
  }
}

function normalizeObjectSlots(children: any, slots: any) {
  for (const key in children) {
    const value = children[key];
    // 使用函数包裹，因为要为slots传递参数
    // createVNode中的第三个参数children需要包裹成数组的形式
    slots[key] = (props) => normalizeSlotValue(value(props));
  }
}

function normalizeSlotValue(value) {
  // 将执行结果包裹为数组
  return Array.isArray(value) ? value : [value];
}
