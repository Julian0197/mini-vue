import { h } from "../../lib/mini-vue.esm.js";
import { Foo } from "./Foo.js";

export const App = {
  name: "App",
  render() {
    // emit
    return h("div", {}, [
      h("div", {}, "App"),
      h(Foo, {
        // on + Event
        onAdd(a, b) {
          console.log("onAdd",a, b);
        },
        // add-foo => addFoo
        onAddFoo(a, b) {
          console.log("onAddFoo", a, b);
        }
      }),
    ]);
  },

  setup() {
    return {};
  },
};
