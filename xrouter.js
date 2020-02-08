class History {
  constructor() {
    this.current = null
  }
}

class XRouter{
  constructor(options) {
    this.mode = options.mode || 'hash'
    this.routes = options.routes || []
    this.history = new History()
    this.init()
    this.routerMap = this.createMap(this.routes)
  }
  init() {
    if(this.mode == 'hash') {
      location.hash ? '' : location.hash = '/'
      window.addEventListener('load', () => {
        this.history.current = location.hash.slice(1)
      })
      window.addEventListener('hashchange', () => {
        this.history.current = location.hash.slice(1)
      })
    } else {
      location.pathname ? '' : location.pathname = '/'
      window.addEventListener('load', () => {
        this.history.current = location.pathname
      })
      window.addEventListener('popstate', () => {
        this.history.current = location.pathname
      })
    }
  }
  createMap(routes) {
    return routes.reduce((memo, cur) => {
      memo[cur.pathc] = cur.component
      return memo
    },{})
  }
}

XRouter.install = function(Vue) {
  Vue.mixin({
    beforeCreate() {
      if(this.$options && this.$options.router) {
        this._root = this
        this._root._router = this.$options.router
        Vue.until.defineReactve(this, 'current', this._router.history)
      } else {
        this._root = this.$parent._root
      }
      Object.defineProperty(this, '$router', {
        get() {
          return this._root._router
        }
      })
    }
  })

  Vue.component('router-link', {
    props: { to: String },
    render(h) {
      return h('a', { attrs: { href: '#' + this.to } }, [this.$slots.default])
    }
  })

  Vue.component('router-view', {
    render(h) {
      let current = this._self._root._router.history.current
      let routerMap = this._self._root._router.routerMap
      h(routerMap[current])
    }
  })
}


export default XRouter