import _ from 'lodash';
import { TopographySketch } from '@/sketch';

//

var DEFAULT_SIMPLIFY_COEFFICIENT = 20; // Degree of polygon simplification
var DEFAULT_PING_TIME = 15; // Amount of time(ms) between updates, in milliseconds.
var DEFAULT_FORCE = 8; // The amount of 'z' added to a point during mouse movement.
var DEFAULT_DECAY_TIME = 2000; // Amount of time(ms) before a cell stops growing when the mouse hovers over a cell.

var id = 0; // Unique id of of this component // TODO: test that this enables parallel topography instances

var script = {
  name: 'Topography',
  props: {
    // Degree to which simplification is applied to the contours.
    simplify: {
      type: Number,
      required: false,
      default: function default$1 () {
        return DEFAULT_SIMPLIFY_COEFFICIENT
      }
    },

    // Amount of time(ms) between updates.
    ping: {
      type: Number,
      required: false,
      default: function default$2 () {
        return DEFAULT_PING_TIME
      }
    },

    // The amount of 'z' added to a point during mouse movement.
    force: {
      type: Number,
      required: false,
      default: function default$3 () {
        return DEFAULT_FORCE
      }
    },

    // Amount of time(ms) before a cell stops growing when the mouse hovers over a cell.
    decayTime: {
      type: Number,
      required: false,
      default: function default$4 () {
        return DEFAULT_DECAY_TIME
      }
    }
  },
  data: function data () {
    return {
      sketchId: 'p5-canvas-' + ++id, // Unique id that matches the a child element's id.
      sketch: undefined, // The p5 sketch.
      mousePosition: undefined, // Mouse position coordinates relative to the root element's size.
      prevMousePosition: undefined, // Previous mouse position.
      mouseCell: undefined, // Coordinates of the resolution cell that the mouse is within.
      prevMouseCell: undefined, // Previous coordinates of the resolution cell that the mouse was within.
      updateIntervalId: undefined, // The id of the interval between updates.
      restingPointerStartTime: undefined
    }
  },
  computed: {
    // Width of this component's root element.
    width: function width () {
      return Math.ceil(this.$el.clientWidth)
    },

    // Height of this component's root element.
    height: function height () {
      return Math.ceil(this.$el.clientHeight)
    },

    // Whether or not the mouse has moved since the last rendering update.
    mouseMoved: function mouseMoved () {
      if (!this.mousePosition) { return this.mousePosition !== this.prevMousePosition }

      return !(
        this.mousePosition.x === this.prevMousePosition.x &&
        this.mousePosition.y === this.prevMousePosition.y
      )
    }
  },
  mounted: function mounted () {
    var topographyConfig = {
      canvasId: this.sketchId,
      dimensions: { width: this.width, height: this.height },
      simplify: this.simplify
    };

    this.sketch = TopographySketch.getEmptyInstance(topographyConfig);

    this.updateIntervalId = setInterval(this.update, this.ping);
  },
  destroyed: function destroyed () {
    clearInterval(this.updateIntervalId);
  },
  methods: {
    /**
     * @param {Event} e A mouse event.
     * @returns {x: Number, y: Number} Mouse coordinates within this element's DOM box.
     */
    getMousePosition: function getMousePosition (e) {
      var rect = this.$el.getBoundingClientRect();
      return {
        x: e.pageX - rect.x,
        y: e.pageY + Math.abs(rect.y)
      }
    },

    handleClick: function handleClick (e) {
      this.sketch.addPoint(this.getMousePosition(e));
    },

    handleMousemove: function handleMousemove (e) {
      this.prevMousePosition = this.mousePosition;

      this.mousePosition = this.getMousePosition(e);

      this.updateMouseCell();
    },

    updateMouseCell: function updateMouseCell () {
      this.prevMouseCell = this.mouseCell;
      this.mouseCell = this.sketch.getCell(this.mousePosition);

      if (this.mouseCellChanged(this.prevMouseCell, this.mouseCell)) {
        this.restingPointerStartTime = new Date().getTime();
      }
    },

    // The resolution cell that the mouse is hovering over.
    mouseCellChanged: function mouseCellChanged (prevMouseCell, mouseCell) {
      if (!prevMouseCell && !mouseCell) { return false }

      return !_.isEqual(prevMouseCell, mouseCell)
    },

    /**
     * Updates the drawing to represent the current mouse position if one exists.
     */
    update: function update () {
      if (this.mousePosition) {
        var hoverTime = new Date().getTime() - this.restingPointerStartTime;

        var hoverForce = (this.decayTime - hoverTime) / this.decayTime;
        if (hoverForce < 0) { hoverForce = 0; }

        var force = this.mouseCellChanged(this.prevMouseCell, this.mouseCell)
          ? this.force
          : (hoverForce * this.force) / 6; // arbitrary fraction of the default

        this.sketch.update(this.mousePosition, force || 0);
      }

      this.prevMousePosition = this.mousePosition;
      this.updateMouseCell();
    },

    /**
     * Resets the variables that change the state of the topography.
     */
    disable: function disable () {
      this.restingPointerStartTime = undefined;
      this.mousePosition = undefined;
      this.mouseCell = undefined;
    }
  }
};

