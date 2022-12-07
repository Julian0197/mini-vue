import { h } from '../../lib/mini-vue.esm.js'
import { Foo } from './Foo.js';

window.self = null;
export const App = {
  render() {
    window.self = this
    return h("div", 
    {
      id: "root",
      class: ["red", "hard"],
      onClick() {
        console.log("click")
      },
      onMousedown() {
        console.log("mousedown")
      }
    },
      // "hi, mini-vue"  // children是简单的string类型
      // [h("p", {class: "red"}, "hi"), h("p", {class: "blue"}, "mini-vue")]
      // 在render中使用setup的数据 this指向setup返回的对象
      [
        h("div", {}, "Hi, " + this.msg),
        h(Foo, {
          count: 7,
        }),
      ]
    )
  },

  setup() {
    // composition api

    return {
      msg: 'mini-vue'
    }
  }
}