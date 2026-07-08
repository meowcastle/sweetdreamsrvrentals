/* @ds-bundle: {"format":3,"namespace":"THESSHDesignSystem_8ff773","components":[{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Eyebrow","sourcePath":"components/core/Eyebrow.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Marquee","sourcePath":"components/media/Marquee.jsx"},{"name":"NowPlayingBadge","sourcePath":"components/media/NowPlayingBadge.jsx"},{"name":"RecordRow","sourcePath":"components/media/RecordRow.jsx"}],"sourceHashes":{"components/core/Button.jsx":"024900bd3052","components/core/Card.jsx":"1ea6f0ae58bc","components/core/Eyebrow.jsx":"c01e4b9e04f0","components/core/Tag.jsx":"2663d84ea5c6","components/media/Marquee.jsx":"aaa027308005","components/media/NowPlayingBadge.jsx":"a2b7123b558a","components/media/RecordRow.jsx":"aafdc5a82efc","ui_kits/site/Footer.jsx":"a3236f97c5b6","ui_kits/site/Hero.jsx":"2b849cf62c05","ui_kits/site/HistoryDrawer.jsx":"331fa8d2e5a6","ui_kits/site/Manifesto.jsx":"b508cd5692db","ui_kits/site/Nav.jsx":"f681a0c3484a","ui_kits/site/SetList.jsx":"c2467a6e6f23","ui_kits/site/SiteApp.jsx":"ed571761e4bf","ui_kits/site/WhenWhere.jsx":"2aef4f386b92"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.THESSHDesignSystem_8ff773 = window.THESSHDesignSystem_8ff773 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
/**
 * Button — THE SSH
 * Square-cornered, broadcast-styled action. Default label is mono
 * uppercase (the house CTA voice). Three variants; orange appears
 * only on the primary hover — the one accent moment.
 */
function Button({
  variant = 'primary',
  size = 'md',
  mono = true,
  full = false,
  href,
  as,
  disabled = false,
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const sizes = {
    sm: {
      padding: '8px 14px',
      font: mono ? '11px' : '13px'
    },
    md: {
      padding: '12px 22px',
      font: mono ? '12px' : '15px'
    },
    lg: {
      padding: '16px 30px',
      font: mono ? '13px' : '17px'
    }
  };
  const s = sizes[size] || sizes.md;
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: full ? '100%' : 'auto',
    padding: s.padding,
    fontSize: s.font,
    fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)',
    fontWeight: 700,
    textTransform: mono ? 'uppercase' : 'none',
    letterSpacing: mono ? '0.16em' : '0',
    lineHeight: 1,
    borderRadius: 'var(--radius-0)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    textDecoration: 'none',
    transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)',
    transform: press && !disabled ? 'translateY(1px)' : 'none',
    opacity: disabled ? 0.4 : 1,
    boxSizing: 'border-box',
    appearance: 'none',
    userSelect: 'none'
  };
  const variants = {
    primary: {
      background: hover && !disabled ? 'var(--orange)' : 'var(--ink)',
      color: hover && !disabled ? 'var(--ink)' : 'var(--paper)',
      border: '1px solid var(--ink)'
    },
    secondary: {
      background: hover && !disabled ? 'var(--ink)' : 'transparent',
      color: hover && !disabled ? 'var(--paper)' : 'var(--ink)',
      border: '1px solid var(--ink)'
    },
    ghost: {
      background: 'transparent',
      color: hover && !disabled ? 'var(--ink)' : 'var(--ink-2)',
      border: '1px solid transparent'
    }
  };
  const Tag = as || (href ? 'a' : 'button');
  const handlers = disabled ? {} : {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false)
  };
  return /*#__PURE__*/React.createElement(Tag, _extends({
    href: href,
    disabled: Tag === 'button' ? disabled : undefined,
    style: {
      ...base,
      ...(variants[variant] || variants.primary),
      ...style
    }
  }, handlers, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Eyebrow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Eyebrow — THE SSH
 * The mono section label, optionally trailed by a hairline rule that
 * fills the row (the broadcast "sec-label" pattern). Use above
 * headlines and to open sections.
 */
function Eyebrow({
  children,
  rule = false,
  ruleStrong = false,
  invert = false,
  style,
  ...rest
}) {
  const color = invert ? 'var(--text-invert-muted)' : 'var(--text-muted)';
  const ruleColor = ruleStrong ? invert ? 'var(--line-invert)' : 'var(--line-strong)' : invert ? 'var(--line-invert)' : 'var(--line)';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      width: '100%',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--label-md)',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-label)',
      color,
      whiteSpace: 'nowrap',
      flex: 'none'
    }
  }, children), rule && /*#__PURE__*/React.createElement("span", {
    style: {
      height: '1px',
      background: ruleColor,
      flex: 1
    }
  }));
}
Object.assign(__ds_scope, { Eyebrow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Eyebrow.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Card — THE SSH
 * A bordered surface block. Hairline frame, square corners, no shadow.
 * Optional mono eyebrow + display title header. Use `invert` for the
 * ink-on-paper inversions that punctuate a layout.
 */
function Card({
  eyebrow,
  title,
  invert = false,
  padding = 'var(--space-6)',
  bordered = true,
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("section", _extends({
    style: {
      background: invert ? 'var(--ink)' : 'var(--surface)',
      color: invert ? 'var(--paper)' : 'var(--ink)',
      border: bordered ? '1px solid var(--ink)' : 'none',
      borderRadius: 'var(--radius-0)',
      padding,
      ...style
    }
  }, rest), eyebrow && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: title ? 'var(--space-3)' : 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Eyebrow, {
    invert: invert
  }, eyebrow)), title && /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 900,
      textTransform: 'uppercase',
      lineHeight: 0.9,
      letterSpacing: '-0.01em',
      fontSize: 'var(--text-d3)',
      margin: '0 0 var(--space-4)',
      color: 'inherit'
    }
  }, title), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Tag — THE SSH
 * A pill capsule for format labels and status flags
 * ("★ PHYSICAL ONLY ★"). Mono, uppercase, hairline by default.
 */
