ArkUI.pageModules.about = {
  mount: function (host) {
    var el = document.createElement('section');
    el.className = 'ark-page learning-page about-page'; el.dataset.arkPage = 'about';
    el.setAttribute('aria-labelledby', 'about-title');
    el.innerHTML = '<div class="concept-content"><p class="learning-eyebrow">ABOUT SUBZERO</p><h1 id="about-title" class="learning-heading">Care is part of the experience.</h1><p class="concept-deck">Subzero is an independent design and experimentation studio. We build rich digital experiences with a purpose: to enrich, educate, and make room for discovery.</p><div class="concept-principles"><section><span>01</span><div><h2>Thoughtful journeys.</h2><p>Every step should have a reason. We shape the path, the pace, and the small interactions so people can explore with intention and understand where they are going.</p></div></section><section><span>02</span><div><h2>Carefully crafted.</h2><p>We bring form, motion, words, and behavior together. The details matter because they change how an experience feels—and how well it serves someone.</p></div></section><section><span>03</span><div><h2>Learning belongs here.</h2><p>For designers, curious beginners, and people building something new, we share experiments and explain what we learn in plain language. The work should leave people with more than an impression.</p></div></section></div><a class="article-back" href="#/concept" data-scene-link="concept">EXPLORE THE SUBZERO THEORY ↗</a></div>';
    host.appendChild(el); return el;
  }
};
