import { isTracking, trackEffects, trigger, triggerEffects } from "./effect";
import { reactive } from "./reactive";
import { hasChanged, isObject } from "./shared";

class RefImpl {
  private _value: any;
  // 和reactive不同的是，只有一个数据，只需要一个仓库存放依赖
  public dep;
  private _rawValue: any;
  public __v_isRef = true;
  constructor(value) {
    this._rawValue = value;
    // 看看value是不是对象，是的话需要reactive包裹
    this._value = convert(value);

    this.dep = new Set();
  }
  get value() {
    // 如果没有触发effect()，activeEffect为undefined
    trackRefValue(this);

    return this._value;
  }

  set value(newValue) {
    // 判断newValue是否和旧的value不一样
    // 这里对比新旧值，是两个object对比，有可能一个是proxy
    if (!hasChanged(this._rawValue, newValue)) {
      this._rawValue = newValue;
      this._value = convert(newValue);
      triggerEffects(this.dep);
    }
  }
}

function convert(value) {
  return isObject(value) ? reactive(value) : value;
}

function trackRefValue(ref) {
  // 如果没有触发effect()，activeEffect为undefined
  if (isTracking()) {
    trackEffects(ref.dep);
  }
}

export function ref(value) {
  return new RefImpl(value);
}

export function isRef(value) {
  return !!value.__v_isRef;
}

export function unRef(ref) {
  // 看看是不是ref，是的话返回ref.value，不是直接返回值
  return isRef(ref) ? ref.value : ref;
}

export function proxyRefs(objectWithRefs) {
  return new Proxy(objectWithRefs, {
    get(target, key) {
      // get => 如果ref就返回它的.value
      // not ref => 直接返回它
      return unRef(Reflect.get(target, key));
    },

    set(target, key, value) {
      if (isRef(target[key]) && !isRef(value)) {
        return target[key].value = value
      } else {
        return Reflect.set(target, key, value)
      }
    }
  });
}
