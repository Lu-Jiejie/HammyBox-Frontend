/**
 * 防止弹出层导致的页面布局偏移和滚动位置跳动
 *
 * 解决方案：在任何样式修改之前就保存滚动位置
 */

let savedScrollPosition = 0
let isLocked = false

// 提前保存滚动位置 - 在每次滚动时更新
function updateScrollPosition() {
  if (!isLocked) {
    savedScrollPosition = window.pageYOffset || document.documentElement.scrollTop
  }
}

// 监听滚动事件，持续更新保存的位置
window.addEventListener('scroll', updateScrollPosition, { passive: true })

// 使用 MutationObserver 监听 body 样式变化
const observer = new MutationObserver(() => {
  const body = document.body
  const hasOverflowHidden = body.style.overflow === 'hidden'

  // 检测到 overflow: hidden 被添加
  if (hasOverflowHidden && !isLocked) {
    isLocked = true

    // console.log('[ScrollLock] Locking scroll at position:', savedScrollPosition)

    // 计算滚动条宽度
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    // 不移除 overflow: hidden，只是添加 padding 补偿滚动条宽度
    // 同时使用 position: fixed 保持视觉位置
    body.style.position = 'fixed'
    body.style.top = `-${savedScrollPosition}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.paddingRight = `${scrollbarWidth}px`
    // 确保 body 高度足够覆盖整个视口（即使向上偏移了）
    body.style.minHeight = `calc(100vh + ${savedScrollPosition}px)`
  }
  // 检测到 overflow 被移除或恢复
  else if (!hasOverflowHidden && isLocked) {
    isLocked = false

    // console.log('[ScrollLock] Unlocking scroll, restoring to:', savedScrollPosition)

    // 恢复 body 样式
    body.style.position = ''
    body.style.top = ''
    body.style.left = ''
    body.style.right = ''
    body.style.width = ''
    body.style.paddingRight = ''
    body.style.minHeight = ''

    // 延迟恢复滚动位置，确保 DOM 已经更新
    requestAnimationFrame(() => {
      window.scrollTo(0, savedScrollPosition)
    })
  }

  // 移除可能由其他代码添加的 margin
  if (body.style.marginRight) {
    body.style.marginRight = ''
  }
})

// 开始观察
if (typeof window !== 'undefined') {
  // 立即保存一次当前滚动位置
  updateScrollPosition()

  // 清理初始样式
  document.body.style.paddingRight = ''
  document.body.style.marginRight = ''

  // 持续监听 body 的 style 属性变化
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['style'],
  })
}

// 清理函数
export function cleanup() {
  window.removeEventListener('scroll', updateScrollPosition)
  observer.disconnect()
}
