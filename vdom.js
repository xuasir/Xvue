// Vnode类型
// vnode {
//   falg 描述vnode类型
//   childrenFlag 子元素类型
//   props 属性对象
//   tag 标签
// }
const VnodeType = {
  HTML: 'HTML',
  TEXT: 'TEXT',

  COMPONENT: 'COMPONENT'
}
const ChildrenType = {
  EMPTY: 'EMPTY', // null
  MULTIPLE: 'MULTIPLE', // 数组
  SINGLE: 'SINGLE' // 单个 默认为文本
}
function getVnodeType(tag) {
  let tagType = typeof tag
  let vnodeType = VnodeType.TEXT
  switch (tagType) {
    case 'string':
      vnodeType = VnodeType.HTML
      break;
    case 'function':
      vnodeType = VnodeType.COMPONENT
      break;
    default:
      break;
  }
  return vnodeType
}
function getChildrenFlag(children) {
  if(children === null) {
    return ChildrenType.EMPTY
  } else if(Array.isArray(children)) {
    if(children.length > 0) {
      return ChildrenType.MULTIPLE
    } else {
      return ChildrenType.EMPTY
    }
  } else {
    return ChildrenType.SINGLE
  }
}

// h 函数
function createElement(tag, props, children = null) {
  let flag = getVnodeType(tag)
  let childrenFlag = getChildrenFlag(children)
  // 文本情况创建一个文本node
  if(childrenFlag == ChildrenType.SINGLE) {
    children = createTextVnode(children + '')
  }
  return {
    flag,
    tag,
    props,
    children,
    childrenFlag,
    el: null
  }
}

// 创建文本节点
function createTextVnode(text) {
  return {
    flag: VnodeType.TEXT,
    tag: null,
    props: null,
    children: text,
    childrenFlag: ChildrenType.EMPTY,
    el: null
  }
}

// 挂载函数
function mount(vm, vnode, pareDom, flagNode = null) {
  let { flag } = vnode
  if(flag == VnodeType.HTML) {
    mountElemnt(vm, vnode, pareDom, flagNode)
  } else if(flag == VnodeType.TEXT) {
    mountTextNode(vm, vnode, pareDom)
  } else if(flag == VnodeType.COMPONENT) {
    
  }
}

function mountElemnt(vm, vnode, pareDom, flagNode = null) {
  let { tag, children, props, childrenFlag } = vnode
  let dom = document.createElement(tag)
  vnode.el = dom
  if(props) {
    Object.keys(props).forEach(key => {
      patchData(vm, dom, key, null, props[key])
    })
  }
  if(childrenFlag == ChildrenType.MULTIPLE) {
    children.forEach(children => {
      mount(vm, children, dom)
    });
  } else if(childrenFlag == ChildrenType.SINGLE) {
    mount(vm, children, dom)
  }
  flagNode ? pareDom.insertBefore(dom, flagNode) : pareDom.appendChild(dom)
}

function mountTextNode(vm, vnode, pareDom) {
  let { children, props } = vnode
  let dom = document.createTextNode(children)
  vnode.el = dom
  if(props) {
    Object.keys(props).forEach(key => {
      patchData(vm, dom, key, null, props[key])
    })
  }
  pareDom.appendChild(dom)
}

//处理数据
function patchData(vm, el, key, prevVal, newVal) {
  if(prevVal == newVal) return
  switch (key) {
    case 'class':
      el.className = newVal == null ? '' : newVal
      break;
    case 'style':
      if(newVal) {
        Object.keys(newVal).forEach(key => {
          if(prevVal && prevVal[key] && prevVal[key] == newVal[key]) { // 无需更新
            return 
          }
          // 更新或者新增
          el.style[key] = newVal[key]
        })
      }
      // 删除
      if(prevVal) {
        Object.keys(prevVal).forEach(key => {
          if(newVal && !newVal.hasOwnProperty(key)) el.style[key] = ''
        })
      }
      break
    default:
      if(key[0] == '@') {
        if(newVal == prevVal) break
        if(!newVal) {
          el.removeEventListener(key.slice(1))
        } else {
          el.addEventListener(key.slice(1), newVal)
        }
      } else if(key[0] == 'x') {
        switch (key.slice(1)) {
          case 'text':
            if(newVal == prevVal) break
            if(!newVal) {
              el.innerText = ''
            } else {
              el.innerText = newVal
            }
            break;
          case 'html':
            if(newVal == prevVal) break
            if(!newVal) {
              el.innerHtml = ''
            } else {
              el.innerHtml = newVal
            }
            break;
          case 'model': // 仅支持input
            if(prevVal == newVal) break
            if(!newVal) {
              el.removeEventListener('input')
              el.value = ''
            } else {
              el.addEventListener('input', e => {
                console.log(`input回调 `,e.target.value)
                // vm[newVal] = e.target.value
              })
              el.value = newVal
            }
            break;
          default:
            break;
        }
      } else if(key != 'key') {
        el.setAttrbute(key, newVal)
      }
      break;
  }
}
// patch--vnode diff
function patch(vm, prev, next, domContainer) {
  let preFlag = prev.flag
  let nextFlag = next.flag
  
  if(preFlag !== nextFlag) { // vnode类型不同
    replaceNode(prev, next, domContainer)
  } else if(next.flag == VnodeType.HTML) {
    patchElementNode(vm, prev, next, domContainer)
  } else if(next.flag == VnodeType.TEXT) {
    patchTextNode(prev, next)
  }
}

