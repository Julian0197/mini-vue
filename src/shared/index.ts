export * from "./toDisplayString"

export const extend = Object.assign;

export const isObject = (val) => {
  return val !== null && typeof val === "object";
};

export const isString = (val) => typeof val === "string"

export const hasChanged = (val, newVal) => {
  return Object.is(val, newVal);
};

// hasOwn判断当前key在不在obj上
export const hasOwn = (obj, key) =>
  Object.prototype.hasOwnProperty.call(obj, key);

// 首字母大写 add => Add
export const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// 转化为驼峰命名格式 add-foo => addFoo
export const camelize = (str: string) => {
  // _是"-foo"，c是"foo"，就是把-foo替换为Foo
  return str.replace(/-(\w)/g, (_, c: string) => {
    return c ? c.toUpperCase() : "";
  });
};

export const toHandlerKey = (str: string) => {
  return str ? "on" + capitalize(str) : "";
};
