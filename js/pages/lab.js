ArkUI.pageModules.lab = {
  mount: function (host) {
    var el = document.createElement('section');
    el.className = 'ark-page learning-page lab-page';
    el.dataset.arkPage = 'lab';
    el.setAttribute('aria-label', 'Interactive model');
    var lab = document.createElement('div'); lab.className = 'expansion';
    lab.innerHTML = "<section class=\"experiments section\" id=\"work\" tabindex=\"-1\" aria-labelledby=\"experiments-title\">\n      <div class=\"section-heading\"><div><p class=\"eyebrow\">01 / Interactive model</p><h1 id=\"experiments-title\">Explore three protocol concepts.</h1><p class=\"model-status\">Illustrative, not live network data.</p></div><p>Change a variable and watch a visual analogy respond. The controls help explain authority, lifecycle, and network boundaries; they do not measure or reproduce a running Flux network.</p></div>\n      <div class=\"lab\" data-mode=\"spacing\">\n        <div class=\"lab-toolbar\"><div class=\"study-tabs\" role=\"group\" aria-label=\"Choose a model\"><button type=\"button\" disabled data-study=\"spacing\" aria-pressed=\"true\">01 <span>Authority</span></button><button type=\"button\" disabled data-study=\"rhythm\" aria-pressed=\"false\">02 <span>Lifecycle</span></button><button type=\"button\" disabled data-study=\"depth\" aria-pressed=\"false\">03 <span>Networks</span></button></div><span class=\"live-label\">INTERACTIVE MODEL</span></div>\n        <div class=\"experiment-stage\" role=\"img\" aria-label=\"Illustrative dots in three independent groups. Adjust their spacing to explore the idea of threshold agreement.\"><div class=\"experiment-grid\"></div><span class=\"stage-corner\">FX\u2014001</span><div class=\"specimen\" aria-hidden=\"true\"><span class=\"dot-group\"><i></i><i></i><i></i><i></i></span><span class=\"dot-group\"><i></i><i></i><i></i><i></i></span><span class=\"dot-group\"><i></i><i></i><i></i><i></i></span></div><span class=\"stage-footnote\">A VISUAL ANALOGY FOR DERIVED, TEMPORARY AUTHORITY.</span><span class=\"stage-axis\" aria-hidden=\"true\">x \u2192</span></div>\n        <div class=\"lab-bottom\"><div class=\"study-description\"><h3 id=\"study-title\">How can threshold agreement be pictured?</h3><p id=\"study-description\">This model moves independent groups closer together as a visual analogy for threshold evidence. It does not calculate a real roster, vote, certificate, or transition.</p></div><div class=\"control\"><div class=\"control-label\"><label for=\"variable\">Visual convergence</label><output for=\"variable\" id=\"variable-value\">50%</output></div><input id=\"variable\" disabled type=\"range\" min=\"0\" max=\"100\" value=\"50\" aria-describedby=\"study-description\"><div class=\"control-ends\"><span id=\"range-start\">Apart</span><span id=\"range-end\">Together</span></div></div></div>\n        <p class=\"no-script\">This model needs JavaScript to respond to your input.</p>\n      </div>\n      <p class=\"lab-note\"><span aria-hidden=\"true\">\u21b3</span> Evidence context: <a href=\"docs/evidence/public-claim-inventory.md\">claim inventory</a> and <a href=\"docs/evidence/registry.md\">evidence registry</a>.</p>\n    </section>";
    el.appendChild(lab);
    ArkUI.mountStudio(el);
    if (!window.ArkMeshSettings || ArkMeshSettings.shapeVisible('lab')) {
      var figure = document.createElement('figure');
      figure.className = 'page-iceberg';
      figure.setAttribute('data-iceberg-anchor', '');
      figure.setAttribute('role', 'img');
      figure.setAttribute('aria-label', 'Decorative particle form');
      el.appendChild(figure);
    }
    host.appendChild(el);
    return el;
  }
};
