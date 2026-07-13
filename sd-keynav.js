/* ────────────────────────────────────────────────────────────────
   Sweet Dreams — Enter-to-advance for multi-field forms, site-wide.
   Pressing Enter in an input jumps to the next field in the same group
   instead of doing nothing (the default for a plain <input> with no
   surrounding <form>, which is what every form on this site is built as).
   On the last field, it clicks the group's marked primary action instead,
   so Enter behaves the way a real <form> submit would.

   Usage: wrap a form's container in data-sd-enter-group, add
   onKeyDown="{{ someHandler }}" (calling SDKeyNav.advanceOnEnter) to each
   input/select in it, and mark the one button Enter should fire with
   data-sd-enter-submit. Groups with no marked button just advance-and-stop
   on the last field - safe default when there's more than one plausible
   action (e.g. "Email quote" vs "Paid over the phone").
   ──────────────────────────────────────────────────────────────── */
(function () {
  function advanceOnEnter(e) {
    if (e.key !== 'Enter' || e.shiftKey) return;
    // Textareas want a real newline on Enter, not a jump to the next field.
    if (e.target.tagName === 'TEXTAREA') return;
    e.preventDefault();
    var group = e.target.closest('[data-sd-enter-group]') || document;
    var fields = Array.prototype.slice
      .call(group.querySelectorAll('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'))
      .filter(function (el) { return el.offsetParent !== null; });
    var idx = fields.indexOf(e.target);
    var next = idx > -1 ? fields[idx + 1] : null;
    if (next) {
      next.focus();
      if (next.tagName !== 'SELECT' && typeof next.select === 'function') next.select();
      return;
    }
    var btn = group.querySelector('[data-sd-enter-submit]');
    if (btn && !btn.disabled) btn.click();
  }
  window.SDKeyNav = { advanceOnEnter: advanceOnEnter };
})();