function patchElementNode(vm, preVNode, nextVNode, domContainer) {
  if(preVNode.tag !== nextVNode.tag) { // 元素类型不同
    replaceNode(preVNode, nextVNode, domContainer)
  }
  // patchdata
  let preProps = preVNode.props
  let nextProps = nextVNode.props
  let el = (nextVNode.el = preVNode.el)
  if(nextProps) {
    Object.keys(nextProps).forEach(key => {
      if(preProps.hasOwnProperty(key)) {
        // 更新
        patchData(vm, el, key, preProps[key], nextProps[key])
      } else {
        // 新增
        patchData(vm, el, key, null, nextProps[key])
      }
    })
  }
  if(preProps) {
    Object.keys(preProps).forEach(key => {
      if(!nextProps.hasOwnProperty(key)) {
        // 删除
        patchData(vm, el, key, preProps[key], null)
      }
    })
  }
  // patch children
  patchChild(vm, preVNode.childrenFlag, nextVNode.childrenFlag, preVNode.children, nextVNode.children, el)
}

function patchChild(vm, preChildFlag, nextChildFlag, preChild, nextChild, domContainer) {
  switch (preChildFlag) {
    case ChildrenType.EMPTY:
      switch (nextChildFlag) {
        case ChildrenType.EMPTY:
          break;
        case ChildrenType.MULTIPLE:
          nextChild.forEach(child => {
            mount(vm, child, domContainer)
          })
          break;
        case ChildrenType.SINGLE:
          mount(vm, nextChild, domContainer)
          break;
        default:
          break;
      }
      break;
    case ChildrenType.MULTIPLE:
      switch (nextChildFlag) {
        case ChildrenType.EMPTY:
          preChild.forEach(child => {
            domContainer.removeChild(child.el)
          })
          break;
        case ChildrenType.MULTIPLE:
          // a,b,c prev 1
          // c,b,e,a next 1
          // li --> 2
          let lastIndex = 0
          nextChild.forEach((nChild, nIndex) => { // 遍历新vnode
            // 在旧vnode中查找
            let pIndex = preChild.findIndex(pChild => pChild.props.key == nChild.props.key)
            if(pIndex >= 0) {
              // 先做patch
              patch(vm, preChild[pIndex], nChild, domContainer)
              // patch结束后新vnode也拥有了el
              if(pIndex < lastIndex) { // 需要移动，新vnode当前顺序在原来vnode中顺序为递增，非递增移动
                let flagNode = nextChild[nIndex - 1].el.nextSibling
                domContainer.insertBefore(preChild[pIndex].el, flagNode) // 从prevnode取出应移动的dom
              } else {
                // 在旧vnode中的位置相对位置赋值
                lastIndex = pIndex
              }
            } else {//没找到新增
              let flagNode = nIndex == 0 ? preChild[0].el : nextChild[nIndex - 1].el.nextSibling
              mount(vm, nChild, domContainer, flagNode)
            }
          })
          preChild.forEach(pChild => { // 遍历旧vnode 查出需要删除的节点
            let has = nextChild.find(nChild => nChild.props.key == pChild.props.key)
            if(!has) {
              domContainer.removeChild(pChild.el)
            }
          })
          break;
        case ChildrenType.SINGLE:
          preChild.forEach(child => {
            domContainer.removeChild(child.el)
          })
          mount(vm, nextChild, domContainer)
          break;
      
        default:
          break;
      }
      break;
    case ChildrenType.SINGLE:
      switch (nextChildFlag) {
        case ChildrenType.EMPTY:
          console.log(preChild.el)
          domContainer.removeChild(preChild.el)
          break;
        case ChildrenType.MULTIPLE:
          domContainer.removeChild(preChild.el)
          nextChild.forEach(child => {
            mount(vm, child, domContainer)
          })
          break;
        case ChildrenType.SINGLE:
          patch(vm, preChild, nextChild, domContainer)
          break;
      
        default:
          break;
      }
      break;
  
    default:
      break;
  }
}

function replaceNode(preVNode, nextVNode, domContainer) {
  domContainer.removeChild(preVNode.el)
  mount(nextVNode, domContainer)
}

function patchTextNode(preVNode, nextVNode) {
  let el = (nextVNode.el = preVNode.el)
  if(nextVNode.children !== preVNode.children) {
    el.nodeValue = nextVNode.children
  }
}