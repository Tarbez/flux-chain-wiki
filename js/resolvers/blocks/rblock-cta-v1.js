/* =====================================================================
   RESOLVER  RBLOCK_CTA_V1  —  a generic button/link block
   ---------------------------------------------------------------------
   Part of the general component system (js/content/components.js). The
   one block type that depends on Part 2's link-editing retrofit: `href` is
   a manifest-style tagged link value (route:<key> / doc:<path> /
   url:<address>), resolved by the exact same js/ark/dash-kit.js helper
   every retrofitted page/resolver link now uses -- not a second, parallel
   href-building helper.

   Props:
     label     button text.
     href      a tagged link value, e.g. "route:about" or "url:https://...".
     variant   'primary' (default, solid) or 'secondary' (outline).

   `from` is not a real prop: js/content/components.js's render() injects
   it on every build as the instance's current route, so a doc: link knows
   where to return. */
ArkUI.register('RBLOCK_CTA_V1', {
  tag: 'div',
  base: { display: 'block', margin: '16px 0' },
  decorate: function (el, p) {
    var a = (ArkUI.dash && ArkUI.dash.linkEl)
      ? ArkUI.dash.linkEl(p.label || 'Learn more', p.href || '', p.from, null)
      : document.createElement('a');
    var solid = p.variant !== 'secondary';
    a.className = ArkUI.atomize({
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 20px',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-button)',
      fontWeight: '600',
      borderRadius: 'var(--size-control-radius)',
      textDecoration: 'none',
      backgroundColor: solid ? 'hsl(var(--primary))' : 'transparent',
      color: solid ? 'hsl(var(--text-inverse))' : 'hsl(var(--primary))',
      border: solid ? '0' : '1px solid hsl(var(--primary))'
    });
    el.appendChild(a);
  }
});
