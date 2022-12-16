import { ref, h } from "../../lib/mini-vue.esm.js";
const prevChildren = "oldTextChildren";
const nextChildren = "newTextChildren"


export default {
  name: "TextToText",
  setup() {
    const isChange = ref(false);
    window.isChange = isChange;

    return {
      isChange
    }
  },
  render() {
    const self = this; 

    return self.isChange === true
      ? h("div", {}, nextChildren)
      : h("div", {}, prevChildren)
  }
}