import { generate } from "./codegen";
import { baseParse } from "./parse";
import { transformExpression } from "./transforms/transformExpression";
import { transformText } from "./transforms/transformText";
import { transformElement } from "./transforms/transfromElement";
import { transform } from "./transfrom";


export function baseCompile(template) {
  const ast: any = baseParse(template)
  transform(ast, {
    nodeTransforms: [transformExpression, transformElement, transformText]
  })

  return generate(ast)
}