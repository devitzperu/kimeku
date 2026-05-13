// Kimeku service worker — push notifications only (no offline cache)

self.addEventListener("install", (event) => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (_) {
    data = { title: "Kimeku", body: event.data ? event.data.text() : "" }
  }
  const title = data.title || "Kimeku"
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { todoId: data.todoId || null },
    tag: data.todoId ? `todo-${data.todoId}` : undefined,
    renotify: true,
  }
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        for (const c of clients) {
          c.postMessage({ type: "todo-alarm", title, body: options.body, todoId: data.todoId })
        }
      }),
    ])
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const todoId = event.notification.data && event.notification.data.todoId
  const url = todoId ? `/todos/${todoId}` : "/todos"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ("focus" in c) {
          c.navigate(url)
          return c.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
