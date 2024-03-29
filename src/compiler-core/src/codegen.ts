import { isString } from "../../shared";
import { NodeTypes } from "./ast";
import {
  CREATE_ELEMENT_VNODE,
  helperMapName,
  TO_DISPLAY_STRING,
} from "./runtimeHelpers";

export function generate(ast) {
  const context = createCodegenContext();
  const { push } = context;

  getFunctionPreamble(ast, context);

  const functionName = "render";
  const args = ["_ctx", "_cache"];
  const signature = args.join(", "); // "_ctx, _cache"
  push(`function ${functionName}(${signature}) {`);
  push(`return `);

  // 这一步逻辑封装在transform中的createRootCodegen
  // const node = ast.children[0]
  genNode(ast.codegenNode, context);

  push("}");
  // return {
  //   code: `
  //   return function render(_ctx, _cache, $props, $setup, $data, $options) {
  //     return "hi,"
  //   }`,
  // };

  return {
    code: context.code,
  };
}

// 获取前导码
function getFunctionPreamble(ast: any, context: any) {
  const { push } = context;
  const VueBinging = "Vue";
  const aliasHelper = (s) => `${helperMapName[s]}:_${helperMapName[s]}`;

  if (ast.helpers.length > 0) {
    push(
      `const { ${ast.helpers.map(aliasHelper).join(", ")} } = ${VueBinging}`
    );
  }

  push("\n");
  push("return ");
}

function genNode(node, context) {
  switch (node.type) {
    case NodeTypes.TEXT:
      genText(node, context);
      break;
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context);
      break;
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context);
      break;
    case NodeTypes.ELEMENT:
      genElement(node, context);
      break;
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node, context);
      break;
    default:
      break;
  }
}

function genText(node: any, context: any) {
  const { push } = context;
  push(`"${node.content}"`);
}

function genInterpolation(node: any, context: any) {
  const { push, helper } = context;

  push(`${helper(TO_DISPLAY_STRING)}(`);
  genNode(node.content, context);
  push(")");
}

function genExpression(node: any, context: any) {
  const { push } = context;
  push(`${node.content}`);
}

function genElement(node: any, context: any) {
  const { push, helper } = context;
  const { tag, children, props } = node;
  
  push(`${helper(CREATE_ELEMENT_VNODE)}(`);
  

  // 循环处理children（hi, 和 {{message}}）
  // for (let i = 0; i < children.length; i++) {
  //   const child = children[i];
  //   genNode(child, context);
  // }
  // transformText后，目前children只有一个元素
  genNodeList(genNullable([tag, props, children]), context)
  
  push(")");
}

function genNullable(args: any) {
  return args.map((arg) => arg || "null")
}

function genNodeList(nodes: any, context: any) {
  const {push} = context
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (isString(node)) {
      push(node)
    } else {
      genNode(node, context)
    }
    if (i < nodes.length - 1) {
      push(", ")
    }
  }
}

function genCompoundExpression(node: any, context: any) {
  const { push } = context;
  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (isString(child)) { // +
      push(child);
    } else {
      genNode(child, context)
    }
  }
}

function createCodegenContext(): any {
  const context = {
    code: "",
    push(source) {
      context.code += source;
    },
    helper(key) {
      return `_${helperMapName[key]}`;
    },
  };
  return context;
}
