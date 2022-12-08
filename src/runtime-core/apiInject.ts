import { getCurrentInstance } from "./component";

export function provide(key, value) {
  // 父组件存储数据
  const currentInstance: any = getCurrentInstance(); // 只有在setup内部使用

  if (currentInstance) {
    // ES6对象结构，创建一个新变量provides，浅拷贝对象的属性
    let { provides } = currentInstance;
    // 拿到父亲的provides
    const parentProvides = currentInstance.parent.provides;
    // 初始化状态：说明当前provides还没有赋值
    if (provides === parentProvides) {
      // 当前组件provides变成了一个空对象，且原型指向parentProvides
      provides = currentInstance.provides = Object.create(parentProvides);
    }
    provides[key] = value;
  }
}

export function inject(key, defaultValue) {
  // 子孙组件获取数据
  const currentInstance: any = getCurrentInstance();

  // 这个if判断当前是在setup中
  if (currentInstance) {
    const parentProvides = currentInstance.parent.provides;

    if (key in parentProvides) {
      return parentProvides[key];
    } else if (defaultValue) {
      if (typeof defaultValue === 'function') {
        return defaultValue()
      } else {
        return defaultValue
      }
    }  
  }
}
