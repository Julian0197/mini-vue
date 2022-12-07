export function initProps(instance, rawProps) {
  // app组件没有父组件传入的props，此时会报错
  instance.props = rawProps || {}

  // TODO attrs
}