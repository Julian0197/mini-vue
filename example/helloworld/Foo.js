import { h } from "../../lib/mini-vue.esm.js";

export const Foo = {
  setup(props) {
    // props.count
    console.log(props);

    // props不可被修改 readonly
    props.count += 2;
    console.log(props);
  },
  render() {
    return h("div", {}, "foo: " + this.count);
  },
};
