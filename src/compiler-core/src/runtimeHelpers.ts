export const TO_DISPLAY_STRING = Symbol("toDisplayString");

// 模板字符串处理symbol有问题，要将symbol转化为字符串
export const helperMapName = {
  [TO_DISPLAY_STRING]: "toDisplayString"
}