function Tag({
  variant = 'outline',
  size = 'md',
  children,
  style,
  ...rest
}) {
  const sizes = {
    sm: {
      padding: '4px 10px',
      font: '10px'
    },
    md: {
      padding: '6px 14px',
      font: '11px'
    },
    lg: {
      padding: '9px 18px',
      font: '12px'
    }
  };
  const s = sizes[size] || sizes.md;
  const variants = {
    outline: {
      background: 'transparent',
      color: 'var(--ink)',
      border: '1px solid var(--ink)'
    },
    solid: {
      background: 'var(--ink)',
      color: 'var(--paper)',
      border: '1px solid var(--ink)'
    },
    accent: {
      background: 'var(--orange)',
      color: 'var(--ink)',
      border: '1px solid var(--orange)'
    },
    muted: {
      background: 'transparent',
      color: 'var(--ink-2)',
      border: '1px solid var(--line-2)'
    }
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: s.padding,
      fontFamily: 'var(--font-mono)',
      fontSize: s.font,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.18em',
      lineHeight: 1,
      borderRadius: 'var(--radius-pill)',
      whiteSpace: 'nowrap',
      ...(variants[variant] || variants.outline),
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/media/Marquee.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Marquee — THE SSH
 * The restrained descendant of the original giant ticker: a single
 * hairline-bounded band of slow-scrolling mono text. Items are joined
 * by an orange star. Duplicated inline for a seamless loop.
 */
function Marquee({
  items = [],
  speed = 38,
  reverse = false,
  invert = false,
  size = '13px',
  style,
  ...rest
}) {
  const list = items.length ? items : ['No streaming', 'No algorithms', 'All formats welcome'];
  const sequence = [...list, ...list];
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      overflow: 'hidden',
      borderTop: `1px solid ${invert ? 'var(--line-invert)' : 'var(--line-strong)'}`,
      borderBottom: `1px solid ${invert ? 'var(--line-invert)' : 'var(--line-strong)'}`,
      background: invert ? 'var(--ink)' : 'transparent',
      color: invert ? 'var(--paper)' : 'var(--ink)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "ssh-marquee-track",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      whiteSpace: 'nowrap',
      padding: '10px 0',
      animation: `ssh-marquee ${speed}s linear infinite${reverse ? ' reverse' : ''}`,
      willChange: 'transform'
    }
  }, sequence.map((item, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      display: 'inline-flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: size,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.16em'
    }
  }, item), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--orange)',
      padding: '0 1.4em',
      fontSize: size
    }
  }, "\u2605")))));
}
Object.assign(__ds_scope, { Marquee });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/media/Marquee.jsx", error: String((e && e.message) || e) }); }

