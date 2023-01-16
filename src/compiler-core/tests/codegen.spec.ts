import { generate } from "../src/codegen";
import { baseParse } from "../src/parse";
import { transform } from "../src/transfrom";

describe("codegen", () => {
  it("string", () => {
    const ast = baseParse("hi");
    
    transform(ast)
    const { code } = generate(ast);

    // 快照测试
    // 给当前code拍照片，后续进行对比
    // 1.抓bug
    // 2.有意更新，需要更新快照
    expect(code).toMatchSnapshot();
  });
});
