import { NodeTypes } from "../ast";
import { isText } from "../utils";

export function transformText(node) {
  if (node.type === NodeTypes.ELEMENT) {
    return () => {
      const { children } = node;
      let currentContainer;

      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isText(child)) {
          for (let j = i + 1; j < children.length; j++) {
            const next = children[j];
            if (isText(next)) {
              // 如果是第一次创建，初始化
              if (!currentContainer) {
                currentContainer = children[i] = {
                  type: NodeTypes.COMPOUND_EXPRESSION,
                  children: [child],
                };
              }

              currentContainer.children.push(" + ");
              currentContainer.children.push(next);
              // 拼接完删除已处理中的字符串
              children.splice(j, 1);
              j--;
            } else {
              // 当前不是文本或插值，是element，就将currentContainer清空
              currentContainer = undefined;
              // 退出内层循环，i++，继续往后遍历看是否有节点要转化为COMPOUND_EXPRESSION
              break;
            }
          }
        }
      }
    };
  }
}


