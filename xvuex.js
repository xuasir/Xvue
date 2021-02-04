const Vue
function  install(_vue) {
  Vue = _vue
  Vue.mixin({
    beforeCreate() {
      if(this.$options && this.$options.store) {
        this._root = this
        this._root._store = this.$options.store
      } else {
        this._root = this.$parent._root
      }
      Vue.until.defineRective(this, '$store', {
        get() {
          return this._root._store
        }
      })
    }
  })
}
class store {
  constructor(options) {
    this.state = new Vue({
      data: options.state
    })
    this._self = thi
    this._mutations = options.mutations
    this._action = options.action
    this._getters = options.getters
    this.initGetters()
  }
  commit(mutationType, ...args) {
    this._mutations[mutationType].call(this._self, this.state, ...args)
  }
  dispatch(actionType, ...args) {
    this._action[actionType].call(this._self, { commit: this.commit, state: this.state }, ...args)
  }
  initGetters() {
    for(let key in this._getters) {
      Object.defineProperty(this.getters, key, {
        get: () => this._getters[key].call(this._self, this.state)
      })
    }
  }
}

export default { stroe, install }