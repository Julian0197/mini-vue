import { NodeTypes } from "../ast";

export function transformExpression(node: any) {
  if (node.type === NodeTypes.INTERPOLATION) {
    return () => {
      node.content = processExpression(node.content);
    };
  }
}

// 模板字符串处理symbol有问题，要将symbol转化为字符串
function processExpression(node: any) {
  node.content = `_ctx.${node.content}`;
  return node;
}
