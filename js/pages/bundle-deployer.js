/* The deployment guide describes the planned local CLI, never a live deploy action. */
ArkUI.pageModules.bundledeployer = {
  mount: function (host) {
    function words(key) { return ArkCopy.text('BUNDLEDEPLOYER.' + key); }
    function node(tag, cls, key) { return ArkUI.el(tag, cls, key ? words(key) : ''); }
    var page = node('section', 'ark-page task-page bundle-deployer-page');
    page.dataset.arkPage = 'bundledeployer';
    page.setAttribute('aria-labelledby', 'bundledeployer-title');
    var top = node('div', 'bundle-topline');
    top.appendChild(node('p', 'bundle-eyebrow', 'EYEBROW'));
    top.appendChild(node('span', 'bundle-status', 'STATUS'));
    page.appendChild(top);
    var hero = node('header', 'bundle-hero');
    var heading = node('h1', '', 'TITLE'); heading.id = 'bundledeployer-title';
    hero.appendChild(heading);
    hero.appendChild(node('p', 'bundle-deck', 'DECK'));
    page.appendChild(hero);

    var layout = node('div', 'bundle-layout');
    var workflow = node('section', 'bundle-workflow');
    workflow.setAttribute('aria-labelledby', 'bundle-workflow-title');
    var workflowHeading = node('h2', '', 'WORKFLOW.TITLE'); workflowHeading.id = 'bundle-workflow-title';
    workflow.appendChild(workflowHeading);
    workflow.appendChild(node('p', 'bundle-requirement', 'REQUIREMENT'));
    var steps = node('ol', 'bundle-steps');
    for (var i = 1; i <= 3; i++) {
      var row = node('li', 'bundle-step');
      var number = ArkUI.el('span', 'bundle-number', '0' + i); number.setAttribute('aria-hidden', 'true');
      row.appendChild(number);
      var copy = node('div', 'bundle-step-copy');
      copy.appendChild(node('h3', '', 'POINT' + i + '.TITLE'));
      copy.appendChild(node('p', '', 'POINT' + i + '.TEXT'));
      row.appendChild(copy); steps.appendChild(row);
    }
    workflow.appendChild(steps); layout.appendChild(workflow);

    var boundary = node('section', 'bundle-boundary');
    boundary.setAttribute('aria-labelledby', 'bundle-boundary-title');
    var figure = node('figure', 'bundle-flow');
    figure.appendChild(node('figcaption', '', 'FLOW.TITLE'));
    var trail = node('ol', 'bundle-flow-trail');
    ['LOCAL', 'BUNDLE', 'MESH'].forEach(function (key) { trail.appendChild(node('li', 'bundle-flow-node', 'FLOW.' + key)); });
    figure.appendChild(trail); figure.appendChild(node('p', 'bundle-flow-note', 'FLOW.NOTE'));
    boundary.appendChild(figure);
    var boundaryHeading = node('h2', '', 'BOUNDARY.TITLE'); boundaryHeading.id = 'bundle-boundary-title';
    boundary.appendChild(boundaryHeading);
    var table = node('table', 'bundle-boundary-table');
    var thead = node('thead', ''), labels = node('tr', '');
    ['PUBLIC', 'LOCAL'].forEach(function (key) { var th = node('th', '', 'BOUNDARY.' + key); th.setAttribute('scope', 'col'); labels.appendChild(th); });
    thead.appendChild(labels); table.appendChild(thead);
    var tbody = node('tbody', '');
    for (var n = 1; n <= 3; n++) {
      var tr = node('tr', ''); tr.appendChild(node('td', '', 'PUBLIC' + n)); tr.appendChild(node('td', '', 'LOCAL' + n)); tbody.appendChild(tr);
    }
    table.appendChild(tbody); boundary.appendChild(table);
    boundary.appendChild(node('p', 'bundle-boundary-note', 'BOUNDARY.NOTE'));
    layout.appendChild(boundary); page.appendChild(layout);

    var release = node('aside', 'bundle-release');
    release.setAttribute('aria-label', words('STATUS'));
    release.appendChild(node('h2', '', 'POINT4.TITLE'));
    release.appendChild(node('p', '', 'POINT4.TEXT'));
    release.appendChild(node('p', 'bundle-release-note', 'RELEASE.NOTE'));
    var back = node('a', 'bundle-back', 'BACK');
    back.href = ArkUI.route.href(ArkUI.pageCatalog.account.path); back.dataset.sceneLink = 'account';
    release.appendChild(back); page.appendChild(release);
    host.appendChild(page);
    return page;
  }
};
