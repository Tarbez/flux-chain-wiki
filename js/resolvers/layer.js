/* Persistent layout and page presence are separate ARK composition fences. */
ArkUI.register('RLAYER_V1', {
  tag: 'div',
  schema: { N: 'name' },
  attrs: function (p) { return { 'data-ark-layer': p.name, class: 'ark-layer ark-layer-' + p.name }; }
});
