import { h, ref } from "../../lib/mini-vue.esm.js";
import Child from "./Child.js";

export const App = {
  name: "App",
  setup() {
    const msg = ref("123");
    const count = ref(1);

    window.msg = msg;
    const changeChildProps = () => {
      msg.value = "456";
    };

    const changeCount = () => {
      count.value++;
    };

    return {
      msg,
      count,
      changeChildProps,
      changeCount,
    };
  },
  render() {
    return h("div", {}, [
      h(
        "button",
        {
          onClick: this.changeChildProps,
        },
        "change child props"
      ),
      // 子组件，设置props
      h(Child, {
        msg: this.msg,
      }),
      h(
        "button",
        {
          onClick: this.changeCount,
        },
        "change self count"
      ),
      h("p", {}, "count: " + this.count),
    ]);
  },
};
