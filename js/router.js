const routes = {};
let currentPage = null;

function registerRoute(path, pageModule) {
  routes[path] = pageModule;
}

function navigate(path) {
  window.location.hash = "#/" + path;
}

function handleRoute() {
  const hash = window.location.hash.slice(2) || "";

  if (currentPage && currentPage.destroy) {
    currentPage.destroy();
  }

  const app = document.getElementById("app");
  app.innerHTML = "";

  const page = routes[hash] || routes[""];
  currentPage = page;
  if (page && page.render) {
    page.render(app);
  }
}

function initRouter() {
  window.addEventListener("hashchange", handleRoute);
  handleRoute();
}
