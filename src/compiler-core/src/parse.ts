import { NodeTypes } from "./ast";

export function baseParse(content: string) {
  const context = createParserContext(content);
  return createRoot(parseChildren(context));
}

function createParserContext(content: string): any {
  return {
    sorce: content,
  };
}

function createRoot(children) {
  return {
    children,
  };
}

function parseChildren(context) {
  // 收集到nodes中
  const nodes: any = [];

  let node: any
  // 判断是否为{{开头的字符串，是的话说明是插值类型
  if (context.sorce.startsWith("{{")) {
    node = parseInterpolation(context);
  }

  // 收集
  nodes.push(node);
  return nodes;
}

function parseInterpolation(context) {
  // 从传入的content：{{message}} 中拿到message
  const openDelimiter = "{{"
  const closeDelimiter = "}}"
  const closeIndedx = context.sorce.indexOf(closeDelimiter, openDelimiter.length);
  const rawContent = context.sorce.slice(openDelimiter.length, closeIndedx);
  const content = rawContent.trim()
  context.sorce = context.sorce.slice(closeIndedx + closeDelimiter.length)
  console.log(context.sorce);
  console.log(content);

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: content,
    }
  }
}
