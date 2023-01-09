import { NodeTypes } from "../src/ast";
import { baseParse } from "../src/parse"

describe("Parse", () => {
  // 插值功能
  describe("interpolation", () => {
    test("simple interpolation", () => {
      const ast = baseParse("{{ message }}");
      // ast是整棵树的root
      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.INTERPOLATION,
        content: {
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: "message",
        },
      });
    });
  });
});
