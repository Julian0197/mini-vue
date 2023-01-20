// mini-vue出口
export * from "./runtime-dom"; // rimtime-core更底层

import { baseCompile } from "./compiler-core/src";
import * as runtimeDom from "./runtime-dom";
import { registerRuntimeCompiler } from "./runtime-dom";

function compileToFunction(template) {
  const { code } = baseCompile(template);
  const render = new Function("Vue", code)(runtimeDom);
  return render;
}

registerRuntimeCompiler(compileToFunction);
