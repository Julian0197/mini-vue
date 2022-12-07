export const enum ShapeFlags {
  ELEMENT = 1, // 0001
  STATEFUL_COMPONENT = 1 << 1, // 二进制左移一位，0010
  TEXT_CHILDREN = 1 << 2, // 0100
  ARRAY_CHILDREN = 1 << 3, // 1000
  SLOT_CHILDREN = 1 << 4
}

// 位运算
// 0000
// 0001 -> element
// 0010 -> stateful_component
// 0100 -> text_children
// 1000 -> array_children

// | (两位都为0，才为0)
// & (两位都为1，才为1)

// 修改用或运算，查找用与运算