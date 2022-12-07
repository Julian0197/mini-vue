import { h } from "../../lib/mini-vue.esm.js";
import { Foo } from "./Foo.js";

export const App = {
  name: "App",
  render() {
    const app = h("div", {}, "App");
    // 在渲染foo时，如果发现children是对象，说明需要渲染插槽slots
    // 将children的内容挂载到当前component实例(Foo)的slots属性中
    const foo = h(
      Foo,
      {},
      {
        header: ({age}) => h("p", {}, "header" + age),
        footer: () => h("p", {}, "footer"),
      }
    );

    return h("div", {}, [app, foo]);
  },

  setup() {
    return {};
  },
};
