import { NodeTypes } from "./ast";

export function baseParse(content: string) {
  const context = createParserContext(content);
  return createRoot(parseChildren(context, []));
}

function createParserContext(content: string): any {
  return {
    source: content,
  };
}

function createRoot(children: any) {
  return {
    type: NodeTypes.ROOT,
    children
  };
}

function parseChildren(context: any, ancestors) {
  // 收集到nodes中
  const nodes: any = [];

  while (!isEnd(context, ancestors)) {
    let node: any;
    const s = context.source
    // 判断是否为{{开头的字符串，是的话说明是插值类型
    if (s.startsWith("{{")) {
      node = parseInterpolation(context);
    } else if (s[0] === "<") {
      if (/[a-z]/i.test(s[1])) {
        node = parseElement(context, ancestors);
      }
    }

    if (!node) {
      node = parseText(context);
    }

    // 收集
    nodes.push(node);
  }
  return nodes;
}

function isEnd(context: any, ancestors) {
  const s = context.source;
  // 2.遇到结束标签
  if (s.startsWith("</")) {
    for (let i = 0; i < ancestors.length; i++) {
      const tag = ancestors[i].tag
      if (startsWithEndTagOpen(s, tag)) {
        return true
      }
    }
  }
  // // 2.遇到结束标签
  // if (parentTag && s.startsWith(`</${parentTag}>`)) {
  //   return true;
  // }
  // 1.source有值
  return !s;
}

function parseText(context: any) {
  let endIndex = context.source.length;
  let endToken = ["<", "{{"];
  for (let i = 0; i < endToken.length; i++) {
    const index = context.source.indexOf(endToken[i]);
    if (index !== -1 && endIndex > index) {
      endIndex = index;
    }
  }

  const content = parseTextData(context, endIndex);

  return {
    type: NodeTypes.TEXT,
    content,
  };
}

function parseTextData(context: any, length) {
  // 1.获取content
  const content = context.source.slice(0, length);
  // 2.推进
  advanceBy(context, length);
  return content;
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
  // const rawContent = context.source.slice(0, rawContentLength);
  const rawContent = parseTextData(context, rawContentLength);

  // content = message
  // 清除空格
  const content = rawContent.trim();

  // 截取（也可以理解为删除，删除已经处理过的字符串）
  // 只需要删除闭合标签的长度
  advanceBy(context, closeDelimiter.length);

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
    },
  };
}

const enum TagType {
  START,
  END,
}

function parseElement(context: any, ancestors) {
  // 处理开始标签<div>
  const element: any = parseTag(context, TagType.START);
  ancestors.push(element)
  // 处理children
  element.children = parseChildren(context, ancestors);
  ancestors.pop()
  // 处理结束标签</div>
  // 判断当前elment的结束标签是否和context.source中的能对应上
  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.END);
  } else {
    throw new Error(`缺少结束标签: ${element.tag}`)
  }
  
  return element;
}

function startsWithEndTagOpen(source, tag) {
  return source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase()
}

function parseTag(context: any, type: TagType) {
  // 1.解析tag
  // <div
  // match:  ["<div", "div", ...]
  const match: any = /^<\/?([a-z]*)/i.exec(context.source); 
  const tag: any = match[1];
  
  // 2.删除处理后的element
  advanceBy(context, match[0].length);
  advanceBy(context, 1);
  // console.log(context.source);

  if (type === TagType.END) return;

  return {
    type: NodeTypes.ELEMENT,
    tag,
  };
}

function advanceBy(context: any, length: number) {
  // 从length开始向后截取全部
  context.source = context.source.slice(length);
}