function normalizeComponent(template, style, script, scopeId, isFunctionalTemplate, moduleIdentifier /* server only */, shadowMode, createInjector, createInjectorSSR, createInjectorShadow) {
    if (typeof shadowMode !== 'boolean') {
        createInjectorSSR = createInjector;
        createInjector = shadowMode;
        shadowMode = false;
    }
    // Vue.extend constructor export interop.
    var options = typeof script === 'function' ? script.options : script;
    // render functions
    if (template && template.render) {
        options.render = template.render;
        options.staticRenderFns = template.staticRenderFns;
        options._compiled = true;
        // functional template
        if (isFunctionalTemplate) {
            options.functional = true;
        }
    }
    // scopedId
    if (scopeId) {
        options._scopeId = scopeId;
    }
    var hook;
    if (moduleIdentifier) {
        // server build
        hook = function (context) {
            // 2.3 injection
            context =
                context || // cached call
                    (this.$vnode && this.$vnode.ssrContext) || // stateful
                    (this.parent && this.parent.$vnode && this.parent.$vnode.ssrContext); // functional
            // 2.2 with runInNewContext: true
            if (!context && typeof __VUE_SSR_CONTEXT__ !== 'undefined') {
                context = __VUE_SSR_CONTEXT__;
            }
            // inject component styles
            if (style) {
                style.call(this, createInjectorSSR(context));
            }
            // register component module identifier for async chunk inference
            if (context && context._registeredComponents) {
                context._registeredComponents.add(moduleIdentifier);
            }
        };
        // used by ssr in case component is cached and beforeCreate
        // never gets called
        options._ssrRegister = hook;
    }
    else if (style) {
        hook = shadowMode
            ? function (context) {
                style.call(this, createInjectorShadow(context, this.$root.$options.shadowRoot));
            }
            : function (context) {
                style.call(this, createInjector(context));
            };
    }
    if (hook) {
        if (options.functional) {
            // register for functional component in vue file
            var originalRender = options.render;
            options.render = function renderWithStyleInjection(h, context) {
                hook.call(context);
                return originalRender(h, context);
            };
        }
        else {
            // inject component registration as beforeCreate hook
            var existing = options.beforeCreate;
            options.beforeCreate = existing ? [].concat(existing, hook) : [hook];
        }
    }
    return script;
}

var isOldIE = typeof navigator !== 'undefined' &&
    /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());
