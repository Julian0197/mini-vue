import { generate } from "../src/codegen";
import { baseParse } from "../src/parse";
import { transformExpression } from "../src/transforms/transformExpression";
import { transformText } from "../src/transforms/transformText";
import { transformElement } from "../src/transforms/transfromElement";
import { transform } from "../src/transfrom";

describe("codegen", () => {
  it("string", () => {
    const ast = baseParse("hi");

    transform(ast);
    const { code } = generate(ast);

    // 快照测试
    // 给当前code拍照片，后续进行对比
    // 1.抓bug
    // 2.有意更新，需要更新快照
    expect(code).toMatchSnapshot();
  });

  it("interpolation", () => {
    const ast = baseParse("{{message}}");
    transform(ast, {
      nodeTransforms: [transformExpression]
    });
    const { code } = generate(ast);
    expect(code).toMatchSnapshot();
  });

  it("element", () => {
    const ast = baseParse("<div></div>");
    transform(ast, {
      nodeTransforms: [transformElement]
    });
    const { code } = generate(ast);
    expect(code).toMatchSnapshot();
  });

  it("multi", () => {
    const ast: any = baseParse("<div>hi,{{message}}</div>")
    transform(ast, {
      nodeTransforms: [transformExpression, transformElement, transformText]
    });
    
    const { code } = generate(ast);
    expect(code).toMatchSnapshot();
  })
});
