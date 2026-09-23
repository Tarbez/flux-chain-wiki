ArkUI.pageModules.lab = {
  mount: function (host) {
    var el = document.createElement('section');
    el.className = 'ark-page learning-page lab-page';
    el.dataset.arkPage = 'lab';
    el.setAttribute('aria-label', 'The open lab');
    var lab = document.createElement('div'); lab.className = 'expansion';
    lab.innerHTML = "<section class=\"experiments section\" id=\"work\" tabindex=\"-1\" aria-labelledby=\"experiments-title\">\n      <div class=\"section-heading\"><div><p class=\"eyebrow\">01 / The open lab</p><h2 id=\"experiments-title\">Same idea.<br>Three ways to see it.</h2></div><p>Change a variable. Notice what happens.<br>Three illustrations of ideas from the Flux spec.</p></div>\n      <div class=\"lab\" data-mode=\"spacing\">\n        <div class=\"lab-toolbar\"><div class=\"study-tabs\" role=\"group\" aria-label=\"Choose an experiment\"><button type=\"button\" disabled data-study=\"spacing\" aria-pressed=\"true\">01 <span>Quorum</span></button><button type=\"button\" disabled data-study=\"rhythm\" aria-pressed=\"false\">02 <span>Compact</span></button><button type=\"button\" disabled data-study=\"depth\" aria-pressed=\"false\">03 <span>CID</span></button></div><span class=\"live-label\"><span class=\"status-dot\"></span> INTERACTIVE STUDY</span></div>\n        <div class=\"experiment-stage\" role=\"img\" aria-label=\"Twelve dots in three independent groups. Adjust agreement to explore how separate copies read as one.\"><div class=\"experiment-grid\"></div><span class=\"stage-corner\">FX\u2014001</span><div class=\"specimen\" aria-hidden=\"true\"><span class=\"dot-group\"><i></i><i></i><i></i><i></i></span><span class=\"dot-group\"><i></i><i></i><i></i><i></i></span><span class=\"dot-group\"><i></i><i></i><i></i><i></i></span></div><span class=\"stage-footnote\">SEVERAL COPIES. ONE LEDGER, ONCE THEY AGREE.</span><span class=\"stage-axis\" aria-hidden=\"true\">x \u2192</span></div>\n        <div class=\"lab-bottom\"><div class=\"study-description\"><h3 id=\"study-title\">When do separate copies start to read as one?</h3><p id=\"study-description\">Bring independent groups of points closer and they begin to read as a single shape. Move them apart and each looks like its own story \u2014 the same idea behind a quorum: several copies of a ledger, agreeing rather than any one dictating the rest.</p></div><div class=\"control\"><div class=\"control-label\"><label for=\"variable\">How closely the copies agree</label><output for=\"variable\" id=\"variable-value\">50%</output></div><input id=\"variable\" disabled type=\"range\" min=\"0\" max=\"100\" value=\"50\" aria-describedby=\"study-description\"><div class=\"control-ends\"><span id=\"range-start\">Diverging</span><span id=\"range-end\">Agreeing</span></div></div></div>\n        <p class=\"no-script\">These studies need JavaScript to respond to your input.</p>\n      </div>\n      <p class=\"lab-note\"><span aria-hidden=\"true\">\u21b3</span> Not a simulation \u2014 just three ways to feel what the spec means.</p>\n    </section>";
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
