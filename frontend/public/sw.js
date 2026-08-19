// Web Push service worker: shows the admin notification and focuses the dashboard on click.
self.addEventListener("push", (event) => {
  let data = { title: "Nouvelle commande", body: "Une boisson vient d'être commandée.", url: "/admin" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    // keep defaults
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/admin";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    }),
  );
});
