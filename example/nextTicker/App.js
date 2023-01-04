import { h, ref, getCurrentInstance, nextTick } from "../../lib/mini-vue.esm.js";

export default {
  name: "App",
  setup() {
    const count = ref(1);
  
    function onClick() {
      for (let i = 0; i < 10; i++) {
        count.value = i;
      }

      nextTick(() => {
        const instance = getCurrentInstance()
        console.log(instance);
      })
    }

    return {
      onClick,
      count,
    };
  },
  render() {
    const button = h("button", { onClick: this.onClick }, "update");
    const p = h("p", {}, "count: " + this.count);
    return h("div", {}, [button, p]);
  },
};
