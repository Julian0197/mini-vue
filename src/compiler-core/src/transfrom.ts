import { NodeTypes } from "./ast";


export function transform(root, options = {}) {
  const context = createTransformContext(root, options)
  // 遍历 => 深度优先遍历
  traverseNode(root, context)
  
  createRootCodegen(root)
}

function createTransformContext(root: any, options: any) {
  const context = {
    root,
    nodeTransforms: options.nodeTransforms || [], 
  }
  return context
}

function traverseNode(node: any, context: any) {
  const nodeTransforms = context.nodeTransforms
  for (let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i]
    transform(node)
  }

  traverseChildren(node, context)
}


function traverseChildren(node, context) {
  const children = node.children
  if (children) {
    for (let i = 0; i < children.length; i++) {
      const node = children[i]
      traverseNode(node, context)
    }
  }
}

function createRootCodegen(root: any) {
  root.codegenNode = root.children[0]
}
