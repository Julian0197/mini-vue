import { h, reactive, ref } from "../../lib/mini-vue.esm.js";
import ArrayToArray from "./ArrayToArray.js";
import ArrayToText from "./ArrayToText.js";
import TextToArray from "./TextToArray.js";
import TextToText from "./TextToText.js";

export const App = {
  name: "App",
  setup() {},
  render() {
    return h("div", {tId: 1}, [
      h("p", {}, "主页"),
      // h(ArrayToText),
      // h(TextToText),
      // h(TextToArray),
      h(ArrayToArray),
    ])
  }
};
