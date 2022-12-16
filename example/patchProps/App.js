import { h, reactive, ref } from "../../lib/mini-vue.esm.js";

export const App = {
  setup() {
    let props = ref({
      foo: "foo",
      bar: "bar",
    });

    const changeProps1 = () => {
      props.value.foo = "new-foo";
    };
    const changeProps2 = () => {
      props.value.foo = undefined;
    };
    const changeProps3 = () => {
      props.value = {}
    };
    return {
      props,
      changeProps1,
      changeProps2,
      changeProps3,
    };
  },
  render() {
    return h("div", { id: "root", ...this.props }, [
      h("button", { onClick: this.changeProps1 }, "修改props中foo属性值"),
      h("button", { onClick: this.changeProps2 }, "修改props中foo属性值变为undefined"),
      h("button", { onClick: this.changeProps3 }, "删除props中的bar属性"),
    ]);
  },
};
