import { ref, h } from "../../lib/mini-vue.esm.js";

// 1.左侧的对比
// (a b) c
// (a b) d e
// const prevChildren = [
//   h("p", { key: "A" }, "A"),
//   h("p", { key: "B" }, "B"),
//   h("p", { key: "C" }, "C"),
// ];

// const nextChildren = [
//   h("p", { key: "A" }, "A"),
//   h("p", { key: "B" }, "B"),
//   h("p", { key: "D" }, "D"),
//   h("p", { key: "E" }, "E"),
// ];

// 2.右侧的对比
// a (b c)
// d e (b c)
// const prevChildren = [
//   h("p", { key: "A" }, "A"),
//   h("p", { key: "B" }, "B"),
//   h("p", { key: "C" }, "C"),
// ];

// const nextChildren = [
//   h("p", { key: "D" }, "D"),
//   h("p", { key: "E" }, "E"),
//   h("p", { key: "B" }, "B"),
//   h("p", { key: "C" }, "C"),
// ];

// 3.新的比老的长
// 需要创建新的
// 3.1左侧
// (a b)
// (a b) c
// const prevChildren = [
//   h("p", { key: "A" }, "A"),
//   h("p", { key: "B" }, "B"),
// ];

// const nextChildren = [
//   h("p", { key: "A" }, "A"),
//   h("p", { key: "B" }, "B"),
//   h("p", { key: "C" }, "C"),
//   h("p", { key: "D" }, "D"),
// ];

// 3.2右侧
// (a b)
// c (a b)
// const prevChildren = [
//   h("p", { key: "A" }, "A"),
//   h("p", { key: "B" }, "B"),
// ];

// const nextChildren = [
//   h("p", { key: "D" }, "D"),
//   h("p", { key: "C" }, "C"),
//   h("p", { key: "A" }, "A"),
//   h("p", { key: "B" }, "B"),
// ];

// 4.老的比新的长
// 删除老的
// 4.1左侧
// (a b) c
// (a b)
// const prevChildren = [
//   h("p", { key: "A" }, "A"),
//   h("p", { key: "B" }, "B"),
//   h("p", { key: "C" }, "C"),
// ];

// const nextChildren = [
//   h("p", { key: "A" }, "A"),
//   h("p", { key: "B" }, "B"),
// ];

// 4.2右侧
// a (b c)
// (b c)
// const prevChildren = [
//   h("p", { key: "A" }, "A"),
//   h("p", { key: "A" }, "A"),
//   h("p", { key: "B" }, "B"),
//   h("p", { key: "C" }, "C"),
// ];

// const nextChildren = [
//   h("p", { key: "B" }, "B"),
//   h("p", { key: "C" }, "C"),
// ];

// 5.对比中间的部分
// 删除老的，在老的中存在，在新的中不存在
// 5.1
// a b (c d) f g
// a b (e c) f g
// d节点在新的中没有，需要删除
// c节点的props发生变化
// const prevChildren = [
//   h("p", { key: "A" }, "A"),
//   h("p", { key: "B" }, "B"),
//   h("p", { key: "C", id: "c-prev" }, "C"),
//   h("p", { key: "D" }, "D"),
//   h("p", { key: "F" }, "F"),
//   h("p", { key: "G" }, "G"),
// ];

// const nextChildren = [
//   h("p", { key: "A" }, "A"),
//   h("p", { key: "B" }, "B"),
//   h("p", { key: "E" }, "E"),
//   h("p", { key: "C", id: "c-next" }, "C"),
//   h("p", { key: "F" }, "F"),
//   h("p", { key: "G" }, "G"),
// ];

// 5.1.1
// 中间部分老的比新的多
// （优化5.1）当中间部分新的节点都被遍历过后，老的多出来的节点可以直接删除
// a b (c e d) f g
// a b (e c) f g
// const prevChildren = [
//   h("p", { key: "A" }, "A"),
//   h("p", { key: "B" }, "B"),
//   h("p", { key: "C", id: "c-prev" }, "C"),
//   h("p", { key: "E" }, "E"),
//   h("p", { key: "D" }, "D"),
//   h("p", { key: "F" }, "F"),
//   h("p", { key: "G" }, "G"),
// ];

// const nextChildren = [
//   h("p", { key: "A" }, "A"),
//   h("p", { key: "B" }, "B"),
//   h("p", { key: "E" }, "E"),
//   h("p", { key: "C", id: "c-next" }, "C"),
//   h("p", { key: "F" }, "F"),
//   h("p", { key: "G" }, "G"),
// ];

// 5.2 优化处理已存在节点的顺序
// a b (c d e z) f g
// a b (d c y e) f g
// c1和c2中 ce的顺序一致
const prevChildren = [
  h("p", { key: "A" }, "A"),
  h("p", { key: "B" }, "B"),

  h("p", { key: "C", id: "prev-id"}, "C"),
  h("p", { key: "D" }, "D"),
  h("p", { key: "E" }, "E"),
  h("p", { key: "Z" }, "Z"),

  h("p", { key: "F" }, "F"),
  h("p", { key: "G" }, "G"),
];
const nextChildren = [
  h("p", { key: "A" }, "A"),
  h("p", { key: "B" }, "B"),

  h("p", { key: "D" }, "D"),
  h("p", { key: "C", id: "next-id"}, "C"),
  h("p", { key: "Y" }, "Y"),
  h("p", { key: "E" }, "E"),

  h("p", { key: "F" }, "F"),
  h("p", { key: "G" }, "G"),
];

export default {
  name: "ArrayToArray",
  setup() {
    const isChange = ref(false);
    window.isChange = isChange;

    return {
      isChange,
    };
  },
  render() {
    const self = this;

    return self.isChange === true
      ? h("div", {}, nextChildren)
      : h("div", {}, prevChildren);
  },
};
