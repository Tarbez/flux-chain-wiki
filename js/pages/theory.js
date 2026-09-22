/* One module renders every detail page of the theory; the route names the manifest. */
ArkUI.pageModules.theory = {
  mount: function (host, page) {
    var el = ArkUI.sheet(String(page).replace(/^concept\//, ''), page);
    host.appendChild(el); return el;
  }
};
