ArkUI.pageModules.lab = {
  mount: function (host) {
    var el = document.createElement('section');
    el.className = 'ark-page learning-page lab-page';
    el.dataset.arkPage = 'lab';
    el.setAttribute('aria-label', 'The open lab');
    var lab = document.createElement('div'); lab.className = 'expansion';
    lab.innerHTML = "<section class=\"experiments section\" id=\"work\" tabindex=\"-1\" aria-labelledby=\"experiments-title\">\n      <div class=\"section-heading\"><div><p class=\"eyebrow\">01 / The open lab</p><h2 id=\"experiments-title\">Three mechanics.<br>Nothing simulated but the pace.</h2></div><p>Change a variable. Notice what happens.<br>Three illustrations of real Flux Protocol mechanics, scrubbed live \u2014 not a feed of real network data.</p></div>\n      <div class=\"lab\" data-mode=\"spacing\">\n        <div class=\"lab-toolbar\"><div class=\"study-tabs\" role=\"group\" aria-label=\"Choose an experiment\"><button type=\"button\" disabled data-study=\"spacing\" aria-pressed=\"true\">01 <span>Authority</span></button><button type=\"button\" disabled data-study=\"rhythm\" aria-pressed=\"false\">02 <span>Lifecycle</span></button><button type=\"button\" disabled data-study=\"depth\" aria-pressed=\"false\">03 <span>Networks</span></button></div><span class=\"live-label\"><span class=\"status-dot\"></span> INTERACTIVE STUDY</span></div>\n        <div class=\"experiment-stage\" role=\"img\" aria-label=\"Twelve dots in three independent groups, standing in for an authority cell's copies. Adjust agreement to explore how a cell reaches threshold.\"><div class=\"experiment-grid\"></div><span class=\"stage-corner\">FX\u2014001</span><div class=\"specimen\" aria-hidden=\"true\"><span class=\"dot-group\"><i></i><i></i><i></i><i></i></span><span class=\"dot-group\"><i></i><i></i><i></i><i></i></span><span class=\"dot-group\"><i></i><i></i><i></i><i></i></span></div><span class=\"stage-footnote\">A CELL FORMS, CERTIFIES ONE TRANSITION, AND DISSOLVES.</span><span class=\"stage-axis\" aria-hidden=\"true\">x \u2192</span></div>\n        <div class=\"lab-bottom\"><div class=\"study-description\"><h3 id=\"study-title\">When does a cell stop needing a committee?</h3><p id=\"study-description\">An ephemeral authority cell is derived for one object, verifies one transition, and dissolves. Bring the independent copies into agreement and the cell closes; keep them apart and it stays open, waiting for threshold evidence \u2014 never for one voice to just decide.</p></div><div class=\"control\"><div class=\"control-label\"><label for=\"variable\">How close the copies are to threshold agreement</label><output for=\"variable\" id=\"variable-value\">50%</output></div><input id=\"variable\" disabled type=\"range\" min=\"0\" max=\"100\" value=\"50\" aria-describedby=\"study-description\"><div class=\"control-ends\"><span id=\"range-start\">Diverging</span><span id=\"range-end\">At threshold</span></div></div></div>\n        <p class=\"no-script\">These studies need JavaScript to respond to your input.</p>\n      </div>\n      <p class=\"lab-note\"><span aria-hidden=\"true\">\u21b3</span> Illustrative \u2014 these mechanics are real and sourced (see the spec), but this page has no live feed of real network data.</p>\n    </section>";
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
