import { h } from '../../lib/mini-vue.esm.js'
 
export const App = {
  render() {
    return h("div", {
      id: "root",
      class: ["red", "hard"],
    },
      // "hi, mini-vue"  children是简单的string类型
      [h("p", {class: "red"}, "hi"), h("p", {class: "blue"}, "mini-vue")]
    )
  },

  setup() {
    // composition api

    return {
      msg: 'mini-vue'
    }
  }
}