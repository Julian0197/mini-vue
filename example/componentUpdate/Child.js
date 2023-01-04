import { h } from "../../lib/mini-vue.esm.js";

export default {
  name: "Child",
  setup(props, { emit }) {

  },
  render(proxy) {
    // this.$props获取传入的props数据
    return h("div", {}, [h("div", {}, "child-props-msg: " + this.$props.msg)])
  }
};
