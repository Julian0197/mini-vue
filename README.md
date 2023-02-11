# mini-vue3实现

> `mini-vue3`按照以下四个分支的顺序，借助jest进行单元测试，通过测试驱动开发小步走实现。

## 1.reactivity

实现`Vue3`响应式原理，并在此基础上实现相关API

+ `effect` & `reactive`依赖收集和触发依赖
+ 实现`effect`返回`runner`
+ 实现`effect`的`stop`和`onStop`
+ 实现`readonly`和`shallowReadonly`
+ 实现`isReactive`、`isReadonly`和`isProxy`
+ 实现`ref`
+ 实现`isRef`、`unRef`和`proxyRefs`功能
+ 实现`computed`计算属性

## 2.runtime-core(1) 

浏览器首次渲染功能，主要实现了一个基本的`Vue3`的虚拟DOM的节点渲染。

本分支只包含了`vnode`的首次渲染过程，组件及节点的更新，更新优化，diff算法的实现将会放在下一分支。

<img src=".\img\runtime-core(1).png" alt="runtime-core(1)" style="zoom:200%;" />

+ 初始化`component`主流程
+ 初始化`element`主流程
+ `rollup`打包库
+ 实现组件代理对象
+ 实现`shapeFlags`
+ 实现事件注册
+ 实现组件的`props`、`emit`和`slots`功能
+ 实现`Fragment`和`Text`类型
+ 实现`getCurrentInstance`
+ 实现`provide/inject`功能

## 3.runtime-core(2)

实现`Vue3`的虚拟DOM更新，包含组件、节点的更新、更新优化、diff算法。

+ 实现自定义渲染器
+ 更新`element`类型节点
+ 更新`component`类型节点
+ diff算法
+ 实现`nextTick`

## 4.compiler-core

实现一个简单的模板编译解析器，可以从`<template>`编译成`render`函数以实现最终渲染。

+ 解析插值
+ 解析`element`标签
+ 解析`text`文本
+ 实现`transform`功能
+ 实现`ast`转化为`render`函数

___

上述内容是本项目实现流程。

**具体实现细节详见每个分支的`README.md`。**