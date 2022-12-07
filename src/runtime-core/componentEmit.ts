import { camelize, toHandlerKey } from "../shared";


export const emit = (instance, event, ...args) => {  
  const { props } = instance

  // 子组件中调用emit('add')，传入add，实际调用的是onAdd
  // 子组件中调用emit('add-foo')，传入add-foo，实际调用的是onAddFoo
  const handlerName = toHandlerKey(camelize(event))
  const handler = props[handlerName]
  handler && handler(...args);
}