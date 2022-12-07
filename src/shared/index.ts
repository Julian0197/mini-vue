export const extend = Object.assign;

export const isObject = (val) => {
  return val !== null && typeof val === 'object'
}

export const hasChanged = (val, newVal) => {
  return Object.is(val, newVal)
}

// hasOwn判断当前key在不在obj上
export const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key)