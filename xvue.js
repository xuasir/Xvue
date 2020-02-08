class XVue {
  constructor(options = {}){
    this.$options = options
    this.$data = options.data
    this.$render = options.render
    this.mounted = options.mounted
    this.observe(this.$data)
    
    // 测试
    // new Watcher(this, 'a', function(newVal) {
    //   console.log(`a更新为：${newVal}`)
    // })
    
  }

  observe(data){
    // 遍历key
    Object.keys(data).forEach(key => {
      // 定义响应式
      this.defineReactive(data, key, data[key])
      // 代理到this
      this.proxyData(key)
    })
  }
  defineReactive(target, key, val){
    let dep = new Dep()
    Object.defineProperty(target, key, {
      get() {
        // 收集依赖
        if(Dep.target && !dep.subs.some(w => w.name == Dep.target.name)) {
          dep.addDep(Dep.target)
        }
        // console.log(`${key} 被访问`)
        return val
      },
      set(newVal) {
        if(val != newVal) {
          // console.log(`${key} 被设置成 ${newVal}`)
          val = newVal
          // 更新触发 --> watcher
          dep.notify()
        }
      }
    })
  }
  proxyData(key){
    Object.defineProperty(this, key, {
      get() {
        return this.$data[key]
      },
      set(newVal) {
        this.$data[key] = newVal
      }
    })
  }
  _render(){
    return this.$render(createElement)
  }
  $mount(el){
    let vm = this
    let FinalEl = el || this.$options.el
    if(FinalEl) {
      if(!this.$options.render) {
        let { render } = this.compose()
        this.$render = render
      }
      new Watcher(vm, 'render-watcher', () => {
        // console.log('render-watcher回调执行')
        vm.update(vm._render(), FinalEl)
      })
      this.mounted.bind(vm)()
      return vm
    } else {
      document.write('必须配置el属性或者在mount函数中传入挂载点')
      return 
    }
  }
  // 编译render函数
  compose() {

  }
  // vnode --> dom
  update(vnode, el) {
    let vm = this
    let domAnchor = null
    if(el) {
      domAnchor = document.getElementById(el.slice(1))
    }
    // 首次渲染
    if(!domAnchor.vnode) {
      // console.log('首次渲染')
      mount(vm, vnode, domAnchor)
    } else {
      // 更新
      // console.log('更新diff渲染')
      patch(vm, domAnchor.vnode, vnode, domAnchor)
    }
    domAnchor.vnode = vnode
  }
}

class Dep {
  constructor() {
    this.subs = []
  }
  addDep(watcher) {
    this.subs.push(watcher)
  }
  notify() {
    this.subs.map(watcher => watcher.update())
  }
}

class Watcher {
  constructor(vm, name, cb) {
    this.vm = vm
    this.cb = cb
    this.name = name

    Dep.target = this
    cb()
    Dep.target = null
  }
  update() {
    if(this.cb) {
      Dep.target = this
      this.cb()
      Dep.target = null
    }
  }
}