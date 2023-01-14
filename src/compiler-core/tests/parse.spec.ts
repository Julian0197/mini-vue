import { NodeTypes } from "../src/ast";
import { baseParse } from "../src/parse";

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
  // element标签
  describe("element", () => {
    it("simple element div", () => {
      const ast = baseParse("<div></div>");
      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: "div",
        children: []
      });
    });
  });
  // text标签
  describe("text", () => {
    it("simple text", () => {
      const ast = baseParse("simple text")

      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.TEXT,
        content: "simple text"
      })
    })
  })
  // 三种类型综合
  test("multi", () => {
    const ast = baseParse("<p>hi,{{ message }}</p>")

    expect(ast.children[0]).toStrictEqual({
      type: NodeTypes.ELEMENT,
      tag: "p",
      children: [
        {
          type: NodeTypes.TEXT,
          content: "hi,"
        },
        {
          type: NodeTypes.INTERPOLATION,
          content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: "message",
          }
        }
      ]
    })
  })

  test("Nested element", () => {
    const ast = baseParse("<div><p>hi</p>{{ message }}</div>")

    expect(ast.children[0]).toStrictEqual({
      type: NodeTypes.ELEMENT,
      tag: "div",
      children: [
        {
          type: NodeTypes.ELEMENT,
          tag: "p",
          children: [
            {
              type: NodeTypes.TEXT,
              content: "hi"
            }
          ]
        },
        {
          type: NodeTypes.INTERPOLATION,
          content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: "message",
          }
        }
      ]
    })
  })

  test("should throw error when lack end tag", () => {
    expect(() => {
      baseParse("<div><span></div>")
    }).toThrow("缺少结束标签: span")
  })
});
