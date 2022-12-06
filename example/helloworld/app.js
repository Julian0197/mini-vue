import { h } from '../../lib/mini-vue.esm.js'
 
window.self = null;
export const App = {
  render() {
    window.self = this
    return h("div", {
      id: "root",
      class: ["red", "hard"],
    },
      // "hi, mini-vue"  // children是简单的string类型
      // [h("p", {class: "red"}, "hi"), h("p", {class: "blue"}, "mini-vue")]
      // 在render中使用setup的数据
      "Hi, " + this.msg
    )
  },

  setup() {
    // composition api

    return {
      msg: 'mini-vue'
    }
  }
}