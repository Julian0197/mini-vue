export function generate(ast) {
  const context = createCodegenContext()
  const {push} = context

  push("return ")
  const functionName = "render"
  const args = ["_ctx", "_cache"]
  const signature = args.join(", ") // "_ctx, _cache"
  push(`function ${functionName}(${signature}) {`)
  push(`return `)

  // 这一步逻辑封装在transform中的createRootCodegen
  // const node = ast.children[0] 
  getNode(ast.codegenNode, context)
  

  push("}")
  // return {
  //   code: `
  //   return function render(_ctx, _cache, $props, $setup, $data, $options) {
  //     return "hi,"
  //   }`,
  // };

  return {
    code: context.code
  }
}

function getNode(node, context) {
  const {push} = context
  push(`${node.content}`)
}

function createCodegenContext(): any {
  const context = {
    code: "",
    push(source) {
      context.code += source
    }
  }
  return context
}
