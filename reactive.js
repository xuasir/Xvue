// vue3 响应式
// 副作用栈
let effectStack = []
let activeEffect = null
// 副作用
function effect(fn, options) {
  // 创建副作用函数
  let e = createReactiveEffect(fn, options)
  if(!options?.lazy) {
    // 首次执行
    e()
  }
  // 返回
  return e
}

function createReactiveEffect(fn, options) {
  // 真实的副作用函数
  const effect = function reactiveEffect(...args) {
    try {
      // 推入数组
      effectStack.push(effect)
      activeEffect = effect
      return fn(...args)
    } finally {
      // 推出
      effectStack.pop()
      activeEffect = effectStack[effectStack.length - 1]
    }
  }
  effect.options = options
  return effect
}

// 计算属性
function computed(fn) {
  let dirty = true
  let value
  let runner = effect(fn, { 
    lazy: true,
    computed: true,
    // 当计算属性依赖的值变化执行
    scheduler: () => {
      if(!dirty) {
        // 将get开放获取
        dirty = true
        // 通知依赖计算属性的副作用执行
        trigger(computed, 'value')
      }
    }
  })
  let computed = {
    effect: runner,
    get value() {
      if(dirty) {
        value = runner()
        // 使用缓存值，直到下次依赖值改变
        dirty = false
      }
      // 依赖收集
      track(computed, 'value')
      return value
    }
  }
  return computed
}

// 缓存对象
// 源对象 => 响应式对象
let toProxy = new WeakMap()
// 响应式对象 => 源对象
let toRaw = new WeakMap()

// 代理对象
let baseHandler = {
  get(target, key) {
    let res = Reflect.get(target, key)
    track(target, key)
    return typeof res === 'object' ? reactive(res) : res
  },
  set(target, key, value) {
    let oldValue = target[key]
    let res = Reflect.set(target, key, value)
    if(Reflect.has(target, key)) {
      // 新增
      trigger(target, key)
    } else {
      // 修改
      if(oldValue !== value) {
        trigger(target, key)
      }
    }
    return res
  }
}

function reactive(target) {
  // 创建响应式对象
  return createReactiveObject(target)
}

function createReactiveObject(target) {
  // 判断是否为对象类型
  if(typeof target !== 'object' || target == null) {
    console.warn(`target can not be reactive`)
    return target
  }
  // 查询缓存如果是缓存则直接返回已经代理的对象
  let proxyobj = toProxy.get(target)
  if(proxyobj) {
    return proxyobj
  }
  if(toRaw.has(target)) {
    return target
  }

  // 创建
  let observed = new Proxy(target, baseHandler)
  
  // 缓存
  toProxy.set(target, observed)
  toRaw.set(observed, target)
  
  // 返回
  return observed
}
// ref 
function ref(value) {
  return createRef(value)
}
function createRef(value) {
  if(isRef(value)) {
    return value
  }
  const r = {
    __ref: true,
    get value() {
      track(r, 'value')
      return value
    },
    set value(newValue) {
      if(newValue !== value) {
        value = newValue
        trigger(r, 'value')
      }
    }
  }
  return r
}
function isRef(r) {
  return r ? r.__ref === true : false
}
// 对象对应key
/**
 * {
 *  target: {
 *      key: deps[]
 *    }
 * }
 */
let targetMap = new WeakMap()

// 依赖收集和派发更新
function track(target, key) {
  if(effectStack.length > 0 || activeEffect !== null) {
    
    let keyToDeps = targetMap.get(target)
    // 查询对象
    if(!keyToDeps) {
      // 没有新建
      targetMap.set(target, keyToDeps = new Map)
    }
    let deps = keyToDeps.get(key)
    if(!deps) {
      keyToDeps.set(key, deps = new Set())
    }
    deps.add(activeEffect)
  }

}

function trigger(target, key) {
  // 计算属性runner
  let computedEffects = new Set()
  // 普通副作用函数
  let effects = new Set()
  // 分离副作用函数
  function add(deps) {
    deps.forEach(dep => {
      if(dep?.options?.computed) {
        computedEffects.add(dep)
      } else {
        effects.add(dep)
      }
    })
  }
  // 分别运行不同副作用函数
  function run(effect) {
    if(effect?.options?.scheduler) {
      // 计算属性 修改成 可求新值
      effect.options.scheduler(effect)
    } else {
      effect()
    }
  }
  let keyToDeps
  if(keyToDeps = targetMap.get(target)) {
    let deps
    if(deps = keyToDeps.get(key)) {
      add(deps)
    }
  }

  computedEffects.forEach(run)
  effects.forEach(run)
}

//-----------测试----------//

// let data = {
//   a: 1
// }

// let observedData = reactive(data)

// effect(() => {
//   console.log(`打印observedData.a: ${observedData.a}`)
// })

// setTimeout(() => {
//   observedData.a = 2
// }, 2000)

// 数组
// let arr = reactive([1,2,3])

// effect(() => {
//   console.log(`打印arr: ${arr}`)
// })

// setTimeout(() => {
//   arr.push(4)
// }, 2000)

// 计算属性
// let data = reactive({ num: 1 })

// let plus = computed(() => data.num * 2)

// let plus3 = computed(() => plus.value *4)

// effect(() => {
//   console.log(`原始： ${data.num}`)
// })

// effect(() => {
//   console.log(`plus ${plus.value}`)
// })

// effect(() => {
//   console.log(`plus3 ${plus3.value}`)
// })

// setTimeout(() => {
//   data.num = 3
// }, 1000)

// ref
// let num = ref(1)

// effect(() => {
//   console.log(`ref: ${num.value}`)
// })

// setTimeout(() => {
//   num.value = 2
// }, 2000);