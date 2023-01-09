import { NodeTypes } from "./ast";

export function baseParse(content: string) {
  const context = createParserContext(content);
  return createRoot(parseChildren(context));
}

function createParserContext(content: string): any {
  return {
    source: content,
  };
}

function createRoot(children: any) {
  return {
    children,
  };
}

function parseChildren(context: any) {
  // 收集到nodes中
  const nodes: any = [];

  let node: any;
  // 判断是否为{{开头的字符串，是的话说明是插值类型
  if (context.source.startsWith("{{")) {
    node = parseInterpolation(context);
  } else if (context.source[0] === "<") {
    if (/[a-z]/i.test(context.source[1])) {
      node = parseElement(context);
    }
  }

  // 收集
  nodes.push(node);
  return nodes;
}

function parseInterpolation(context: any) {
  // 从传入的content：{{ message }} 中拿到message
  const openDelimiter = "{{";
  const closeDelimiter = "}}";

  // 查找到结束括号的位置
  // closeIndex = 11
  const closeIndex = context.source.indexOf(
    closeDelimiter,
    openDelimiter.length
  );
  // 截取字符串 message }}
  advanceBy(context, openDelimiter.length);

  // 获取除{{和}}外的总长度
  // rawContentLength = 9
  const rawContentLength = closeIndex - openDelimiter.length;
  // rawContent = 空格message空格
  const rawContent = context.source.slice(0, rawContentLength);
  // content = message
  // 清除空格
  const content = rawContent.trim();
  // 截取（也可以理解为删除，删除已经处理过的字符串）
  advanceBy(context, rawContentLength + closeDelimiter.length);

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: content,
    },
  };
}

const enum TagType {
  START,
  END
}

function parseElement(context: any) {
  // 处理开始标签<div>
  const element = parseTag(context, TagType.START);
  // 处理结束标签</div>
  parseTag(context, TagType.END)
  return element
}

function parseTag(context: any, type: TagType) {
  // 1.解析tag
  // <div
  const match: any = /^<\/?([a-z]*)/i.exec(context.source); // ["<div", "div", ...]
  const tag = match[1];
  // 2.删除处理后的element
  advanceBy(context, match[0].length);
  advanceBy(context, 1);
  // console.log(context.source);
  
  if (type === TagType.END) return
  
  return {
    type: NodeTypes.ELEMENT,
    tag: tag,
  };
}

function advanceBy(context: any, length: number) {
  // 从length开始向后截取全部
  context.source = context.source.slice(length);
}
