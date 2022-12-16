import { ref, h } from "../../lib/mini-vue.esm.js";
const prevChildren = "oldTextChildren"
const nextChildren = [h("div", {}, "A"), h("div", {}, "B")];


export default {
  name: "TextToArray",
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