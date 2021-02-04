// 状态
const PENDING = 'pending'
const RESOLVED = 'fulfilled'
const REJECTED = 'rejected'

/**
 * 
 * @param {*} promise then返回的新的primose
 * @param {*} x 当前then的onResolve或者onReject执行结果
 * @param {*} resolve 新promise的resolve方法
 * @param {*} reject 新promise的reject方法
 */
function resolvePromise(promise, x, resolve, reject) {
  // 不能循环调用promise
  if(promise === x) {
    throw new TypeError('不能resolve自身对应promise')
  }
  // 是否被调用
  let called = false

  if(typeof x === 'function' || typeof x === 'object' && typeof x !== null) {
    // 是一个对象或者函数
    try {
      const then = x.then
      if(typeof then === 'function') {
        // 如果是函数 执行他
        try {
          then.call(x, resolve, reject)
        } catch (e) {
          if(!called) {
            called = true
            reject(x)
          }
        }
      }
    } catch (e) {
      if(!called) {
        called = true
        reject(x)
      }
    }
  } else {
    // 是一个普通值
    if(!called) {
      called = true
      resolve(x)
    }
  }
}

class MyPromise {
  // 状态
  state = PENDING
  // 值
  value = undefined
  // 拒因
  reason = undefined

  // 回调列表
  resolveCallbacks = []
  rejectCallbacks  = []

  // => fulfilled
  resolve(value) {
    if(this.state === PENDING) {
      this.value = value
      this.state = RESOLVED
      // 需要执行resolve回调列表
      this.resolveCallbacks.forEach(onResolve => {
          onResolve(this.value)
      })
    }
  }

  // => rejected 
  reject(reason) {
    if(this.state === PENDING) {
      this.reason = reason
      this.state = REJECTED
      this.rejectCallbacks.forEach(onReject => {
        onReject(this.reason)
      })
    }
  }
 
  constructor(executor) {
    // 立即执行
    executor(this.resolve.bind(this), this.reject.bind(this))
  }

  // thenable
  then(onResolve, onReject) {
    // 如果不是函数需要忽略
    onResolve = typeof onResolve !== 'function' ? data => data : onResolve
    onReject = typeof onReject !== 'function' ? error => error : onReject

    /**
     * then需要返回一个新的primose
     * 并且需要异步执行 onResolve和onResject来确保promise已经初始化并且赋值
     * 因为返回的新primose必须以onResolve和onResject的结果来决定状态
     */
    let promise = new MyPromise((resolve, reject) => {
      // 执行出现错误应该将错误作为新返回promise的拒因
      try {
        if(this.state === RESOLVED) {
          // 已经fulfilled
          setTimeout(() => {
            // 异步执行
            // 由于try catch 只能补捕获同步错误
            // 还需要防止onResolve出现错误
            try {
              let res = onResolve(this.value)
              resolvePromise(promise, res, resolve, reject)
            } catch (e) {
              reject(e)
            }
          }, 0)
        } else if(this.state === REJECTED) {
          // 已经rejected
          setTimeout(() => {
            try {
              let res = onReject(this.reason)
              resolvePromise(promise, res, resolve, reject)
            } catch (e) {
              reject(e)
            }
          }, 0)
        } else if(this.state === PENDING) {
          // 等待中
          this.resolveCallbacks.push(function(value) {
            try {
              let res = onResolve(value)
              resolvePromise(promise, res, resolve, reject)
            } catch (e) {
              reject(e)
            }
          })
          this.rejectCallbacks.push(function(reason) {
            try {
              let res = onReject(reason)
              resolvePromise(promise, res, resolve, reject)
            } catch (e) {
              reject(e)
            }
          })
        }
      } catch(e) {
        reject(e)
      }
    })

    return promise
  }

  // 静态方法集
  static resolve(value) {
    return new MyPromise((resolve) => resolve(value))
  }

  static reject(value) {
    return new MyPromise((_, reject) => reject(value))
  }

  static all(...promises) {
    let num = promises.length
    let values = []
    return new MyPromise((resolve, reject) => {
      try {
        promises.forEach((promise, index) => {
          MyPromise.resolve(promise).then(data => {
              values[index] = data
              num--
              if(num < 1) {
                resolve(values)
              }
          })
        })
      } catch (e) {
        reject(e)
      }
      
    })
  }

  static race(...promises) {
    return new MyPromise((resolve, reject) => {
      try {
        promises.forEach(promise => {
          MyPromise.resolve(promise).then(data => {
            resolve(data)
          })
        })
      } catch (e) {
        reject(e)
      }
    })
  }
}
// ------------规范测试--------------
// 872个通过
MyPromise.defer = MyPromise.deferred = function() {
  let dfd = {}
  dfd.promise = new Promise((resolve, reject) => {
    dfd.resolve = resolve
    dfd.reject = reject
  })
  return dfd
}
module.exports = MyPromise

// -----------------test--------------------
// let p1 = new MyPromise((resolve) => {
//   setTimeout(() => {
//     resolve(100)
//   }, 1000)
// })

// let p2 = p1.then((data) => {
//   console.log(`p1 then1 data ${data}`)
//   return data + 100
// }).then(data => {
//   console.log(`p1 then2 data ${data}`)
//   return new MyPromise((resolve, reject) => {
//     // reject('出错了')
//     throw new Error('throw的错误')
//   })
// })

// p2.then((data) => {
//   console.log(`p2 then1 data ${data}`)
// }, e => {
//   console.log(`p2 then1 error ${e}`)
// })


// ---------------静态方法测试-------------