// components/media/NowPlayingBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * NowPlayingBadge — THE SSH
 * The signature broadcast chip: an orange "live" pulse, animated EQ
 * bars, and the current track in mono. The site's one piece of motion.
 */
function NowPlayingBadge({
  title = 'Untitled',
  artist = 'Unknown',
  label = 'Now Playing',
  invert = false,
  style,
  ...rest
}) {
  const fg = invert ? 'var(--paper)' : 'var(--ink)';
  const muted = invert ? 'var(--text-invert-muted)' : 'var(--ink-2)';
  const line = invert ? 'var(--line-invert)' : 'var(--line-2)';
  const bars = [{
    h: '55%',
    d: '0ms'
  }, {
    h: '100%',
    d: '160ms'
  }, {
    h: '70%',
    d: '320ms'
  }, {
    h: '42%',
    d: '80ms'
  }];
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 16px',
      border: `1px solid ${line}`,
      borderRadius: 'var(--radius-0)',
      background: invert ? 'transparent' : 'var(--surface)',
      color: fg,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      width: '8px',
      height: '8px',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: '999px',
      background: 'var(--orange)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: '2px',
      height: '13px',
      flex: 'none'
    }
  }, bars.map((b, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "ssh-eq-bar",
    style: {
      width: '3px',
      height: b.h,
      background: 'var(--orange)',
      transformOrigin: 'bottom',
      animation: `ssh-eq 0.7s var(--ease-std) ${b.d} infinite alternate`
    }
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '9px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.22em',
      color: 'var(--orange-ink)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: '8px',
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: '13px',
      fontWeight: 600,
      color: fg
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: '12px',
      color: muted
    }
  }, artist))));
}
Object.assign(__ds_scope, { NowPlayingBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/media/NowPlayingBadge.jsx", error: String((e && e.message) || e) }); }

// components/media/RecordRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
/**
 * RecordRow — THE SSH
 * A single line in a set list / history: index, artwork, title, artist,
 * format tag, and timecode. Hairline divider, restrained hover.
 */
function RecordRow({
  index,
  title = 'Untitled',
  artist = 'Unknown',
  format,
  time,
  artwork,
  href,
  style,
  ...rest
}) {
  const [hover, setHover] = useState(false);
  const Tag = href ? 'a' : 'div';
  return /*#__PURE__*/React.createElement(Tag, _extends({
    href: href,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'grid',
      gridTemplateColumns: `${index != null ? '28px ' : ''}${artwork ? '40px ' : ''}1fr auto`,
      alignItems: 'center',
      gap: '16px',
      padding: '12px 8px',
      borderBottom: '1px solid var(--line)',
      textDecoration: 'none',
      color: 'var(--ink)',
      background: hover ? 'var(--paper-3)' : 'transparent',
      transition: 'background var(--dur-fast) var(--ease-out)',
      ...style
    }
  }, rest), index != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '12px',
      color: 'var(--ink-3)'
    }
  }, String(index).padStart(2, '0')), artwork && /*#__PURE__*/React.createElement("span", {
    style: {
      width: '40px',
      height: '40px',
      overflow: 'hidden',
      border: '1px solid var(--line)',
      background: 'var(--ink)',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: artwork,
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: '15px',
      fontWeight: 600,
      color: hover ? 'var(--orange-ink)' : 'var(--ink)',
      transition: 'color var(--dur-fast) var(--ease-out)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: '13px',
      color: 'var(--ink-2)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, artist)), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      flex: 'none'
    }
  }, format && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.16em',
      color: 'var(--ink-2)'
    }
  }, format), time && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '12px',
      color: 'var(--ink-3)'
    }
  }, time)));
}
Object.assign(__ds_scope, { RecordRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/media/RecordRow.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/Footer.jsx
try { (() => {
/* global React */
// Footer — ink field, oversized wordmark, mono legal row.
const {
  Tag
} = window.THESSHDesignSystem_8ff773;
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--ink)',
      color: 'var(--paper)',
      padding: 'clamp(48px,7vw,96px) 0 32px',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ssh-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 900,
      textTransform: 'uppercase',
      fontSize: 'clamp(72px, 20vw, 280px)',
      lineHeight: 0.78,
      letterSpacing: '-0.02em'
    }
  }, "THE", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--orange)'
    }
  }, "SSH")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'clamp(28px,4vw,52px)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: '24px',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '12px',
      textTransform: 'uppercase',
      letterSpacing: '0.14em',
      lineHeight: 1.8
    }
  }, "Saturday Summer Hang", /*#__PURE__*/React.createElement("br", null), "Clinton Hill \xB7 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--orange)'
    }
  }, "Brooklyn, NY")), /*#__PURE__*/React.createElement(Tag, {
    variant: "outline",
    style: {
      borderColor: 'var(--paper)',
      color: 'var(--paper)'
    }
  }, "\u2605 Physical only \u2605")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'clamp(28px,4vw,56px)',
      paddingTop: '20px',
      borderTop: '1px solid var(--line-invert)',
      display: 'flex',
      justifyContent: 'space-between',
      gap: '16px',
      flexWrap: 'wrap',
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--text-invert-muted)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 The SSH NYC"), /*#__PURE__*/React.createElement("span", null, "No streaming \xB7 No algorithms \xB7 No format left behind"))));
}
window.Footer = Footer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/Footer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/Hero.jsx
try { (() => {
/* global React */
// Hero — editorial split. Cream column of type, full-height framed photo.
const {
  Button,
  Eyebrow
} = window.THESSHDesignSystem_8ff773;
function Hero() {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      background: 'var(--paper)',
      borderBottom: '1px solid var(--ink)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "hero-grid"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'clamp(40px,6vw,88px) var(--gutter)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: '40px',
      minHeight: 'min(82vh, 760px)'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    rule: true
  }, "Est. Clinton Hill \xB7 Brooklyn"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 900,
      textTransform: 'uppercase',
      lineHeight: 0.84,
      letterSpacing: '-0.015em',
      margin: 0,
      fontSize: 'clamp(52px, 8vw, 116px)',
      color: 'var(--ink)'
    }
  }, "Saturday", /*#__PURE__*/React.createElement("br", null), "Summer", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--orange)'
    }
  }, "Hang")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 500,
      fontSize: 'var(--text-lead)',
      lineHeight: 1.4,
      maxWidth: '36ch',
      marginTop: '28px',
      color: 'var(--ink-2)'
    }
  }, "A weekly gathering of music lovers. Everything we play comes from a physical format \u2014 vinyl, cassette, CD, iPod.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    href: "#when"
  }, "Pull up Saturday"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    href: "#sets"
  }, "See what played"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      borderLeft: '1px solid var(--ink)',
      minHeight: '320px',
      background: 'var(--ink)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/photos/rig-setup.jpg",
    alt: "The SSH driveway setup",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: '14px var(--gutter)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      background: 'linear-gradient(to top, rgba(23,19,13,.72), transparent)',
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.16em',
      color: 'var(--paper)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "The rig \xB7 last Saturday"), /*#__PURE__*/React.createElement("span", null, "14:02")))));
}
window.Hero = Hero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/HistoryDrawer.jsx
try { (() => {
/* global React */
// HistoryDrawer — slide-in set history panel, grouped by date. Uses RecordRow.
const {
  RecordRow,
  Eyebrow,
  Tag
} = window.THESSHDesignSystem_8ff773;
const HISTORY = [{
  date: 'Saturday · June 13',
  tracks: [{
    title: 'Avalon',
    artist: 'Roxy Music',
    format: 'iPod',
    time: '18:02'
  }, {
    title: 'Innervisions',
    artist: 'Stevie Wonder',
    format: 'CD',
    time: '17:39'
  }, {
    title: 'Sign o\u2019 the Times',
    artist: 'Prince',
    format: 'Cassette',
    time: '17:14'
  }, {
    title: 'Aja',
    artist: 'Steely Dan',
    format: 'Vinyl',
    time: '16:51'
  }, {
    title: 'La Voce Del Padrone',
    artist: 'Franco Battiato',
    format: 'Vinyl',
    time: '16:38'
  }]
}, {
  date: 'Saturday · June 6',
  tracks: [{
    title: 'Remain in Light',
    artist: 'Talking Heads',
    format: 'Vinyl',
    time: '19:20'
  }, {
    title: 'The Köln Concert',
    artist: 'Keith Jarrett',
    format: 'CD',
    time: '18:44'
  }, {
    title: 'Pang!',
    artist: 'Caroline Polachek',
    format: 'iPod',
    time: '17:55'
  }]
}];
function HistoryDrawer({
  open,
  onClose
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 80,
      background: 'rgba(23,19,13,0.45)',
      opacity: open ? 1 : 0,
      pointerEvents: open ? 'auto' : 'none',
      transition: 'opacity var(--dur-base) var(--ease-out)'
    }
  }), /*#__PURE__*/React.createElement("aside", {
    style: {
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      zIndex: 90,
      width: 'min(440px, 92vw)',
      background: 'var(--paper)',
      borderLeft: '1px solid var(--ink)',
      transform: open ? 'translateX(0)' : 'translateX(101%)',
      transition: 'transform var(--dur-slow) var(--ease-out)',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: open ? 'var(--shadow-card)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '18px 22px',
      borderBottom: '1px solid var(--ink)',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 900,
      textTransform: 'uppercase',
      fontSize: '22px',
      letterSpacing: '-0.01em'
    }
  }, "Set history"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Close",
    style: {
      appearance: 'none',
      cursor: 'pointer',
      background: 'transparent',
      border: '1px solid var(--ink)',
      width: '32px',
      height: '32px',
      display: 'grid',
      placeItems: 'center',
      color: 'var(--ink)',
      fontFamily: 'var(--font-mono)',
      fontSize: '14px'
    }
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowY: 'auto',
      flex: 1,
      padding: '0 22px 28px'
    }
  }, HISTORY.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.date,
    style: {
      marginTop: '24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '8px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.18em',
      color: 'var(--ink-2)'
    }
  }, g.date), /*#__PURE__*/React.createElement(Tag, {
    variant: "muted",
    size: "sm"
  }, g.tracks.length)), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--ink)'
    }
  }, g.tracks.map((t, i) => /*#__PURE__*/React.createElement(RecordRow, {
    key: i,
    title: t.title,
    artist: t.artist,
    format: t.format,
    time: t.time
  }))))))));
}
window.HistoryDrawer = HistoryDrawer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/HistoryDrawer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/Manifesto.jsx
try { (() => {
/* global React */
// Manifesto — a single large lede on cream, lots of air. One marquee band.
const {
  Marquee,
  Eyebrow
} = window.THESSHDesignSystem_8ff773;
function Manifesto() {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Marquee, {
    items: ['Vinyl', 'Cassette', 'CD', 'iPod'],
    speed: 34,
    style: {
      borderTop: 'none'
    }
  }), /*#__PURE__*/React.createElement("section", {
    id: "what",
    style: {
      background: 'var(--paper)',
      padding: 'var(--section-y) 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ssh-wrap",
    style: {
      display: 'grid',
      gap: 'clamp(28px,4vw,56px)'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    rule: true
  }, "What it is"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 500,
      fontSize: 'clamp(22px, 3vw, 40px)',
      lineHeight: 1.32,
      letterSpacing: '-0.01em',
      maxWidth: '20ch',
      margin: 0,
      color: 'var(--ink)'
    }
  }, "We listen together. The day starts ", /*#__PURE__*/React.createElement(Mark, null, "open format"), " \u2014 anyone can put something on \u2014 and builds into ", /*#__PURE__*/React.createElement(Mark, null, "featured sets"), " from the community."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '32px',
      flexWrap: 'wrap',
      borderTop: '1px solid var(--line)',
      paddingTop: '24px'
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    k: "No streaming",
    v: "Ever"
  }), /*#__PURE__*/React.createElement(Stat, {
    k: "No algorithms",
    v: "None"
  }), /*#__PURE__*/React.createElement(Stat, {
    k: "Formats welcome",
    v: "All four"
  })))));
}
function Mark({
  children
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      boxShadow: 'inset 0 -0.42em 0 rgba(234,150,26,0.35)'
    }
  }, children);
}
function Stat({
  k,
  v
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.18em',
      color: 'var(--ink-2)'
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 900,
      textTransform: 'uppercase',
      fontSize: '26px',
      color: 'var(--ink)'
    }
  }, v));
}
window.Manifesto = Manifesto;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/Manifesto.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/Nav.jsx
try { (() => {
/* global React */
// Nav — thin broadcast slate, fixed to top. Mono metadata, live tag.
const {
  Tag
} = window.THESSHDesignSystem_8ff773;
function Nav({
  onOpenHistory
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'var(--ink)',
      color: 'var(--paper)',
      borderBottom: '1px solid var(--line-invert)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ssh-wrap",
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '52px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 900,
      textTransform: 'uppercase',
      fontSize: '18px',
      letterSpacing: '-0.01em'
    }
  }, "THE SSH"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.24em',
      color: 'var(--text-invert-muted)'
    },
    className: "nav-tag"
  }, "Saturday Summer Hang")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '18px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '7px',
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.2em',
      color: 'var(--paper)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: '7px',
      height: '7px',
      borderRadius: '999px',
      background: 'var(--orange)'
    }
  }), "Clinton Hill"), /*#__PURE__*/React.createElement("button", {
    onClick: onOpenHistory,
    style: {
      appearance: 'none',
      cursor: 'pointer',
      background: 'transparent',
      border: '1px solid var(--line-invert)',
      color: 'var(--paper)',
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.18em',
      padding: '7px 13px'
    }
  }, "Set history"))));
}
window.Nav = Nav;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/Nav.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/SetList.jsx
try { (() => {
/* global React */
// SetList — aligned photo grid + last Saturday's set list. Now-playing on top.
const {
  Eyebrow,
  NowPlayingBadge,
  RecordRow,
  Tag
} = window.THESSHDesignSystem_8ff773;
const PHOTOS = [{
  src: 'group.jpg',
  cap: 'The crowd',
  t: '15:20'
}, {
  src: 'handoff.jpg',
  cap: 'The handoff',
  t: '16:38'
}, {
  src: 'table.jpg',
  cap: 'Side table',
  t: '18:05'
}, {
  src: 'evening.jpg',
  cap: 'Side B',
  t: '20:11'
}];
const SET = [{
  title: 'La Voce Del Padrone',
  artist: 'Franco Battiato',
  format: 'Vinyl',
  time: '16:38'
}, {
  title: 'Aja',
  artist: 'Steely Dan',
  format: 'Vinyl',
  time: '16:51'
}, {
  title: 'Sign o\u2019 the Times',
  artist: 'Prince',
  format: 'Cassette',
  time: '17:14'
}, {
  title: 'Innervisions',
  artist: 'Stevie Wonder',
  format: 'CD',
  time: '17:39'
}, {
  title: 'Avalon',
  artist: 'Roxy Music',
  format: 'iPod',
  time: '18:02'
}];
function SetList() {
  return /*#__PURE__*/React.createElement("section", {
    id: "sets",
    style: {
      background: 'var(--paper-2)',
      borderTop: '1px solid var(--ink)',
      borderBottom: '1px solid var(--ink)',
      padding: 'var(--section-y) 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ssh-wrap",
    style: {
      display: 'grid',
      gap: 'clamp(30px,4vw,52px)'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    rule: true
  }, "From the hang"), /*#__PURE__*/React.createElement("div", {
    className: "sets-grid"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 900,
      textTransform: 'uppercase',
      fontSize: 'clamp(34px,4.6vw,60px)',
      lineHeight: 0.88,
      letterSpacing: '-0.01em',
      margin: '0 0 24px',
      color: 'var(--ink)',
      maxWidth: '14ch'
    }
  }, "Scenes from the driveway"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '14px'
    }
  }, PHOTOS.map(p => /*#__PURE__*/React.createElement("figure", {
    key: p.src,
    style: {
      margin: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      aspectRatio: '4/5',
      overflow: 'hidden',
      border: '1px solid var(--ink)',
      background: 'var(--ink)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: `../../assets/photos/${p.src}`,
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block'
    }
  })), /*#__PURE__*/React.createElement("figcaption", {
    style: {
      marginTop: '8px',
      display: 'flex',
      justifyContent: 'space-between',
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: 'var(--ink-2)'
    }
  }, /*#__PURE__*/React.createElement("span", null, p.cap), /*#__PURE__*/React.createElement("span", null, p.t)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }
  }, /*#__PURE__*/React.createElement(NowPlayingBadge, {
    title: "Avalon",
    artist: "Roxy Music",
    style: {
      alignSelf: 'flex-start'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.2em',
      color: 'var(--ink-2)'
    }
  }, "Last Saturday \xB7 Side A"), /*#__PURE__*/React.createElement(Tag, {
    variant: "outline",
    size: "sm"
  }, SET.length, " tracks")), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--ink)'
    }
  }, SET.map((s, i) => /*#__PURE__*/React.createElement(RecordRow, {
    key: i,
    index: i + 1,
    title: s.title,
    artist: s.artist,
    format: s.format,
    time: s.time
  })))))));
}
window.SetList = SetList;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/SetList.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/SiteApp.jsx
try { (() => {
/* global React */
// SiteApp — composes the minimalist SSH site and wires the history drawer.
function SiteApp() {
  const [historyOpen, setHistoryOpen] = React.useState(false);
  React.useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') setHistoryOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "SSH \u2014 Home",
    style: {
      background: 'var(--paper)'
    }
  }, /*#__PURE__*/React.createElement(window.Nav, {
    onOpenHistory: () => setHistoryOpen(true)
  }), /*#__PURE__*/React.createElement(window.Hero, null), /*#__PURE__*/React.createElement(window.Manifesto, null), /*#__PURE__*/React.createElement(window.WhenWhere, null), /*#__PURE__*/React.createElement(window.SetList, null), /*#__PURE__*/React.createElement(window.Footer, null), /*#__PURE__*/React.createElement(window.HistoryDrawer, {
    open: historyOpen,
    onClose: () => setHistoryOpen(false)
  }));
}
window.SiteApp = SiteApp;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/SiteApp.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/WhenWhere.jsx
try { (() => {
/* global React */
// WhenWhere — a three-cell hairline grid. The middle cell inverts to ink.
const {
  Eyebrow
} = window.THESSHDesignSystem_8ff773;
function Cell({
  k,
  big,
  meta,
  invert
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: invert ? 'var(--ink)' : 'var(--paper)',
      color: invert ? 'var(--paper)' : 'var(--ink)',
      padding: 'clamp(24px,3vw,40px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: '28px',
      minHeight: 'clamp(220px,26vw,320px)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.22em',
      color: invert ? 'var(--text-invert-muted)' : 'var(--ink-2)'
    }
  }, k), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 900,
      textTransform: 'uppercase',
      fontSize: 'clamp(38px,5vw,68px)',
      lineHeight: 0.86,
      letterSpacing: '-0.01em',
      color: invert ? 'var(--orange)' : 'var(--ink)'
    }
  }, big), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: '15px',
      lineHeight: 1.5,
      margin: 0,
      color: invert ? 'var(--text-invert-muted)' : 'var(--ink-2)'
    }
  }, meta));
}
function WhenWhere() {
  return /*#__PURE__*/React.createElement("section", {
    id: "when",
    style: {
      background: 'var(--paper)',
      padding: 'var(--section-y) 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ssh-wrap",
    style: {
      display: 'grid',
      gap: 'clamp(24px,3vw,40px)'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    rule: true
  }, "Come through"), /*#__PURE__*/React.createElement("div", {
    className: "ww-grid",
    style: {
      border: '1px solid var(--ink)'
    }
  }, /*#__PURE__*/React.createElement(Cell, {
    k: "When",
    big: /*#__PURE__*/React.createElement("span", null, "Satur\xADdays"),
    meta: /*#__PURE__*/React.createElement(React.Fragment, null, "Summer 2026.", /*#__PURE__*/React.createElement("br", null), "Afternoon into evening.")
  }), /*#__PURE__*/React.createElement(Cell, {
    k: "Where",
    big: "Clinton Hill",
    meta: /*#__PURE__*/React.createElement(React.Fragment, null, "Brooklyn, New York.", /*#__PURE__*/React.createElement("br", null), "Address shared with friends."),
    invert: true
  }), /*#__PURE__*/React.createElement(Cell, {
    k: "The vibe",
    big: "Bring it all",
    meta: /*#__PURE__*/React.createElement(React.Fragment, null, "Records, CDs, tapes, iPods.", /*#__PURE__*/React.createElement("br", null), "No format left behind.")
  }))));
}
window.WhenWhere = WhenWhere;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/WhenWhere.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Eyebrow = __ds_scope.Eyebrow;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Marquee = __ds_scope.Marquee;

__ds_ns.NowPlayingBadge = __ds_scope.NowPlayingBadge;

__ds_ns.RecordRow = __ds_scope.RecordRow;

})();