function createInjector(context) {
    return function (id, style) { return addStyle(id, style); };
}
var HEAD;
var styles = {};
function addStyle(id, css) {
    var group = isOldIE ? css.media || 'default' : id;
    var style = styles[group] || (styles[group] = { ids: new Set(), styles: [] });
    if (!style.ids.has(id)) {
        style.ids.add(id);
        var code = css.source;
        if (css.map) {
            // https://developer.chrome.com/devtools/docs/javascript-debugging
            // this makes source maps inside style tags work properly in Chrome
            code += '\n/*# sourceURL=' + css.map.sources[0] + ' */';
            // http://stackoverflow.com/a/26603875
            code +=
                '\n/*# sourceMappingURL=data:application/json;base64,' +
                    btoa(unescape(encodeURIComponent(JSON.stringify(css.map)))) +
                    ' */';
        }
        if (!style.element) {
            style.element = document.createElement('style');
            style.element.type = 'text/css';
            if (css.media)
                { style.element.setAttribute('media', css.media); }
            if (HEAD === undefined) {
                HEAD = document.head || document.getElementsByTagName('head')[0];
            }
            HEAD.appendChild(style.element);
        }
        if ('styleSheet' in style.element) {
            style.styles.push(code);
            style.element.styleSheet.cssText = style.styles
                .filter(Boolean)
                .join('\n');
        }
        else {
            var index = style.ids.size - 1;
            var textNode = document.createTextNode(code);
            var nodes = style.element.childNodes;
            if (nodes[index])
                { style.element.removeChild(nodes[index]); }
            if (nodes.length)
                { style.element.insertBefore(textNode, nodes[index]); }
            else
                { style.element.appendChild(textNode); }
        }
    }
}

/* script */
var __vue_script__ = script;

