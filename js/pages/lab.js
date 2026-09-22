ArkUI.pageModules.lab = {
  mount: function (host) {
    var el = document.createElement('section');
    el.className = 'ark-page learning-page lab-page';
    el.dataset.arkPage = 'lab';
    el.setAttribute('aria-label', 'The open lab');
    var lab = document.createElement('div'); lab.className = 'expansion';
    lab.innerHTML = "<section class=\"experiments section\" id=\"work\" tabindex=\"-1\" aria-labelledby=\"experiments-title\">\n      <div class=\"section-heading\"><div><p class=\"eyebrow\">01 / The open lab</p><h2 id=\"experiments-title\">Small shifts.<br>Different perspectives.</h2></div><p>Change a variable. Notice what happens.<br>Three studies in how we see, group, and feel.</p></div>\n      <div class=\"lab\" data-mode=\"spacing\">\n        <div class=\"lab-toolbar\"><div class=\"study-tabs\" role=\"group\" aria-label=\"Choose an experiment\"><button type=\"button\" disabled data-study=\"spacing\" aria-pressed=\"true\">01 <span>Proximity</span></button><button type=\"button\" disabled data-study=\"rhythm\" aria-pressed=\"false\">02 <span>Rhythm</span></button><button type=\"button\" disabled data-study=\"depth\" aria-pressed=\"false\">03 <span>Depth</span></button></div><span class=\"live-label\"><span class=\"status-dot\"></span> INTERACTIVE STUDY</span></div>\n        <div class=\"experiment-stage\" role=\"img\" aria-label=\"Twelve dots in three groups. Adjust the spacing to explore perceived grouping.\"><div class=\"experiment-grid\"></div><span class=\"stage-corner\">SZ\u2014001</span><div class=\"specimen\" aria-hidden=\"true\"><span class=\"dot-group\"><i></i><i></i><i></i><i></i></span><span class=\"dot-group\"><i></i><i></i><i></i><i></i></span><span class=\"dot-group\"><i></i><i></i><i></i><i></i></span></div><span class=\"stage-footnote\">THE SAME ELEMENTS. A DIFFERENT RELATIONSHIP.</span><span class=\"stage-axis\" aria-hidden=\"true\">x \u2192</span></div>\n        <div class=\"lab-bottom\"><div class=\"study-description\"><h3 id=\"study-title\">When does a collection become a group?</h3><p id=\"study-description\">Bring things closer and they begin to belong together. Move them apart and new boundaries appear.</p></div><div class=\"control\"><div class=\"control-label\"><label for=\"variable\">Distance between groups</label><output for=\"variable\" id=\"variable-value\">50%</output></div><input id=\"variable\" disabled type=\"range\" min=\"0\" max=\"100\" value=\"50\" aria-describedby=\"study-description\"><div class=\"control-ends\"><span id=\"range-start\">Together</span><span id=\"range-end\">Apart</span></div></div></div>\n        <p class=\"no-script\">These studies need JavaScript to respond to your input.</p>\n      </div>\n      <p class=\"lab-note\"><span aria-hidden=\"true\">\u21b3</span> No right answer. Just something worth noticing.</p>\n    </section>";
    el.appendChild(lab);
    ArkUI.mountStudio(el);
    var figure = document.createElement('figure');
    figure.className = 'page-iceberg';
    figure.setAttribute('data-iceberg-anchor', '');
    figure.setAttribute('role', 'img');
    figure.setAttribute('aria-label', 'Decorative particle form');
    el.appendChild(figure);
    host.appendChild(el);
    return el;
  }
};
