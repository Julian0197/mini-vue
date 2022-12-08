import { h, provide, inject } from "../../lib/mini-vue.esm.js";

const Father = {
  name: "Father",
  setup() {
    provide("foo", "fooVal-father");
    provide("bar", "barVal-father");
  },
  render() {
    return h("div", {}, [h("p", {}, "Father"), h(Son)]);
  },
};

const Son = {
  name: "Son",
  setup() {
    provide("foo", "fooVal-son");
    const foo = inject("foo");
    return {
      foo,
    };
  },
  render() {
    return h("div", {}, [
      h("p", {}, `Son获取Farher: -${this.foo}`),
      h(GrandSon),
    ]);
  },
};

const GrandSon = {
  name: "GrandSon",
  setup() {
    const foo = inject("foo");
    const bar = inject("bar");
    const baz = inject("baz", "defaultBaz");
    const ff = inject("ff", () => "ffDefault");

    return {
      foo,
      bar,
      baz,
      ff,
    };
  },
  render() {
    return h(
      "div",
      {},
      `GrandSon获取Father: -${this.foo} - ${this.bar} - ${this.baz} - ${this.ff}`
    );
  },
};

export default {
  name: "App",
  setup() {},
  render() {
    return h("div", {}, [h("p", {}, [h("p", {}, "apiInject"), h(Father)])]);
  },
};