/* template */
var __vue_render__ = function() {
  var _vm = this;
  var _h = _vm.$createElement;
  var _c = _vm._self._c || _h;
  return _c(
    "div",
    {
      staticClass: "topography",
      on: {
        click: _vm.handleClick,
        mousemove: _vm.handleMousemove,
        mouseleave: function($event) {
          return _vm.disable()
        }
      }
    },
    [_c("div", { staticClass: "p5-canvas", attrs: { id: _vm.sketchId } })]
  )
};
var __vue_staticRenderFns__ = [];
__vue_render__._withStripped = true;

  /* style */
  var __vue_inject_styles__ = function (inject) {
    if (!inject) { return }
    inject("data-v-72d51140_0", { source: ".topography {\n  position: relative;\n  align-items: center;\n  justify-content: center;\n}\n.box-1 {\n  width: 200px;\n  height: 300px;\n  background: white;\n  border: 3px solid black;\n  z-index: 1;\n  opacity: 0;\n}\n.p5-canvas {\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  pointer-events: none;\n}\n.p5-canvas .canvas {\n  width: 100%;\n  height: 100%;\n}\n\n/*# sourceMappingURL=vue-contour-lines.vue.map */", map: {"version":3,"sources":["/home/jbr/webdev/vue-contour-lines/src/vue-contour-lines.vue","vue-contour-lines.vue"],"names":[],"mappings":"AAkLA;EACA,kBAAA;EAEA,mBAAA;EACA,uBAAA;AClLA;ADqLA;EACA,YAAA;EACA,aAAA;EACA,iBAAA;EACA,uBAAA;EAEA,UAAA;EAEA,UAAA;ACpLA;ADuLA;EACA,MAAA;EACA,OAAA;EACA,WAAA;EACA,YAAA;EAEA,aAAA;EACA,mBAAA;EACA,uBAAA;EAEA,oBAAA;ACtLA;ADwLA;EACA,WAAA;EACA,YAAA;ACtLA;;AAEA,gDAAgD","file":"vue-contour-lines.vue","sourcesContent":["<template>\n  <div class=\"topography\" @click=\"handleClick\" @mousemove=\"handleMousemove\" @mouseleave=\"disable()\">\n    <div class=\"p5-canvas\" :id=\"sketchId\"></div>\n  </div>\n</template>\n\n<script>\nimport _ from 'lodash'\nimport { TopographySketch } from '@/sketch'\n\nconst DEFAULT_SIMPLIFY_COEFFICIENT = 20 // Degree of polygon simplification\nconst DEFAULT_PING_TIME = 15 // Amount of time(ms) between updates, in milliseconds.\nconst DEFAULT_FORCE = 8 // The amount of 'z' added to a point during mouse movement.\nconst DEFAULT_DECAY_TIME = 2000 // Amount of time(ms) before a cell stops growing when the mouse hovers over a cell.\n\nvar id = 0 // Unique id of of this component // TODO: test that this enables parallel topography instances\n\nexport default {\n  name: 'Topography',\n  props: {\n    // Degree to which simplification is applied to the contours.\n    simplify: {\n      type: Number,\n      required: false,\n      default () {\n        return DEFAULT_SIMPLIFY_COEFFICIENT\n      }\n    },\n\n    // Amount of time(ms) between updates.\n    ping: {\n      type: Number,\n      required: false,\n      default () {\n        return DEFAULT_PING_TIME\n      }\n    },\n\n    // The amount of 'z' added to a point during mouse movement.\n    force: {\n      type: Number,\n      required: false,\n      default () {\n        return DEFAULT_FORCE\n      }\n    },\n\n    // Amount of time(ms) before a cell stops growing when the mouse hovers over a cell.\n    decayTime: {\n      type: Number,\n      required: false,\n      default () {\n        return DEFAULT_DECAY_TIME\n      }\n    }\n  },\n  data () {\n    return {\n      sketchId: 'p5-canvas-' + ++id, // Unique id that matches the a child element's id.\n      sketch: undefined, // The p5 sketch.\n      mousePosition: undefined, // Mouse position coordinates relative to the root element's size.\n      prevMousePosition: undefined, // Previous mouse position.\n      mouseCell: undefined, // Coordinates of the resolution cell that the mouse is within.\n      prevMouseCell: undefined, // Previous coordinates of the resolution cell that the mouse was within.\n      updateIntervalId: undefined, // The id of the interval between updates.\n      restingPointerStartTime: undefined\n    }\n  },\n  computed: {\n    // Width of this component's root element.\n    width () {\n      return Math.ceil(this.$el.clientWidth)\n    },\n\n    // Height of this component's root element.\n    height () {\n      return Math.ceil(this.$el.clientHeight)\n    },\n\n    // Whether or not the mouse has moved since the last rendering update.\n    mouseMoved () {\n      if (!this.mousePosition) { return this.mousePosition !== this.prevMousePosition }\n\n      return !(\n        this.mousePosition.x === this.prevMousePosition.x &&\n        this.mousePosition.y === this.prevMousePosition.y\n      )\n    }\n  },\n  mounted () {\n    const topographyConfig = {\n      canvasId: this.sketchId,\n      dimensions: { width: this.width, height: this.height },\n      simplify: this.simplify\n    }\n\n    this.sketch = TopographySketch.getEmptyInstance(topographyConfig)\n\n    this.updateIntervalId = setInterval(this.update, this.ping)\n  },\n  destroyed () {\n    clearInterval(this.updateIntervalId)\n  },\n  methods: {\n    /**\n     * @param {Event} e A mouse event.\n     * @returns {x: Number, y: Number} Mouse coordinates within this element's DOM box.\n     */\n    getMousePosition (e) {\n      const rect = this.$el.getBoundingClientRect()\n      return {\n        x: e.pageX - rect.x,\n        y: e.pageY + Math.abs(rect.y)\n      }\n    },\n\n    handleClick (e) {\n      this.sketch.addPoint(this.getMousePosition(e))\n    },\n\n    handleMousemove (e) {\n      this.prevMousePosition = this.mousePosition\n\n      this.mousePosition = this.getMousePosition(e)\n\n      this.updateMouseCell()\n    },\n\n    updateMouseCell () {\n      this.prevMouseCell = this.mouseCell\n      this.mouseCell = this.sketch.getCell(this.mousePosition)\n\n      if (this.mouseCellChanged(this.prevMouseCell, this.mouseCell)) {\n        this.restingPointerStartTime = new Date().getTime()\n      }\n    },\n\n    // The resolution cell that the mouse is hovering over.\n    mouseCellChanged (prevMouseCell, mouseCell) {\n      if (!prevMouseCell && !mouseCell) return false\n\n      return !_.isEqual(prevMouseCell, mouseCell)\n    },\n\n    /**\n     * Updates the drawing to represent the current mouse position if one exists.\n     */\n    update () {\n      if (this.mousePosition) {\n        const hoverTime = new Date().getTime() - this.restingPointerStartTime\n\n        let hoverForce = (this.decayTime - hoverTime) / this.decayTime\n        if (hoverForce < 0) hoverForce = 0\n\n        const force = this.mouseCellChanged(this.prevMouseCell, this.mouseCell)\n          ? this.force\n          : (hoverForce * this.force) / 6 // arbitrary fraction of the default\n\n        this.sketch.update(this.mousePosition, force || 0)\n      }\n\n      this.prevMousePosition = this.mousePosition\n      this.updateMouseCell()\n    },\n\n    /**\n     * Resets the variables that change the state of the topography.\n     */\n    disable () {\n      this.restingPointerStartTime = undefined\n      this.mousePosition = undefined\n      this.mouseCell = undefined\n    }\n  }\n}\n</script>\n\n<style lang=\"scss\">\n.topography {\n  position: relative;\n\n  align-items: center;\n  justify-content: center;\n}\n\n.box-1 {\n  width: 200px;\n  height: 300px;\n  background: white;\n  border: 3px solid black;\n\n  z-index: 1;\n\n  opacity: 0;\n}\n\n.p5-canvas {\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n\n  display: flex;\n  align-items: center;\n  justify-content: center;\n\n  pointer-events: none;\n\n  .canvas {\n    width: 100%;\n    height: 100%;\n  }\n}\n</style>\n",".topography {\n  position: relative;\n  align-items: center;\n  justify-content: center;\n}\n\n.box-1 {\n  width: 200px;\n  height: 300px;\n  background: white;\n  border: 3px solid black;\n  z-index: 1;\n  opacity: 0;\n}\n\n.p5-canvas {\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  pointer-events: none;\n}\n.p5-canvas .canvas {\n  width: 100%;\n  height: 100%;\n}\n\n/*# sourceMappingURL=vue-contour-lines.vue.map */"]}, media: undefined });

  };
  /* scoped */
  var __vue_scope_id__ = undefined;
  /* module identifier */
  var __vue_module_identifier__ = undefined;
  /* functional template */
  var __vue_is_functional_template__ = false;
  /* style inject SSR */
  
  /* style inject shadow dom */
  

  
  var __vue_component__ = normalizeComponent(
    { render: __vue_render__, staticRenderFns: __vue_staticRenderFns__ },
    __vue_inject_styles__,
    __vue_script__,
    __vue_scope_id__,
    __vue_is_functional_template__,
    __vue_module_identifier__,
    false,
    createInjector,
    undefined,
    undefined
  );

// Declare install function executed by Vue.use()
function install(Vue) {
	if (install.installed) { return; }
	install.installed = true;
	Vue.component('vue-contour-lines', __vue_component__);
}

// Create module definition for Vue.use()
var plugin = {
	install: install,
};

// Auto-install when vue is found (eg. in browser via <script> tag)
var GlobalVue = null;
if (typeof window !== 'undefined') {
	GlobalVue = window.Vue;
} else if (typeof global !== 'undefined') {
	GlobalVue = global.Vue;
}
if (GlobalVue) {
	GlobalVue.use(plugin);
}

export default __vue_component__;
export { install };
