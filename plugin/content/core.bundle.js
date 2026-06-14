var ZONCore = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // node_modules/nunjucks/browser/nunjucks.js
  var require_nunjucks = __commonJS({
    "node_modules/nunjucks/browser/nunjucks.js"(exports, module) {
      (function webpackUniversalModuleDefinition(root, factory) {
        if (typeof exports === "object" && typeof module === "object")
          module.exports = factory();
        else if (typeof define === "function" && define.amd)
          define([], factory);
        else if (typeof exports === "object")
          exports["nunjucks"] = factory();
        else
          root["nunjucks"] = factory();
      })(typeof self !== "undefined" ? self : exports, function() {
        return (
          /******/
          (function(modules) {
            var installedModules = {};
            function __webpack_require__(moduleId) {
              if (installedModules[moduleId]) {
                return installedModules[moduleId].exports;
              }
              var module2 = installedModules[moduleId] = {
                /******/
                i: moduleId,
                /******/
                l: false,
                /******/
                exports: {}
                /******/
              };
              modules[moduleId].call(module2.exports, module2, module2.exports, __webpack_require__);
              module2.l = true;
              return module2.exports;
            }
            __webpack_require__.m = modules;
            __webpack_require__.c = installedModules;
            __webpack_require__.d = function(exports2, name, getter) {
              if (!__webpack_require__.o(exports2, name)) {
                Object.defineProperty(exports2, name, {
                  /******/
                  configurable: false,
                  /******/
                  enumerable: true,
                  /******/
                  get: getter
                  /******/
                });
              }
            };
            __webpack_require__.n = function(module2) {
              var getter = module2 && module2.__esModule ? (
                /******/
                function getDefault() {
                  return module2["default"];
                }
              ) : (
                /******/
                function getModuleExports() {
                  return module2;
                }
              );
              __webpack_require__.d(getter, "a", getter);
              return getter;
            };
            __webpack_require__.o = function(object, property) {
              return Object.prototype.hasOwnProperty.call(object, property);
            };
            __webpack_require__.p = "";
            return __webpack_require__(__webpack_require__.s = 11);
          })([
            /* 0 */
            /***/
            (function(module2, exports2, __webpack_require__) {
              "use strict";
              var ArrayProto = Array.prototype;
              var ObjProto = Object.prototype;
              var escapeMap = {
                "&": "&amp;",
                '"': "&quot;",
                "'": "&#39;",
                "<": "&lt;",
                ">": "&gt;",
                "\\": "&#92;"
              };
              var escapeRegex = /[&"'<>\\]/g;
              var exports2 = module2.exports = {};
              function hasOwnProp(obj, k) {
                return ObjProto.hasOwnProperty.call(obj, k);
              }
              exports2.hasOwnProp = hasOwnProp;
              function lookupEscape(ch) {
                return escapeMap[ch];
              }
              function _prettifyError(path, withInternals, err) {
                if (!err.Update) {
                  err = new exports2.TemplateError(err);
                }
                err.Update(path);
                if (!withInternals) {
                  var old = err;
                  err = new Error(old.message);
                  err.name = old.name;
                }
                return err;
              }
              exports2._prettifyError = _prettifyError;
              function TemplateError(message, lineno, colno) {
                var err;
                var cause;
                if (message instanceof Error) {
                  cause = message;
                  message = cause.name + ": " + cause.message;
                }
                if (Object.setPrototypeOf) {
                  err = new Error(message);
                  Object.setPrototypeOf(err, TemplateError.prototype);
                } else {
                  err = this;
                  Object.defineProperty(err, "message", {
                    enumerable: false,
                    writable: true,
                    value: message
                  });
                }
                Object.defineProperty(err, "name", {
                  value: "Template render error"
                });
                if (Error.captureStackTrace) {
                  Error.captureStackTrace(err, this.constructor);
                }
                var getStack;
                if (cause) {
                  var stackDescriptor = Object.getOwnPropertyDescriptor(cause, "stack");
                  getStack = stackDescriptor && (stackDescriptor.get || function() {
                    return stackDescriptor.value;
                  });
                  if (!getStack) {
                    getStack = function getStack2() {
                      return cause.stack;
                    };
                  }
                } else {
                  var stack = new Error(message).stack;
                  getStack = function getStack2() {
                    return stack;
                  };
                }
                Object.defineProperty(err, "stack", {
                  get: function get() {
                    return getStack.call(err);
                  }
                });
                Object.defineProperty(err, "cause", {
                  value: cause
                });
                err.lineno = lineno;
                err.colno = colno;
                err.firstUpdate = true;
                err.Update = function Update(path) {
                  var msg = "(" + (path || "unknown path") + ")";
                  if (this.firstUpdate) {
                    if (this.lineno && this.colno) {
                      msg += " [Line " + this.lineno + ", Column " + this.colno + "]";
                    } else if (this.lineno) {
                      msg += " [Line " + this.lineno + "]";
                    }
                  }
                  msg += "\n ";
                  if (this.firstUpdate) {
                    msg += " ";
                  }
                  this.message = msg + (this.message || "");
                  this.firstUpdate = false;
                  return this;
                };
                return err;
              }
              if (Object.setPrototypeOf) {
                Object.setPrototypeOf(TemplateError.prototype, Error.prototype);
              } else {
                TemplateError.prototype = Object.create(Error.prototype, {
                  constructor: {
                    value: TemplateError
                  }
                });
              }
              exports2.TemplateError = TemplateError;
              function escape(val) {
                return val.replace(escapeRegex, lookupEscape);
              }
              exports2.escape = escape;
              function isFunction(obj) {
                return ObjProto.toString.call(obj) === "[object Function]";
              }
              exports2.isFunction = isFunction;
              function isArray(obj) {
                return ObjProto.toString.call(obj) === "[object Array]";
              }
              exports2.isArray = isArray;
              function isString(obj) {
                return ObjProto.toString.call(obj) === "[object String]";
              }
              exports2.isString = isString;
              function isObject(obj) {
                return ObjProto.toString.call(obj) === "[object Object]";
              }
              exports2.isObject = isObject;
              function _prepareAttributeParts(attr) {
                if (!attr) {
                  return [];
                }
                if (typeof attr === "string") {
                  return attr.split(".");
                }
                return [attr];
              }
              function getAttrGetter(attribute) {
                var parts = _prepareAttributeParts(attribute);
                return function attrGetter(item) {
                  var _item = item;
                  for (var i = 0; i < parts.length; i++) {
                    var part = parts[i];
                    if (hasOwnProp(_item, part)) {
                      _item = _item[part];
                    } else {
                      return void 0;
                    }
                  }
                  return _item;
                };
              }
              exports2.getAttrGetter = getAttrGetter;
              function groupBy(obj, val, throwOnUndefined) {
                var result = {};
                var iterator = isFunction(val) ? val : getAttrGetter(val);
                for (var i = 0; i < obj.length; i++) {
                  var value = obj[i];
                  var key = iterator(value, i);
                  if (key === void 0 && throwOnUndefined === true) {
                    throw new TypeError('groupby: attribute "' + val + '" resolved to undefined');
                  }
                  (result[key] || (result[key] = [])).push(value);
                }
                return result;
              }
              exports2.groupBy = groupBy;
              function toArray(obj) {
                return Array.prototype.slice.call(obj);
              }
              exports2.toArray = toArray;
              function without(array) {
                var result = [];
                if (!array) {
                  return result;
                }
                var length = array.length;
                var contains = toArray(arguments).slice(1);
                var index = -1;
                while (++index < length) {
                  if (indexOf(contains, array[index]) === -1) {
                    result.push(array[index]);
                  }
                }
                return result;
              }
              exports2.without = without;
              function repeat(char_, n) {
                var str = "";
                for (var i = 0; i < n; i++) {
                  str += char_;
                }
                return str;
              }
              exports2.repeat = repeat;
              function each(obj, func, context) {
                if (obj == null) {
                  return;
                }
                if (ArrayProto.forEach && obj.forEach === ArrayProto.forEach) {
                  obj.forEach(func, context);
                } else if (obj.length === +obj.length) {
                  for (var i = 0, l = obj.length; i < l; i++) {
                    func.call(context, obj[i], i, obj);
                  }
                }
              }
              exports2.each = each;
              function map(obj, func) {
                var results = [];
                if (obj == null) {
                  return results;
                }
                if (ArrayProto.map && obj.map === ArrayProto.map) {
                  return obj.map(func);
                }
                for (var i = 0; i < obj.length; i++) {
                  results[results.length] = func(obj[i], i);
                }
                if (obj.length === +obj.length) {
                  results.length = obj.length;
                }
                return results;
              }
              exports2.map = map;
              function asyncIter(arr, iter, cb) {
                var i = -1;
                function next() {
                  i++;
                  if (i < arr.length) {
                    iter(arr[i], i, next, cb);
                  } else {
                    cb();
                  }
                }
                next();
              }
              exports2.asyncIter = asyncIter;
              function asyncFor(obj, iter, cb) {
                var keys = keys_(obj || {});
                var len = keys.length;
                var i = -1;
                function next() {
                  i++;
                  var k = keys[i];
                  if (i < len) {
                    iter(k, obj[k], i, len, next);
                  } else {
                    cb();
                  }
                }
                next();
              }
              exports2.asyncFor = asyncFor;
              function indexOf(arr, searchElement, fromIndex) {
                return Array.prototype.indexOf.call(arr || [], searchElement, fromIndex);
              }
              exports2.indexOf = indexOf;
              function keys_(obj) {
                var arr = [];
                for (var k in obj) {
                  if (hasOwnProp(obj, k)) {
                    arr.push(k);
                  }
                }
                return arr;
              }
              exports2.keys = keys_;
              function _entries(obj) {
                return keys_(obj).map(function(k) {
                  return [k, obj[k]];
                });
              }
              exports2._entries = _entries;
              function _values(obj) {
                return keys_(obj).map(function(k) {
                  return obj[k];
                });
              }
              exports2._values = _values;
              function extend(obj1, obj2) {
                obj1 = obj1 || {};
                keys_(obj2).forEach(function(k) {
                  obj1[k] = obj2[k];
                });
                return obj1;
              }
              exports2._assign = exports2.extend = extend;
              function inOperator(key, val) {
                if (isArray(val) || isString(val)) {
                  return val.indexOf(key) !== -1;
                } else if (isObject(val)) {
                  return key in val;
                }
                throw new Error('Cannot use "in" operator to search for "' + key + '" in unexpected types.');
              }
              exports2.inOperator = inOperator;
            }),
            /* 1 */
            /***/
            (function(module2, exports2, __webpack_require__) {
              "use strict";
              function _defineProperties(target, props) {
                for (var i = 0; i < props.length; i++) {
                  var descriptor = props[i];
                  descriptor.enumerable = descriptor.enumerable || false;
                  descriptor.configurable = true;
                  if ("value" in descriptor) descriptor.writable = true;
                  Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
                }
              }
              function _createClass(Constructor, protoProps, staticProps) {
                if (protoProps) _defineProperties(Constructor.prototype, protoProps);
                if (staticProps) _defineProperties(Constructor, staticProps);
                Object.defineProperty(Constructor, "prototype", { writable: false });
                return Constructor;
              }
              function _toPropertyKey(arg) {
                var key = _toPrimitive(arg, "string");
                return typeof key === "symbol" ? key : String(key);
              }
              function _toPrimitive(input, hint) {
                if (typeof input !== "object" || input === null) return input;
                var prim = input[Symbol.toPrimitive];
                if (prim !== void 0) {
                  var res = prim.call(input, hint || "default");
                  if (typeof res !== "object") return res;
                  throw new TypeError("@@toPrimitive must return a primitive value.");
                }
                return (hint === "string" ? String : Number)(input);
              }
              function _inheritsLoose(subClass, superClass) {
                subClass.prototype = Object.create(superClass.prototype);
                subClass.prototype.constructor = subClass;
                _setPrototypeOf(subClass, superClass);
              }
              function _setPrototypeOf(o, p) {
                _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf2(o2, p2) {
                  o2.__proto__ = p2;
                  return o2;
                };
                return _setPrototypeOf(o, p);
              }
              var EventEmitter = __webpack_require__(16);
              var lib = __webpack_require__(0);
              function parentWrap(parent, prop) {
                if (typeof parent !== "function" || typeof prop !== "function") {
                  return prop;
                }
                return function wrap() {
                  var tmp = this.parent;
                  this.parent = parent;
                  var res = prop.apply(this, arguments);
                  this.parent = tmp;
                  return res;
                };
              }
              function extendClass(cls, name, props) {
                props = props || {};
                lib.keys(props).forEach(function(k) {
                  props[k] = parentWrap(cls.prototype[k], props[k]);
                });
                var subclass = /* @__PURE__ */ (function(_cls) {
                  _inheritsLoose(subclass2, _cls);
                  function subclass2() {
                    return _cls.apply(this, arguments) || this;
                  }
                  _createClass(subclass2, [{
                    key: "typename",
                    get: function get() {
                      return name;
                    }
                  }]);
                  return subclass2;
                })(cls);
                lib._assign(subclass.prototype, props);
                return subclass;
              }
              var Obj = /* @__PURE__ */ (function() {
                function Obj2() {
                  this.init.apply(this, arguments);
                }
                var _proto = Obj2.prototype;
                _proto.init = function init() {
                };
                Obj2.extend = function extend(name, props) {
                  if (typeof name === "object") {
                    props = name;
                    name = "anonymous";
                  }
                  return extendClass(this, name, props);
                };
                _createClass(Obj2, [{
                  key: "typename",
                  get: function get() {
                    return this.constructor.name;
                  }
                }]);
                return Obj2;
              })();
              var EmitterObj = /* @__PURE__ */ (function(_EventEmitter) {
                _inheritsLoose(EmitterObj2, _EventEmitter);
                function EmitterObj2() {
                  var _this2;
                  var _this;
                  _this = _EventEmitter.call(this) || this;
                  (_this2 = _this).init.apply(_this2, arguments);
                  return _this;
                }
                var _proto2 = EmitterObj2.prototype;
                _proto2.init = function init() {
                };
                EmitterObj2.extend = function extend(name, props) {
                  if (typeof name === "object") {
                    props = name;
                    name = "anonymous";
                  }
                  return extendClass(this, name, props);
                };
                _createClass(EmitterObj2, [{
                  key: "typename",
                  get: function get() {
                    return this.constructor.name;
                  }
                }]);
                return EmitterObj2;
              })(EventEmitter);
              module2.exports = {
                Obj,
                EmitterObj
              };
            }),
            /* 2 */
            /***/
            (function(module2, exports2, __webpack_require__) {
              "use strict";
              var lib = __webpack_require__(0);
              var arrayFrom = Array.from;
              var supportsIterators = typeof Symbol === "function" && Symbol.iterator && typeof arrayFrom === "function";
              var Frame = /* @__PURE__ */ (function() {
                function Frame2(parent, isolateWrites) {
                  this.variables = /* @__PURE__ */ Object.create(null);
                  this.parent = parent;
                  this.topLevel = false;
                  this.isolateWrites = isolateWrites;
                }
                var _proto = Frame2.prototype;
                _proto.set = function set(name, val, resolveUp) {
                  var parts = name.split(".");
                  var obj = this.variables;
                  var frame = this;
                  if (resolveUp) {
                    if (frame = this.resolve(parts[0], true)) {
                      frame.set(name, val);
                      return;
                    }
                  }
                  for (var i = 0; i < parts.length - 1; i++) {
                    var id = parts[i];
                    if (!obj[id]) {
                      obj[id] = {};
                    }
                    obj = obj[id];
                  }
                  obj[parts[parts.length - 1]] = val;
                };
                _proto.get = function get(name) {
                  var val = this.variables[name];
                  if (val !== void 0) {
                    return val;
                  }
                  return null;
                };
                _proto.lookup = function lookup(name) {
                  var p = this.parent;
                  var val = this.variables[name];
                  if (val !== void 0) {
                    return val;
                  }
                  return p && p.lookup(name);
                };
                _proto.resolve = function resolve(name, forWrite) {
                  var p = forWrite && this.isolateWrites ? void 0 : this.parent;
                  var val = this.variables[name];
                  if (val !== void 0) {
                    return this;
                  }
                  return p && p.resolve(name);
                };
                _proto.push = function push(isolateWrites) {
                  return new Frame2(this, isolateWrites);
                };
                _proto.pop = function pop() {
                  return this.parent;
                };
                return Frame2;
              })();
              function makeMacro(argNames, kwargNames, func) {
                return function macro() {
                  for (var _len = arguments.length, macroArgs = new Array(_len), _key = 0; _key < _len; _key++) {
                    macroArgs[_key] = arguments[_key];
                  }
                  var argCount = numArgs(macroArgs);
                  var args;
                  var kwargs = getKeywordArgs(macroArgs);
                  if (argCount > argNames.length) {
                    args = macroArgs.slice(0, argNames.length);
                    macroArgs.slice(args.length, argCount).forEach(function(val, i2) {
                      if (i2 < kwargNames.length) {
                        kwargs[kwargNames[i2]] = val;
                      }
                    });
                    args.push(kwargs);
                  } else if (argCount < argNames.length) {
                    args = macroArgs.slice(0, argCount);
                    for (var i = argCount; i < argNames.length; i++) {
                      var arg = argNames[i];
                      args.push(kwargs[arg]);
                      delete kwargs[arg];
                    }
                    args.push(kwargs);
                  } else {
                    args = macroArgs;
                  }
                  return func.apply(this, args);
                };
              }
              function makeKeywordArgs(obj) {
                obj.__keywords = true;
                return obj;
              }
              function isKeywordArgs(obj) {
                return obj && Object.prototype.hasOwnProperty.call(obj, "__keywords");
              }
              function getKeywordArgs(args) {
                var len = args.length;
                if (len) {
                  var lastArg = args[len - 1];
                  if (isKeywordArgs(lastArg)) {
                    return lastArg;
                  }
                }
                return {};
              }
              function numArgs(args) {
                var len = args.length;
                if (len === 0) {
                  return 0;
                }
                var lastArg = args[len - 1];
                if (isKeywordArgs(lastArg)) {
                  return len - 1;
                } else {
                  return len;
                }
              }
              function SafeString(val) {
                if (typeof val !== "string") {
                  return val;
                }
                this.val = val;
                this.length = val.length;
              }
              SafeString.prototype = Object.create(String.prototype, {
                length: {
                  writable: true,
                  configurable: true,
                  value: 0
                }
              });
              SafeString.prototype.valueOf = function valueOf() {
                return this.val;
              };
              SafeString.prototype.toString = function toString() {
                return this.val;
              };
              function copySafeness(dest, target) {
                if (dest instanceof SafeString) {
                  return new SafeString(target);
                }
                return target.toString();
              }
              function markSafe(val) {
                var type = typeof val;
                if (type === "string") {
                  return new SafeString(val);
                } else if (type !== "function") {
                  return val;
                } else {
                  return function wrapSafe(args) {
                    var ret = val.apply(this, arguments);
                    if (typeof ret === "string") {
                      return new SafeString(ret);
                    }
                    return ret;
                  };
                }
              }
              function suppressValue(val, autoescape) {
                val = val !== void 0 && val !== null ? val : "";
                if (autoescape && !(val instanceof SafeString)) {
                  val = lib.escape(val.toString());
                }
                return val;
              }
              function ensureDefined(val, lineno, colno) {
                if (val === null || val === void 0) {
                  throw new lib.TemplateError("attempted to output null or undefined value", lineno + 1, colno + 1);
                }
                return val;
              }
              function memberLookup(obj, val) {
                if (obj === void 0 || obj === null) {
                  return void 0;
                }
                if (typeof obj[val] === "function") {
                  return function() {
                    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                      args[_key2] = arguments[_key2];
                    }
                    return obj[val].apply(obj, args);
                  };
                }
                return obj[val];
              }
              function callWrap(obj, name, context, args) {
                if (!obj) {
                  throw new Error("Unable to call `" + name + "`, which is undefined or falsey");
                } else if (typeof obj !== "function") {
                  throw new Error("Unable to call `" + name + "`, which is not a function");
                }
                return obj.apply(context, args);
              }
              function contextOrFrameLookup(context, frame, name) {
                var val = frame.lookup(name);
                return val !== void 0 ? val : context.lookup(name);
              }
              function handleError(error, lineno, colno) {
                if (error.lineno) {
                  return error;
                } else {
                  return new lib.TemplateError(error, lineno, colno);
                }
              }
              function asyncEach(arr, dimen, iter, cb) {
                if (lib.isArray(arr)) {
                  var len = arr.length;
                  lib.asyncIter(arr, function iterCallback(item, i, next) {
                    switch (dimen) {
                      case 1:
                        iter(item, i, len, next);
                        break;
                      case 2:
                        iter(item[0], item[1], i, len, next);
                        break;
                      case 3:
                        iter(item[0], item[1], item[2], i, len, next);
                        break;
                      default:
                        item.push(i, len, next);
                        iter.apply(this, item);
                    }
                  }, cb);
                } else {
                  lib.asyncFor(arr, function iterCallback(key, val, i, len2, next) {
                    iter(key, val, i, len2, next);
                  }, cb);
                }
              }
              function asyncAll(arr, dimen, func, cb) {
                var finished = 0;
                var len;
                var outputArr;
                function done(i2, output) {
                  finished++;
                  outputArr[i2] = output;
                  if (finished === len) {
                    cb(null, outputArr.join(""));
                  }
                }
                if (lib.isArray(arr)) {
                  len = arr.length;
                  outputArr = new Array(len);
                  if (len === 0) {
                    cb(null, "");
                  } else {
                    for (var i = 0; i < arr.length; i++) {
                      var item = arr[i];
                      switch (dimen) {
                        case 1:
                          func(item, i, len, done);
                          break;
                        case 2:
                          func(item[0], item[1], i, len, done);
                          break;
                        case 3:
                          func(item[0], item[1], item[2], i, len, done);
                          break;
                        default:
                          item.push(i, len, done);
                          func.apply(this, item);
                      }
                    }
                  }
                } else {
                  var keys = lib.keys(arr || {});
                  len = keys.length;
                  outputArr = new Array(len);
                  if (len === 0) {
                    cb(null, "");
                  } else {
                    for (var _i = 0; _i < keys.length; _i++) {
                      var k = keys[_i];
                      func(k, arr[k], _i, len, done);
                    }
                  }
                }
              }
              function fromIterator(arr) {
                if (typeof arr !== "object" || arr === null || lib.isArray(arr)) {
                  return arr;
                } else if (supportsIterators && Symbol.iterator in arr) {
                  return arrayFrom(arr);
                } else {
                  return arr;
                }
              }
              module2.exports = {
                Frame,
                makeMacro,
                makeKeywordArgs,
                numArgs,
                suppressValue,
                ensureDefined,
                memberLookup,
                contextOrFrameLookup,
                callWrap,
                handleError,
                isArray: lib.isArray,
                keys: lib.keys,
                SafeString,
                copySafeness,
                markSafe,
                asyncEach,
                asyncAll,
                inOperator: lib.inOperator,
                fromIterator
              };
            }),
            /* 3 */
            /***/
            (function(module2, exports2, __webpack_require__) {
              "use strict";
              function _defineProperties(target, props) {
                for (var i = 0; i < props.length; i++) {
                  var descriptor = props[i];
                  descriptor.enumerable = descriptor.enumerable || false;
                  descriptor.configurable = true;
                  if ("value" in descriptor) descriptor.writable = true;
                  Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
                }
              }
              function _createClass(Constructor, protoProps, staticProps) {
                if (protoProps) _defineProperties(Constructor.prototype, protoProps);
                if (staticProps) _defineProperties(Constructor, staticProps);
                Object.defineProperty(Constructor, "prototype", { writable: false });
                return Constructor;
              }
              function _toPropertyKey(arg) {
                var key = _toPrimitive(arg, "string");
                return typeof key === "symbol" ? key : String(key);
              }
              function _toPrimitive(input, hint) {
                if (typeof input !== "object" || input === null) return input;
                var prim = input[Symbol.toPrimitive];
                if (prim !== void 0) {
                  var res = prim.call(input, hint || "default");
                  if (typeof res !== "object") return res;
                  throw new TypeError("@@toPrimitive must return a primitive value.");
                }
                return (hint === "string" ? String : Number)(input);
              }
              function _inheritsLoose(subClass, superClass) {
                subClass.prototype = Object.create(superClass.prototype);
                subClass.prototype.constructor = subClass;
                _setPrototypeOf(subClass, superClass);
              }
              function _setPrototypeOf(o, p) {
                _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf2(o2, p2) {
                  o2.__proto__ = p2;
                  return o2;
                };
                return _setPrototypeOf(o, p);
              }
              var _require = __webpack_require__(1), Obj = _require.Obj;
              function traverseAndCheck(obj, type, results) {
                if (obj instanceof type) {
                  results.push(obj);
                }
                if (obj instanceof Node) {
                  obj.findAll(type, results);
                }
              }
              var Node = /* @__PURE__ */ (function(_Obj) {
                _inheritsLoose(Node2, _Obj);
                function Node2() {
                  return _Obj.apply(this, arguments) || this;
                }
                var _proto = Node2.prototype;
                _proto.init = function init(lineno, colno) {
                  var _arguments = arguments, _this = this;
                  for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
                    args[_key - 2] = arguments[_key];
                  }
                  this.lineno = lineno;
                  this.colno = colno;
                  this.fields.forEach(function(field, i) {
                    var val = _arguments[i + 2];
                    if (val === void 0) {
                      val = null;
                    }
                    _this[field] = val;
                  });
                };
                _proto.findAll = function findAll(type, results) {
                  var _this2 = this;
                  results = results || [];
                  if (this instanceof NodeList) {
                    this.children.forEach(function(child) {
                      return traverseAndCheck(child, type, results);
                    });
                  } else {
                    this.fields.forEach(function(field) {
                      return traverseAndCheck(_this2[field], type, results);
                    });
                  }
                  return results;
                };
                _proto.iterFields = function iterFields(func) {
                  var _this3 = this;
                  this.fields.forEach(function(field) {
                    func(_this3[field], field);
                  });
                };
                return Node2;
              })(Obj);
              var Value = /* @__PURE__ */ (function(_Node) {
                _inheritsLoose(Value2, _Node);
                function Value2() {
                  return _Node.apply(this, arguments) || this;
                }
                _createClass(Value2, [{
                  key: "typename",
                  get: function get() {
                    return "Value";
                  }
                }, {
                  key: "fields",
                  get: function get() {
                    return ["value"];
                  }
                }]);
                return Value2;
              })(Node);
              var NodeList = /* @__PURE__ */ (function(_Node2) {
                _inheritsLoose(NodeList2, _Node2);
                function NodeList2() {
                  return _Node2.apply(this, arguments) || this;
                }
                var _proto2 = NodeList2.prototype;
                _proto2.init = function init(lineno, colno, nodes) {
                  _Node2.prototype.init.call(this, lineno, colno, nodes || []);
                };
                _proto2.addChild = function addChild(node) {
                  this.children.push(node);
                };
                _createClass(NodeList2, [{
                  key: "typename",
                  get: function get() {
                    return "NodeList";
                  }
                }, {
                  key: "fields",
                  get: function get() {
                    return ["children"];
                  }
                }]);
                return NodeList2;
              })(Node);
              var Root = NodeList.extend("Root");
              var Literal = Value.extend("Literal");
              var _Symbol = Value.extend("Symbol");
              var Group = NodeList.extend("Group");
              var ArrayNode = NodeList.extend("Array");
              var Pair = Node.extend("Pair", {
                fields: ["key", "value"]
              });
              var Dict = NodeList.extend("Dict");
              var LookupVal = Node.extend("LookupVal", {
                fields: ["target", "val"]
              });
              var If = Node.extend("If", {
                fields: ["cond", "body", "else_"]
              });
              var IfAsync = If.extend("IfAsync");
              var InlineIf = Node.extend("InlineIf", {
                fields: ["cond", "body", "else_"]
              });
              var For = Node.extend("For", {
                fields: ["arr", "name", "body", "else_"]
              });
              var AsyncEach = For.extend("AsyncEach");
              var AsyncAll = For.extend("AsyncAll");
              var Macro = Node.extend("Macro", {
                fields: ["name", "args", "body"]
              });
              var Caller = Macro.extend("Caller");
              var Import = Node.extend("Import", {
                fields: ["template", "target", "withContext"]
              });
              var FromImport = /* @__PURE__ */ (function(_Node3) {
                _inheritsLoose(FromImport2, _Node3);
                function FromImport2() {
                  return _Node3.apply(this, arguments) || this;
                }
                var _proto3 = FromImport2.prototype;
                _proto3.init = function init(lineno, colno, template, names, withContext) {
                  _Node3.prototype.init.call(this, lineno, colno, template, names || new NodeList(), withContext);
                };
                _createClass(FromImport2, [{
                  key: "typename",
                  get: function get() {
                    return "FromImport";
                  }
                }, {
                  key: "fields",
                  get: function get() {
                    return ["template", "names", "withContext"];
                  }
                }]);
                return FromImport2;
              })(Node);
              var FunCall = Node.extend("FunCall", {
                fields: ["name", "args"]
              });
              var Filter = FunCall.extend("Filter");
              var FilterAsync = Filter.extend("FilterAsync", {
                fields: ["name", "args", "symbol"]
              });
              var KeywordArgs = Dict.extend("KeywordArgs");
              var Block = Node.extend("Block", {
                fields: ["name", "body"]
              });
              var Super = Node.extend("Super", {
                fields: ["blockName", "symbol"]
              });
              var TemplateRef = Node.extend("TemplateRef", {
                fields: ["template"]
              });
              var Extends = TemplateRef.extend("Extends");
              var Include = Node.extend("Include", {
                fields: ["template", "ignoreMissing"]
              });
              var Set2 = Node.extend("Set", {
                fields: ["targets", "value"]
              });
              var Switch = Node.extend("Switch", {
                fields: ["expr", "cases", "default"]
              });
              var Case = Node.extend("Case", {
                fields: ["cond", "body"]
              });
              var Output = NodeList.extend("Output");
              var Capture = Node.extend("Capture", {
                fields: ["body"]
              });
              var TemplateData = Literal.extend("TemplateData");
              var UnaryOp = Node.extend("UnaryOp", {
                fields: ["target"]
              });
              var BinOp = Node.extend("BinOp", {
                fields: ["left", "right"]
              });
              var In = BinOp.extend("In");
              var Is = BinOp.extend("Is");
              var Or = BinOp.extend("Or");
              var And = BinOp.extend("And");
              var Not = UnaryOp.extend("Not");
              var Add = BinOp.extend("Add");
              var Concat = BinOp.extend("Concat");
              var Sub = BinOp.extend("Sub");
              var Mul = BinOp.extend("Mul");
              var Div = BinOp.extend("Div");
              var FloorDiv = BinOp.extend("FloorDiv");
              var Mod = BinOp.extend("Mod");
              var Pow = BinOp.extend("Pow");
              var Neg = UnaryOp.extend("Neg");
              var Pos = UnaryOp.extend("Pos");
              var Compare = Node.extend("Compare", {
                fields: ["expr", "ops"]
              });
              var CompareOperand = Node.extend("CompareOperand", {
                fields: ["expr", "type"]
              });
              var CallExtension = Node.extend("CallExtension", {
                init: function init(ext, prop, args, contentArgs) {
                  this.parent();
                  this.extName = ext.__name || ext;
                  this.prop = prop;
                  this.args = args || new NodeList();
                  this.contentArgs = contentArgs || [];
                  this.autoescape = ext.autoescape;
                },
                fields: ["extName", "prop", "args", "contentArgs"]
              });
              var CallExtensionAsync = CallExtension.extend("CallExtensionAsync");
              function print(str, indent, inline) {
                var lines = str.split("\n");
                lines.forEach(function(line, i) {
                  if (line && (inline && i > 0 || !inline)) {
                    process.stdout.write(" ".repeat(indent));
                  }
                  var nl = i === lines.length - 1 ? "" : "\n";
                  process.stdout.write("" + line + nl);
                });
              }
              function printNodes(node, indent) {
                indent = indent || 0;
                print(node.typename + ": ", indent);
                if (node instanceof NodeList) {
                  print("\n");
                  node.children.forEach(function(n) {
                    printNodes(n, indent + 2);
                  });
                } else if (node instanceof CallExtension) {
                  print(node.extName + "." + node.prop + "\n");
                  if (node.args) {
                    printNodes(node.args, indent + 2);
                  }
                  if (node.contentArgs) {
                    node.contentArgs.forEach(function(n) {
                      printNodes(n, indent + 2);
                    });
                  }
                } else {
                  var nodes = [];
                  var props = null;
                  node.iterFields(function(val, fieldName) {
                    if (val instanceof Node) {
                      nodes.push([fieldName, val]);
                    } else {
                      props = props || {};
                      props[fieldName] = val;
                    }
                  });
                  if (props) {
                    print(JSON.stringify(props, null, 2) + "\n", null, true);
                  } else {
                    print("\n");
                  }
                  nodes.forEach(function(_ref) {
                    var fieldName = _ref[0], n = _ref[1];
                    print("[" + fieldName + "] =>", indent + 2);
                    printNodes(n, indent + 4);
                  });
                }
              }
              module2.exports = {
                Node,
                Root,
                NodeList,
                Value,
                Literal,
                Symbol: _Symbol,
                Group,
                Array: ArrayNode,
                Pair,
                Dict,
                Output,
                Capture,
                TemplateData,
                If,
                IfAsync,
                InlineIf,
                For,
                AsyncEach,
                AsyncAll,
                Macro,
                Caller,
                Import,
                FromImport,
                FunCall,
                Filter,
                FilterAsync,
                KeywordArgs,
                Block,
                Super,
                Extends,
                Include,
                Set: Set2,
                Switch,
                Case,
                LookupVal,
                BinOp,
                In,
                Is,
                Or,
                And,
                Not,
                Add,
                Concat,
                Sub,
                Mul,
                Div,
                FloorDiv,
                Mod,
                Pow,
                Neg,
                Pos,
                Compare,
                CompareOperand,
                CallExtension,
                CallExtensionAsync,
                printNodes
              };
            }),
            /* 4 */
            /***/
            (function(module2, exports2) {
            }),
            /* 5 */
            /***/
            (function(module2, exports2, __webpack_require__) {
              "use strict";
              function _inheritsLoose(subClass, superClass) {
                subClass.prototype = Object.create(superClass.prototype);
                subClass.prototype.constructor = subClass;
                _setPrototypeOf(subClass, superClass);
              }
              function _setPrototypeOf(o, p) {
                _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf2(o2, p2) {
                  o2.__proto__ = p2;
                  return o2;
                };
                return _setPrototypeOf(o, p);
              }
              var parser = __webpack_require__(8);
              var transformer = __webpack_require__(17);
              var nodes = __webpack_require__(3);
              var _require = __webpack_require__(0), TemplateError = _require.TemplateError;
              var _require2 = __webpack_require__(2), Frame = _require2.Frame;
              var _require3 = __webpack_require__(1), Obj = _require3.Obj;
              var compareOps = {
                "==": "==",
                "===": "===",
                "!=": "!=",
                "!==": "!==",
                "<": "<",
                ">": ">",
                "<=": "<=",
                ">=": ">="
              };
              var Compiler = /* @__PURE__ */ (function(_Obj) {
                _inheritsLoose(Compiler2, _Obj);
                function Compiler2() {
                  return _Obj.apply(this, arguments) || this;
                }
                var _proto = Compiler2.prototype;
                _proto.init = function init(templateName, throwOnUndefined) {
                  this.templateName = templateName;
                  this.codebuf = [];
                  this.lastId = 0;
                  this.buffer = null;
                  this.bufferStack = [];
                  this._scopeClosers = "";
                  this.inBlock = false;
                  this.throwOnUndefined = throwOnUndefined;
                };
                _proto.fail = function fail(msg, lineno, colno) {
                  if (lineno !== void 0) {
                    lineno += 1;
                  }
                  if (colno !== void 0) {
                    colno += 1;
                  }
                  throw new TemplateError(msg, lineno, colno);
                };
                _proto._pushBuffer = function _pushBuffer() {
                  var id = this._tmpid();
                  this.bufferStack.push(this.buffer);
                  this.buffer = id;
                  this._emit("var " + this.buffer + ' = "";');
                  return id;
                };
                _proto._popBuffer = function _popBuffer() {
                  this.buffer = this.bufferStack.pop();
                };
                _proto._emit = function _emit(code) {
                  this.codebuf.push(code);
                };
                _proto._emitLine = function _emitLine(code) {
                  this._emit(code + "\n");
                };
                _proto._emitLines = function _emitLines() {
                  var _this = this;
                  for (var _len = arguments.length, lines = new Array(_len), _key = 0; _key < _len; _key++) {
                    lines[_key] = arguments[_key];
                  }
                  lines.forEach(function(line) {
                    return _this._emitLine(line);
                  });
                };
                _proto._emitFuncBegin = function _emitFuncBegin(node, name) {
                  this.buffer = "output";
                  this._scopeClosers = "";
                  this._emitLine("function " + name + "(env, context, frame, runtime, cb) {");
                  this._emitLine("var lineno = " + node.lineno + ";");
                  this._emitLine("var colno = " + node.colno + ";");
                  this._emitLine("var " + this.buffer + ' = "";');
                  this._emitLine("try {");
                };
                _proto._emitFuncEnd = function _emitFuncEnd(noReturn) {
                  if (!noReturn) {
                    this._emitLine("cb(null, " + this.buffer + ");");
                  }
                  this._closeScopeLevels();
                  this._emitLine("} catch (e) {");
                  this._emitLine("  cb(runtime.handleError(e, lineno, colno));");
                  this._emitLine("}");
                  this._emitLine("}");
                  this.buffer = null;
                };
                _proto._addScopeLevel = function _addScopeLevel() {
                  this._scopeClosers += "})";
                };
                _proto._closeScopeLevels = function _closeScopeLevels() {
                  this._emitLine(this._scopeClosers + ";");
                  this._scopeClosers = "";
                };
                _proto._withScopedSyntax = function _withScopedSyntax(func) {
                  var _scopeClosers = this._scopeClosers;
                  this._scopeClosers = "";
                  func.call(this);
                  this._closeScopeLevels();
                  this._scopeClosers = _scopeClosers;
                };
                _proto._makeCallback = function _makeCallback(res) {
                  var err = this._tmpid();
                  return "function(" + err + (res ? "," + res : "") + ") {\nif(" + err + ") { cb(" + err + "); return; }";
                };
                _proto._tmpid = function _tmpid() {
                  this.lastId++;
                  return "t_" + this.lastId;
                };
                _proto._templateName = function _templateName() {
                  return this.templateName == null ? "undefined" : JSON.stringify(this.templateName);
                };
                _proto._compileChildren = function _compileChildren(node, frame) {
                  var _this2 = this;
                  node.children.forEach(function(child) {
                    _this2.compile(child, frame);
                  });
                };
                _proto._compileAggregate = function _compileAggregate(node, frame, startChar, endChar) {
                  var _this3 = this;
                  if (startChar) {
                    this._emit(startChar);
                  }
                  node.children.forEach(function(child, i) {
                    if (i > 0) {
                      _this3._emit(",");
                    }
                    _this3.compile(child, frame);
                  });
                  if (endChar) {
                    this._emit(endChar);
                  }
                };
                _proto._compileExpression = function _compileExpression(node, frame) {
                  this.assertType(node, nodes.Literal, nodes.Symbol, nodes.Group, nodes.Array, nodes.Dict, nodes.FunCall, nodes.Caller, nodes.Filter, nodes.LookupVal, nodes.Compare, nodes.InlineIf, nodes.In, nodes.Is, nodes.And, nodes.Or, nodes.Not, nodes.Add, nodes.Concat, nodes.Sub, nodes.Mul, nodes.Div, nodes.FloorDiv, nodes.Mod, nodes.Pow, nodes.Neg, nodes.Pos, nodes.Compare, nodes.NodeList);
                  this.compile(node, frame);
                };
                _proto.assertType = function assertType(node) {
                  for (var _len2 = arguments.length, types = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                    types[_key2 - 1] = arguments[_key2];
                  }
                  if (!types.some(function(t) {
                    return node instanceof t;
                  })) {
                    this.fail("assertType: invalid type: " + node.typename, node.lineno, node.colno);
                  }
                };
                _proto.compileCallExtension = function compileCallExtension(node, frame, async) {
                  var _this4 = this;
                  var args = node.args;
                  var contentArgs = node.contentArgs;
                  var autoescape = typeof node.autoescape === "boolean" ? node.autoescape : true;
                  if (!async) {
                    this._emit(this.buffer + " += runtime.suppressValue(");
                  }
                  this._emit('env.getExtension("' + node.extName + '")["' + node.prop + '"](');
                  this._emit("context");
                  if (args || contentArgs) {
                    this._emit(",");
                  }
                  if (args) {
                    if (!(args instanceof nodes.NodeList)) {
                      this.fail("compileCallExtension: arguments must be a NodeList, use `parser.parseSignature`");
                    }
                    args.children.forEach(function(arg, i) {
                      _this4._compileExpression(arg, frame);
                      if (i !== args.children.length - 1 || contentArgs.length) {
                        _this4._emit(",");
                      }
                    });
                  }
                  if (contentArgs.length) {
                    contentArgs.forEach(function(arg, i) {
                      if (i > 0) {
                        _this4._emit(",");
                      }
                      if (arg) {
                        _this4._emitLine("function(cb) {");
                        _this4._emitLine("if(!cb) { cb = function(err) { if(err) { throw err; }}}");
                        var id = _this4._pushBuffer();
                        _this4._withScopedSyntax(function() {
                          _this4.compile(arg, frame);
                          _this4._emitLine("cb(null, " + id + ");");
                        });
                        _this4._popBuffer();
                        _this4._emitLine("return " + id + ";");
                        _this4._emitLine("}");
                      } else {
                        _this4._emit("null");
                      }
                    });
                  }
                  if (async) {
                    var res = this._tmpid();
                    this._emitLine(", " + this._makeCallback(res));
                    this._emitLine(this.buffer + " += runtime.suppressValue(" + res + ", " + autoescape + " && env.opts.autoescape);");
                    this._addScopeLevel();
                  } else {
                    this._emit(")");
                    this._emit(", " + autoescape + " && env.opts.autoescape);\n");
                  }
                };
                _proto.compileCallExtensionAsync = function compileCallExtensionAsync(node, frame) {
                  this.compileCallExtension(node, frame, true);
                };
                _proto.compileNodeList = function compileNodeList(node, frame) {
                  this._compileChildren(node, frame);
                };
                _proto.compileLiteral = function compileLiteral(node) {
                  if (typeof node.value === "string") {
                    var val = node.value.replace(/\\/g, "\\\\");
                    val = val.replace(/"/g, '\\"');
                    val = val.replace(/\n/g, "\\n");
                    val = val.replace(/\r/g, "\\r");
                    val = val.replace(/\t/g, "\\t");
                    val = val.replace(/\u2028/g, "\\u2028");
                    this._emit('"' + val + '"');
                  } else if (node.value === null) {
                    this._emit("null");
                  } else {
                    this._emit(node.value.toString());
                  }
                };
                _proto.compileSymbol = function compileSymbol(node, frame) {
                  var name = node.value;
                  var v = frame.lookup(name);
                  if (v) {
                    this._emit(v);
                  } else {
                    this._emit('runtime.contextOrFrameLookup(context, frame, "' + name + '")');
                  }
                };
                _proto.compileGroup = function compileGroup(node, frame) {
                  this._compileAggregate(node, frame, "(", ")");
                };
                _proto.compileArray = function compileArray(node, frame) {
                  this._compileAggregate(node, frame, "[", "]");
                };
                _proto.compileDict = function compileDict(node, frame) {
                  this._compileAggregate(node, frame, "{", "}");
                };
                _proto.compilePair = function compilePair(node, frame) {
                  var key = node.key;
                  var val = node.value;
                  if (key instanceof nodes.Symbol) {
                    key = new nodes.Literal(key.lineno, key.colno, key.value);
                  } else if (!(key instanceof nodes.Literal && typeof key.value === "string")) {
                    this.fail("compilePair: Dict keys must be strings or names", key.lineno, key.colno);
                  }
                  this.compile(key, frame);
                  this._emit(": ");
                  this._compileExpression(val, frame);
                };
                _proto.compileInlineIf = function compileInlineIf(node, frame) {
                  this._emit("(");
                  this.compile(node.cond, frame);
                  this._emit("?");
                  this.compile(node.body, frame);
                  this._emit(":");
                  if (node.else_ !== null) {
                    this.compile(node.else_, frame);
                  } else {
                    this._emit('""');
                  }
                  this._emit(")");
                };
                _proto.compileIn = function compileIn(node, frame) {
                  this._emit("runtime.inOperator(");
                  this.compile(node.left, frame);
                  this._emit(",");
                  this.compile(node.right, frame);
                  this._emit(")");
                };
                _proto.compileIs = function compileIs(node, frame) {
                  var right = node.right.name ? node.right.name.value : node.right.value;
                  this._emit('env.getTest("' + right + '").call(context, ');
                  this.compile(node.left, frame);
                  if (node.right.args) {
                    this._emit(",");
                    this.compile(node.right.args, frame);
                  }
                  this._emit(") === true");
                };
                _proto._binOpEmitter = function _binOpEmitter(node, frame, str) {
                  this.compile(node.left, frame);
                  this._emit(str);
                  this.compile(node.right, frame);
                };
                _proto.compileOr = function compileOr(node, frame) {
                  return this._binOpEmitter(node, frame, " || ");
                };
                _proto.compileAnd = function compileAnd(node, frame) {
                  return this._binOpEmitter(node, frame, " && ");
                };
                _proto.compileAdd = function compileAdd(node, frame) {
                  return this._binOpEmitter(node, frame, " + ");
                };
                _proto.compileConcat = function compileConcat(node, frame) {
                  return this._binOpEmitter(node, frame, ' + "" + ');
                };
                _proto.compileSub = function compileSub(node, frame) {
                  return this._binOpEmitter(node, frame, " - ");
                };
                _proto.compileMul = function compileMul(node, frame) {
                  return this._binOpEmitter(node, frame, " * ");
                };
                _proto.compileDiv = function compileDiv(node, frame) {
                  return this._binOpEmitter(node, frame, " / ");
                };
                _proto.compileMod = function compileMod(node, frame) {
                  return this._binOpEmitter(node, frame, " % ");
                };
                _proto.compileNot = function compileNot(node, frame) {
                  this._emit("!");
                  this.compile(node.target, frame);
                };
                _proto.compileFloorDiv = function compileFloorDiv(node, frame) {
                  this._emit("Math.floor(");
                  this.compile(node.left, frame);
                  this._emit(" / ");
                  this.compile(node.right, frame);
                  this._emit(")");
                };
                _proto.compilePow = function compilePow(node, frame) {
                  this._emit("Math.pow(");
                  this.compile(node.left, frame);
                  this._emit(", ");
                  this.compile(node.right, frame);
                  this._emit(")");
                };
                _proto.compileNeg = function compileNeg(node, frame) {
                  this._emit("-");
                  this.compile(node.target, frame);
                };
                _proto.compilePos = function compilePos(node, frame) {
                  this._emit("+");
                  this.compile(node.target, frame);
                };
                _proto.compileCompare = function compileCompare(node, frame) {
                  var _this5 = this;
                  this.compile(node.expr, frame);
                  node.ops.forEach(function(op) {
                    _this5._emit(" " + compareOps[op.type] + " ");
                    _this5.compile(op.expr, frame);
                  });
                };
                _proto.compileLookupVal = function compileLookupVal(node, frame) {
                  this._emit("runtime.memberLookup((");
                  this._compileExpression(node.target, frame);
                  this._emit("),");
                  this._compileExpression(node.val, frame);
                  this._emit(")");
                };
                _proto._getNodeName = function _getNodeName(node) {
                  switch (node.typename) {
                    case "Symbol":
                      return node.value;
                    case "FunCall":
                      return "the return value of (" + this._getNodeName(node.name) + ")";
                    case "LookupVal":
                      return this._getNodeName(node.target) + '["' + this._getNodeName(node.val) + '"]';
                    case "Literal":
                      return node.value.toString();
                    default:
                      return "--expression--";
                  }
                };
                _proto.compileFunCall = function compileFunCall(node, frame) {
                  this._emit("(lineno = " + node.lineno + ", colno = " + node.colno + ", ");
                  this._emit("runtime.callWrap(");
                  this._compileExpression(node.name, frame);
                  this._emit(', "' + this._getNodeName(node.name).replace(/"/g, '\\"') + '", context, ');
                  this._compileAggregate(node.args, frame, "[", "])");
                  this._emit(")");
                };
                _proto.compileFilter = function compileFilter(node, frame) {
                  var name = node.name;
                  this.assertType(name, nodes.Symbol);
                  this._emit('env.getFilter("' + name.value + '").call(context, ');
                  this._compileAggregate(node.args, frame);
                  this._emit(")");
                };
                _proto.compileFilterAsync = function compileFilterAsync(node, frame) {
                  var name = node.name;
                  var symbol = node.symbol.value;
                  this.assertType(name, nodes.Symbol);
                  frame.set(symbol, symbol);
                  this._emit('env.getFilter("' + name.value + '").call(context, ');
                  this._compileAggregate(node.args, frame);
                  this._emitLine(", " + this._makeCallback(symbol));
                  this._addScopeLevel();
                };
                _proto.compileKeywordArgs = function compileKeywordArgs(node, frame) {
                  this._emit("runtime.makeKeywordArgs(");
                  this.compileDict(node, frame);
                  this._emit(")");
                };
                _proto.compileSet = function compileSet(node, frame) {
                  var _this6 = this;
                  var ids = [];
                  node.targets.forEach(function(target) {
                    var name = target.value;
                    var id = frame.lookup(name);
                    if (id === null || id === void 0) {
                      id = _this6._tmpid();
                      _this6._emitLine("var " + id + ";");
                    }
                    ids.push(id);
                  });
                  if (node.value) {
                    this._emit(ids.join(" = ") + " = ");
                    this._compileExpression(node.value, frame);
                    this._emitLine(";");
                  } else {
                    this._emit(ids.join(" = ") + " = ");
                    this.compile(node.body, frame);
                    this._emitLine(";");
                  }
                  node.targets.forEach(function(target, i) {
                    var id = ids[i];
                    var name = target.value;
                    _this6._emitLine('frame.set("' + name + '", ' + id + ", true);");
                    _this6._emitLine("if(frame.topLevel) {");
                    _this6._emitLine('context.setVariable("' + name + '", ' + id + ");");
                    _this6._emitLine("}");
                    if (name.charAt(0) !== "_") {
                      _this6._emitLine("if(frame.topLevel) {");
                      _this6._emitLine('context.addExport("' + name + '", ' + id + ");");
                      _this6._emitLine("}");
                    }
                  });
                };
                _proto.compileSwitch = function compileSwitch(node, frame) {
                  var _this7 = this;
                  this._emit("switch (");
                  this.compile(node.expr, frame);
                  this._emit(") {");
                  node.cases.forEach(function(c, i) {
                    _this7._emit("case ");
                    _this7.compile(c.cond, frame);
                    _this7._emit(": ");
                    _this7.compile(c.body, frame);
                    if (c.body.children.length) {
                      _this7._emitLine("break;");
                    }
                  });
                  if (node.default) {
                    this._emit("default:");
                    this.compile(node.default, frame);
                  }
                  this._emit("}");
                };
                _proto.compileIf = function compileIf(node, frame, async) {
                  var _this8 = this;
                  this._emit("if(");
                  this._compileExpression(node.cond, frame);
                  this._emitLine(") {");
                  this._withScopedSyntax(function() {
                    _this8.compile(node.body, frame);
                    if (async) {
                      _this8._emit("cb()");
                    }
                  });
                  if (node.else_) {
                    this._emitLine("}\nelse {");
                    this._withScopedSyntax(function() {
                      _this8.compile(node.else_, frame);
                      if (async) {
                        _this8._emit("cb()");
                      }
                    });
                  } else if (async) {
                    this._emitLine("}\nelse {");
                    this._emit("cb()");
                  }
                  this._emitLine("}");
                };
                _proto.compileIfAsync = function compileIfAsync(node, frame) {
                  this._emit("(function(cb) {");
                  this.compileIf(node, frame, true);
                  this._emit("})(" + this._makeCallback());
                  this._addScopeLevel();
                };
                _proto._emitLoopBindings = function _emitLoopBindings(node, arr, i, len) {
                  var _this9 = this;
                  var bindings = [{
                    name: "index",
                    val: i + " + 1"
                  }, {
                    name: "index0",
                    val: i
                  }, {
                    name: "revindex",
                    val: len + " - " + i
                  }, {
                    name: "revindex0",
                    val: len + " - " + i + " - 1"
                  }, {
                    name: "first",
                    val: i + " === 0"
                  }, {
                    name: "last",
                    val: i + " === " + len + " - 1"
                  }, {
                    name: "length",
                    val: len
                  }];
                  bindings.forEach(function(b) {
                    _this9._emitLine('frame.set("loop.' + b.name + '", ' + b.val + ");");
                  });
                };
                _proto.compileFor = function compileFor(node, frame) {
                  var _this10 = this;
                  var i = this._tmpid();
                  var len = this._tmpid();
                  var arr = this._tmpid();
                  frame = frame.push();
                  this._emitLine("frame = frame.push();");
                  this._emit("var " + arr + " = ");
                  this._compileExpression(node.arr, frame);
                  this._emitLine(";");
                  this._emit("if(" + arr + ") {");
                  this._emitLine(arr + " = runtime.fromIterator(" + arr + ");");
                  if (node.name instanceof nodes.Array) {
                    this._emitLine("var " + i + ";");
                    this._emitLine("if(runtime.isArray(" + arr + ")) {");
                    this._emitLine("var " + len + " = " + arr + ".length;");
                    this._emitLine("for(" + i + "=0; " + i + " < " + arr + ".length; " + i + "++) {");
                    node.name.children.forEach(function(child, u) {
                      var tid = _this10._tmpid();
                      _this10._emitLine("var " + tid + " = " + arr + "[" + i + "][" + u + "];");
                      _this10._emitLine('frame.set("' + child + '", ' + arr + "[" + i + "][" + u + "]);");
                      frame.set(node.name.children[u].value, tid);
                    });
                    this._emitLoopBindings(node, arr, i, len);
                    this._withScopedSyntax(function() {
                      _this10.compile(node.body, frame);
                    });
                    this._emitLine("}");
                    this._emitLine("} else {");
                    var _node$name$children = node.name.children, key = _node$name$children[0], val = _node$name$children[1];
                    var k = this._tmpid();
                    var v = this._tmpid();
                    frame.set(key.value, k);
                    frame.set(val.value, v);
                    this._emitLine(i + " = -1;");
                    this._emitLine("var " + len + " = runtime.keys(" + arr + ").length;");
                    this._emitLine("for(var " + k + " in " + arr + ") {");
                    this._emitLine(i + "++;");
                    this._emitLine("var " + v + " = " + arr + "[" + k + "];");
                    this._emitLine('frame.set("' + key.value + '", ' + k + ");");
                    this._emitLine('frame.set("' + val.value + '", ' + v + ");");
                    this._emitLoopBindings(node, arr, i, len);
                    this._withScopedSyntax(function() {
                      _this10.compile(node.body, frame);
                    });
                    this._emitLine("}");
                    this._emitLine("}");
                  } else {
                    var _v = this._tmpid();
                    frame.set(node.name.value, _v);
                    this._emitLine("var " + len + " = " + arr + ".length;");
                    this._emitLine("for(var " + i + "=0; " + i + " < " + arr + ".length; " + i + "++) {");
                    this._emitLine("var " + _v + " = " + arr + "[" + i + "];");
                    this._emitLine('frame.set("' + node.name.value + '", ' + _v + ");");
                    this._emitLoopBindings(node, arr, i, len);
                    this._withScopedSyntax(function() {
                      _this10.compile(node.body, frame);
                    });
                    this._emitLine("}");
                  }
                  this._emitLine("}");
                  if (node.else_) {
                    this._emitLine("if (!" + len + ") {");
                    this.compile(node.else_, frame);
                    this._emitLine("}");
                  }
                  this._emitLine("frame = frame.pop();");
                };
                _proto._compileAsyncLoop = function _compileAsyncLoop(node, frame, parallel) {
                  var _this11 = this;
                  var i = this._tmpid();
                  var len = this._tmpid();
                  var arr = this._tmpid();
                  var asyncMethod = parallel ? "asyncAll" : "asyncEach";
                  frame = frame.push();
                  this._emitLine("frame = frame.push();");
                  this._emit("var " + arr + " = runtime.fromIterator(");
                  this._compileExpression(node.arr, frame);
                  this._emitLine(");");
                  if (node.name instanceof nodes.Array) {
                    var arrayLen = node.name.children.length;
                    this._emit("runtime." + asyncMethod + "(" + arr + ", " + arrayLen + ", function(");
                    node.name.children.forEach(function(name) {
                      _this11._emit(name.value + ",");
                    });
                    this._emit(i + "," + len + ",next) {");
                    node.name.children.forEach(function(name) {
                      var id2 = name.value;
                      frame.set(id2, id2);
                      _this11._emitLine('frame.set("' + id2 + '", ' + id2 + ");");
                    });
                  } else {
                    var id = node.name.value;
                    this._emitLine("runtime." + asyncMethod + "(" + arr + ", 1, function(" + id + ", " + i + ", " + len + ",next) {");
                    this._emitLine('frame.set("' + id + '", ' + id + ");");
                    frame.set(id, id);
                  }
                  this._emitLoopBindings(node, arr, i, len);
                  this._withScopedSyntax(function() {
                    var buf;
                    if (parallel) {
                      buf = _this11._pushBuffer();
                    }
                    _this11.compile(node.body, frame);
                    _this11._emitLine("next(" + i + (buf ? "," + buf : "") + ");");
                    if (parallel) {
                      _this11._popBuffer();
                    }
                  });
                  var output = this._tmpid();
                  this._emitLine("}, " + this._makeCallback(output));
                  this._addScopeLevel();
                  if (parallel) {
                    this._emitLine(this.buffer + " += " + output + ";");
                  }
                  if (node.else_) {
                    this._emitLine("if (!" + arr + ".length) {");
                    this.compile(node.else_, frame);
                    this._emitLine("}");
                  }
                  this._emitLine("frame = frame.pop();");
                };
                _proto.compileAsyncEach = function compileAsyncEach(node, frame) {
                  this._compileAsyncLoop(node, frame);
                };
                _proto.compileAsyncAll = function compileAsyncAll(node, frame) {
                  this._compileAsyncLoop(node, frame, true);
                };
                _proto._compileMacro = function _compileMacro(node, frame) {
                  var _this12 = this;
                  var args = [];
                  var kwargs = null;
                  var funcId = "macro_" + this._tmpid();
                  var keepFrame = frame !== void 0;
                  node.args.children.forEach(function(arg, i) {
                    if (i === node.args.children.length - 1 && arg instanceof nodes.Dict) {
                      kwargs = arg;
                    } else {
                      _this12.assertType(arg, nodes.Symbol);
                      args.push(arg);
                    }
                  });
                  var realNames = [].concat(args.map(function(n) {
                    return "l_" + n.value;
                  }), ["kwargs"]);
                  var argNames = args.map(function(n) {
                    return '"' + n.value + '"';
                  });
                  var kwargNames = (kwargs && kwargs.children || []).map(function(n) {
                    return '"' + n.key.value + '"';
                  });
                  var currFrame;
                  if (keepFrame) {
                    currFrame = frame.push(true);
                  } else {
                    currFrame = new Frame();
                  }
                  this._emitLines("var " + funcId + " = runtime.makeMacro(", "[" + argNames.join(", ") + "], ", "[" + kwargNames.join(", ") + "], ", "function (" + realNames.join(", ") + ") {", "var callerFrame = frame;", "frame = " + (keepFrame ? "frame.push(true);" : "new runtime.Frame();"), "kwargs = kwargs || {};", 'if (Object.prototype.hasOwnProperty.call(kwargs, "caller")) {', 'frame.set("caller", kwargs.caller); }');
                  args.forEach(function(arg) {
                    _this12._emitLine('frame.set("' + arg.value + '", l_' + arg.value + ");");
                    currFrame.set(arg.value, "l_" + arg.value);
                  });
                  if (kwargs) {
                    kwargs.children.forEach(function(pair) {
                      var name = pair.key.value;
                      _this12._emit('frame.set("' + name + '", ');
                      _this12._emit('Object.prototype.hasOwnProperty.call(kwargs, "' + name + '")');
                      _this12._emit(' ? kwargs["' + name + '"] : ');
                      _this12._compileExpression(pair.value, currFrame);
                      _this12._emit(");");
                    });
                  }
                  var bufferId = this._pushBuffer();
                  this._withScopedSyntax(function() {
                    _this12.compile(node.body, currFrame);
                  });
                  this._emitLine("frame = " + (keepFrame ? "frame.pop();" : "callerFrame;"));
                  this._emitLine("return new runtime.SafeString(" + bufferId + ");");
                  this._emitLine("});");
                  this._popBuffer();
                  return funcId;
                };
                _proto.compileMacro = function compileMacro(node, frame) {
                  var funcId = this._compileMacro(node);
                  var name = node.name.value;
                  frame.set(name, funcId);
                  if (frame.parent) {
                    this._emitLine('frame.set("' + name + '", ' + funcId + ");");
                  } else {
                    if (node.name.value.charAt(0) !== "_") {
                      this._emitLine('context.addExport("' + name + '");');
                    }
                    this._emitLine('context.setVariable("' + name + '", ' + funcId + ");");
                  }
                };
                _proto.compileCaller = function compileCaller(node, frame) {
                  this._emit("(function (){");
                  var funcId = this._compileMacro(node, frame);
                  this._emit("return " + funcId + ";})()");
                };
                _proto._compileGetTemplate = function _compileGetTemplate(node, frame, eagerCompile, ignoreMissing) {
                  var parentTemplateId = this._tmpid();
                  var parentName = this._templateName();
                  var cb = this._makeCallback(parentTemplateId);
                  var eagerCompileArg = eagerCompile ? "true" : "false";
                  var ignoreMissingArg = ignoreMissing ? "true" : "false";
                  this._emit("env.getTemplate(");
                  this._compileExpression(node.template, frame);
                  this._emitLine(", " + eagerCompileArg + ", " + parentName + ", " + ignoreMissingArg + ", " + cb);
                  return parentTemplateId;
                };
                _proto.compileImport = function compileImport(node, frame) {
                  var target = node.target.value;
                  var id = this._compileGetTemplate(node, frame, false, false);
                  this._addScopeLevel();
                  this._emitLine(id + ".getExported(" + (node.withContext ? "context.getVariables(), frame, " : "") + this._makeCallback(id));
                  this._addScopeLevel();
                  frame.set(target, id);
                  if (frame.parent) {
                    this._emitLine('frame.set("' + target + '", ' + id + ");");
                  } else {
                    this._emitLine('context.setVariable("' + target + '", ' + id + ");");
                  }
                };
                _proto.compileFromImport = function compileFromImport(node, frame) {
                  var _this13 = this;
                  var importedId = this._compileGetTemplate(node, frame, false, false);
                  this._addScopeLevel();
                  this._emitLine(importedId + ".getExported(" + (node.withContext ? "context.getVariables(), frame, " : "") + this._makeCallback(importedId));
                  this._addScopeLevel();
                  node.names.children.forEach(function(nameNode) {
                    var name;
                    var alias;
                    var id = _this13._tmpid();
                    if (nameNode instanceof nodes.Pair) {
                      name = nameNode.key.value;
                      alias = nameNode.value.value;
                    } else {
                      name = nameNode.value;
                      alias = name;
                    }
                    _this13._emitLine("if(Object.prototype.hasOwnProperty.call(" + importedId + ', "' + name + '")) {');
                    _this13._emitLine("var " + id + " = " + importedId + "." + name + ";");
                    _this13._emitLine("} else {");
                    _this13._emitLine(`cb(new Error("cannot import '` + name + `'")); return;`);
                    _this13._emitLine("}");
                    frame.set(alias, id);
                    if (frame.parent) {
                      _this13._emitLine('frame.set("' + alias + '", ' + id + ");");
                    } else {
                      _this13._emitLine('context.setVariable("' + alias + '", ' + id + ");");
                    }
                  });
                };
                _proto.compileBlock = function compileBlock(node) {
                  var id = this._tmpid();
                  if (!this.inBlock) {
                    this._emit('(parentTemplate ? function(e, c, f, r, cb) { cb(""); } : ');
                  }
                  this._emit('context.getBlock("' + node.name.value + '")');
                  if (!this.inBlock) {
                    this._emit(")");
                  }
                  this._emitLine("(env, context, frame, runtime, " + this._makeCallback(id));
                  this._emitLine(this.buffer + " += " + id + ";");
                  this._addScopeLevel();
                };
                _proto.compileSuper = function compileSuper(node, frame) {
                  var name = node.blockName.value;
                  var id = node.symbol.value;
                  var cb = this._makeCallback(id);
                  this._emitLine('context.getSuper(env, "' + name + '", b_' + name + ", frame, runtime, " + cb);
                  this._emitLine(id + " = runtime.markSafe(" + id + ");");
                  this._addScopeLevel();
                  frame.set(id, id);
                };
                _proto.compileExtends = function compileExtends(node, frame) {
                  var k = this._tmpid();
                  var parentTemplateId = this._compileGetTemplate(node, frame, true, false);
                  this._emitLine("parentTemplate = " + parentTemplateId);
                  this._emitLine("for(var " + k + " in parentTemplate.blocks) {");
                  this._emitLine("context.addBlock(" + k + ", parentTemplate.blocks[" + k + "]);");
                  this._emitLine("}");
                  this._addScopeLevel();
                };
                _proto.compileInclude = function compileInclude(node, frame) {
                  this._emitLine("var tasks = [];");
                  this._emitLine("tasks.push(");
                  this._emitLine("function(callback) {");
                  var id = this._compileGetTemplate(node, frame, false, node.ignoreMissing);
                  this._emitLine("callback(null," + id + ");});");
                  this._emitLine("});");
                  var id2 = this._tmpid();
                  this._emitLine("tasks.push(");
                  this._emitLine("function(template, callback){");
                  this._emitLine("template.render(context.getVariables(), frame, " + this._makeCallback(id2));
                  this._emitLine("callback(null," + id2 + ");});");
                  this._emitLine("});");
                  this._emitLine("tasks.push(");
                  this._emitLine("function(result, callback){");
                  this._emitLine(this.buffer + " += result;");
                  this._emitLine("callback(null);");
                  this._emitLine("});");
                  this._emitLine("env.waterfall(tasks, function(){");
                  this._addScopeLevel();
                };
                _proto.compileTemplateData = function compileTemplateData(node, frame) {
                  this.compileLiteral(node, frame);
                };
                _proto.compileCapture = function compileCapture(node, frame) {
                  var _this14 = this;
                  var buffer = this.buffer;
                  this.buffer = "output";
                  this._emitLine("(function() {");
                  this._emitLine('var output = "";');
                  this._withScopedSyntax(function() {
                    _this14.compile(node.body, frame);
                  });
                  this._emitLine("return output;");
                  this._emitLine("})()");
                  this.buffer = buffer;
                };
                _proto.compileOutput = function compileOutput(node, frame) {
                  var _this15 = this;
                  var children = node.children;
                  children.forEach(function(child) {
                    if (child instanceof nodes.TemplateData) {
                      if (child.value) {
                        _this15._emit(_this15.buffer + " += ");
                        _this15.compileLiteral(child, frame);
                        _this15._emitLine(";");
                      }
                    } else {
                      _this15._emit(_this15.buffer + " += runtime.suppressValue(");
                      if (_this15.throwOnUndefined) {
                        _this15._emit("runtime.ensureDefined(");
                      }
                      _this15.compile(child, frame);
                      if (_this15.throwOnUndefined) {
                        _this15._emit("," + node.lineno + "," + node.colno + ")");
                      }
                      _this15._emit(", env.opts.autoescape);\n");
                    }
                  });
                };
                _proto.compileRoot = function compileRoot(node, frame) {
                  var _this16 = this;
                  if (frame) {
                    this.fail("compileRoot: root node can't have frame");
                  }
                  frame = new Frame();
                  this._emitFuncBegin(node, "root");
                  this._emitLine("var parentTemplate = null;");
                  this._compileChildren(node, frame);
                  this._emitLine("if(parentTemplate) {");
                  this._emitLine("parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);");
                  this._emitLine("} else {");
                  this._emitLine("cb(null, " + this.buffer + ");");
                  this._emitLine("}");
                  this._emitFuncEnd(true);
                  this.inBlock = true;
                  var blockNames = [];
                  var blocks = node.findAll(nodes.Block);
                  blocks.forEach(function(block, i) {
                    var name = block.name.value;
                    if (blockNames.indexOf(name) !== -1) {
                      throw new Error('Block "' + name + '" defined more than once.');
                    }
                    blockNames.push(name);
                    _this16._emitFuncBegin(block, "b_" + name);
                    var tmpFrame = new Frame();
                    _this16._emitLine("var frame = frame.push(true);");
                    _this16.compile(block.body, tmpFrame);
                    _this16._emitFuncEnd();
                  });
                  this._emitLine("return {");
                  blocks.forEach(function(block, i) {
                    var blockName = "b_" + block.name.value;
                    _this16._emitLine(blockName + ": " + blockName + ",");
                  });
                  this._emitLine("root: root\n};");
                };
                _proto.compile = function compile(node, frame) {
                  var _compile = this["compile" + node.typename];
                  if (_compile) {
                    _compile.call(this, node, frame);
                  } else {
                    this.fail("compile: Cannot compile node: " + node.typename, node.lineno, node.colno);
                  }
                };
                _proto.getCode = function getCode() {
                  return this.codebuf.join("");
                };
                return Compiler2;
              })(Obj);
              module2.exports = {
                compile: function compile(src, asyncFilters, extensions, name, opts) {
                  if (opts === void 0) {
                    opts = {};
                  }
                  var c = new Compiler(name, opts.throwOnUndefined);
                  var preprocessors = (extensions || []).map(function(ext) {
                    return ext.preprocess;
                  }).filter(function(f) {
                    return !!f;
                  });
                  var processedSrc = preprocessors.reduce(function(s, processor) {
                    return processor(s);
                  }, src);
                  c.compile(transformer.transform(parser.parse(processedSrc, extensions, opts), asyncFilters, name));
                  return c.getCode();
                },
                Compiler
              };
            }),
            /* 6 */
            /***/
            (function(module2, exports2, __webpack_require__) {
              "use strict";
              function _inheritsLoose(subClass, superClass) {
                subClass.prototype = Object.create(superClass.prototype);
                subClass.prototype.constructor = subClass;
                _setPrototypeOf(subClass, superClass);
              }
              function _setPrototypeOf(o, p) {
                _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf2(o2, p2) {
                  o2.__proto__ = p2;
                  return o2;
                };
                return _setPrototypeOf(o, p);
              }
              var path = __webpack_require__(4);
              var _require = __webpack_require__(1), EmitterObj = _require.EmitterObj;
              module2.exports = /* @__PURE__ */ (function(_EmitterObj) {
                _inheritsLoose(Loader, _EmitterObj);
                function Loader() {
                  return _EmitterObj.apply(this, arguments) || this;
                }
                var _proto = Loader.prototype;
                _proto.resolve = function resolve(from, to) {
                  return path.resolve(path.dirname(from), to);
                };
                _proto.isRelative = function isRelative(filename) {
                  return filename.indexOf("./") === 0 || filename.indexOf("../") === 0;
                };
                return Loader;
              })(EmitterObj);
            }),
            /* 7 */
            /***/
            (function(module2, exports2, __webpack_require__) {
              "use strict";
              function _inheritsLoose(subClass, superClass) {
                subClass.prototype = Object.create(superClass.prototype);
                subClass.prototype.constructor = subClass;
                _setPrototypeOf(subClass, superClass);
              }
              function _setPrototypeOf(o, p) {
                _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf2(o2, p2) {
                  o2.__proto__ = p2;
                  return o2;
                };
                return _setPrototypeOf(o, p);
              }
              var asap = __webpack_require__(12);
              var _waterfall = __webpack_require__(15);
              var lib = __webpack_require__(0);
              var compiler = __webpack_require__(5);
              var filters = __webpack_require__(18);
              var _require = __webpack_require__(10), FileSystemLoader = _require.FileSystemLoader, WebLoader = _require.WebLoader, PrecompiledLoader = _require.PrecompiledLoader;
              var tests = __webpack_require__(20);
              var globals = __webpack_require__(21);
              var _require2 = __webpack_require__(1), Obj = _require2.Obj, EmitterObj = _require2.EmitterObj;
              var globalRuntime = __webpack_require__(2);
              var handleError = globalRuntime.handleError, Frame = globalRuntime.Frame;
              var expressApp = __webpack_require__(22);
              function callbackAsap(cb, err, res) {
                asap(function() {
                  cb(err, res);
                });
              }
              var noopTmplSrc = {
                type: "code",
                obj: {
                  root: function root(env, context, frame, runtime, cb) {
                    try {
                      cb(null, "");
                    } catch (e) {
                      cb(handleError(e, null, null));
                    }
                  }
                }
              };
              var Environment = /* @__PURE__ */ (function(_EmitterObj) {
                _inheritsLoose(Environment2, _EmitterObj);
                function Environment2() {
                  return _EmitterObj.apply(this, arguments) || this;
                }
                var _proto = Environment2.prototype;
                _proto.init = function init(loaders, opts) {
                  var _this = this;
                  opts = this.opts = opts || {};
                  this.opts.dev = !!opts.dev;
                  this.opts.autoescape = opts.autoescape != null ? opts.autoescape : true;
                  this.opts.throwOnUndefined = !!opts.throwOnUndefined;
                  this.opts.trimBlocks = !!opts.trimBlocks;
                  this.opts.lstripBlocks = !!opts.lstripBlocks;
                  this.loaders = [];
                  if (!loaders) {
                    if (FileSystemLoader) {
                      this.loaders = [new FileSystemLoader("views")];
                    } else if (WebLoader) {
                      this.loaders = [new WebLoader("/views")];
                    }
                  } else {
                    this.loaders = lib.isArray(loaders) ? loaders : [loaders];
                  }
                  if (typeof window !== "undefined" && window.nunjucksPrecompiled) {
                    this.loaders.unshift(new PrecompiledLoader(window.nunjucksPrecompiled));
                  }
                  this._initLoaders();
                  this.globals = globals();
                  this.filters = {};
                  this.tests = {};
                  this.asyncFilters = [];
                  this.extensions = {};
                  this.extensionsList = [];
                  lib._entries(filters).forEach(function(_ref) {
                    var name = _ref[0], filter = _ref[1];
                    return _this.addFilter(name, filter);
                  });
                  lib._entries(tests).forEach(function(_ref2) {
                    var name = _ref2[0], test = _ref2[1];
                    return _this.addTest(name, test);
                  });
                };
                _proto._initLoaders = function _initLoaders() {
                  var _this2 = this;
                  this.loaders.forEach(function(loader) {
                    loader.cache = {};
                    if (typeof loader.on === "function") {
                      loader.on("update", function(name, fullname) {
                        loader.cache[name] = null;
                        _this2.emit("update", name, fullname, loader);
                      });
                      loader.on("load", function(name, source) {
                        _this2.emit("load", name, source, loader);
                      });
                    }
                  });
                };
                _proto.invalidateCache = function invalidateCache() {
                  this.loaders.forEach(function(loader) {
                    loader.cache = {};
                  });
                };
                _proto.addExtension = function addExtension(name, extension) {
                  extension.__name = name;
                  this.extensions[name] = extension;
                  this.extensionsList.push(extension);
                  return this;
                };
                _proto.removeExtension = function removeExtension(name) {
                  var extension = this.getExtension(name);
                  if (!extension) {
                    return;
                  }
                  this.extensionsList = lib.without(this.extensionsList, extension);
                  delete this.extensions[name];
                };
                _proto.getExtension = function getExtension(name) {
                  return this.extensions[name];
                };
                _proto.hasExtension = function hasExtension(name) {
                  return !!this.extensions[name];
                };
                _proto.addGlobal = function addGlobal(name, value) {
                  this.globals[name] = value;
                  return this;
                };
                _proto.getGlobal = function getGlobal(name) {
                  if (typeof this.globals[name] === "undefined") {
                    throw new Error("global not found: " + name);
                  }
                  return this.globals[name];
                };
                _proto.addFilter = function addFilter(name, func, async) {
                  var wrapped = func;
                  if (async) {
                    this.asyncFilters.push(name);
                  }
                  this.filters[name] = wrapped;
                  return this;
                };
                _proto.getFilter = function getFilter(name) {
                  if (!this.filters[name]) {
                    throw new Error("filter not found: " + name);
                  }
                  return this.filters[name];
                };
                _proto.addTest = function addTest(name, func) {
                  this.tests[name] = func;
                  return this;
                };
                _proto.getTest = function getTest(name) {
                  if (!this.tests[name]) {
                    throw new Error("test not found: " + name);
                  }
                  return this.tests[name];
                };
                _proto.resolveTemplate = function resolveTemplate(loader, parentName, filename) {
                  var isRelative = loader.isRelative && parentName ? loader.isRelative(filename) : false;
                  return isRelative && loader.resolve ? loader.resolve(parentName, filename) : filename;
                };
                _proto.getTemplate = function getTemplate(name, eagerCompile, parentName, ignoreMissing, cb) {
                  var _this3 = this;
                  var that = this;
                  var tmpl = null;
                  if (name && name.raw) {
                    name = name.raw;
                  }
                  if (lib.isFunction(parentName)) {
                    cb = parentName;
                    parentName = null;
                    eagerCompile = eagerCompile || false;
                  }
                  if (lib.isFunction(eagerCompile)) {
                    cb = eagerCompile;
                    eagerCompile = false;
                  }
                  if (name instanceof Template) {
                    tmpl = name;
                  } else if (typeof name !== "string") {
                    throw new Error("template names must be a string: " + name);
                  } else {
                    for (var i = 0; i < this.loaders.length; i++) {
                      var loader = this.loaders[i];
                      tmpl = loader.cache[this.resolveTemplate(loader, parentName, name)];
                      if (tmpl) {
                        break;
                      }
                    }
                  }
                  if (tmpl) {
                    if (eagerCompile) {
                      tmpl.compile();
                    }
                    if (cb) {
                      cb(null, tmpl);
                      return void 0;
                    } else {
                      return tmpl;
                    }
                  }
                  var syncResult;
                  var createTemplate = function createTemplate2(err, info) {
                    if (!info && !err && !ignoreMissing) {
                      err = new Error("template not found: " + name);
                    }
                    if (err) {
                      if (cb) {
                        cb(err);
                        return;
                      } else {
                        throw err;
                      }
                    }
                    var newTmpl;
                    if (!info) {
                      newTmpl = new Template(noopTmplSrc, _this3, "", eagerCompile);
                    } else {
                      newTmpl = new Template(info.src, _this3, info.path, eagerCompile);
                      if (!info.noCache) {
                        info.loader.cache[name] = newTmpl;
                      }
                    }
                    if (cb) {
                      cb(null, newTmpl);
                    } else {
                      syncResult = newTmpl;
                    }
                  };
                  lib.asyncIter(this.loaders, function(loader2, i2, next, done) {
                    function handle(err, src) {
                      if (err) {
                        done(err);
                      } else if (src) {
                        src.loader = loader2;
                        done(null, src);
                      } else {
                        next();
                      }
                    }
                    name = that.resolveTemplate(loader2, parentName, name);
                    if (loader2.async) {
                      loader2.getSource(name, handle);
                    } else {
                      handle(null, loader2.getSource(name));
                    }
                  }, createTemplate);
                  return syncResult;
                };
                _proto.express = function express(app) {
                  return expressApp(this, app);
                };
                _proto.render = function render2(name, ctx, cb) {
                  if (lib.isFunction(ctx)) {
                    cb = ctx;
                    ctx = null;
                  }
                  var syncResult = null;
                  this.getTemplate(name, function(err, tmpl) {
                    if (err && cb) {
                      callbackAsap(cb, err);
                    } else if (err) {
                      throw err;
                    } else {
                      syncResult = tmpl.render(ctx, cb);
                    }
                  });
                  return syncResult;
                };
                _proto.renderString = function renderString(src, ctx, opts, cb) {
                  if (lib.isFunction(opts)) {
                    cb = opts;
                    opts = {};
                  }
                  opts = opts || {};
                  var tmpl = new Template(src, this, opts.path);
                  return tmpl.render(ctx, cb);
                };
                _proto.waterfall = function waterfall(tasks, callback, forceAsync) {
                  return _waterfall(tasks, callback, forceAsync);
                };
                return Environment2;
              })(EmitterObj);
              var Context = /* @__PURE__ */ (function(_Obj) {
                _inheritsLoose(Context2, _Obj);
                function Context2() {
                  return _Obj.apply(this, arguments) || this;
                }
                var _proto2 = Context2.prototype;
                _proto2.init = function init(ctx, blocks, env) {
                  var _this4 = this;
                  this.env = env || new Environment();
                  this.ctx = lib.extend({}, ctx);
                  this.blocks = {};
                  this.exported = [];
                  lib.keys(blocks).forEach(function(name) {
                    _this4.addBlock(name, blocks[name]);
                  });
                };
                _proto2.lookup = function lookup(name) {
                  if (name in this.env.globals && !(name in this.ctx)) {
                    return this.env.globals[name];
                  } else {
                    return this.ctx[name];
                  }
                };
                _proto2.setVariable = function setVariable(name, val) {
                  this.ctx[name] = val;
                };
                _proto2.getVariables = function getVariables() {
                  return this.ctx;
                };
                _proto2.addBlock = function addBlock(name, block) {
                  this.blocks[name] = this.blocks[name] || [];
                  this.blocks[name].push(block);
                  return this;
                };
                _proto2.getBlock = function getBlock(name) {
                  if (!this.blocks[name]) {
                    throw new Error('unknown block "' + name + '"');
                  }
                  return this.blocks[name][0];
                };
                _proto2.getSuper = function getSuper(env, name, block, frame, runtime, cb) {
                  var idx = lib.indexOf(this.blocks[name] || [], block);
                  var blk = this.blocks[name][idx + 1];
                  var context = this;
                  if (idx === -1 || !blk) {
                    throw new Error('no super block available for "' + name + '"');
                  }
                  blk(env, context, frame, runtime, cb);
                };
                _proto2.addExport = function addExport(name) {
                  this.exported.push(name);
                };
                _proto2.getExported = function getExported() {
                  var _this5 = this;
                  var exported = {};
                  this.exported.forEach(function(name) {
                    exported[name] = _this5.ctx[name];
                  });
                  return exported;
                };
                return Context2;
              })(Obj);
              var Template = /* @__PURE__ */ (function(_Obj2) {
                _inheritsLoose(Template2, _Obj2);
                function Template2() {
                  return _Obj2.apply(this, arguments) || this;
                }
                var _proto3 = Template2.prototype;
                _proto3.init = function init(src, env, path, eagerCompile) {
                  this.env = env || new Environment();
                  if (lib.isObject(src)) {
                    switch (src.type) {
                      case "code":
                        this.tmplProps = src.obj;
                        break;
                      case "string":
                        this.tmplStr = src.obj;
                        break;
                      default:
                        throw new Error("Unexpected template object type " + src.type + "; expected 'code', or 'string'");
                    }
                  } else if (lib.isString(src)) {
                    this.tmplStr = src;
                  } else {
                    throw new Error("src must be a string or an object describing the source");
                  }
                  this.path = path;
                  if (eagerCompile) {
                    try {
                      this._compile();
                    } catch (err) {
                      throw lib._prettifyError(this.path, this.env.opts.dev, err);
                    }
                  } else {
                    this.compiled = false;
                  }
                };
                _proto3.render = function render2(ctx, parentFrame, cb) {
                  var _this6 = this;
                  if (typeof ctx === "function") {
                    cb = ctx;
                    ctx = {};
                  } else if (typeof parentFrame === "function") {
                    cb = parentFrame;
                    parentFrame = null;
                  }
                  var forceAsync = !parentFrame;
                  try {
                    this.compile();
                  } catch (e) {
                    var err = lib._prettifyError(this.path, this.env.opts.dev, e);
                    if (cb) {
                      return callbackAsap(cb, err);
                    } else {
                      throw err;
                    }
                  }
                  var context = new Context(ctx || {}, this.blocks, this.env);
                  var frame = parentFrame ? parentFrame.push(true) : new Frame();
                  frame.topLevel = true;
                  var syncResult = null;
                  var didError = false;
                  this.rootRenderFunc(this.env, context, frame, globalRuntime, function(err2, res) {
                    if (didError && cb && typeof res !== "undefined") {
                      return;
                    }
                    if (err2) {
                      err2 = lib._prettifyError(_this6.path, _this6.env.opts.dev, err2);
                      didError = true;
                    }
                    if (cb) {
                      if (forceAsync) {
                        callbackAsap(cb, err2, res);
                      } else {
                        cb(err2, res);
                      }
                    } else {
                      if (err2) {
                        throw err2;
                      }
                      syncResult = res;
                    }
                  });
                  return syncResult;
                };
                _proto3.getExported = function getExported(ctx, parentFrame, cb) {
                  if (typeof ctx === "function") {
                    cb = ctx;
                    ctx = {};
                  }
                  if (typeof parentFrame === "function") {
                    cb = parentFrame;
                    parentFrame = null;
                  }
                  try {
                    this.compile();
                  } catch (e) {
                    if (cb) {
                      return cb(e);
                    } else {
                      throw e;
                    }
                  }
                  var frame = parentFrame ? parentFrame.push() : new Frame();
                  frame.topLevel = true;
                  var context = new Context(ctx || {}, this.blocks, this.env);
                  this.rootRenderFunc(this.env, context, frame, globalRuntime, function(err) {
                    if (err) {
                      cb(err, null);
                    } else {
                      cb(null, context.getExported());
                    }
                  });
                };
                _proto3.compile = function compile() {
                  if (!this.compiled) {
                    this._compile();
                  }
                };
                _proto3._compile = function _compile() {
                  var props;
                  if (this.tmplProps) {
                    props = this.tmplProps;
                  } else {
                    var source = compiler.compile(this.tmplStr, this.env.asyncFilters, this.env.extensionsList, this.path, this.env.opts);
                    var func = new Function(source);
                    props = func();
                  }
                  this.blocks = this._getBlocks(props);
                  this.rootRenderFunc = props.root;
                  this.compiled = true;
                };
                _proto3._getBlocks = function _getBlocks(props) {
                  var blocks = {};
                  lib.keys(props).forEach(function(k) {
                    if (k.slice(0, 2) === "b_") {
                      blocks[k.slice(2)] = props[k];
                    }
                  });
                  return blocks;
                };
                return Template2;
              })(Obj);
              module2.exports = {
                Environment,
                Template
              };
            }),
            /* 8 */
            /***/
            (function(module2, exports2, __webpack_require__) {
              "use strict";
              function _inheritsLoose(subClass, superClass) {
                subClass.prototype = Object.create(superClass.prototype);
                subClass.prototype.constructor = subClass;
                _setPrototypeOf(subClass, superClass);
              }
              function _setPrototypeOf(o, p) {
                _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf2(o2, p2) {
                  o2.__proto__ = p2;
                  return o2;
                };
                return _setPrototypeOf(o, p);
              }
              var lexer = __webpack_require__(9);
              var nodes = __webpack_require__(3);
              var Obj = __webpack_require__(1).Obj;
              var lib = __webpack_require__(0);
              var Parser = /* @__PURE__ */ (function(_Obj) {
                _inheritsLoose(Parser2, _Obj);
                function Parser2() {
                  return _Obj.apply(this, arguments) || this;
                }
                var _proto = Parser2.prototype;
                _proto.init = function init(tokens) {
                  this.tokens = tokens;
                  this.peeked = null;
                  this.breakOnBlocks = null;
                  this.dropLeadingWhitespace = false;
                  this.extensions = [];
                };
                _proto.nextToken = function nextToken(withWhitespace) {
                  var tok;
                  if (this.peeked) {
                    if (!withWhitespace && this.peeked.type === lexer.TOKEN_WHITESPACE) {
                      this.peeked = null;
                    } else {
                      tok = this.peeked;
                      this.peeked = null;
                      return tok;
                    }
                  }
                  tok = this.tokens.nextToken();
                  if (!withWhitespace) {
                    while (tok && tok.type === lexer.TOKEN_WHITESPACE) {
                      tok = this.tokens.nextToken();
                    }
                  }
                  return tok;
                };
                _proto.peekToken = function peekToken() {
                  this.peeked = this.peeked || this.nextToken();
                  return this.peeked;
                };
                _proto.pushToken = function pushToken(tok) {
                  if (this.peeked) {
                    throw new Error("pushToken: can only push one token on between reads");
                  }
                  this.peeked = tok;
                };
                _proto.error = function error(msg, lineno, colno) {
                  if (lineno === void 0 || colno === void 0) {
                    var tok = this.peekToken() || {};
                    lineno = tok.lineno;
                    colno = tok.colno;
                  }
                  if (lineno !== void 0) {
                    lineno += 1;
                  }
                  if (colno !== void 0) {
                    colno += 1;
                  }
                  return new lib.TemplateError(msg, lineno, colno);
                };
                _proto.fail = function fail(msg, lineno, colno) {
                  throw this.error(msg, lineno, colno);
                };
                _proto.skip = function skip(type) {
                  var tok = this.nextToken();
                  if (!tok || tok.type !== type) {
                    this.pushToken(tok);
                    return false;
                  }
                  return true;
                };
                _proto.expect = function expect(type) {
                  var tok = this.nextToken();
                  if (tok.type !== type) {
                    this.fail("expected " + type + ", got " + tok.type, tok.lineno, tok.colno);
                  }
                  return tok;
                };
                _proto.skipValue = function skipValue(type, val) {
                  var tok = this.nextToken();
                  if (!tok || tok.type !== type || tok.value !== val) {
                    this.pushToken(tok);
                    return false;
                  }
                  return true;
                };
                _proto.skipSymbol = function skipSymbol(val) {
                  return this.skipValue(lexer.TOKEN_SYMBOL, val);
                };
                _proto.advanceAfterBlockEnd = function advanceAfterBlockEnd(name) {
                  var tok;
                  if (!name) {
                    tok = this.peekToken();
                    if (!tok) {
                      this.fail("unexpected end of file");
                    }
                    if (tok.type !== lexer.TOKEN_SYMBOL) {
                      this.fail("advanceAfterBlockEnd: expected symbol token or explicit name to be passed");
                    }
                    name = this.nextToken().value;
                  }
                  tok = this.nextToken();
                  if (tok && tok.type === lexer.TOKEN_BLOCK_END) {
                    if (tok.value.charAt(0) === "-") {
                      this.dropLeadingWhitespace = true;
                    }
                  } else {
                    this.fail("expected block end in " + name + " statement");
                  }
                  return tok;
                };
                _proto.advanceAfterVariableEnd = function advanceAfterVariableEnd() {
                  var tok = this.nextToken();
                  if (tok && tok.type === lexer.TOKEN_VARIABLE_END) {
                    this.dropLeadingWhitespace = tok.value.charAt(tok.value.length - this.tokens.tags.VARIABLE_END.length - 1) === "-";
                  } else {
                    this.pushToken(tok);
                    this.fail("expected variable end");
                  }
                };
                _proto.parseFor = function parseFor() {
                  var forTok = this.peekToken();
                  var node;
                  var endBlock;
                  if (this.skipSymbol("for")) {
                    node = new nodes.For(forTok.lineno, forTok.colno);
                    endBlock = "endfor";
                  } else if (this.skipSymbol("asyncEach")) {
                    node = new nodes.AsyncEach(forTok.lineno, forTok.colno);
                    endBlock = "endeach";
                  } else if (this.skipSymbol("asyncAll")) {
                    node = new nodes.AsyncAll(forTok.lineno, forTok.colno);
                    endBlock = "endall";
                  } else {
                    this.fail("parseFor: expected for{Async}", forTok.lineno, forTok.colno);
                  }
                  node.name = this.parsePrimary();
                  if (!(node.name instanceof nodes.Symbol)) {
                    this.fail("parseFor: variable name expected for loop");
                  }
                  var type = this.peekToken().type;
                  if (type === lexer.TOKEN_COMMA) {
                    var key = node.name;
                    node.name = new nodes.Array(key.lineno, key.colno);
                    node.name.addChild(key);
                    while (this.skip(lexer.TOKEN_COMMA)) {
                      var prim = this.parsePrimary();
                      node.name.addChild(prim);
                    }
                  }
                  if (!this.skipSymbol("in")) {
                    this.fail('parseFor: expected "in" keyword for loop', forTok.lineno, forTok.colno);
                  }
                  node.arr = this.parseExpression();
                  this.advanceAfterBlockEnd(forTok.value);
                  node.body = this.parseUntilBlocks(endBlock, "else");
                  if (this.skipSymbol("else")) {
                    this.advanceAfterBlockEnd("else");
                    node.else_ = this.parseUntilBlocks(endBlock);
                  }
                  this.advanceAfterBlockEnd();
                  return node;
                };
                _proto.parseMacro = function parseMacro() {
                  var macroTok = this.peekToken();
                  if (!this.skipSymbol("macro")) {
                    this.fail("expected macro");
                  }
                  var name = this.parsePrimary(true);
                  var args = this.parseSignature();
                  var node = new nodes.Macro(macroTok.lineno, macroTok.colno, name, args);
                  this.advanceAfterBlockEnd(macroTok.value);
                  node.body = this.parseUntilBlocks("endmacro");
                  this.advanceAfterBlockEnd();
                  return node;
                };
                _proto.parseCall = function parseCall() {
                  var callTok = this.peekToken();
                  if (!this.skipSymbol("call")) {
                    this.fail("expected call");
                  }
                  var callerArgs = this.parseSignature(true) || new nodes.NodeList();
                  var macroCall = this.parsePrimary();
                  this.advanceAfterBlockEnd(callTok.value);
                  var body = this.parseUntilBlocks("endcall");
                  this.advanceAfterBlockEnd();
                  var callerName = new nodes.Symbol(callTok.lineno, callTok.colno, "caller");
                  var callerNode = new nodes.Caller(callTok.lineno, callTok.colno, callerName, callerArgs, body);
                  var args = macroCall.args.children;
                  if (!(args[args.length - 1] instanceof nodes.KeywordArgs)) {
                    args.push(new nodes.KeywordArgs());
                  }
                  var kwargs = args[args.length - 1];
                  kwargs.addChild(new nodes.Pair(callTok.lineno, callTok.colno, callerName, callerNode));
                  return new nodes.Output(callTok.lineno, callTok.colno, [macroCall]);
                };
                _proto.parseWithContext = function parseWithContext() {
                  var tok = this.peekToken();
                  var withContext = null;
                  if (this.skipSymbol("with")) {
                    withContext = true;
                  } else if (this.skipSymbol("without")) {
                    withContext = false;
                  }
                  if (withContext !== null) {
                    if (!this.skipSymbol("context")) {
                      this.fail("parseFrom: expected context after with/without", tok.lineno, tok.colno);
                    }
                  }
                  return withContext;
                };
                _proto.parseImport = function parseImport() {
                  var importTok = this.peekToken();
                  if (!this.skipSymbol("import")) {
                    this.fail("parseImport: expected import", importTok.lineno, importTok.colno);
                  }
                  var template = this.parseExpression();
                  if (!this.skipSymbol("as")) {
                    this.fail('parseImport: expected "as" keyword', importTok.lineno, importTok.colno);
                  }
                  var target = this.parseExpression();
                  var withContext = this.parseWithContext();
                  var node = new nodes.Import(importTok.lineno, importTok.colno, template, target, withContext);
                  this.advanceAfterBlockEnd(importTok.value);
                  return node;
                };
                _proto.parseFrom = function parseFrom() {
                  var fromTok = this.peekToken();
                  if (!this.skipSymbol("from")) {
                    this.fail("parseFrom: expected from");
                  }
                  var template = this.parseExpression();
                  if (!this.skipSymbol("import")) {
                    this.fail("parseFrom: expected import", fromTok.lineno, fromTok.colno);
                  }
                  var names = new nodes.NodeList();
                  var withContext;
                  while (1) {
                    var nextTok = this.peekToken();
                    if (nextTok.type === lexer.TOKEN_BLOCK_END) {
                      if (!names.children.length) {
                        this.fail("parseFrom: Expected at least one import name", fromTok.lineno, fromTok.colno);
                      }
                      if (nextTok.value.charAt(0) === "-") {
                        this.dropLeadingWhitespace = true;
                      }
                      this.nextToken();
                      break;
                    }
                    if (names.children.length > 0 && !this.skip(lexer.TOKEN_COMMA)) {
                      this.fail("parseFrom: expected comma", fromTok.lineno, fromTok.colno);
                    }
                    var name = this.parsePrimary();
                    if (name.value.charAt(0) === "_") {
                      this.fail("parseFrom: names starting with an underscore cannot be imported", name.lineno, name.colno);
                    }
                    if (this.skipSymbol("as")) {
                      var alias = this.parsePrimary();
                      names.addChild(new nodes.Pair(name.lineno, name.colno, name, alias));
                    } else {
                      names.addChild(name);
                    }
                    withContext = this.parseWithContext();
                  }
                  return new nodes.FromImport(fromTok.lineno, fromTok.colno, template, names, withContext);
                };
                _proto.parseBlock = function parseBlock() {
                  var tag = this.peekToken();
                  if (!this.skipSymbol("block")) {
                    this.fail("parseBlock: expected block", tag.lineno, tag.colno);
                  }
                  var node = new nodes.Block(tag.lineno, tag.colno);
                  node.name = this.parsePrimary();
                  if (!(node.name instanceof nodes.Symbol)) {
                    this.fail("parseBlock: variable name expected", tag.lineno, tag.colno);
                  }
                  this.advanceAfterBlockEnd(tag.value);
                  node.body = this.parseUntilBlocks("endblock");
                  this.skipSymbol("endblock");
                  this.skipSymbol(node.name.value);
                  var tok = this.peekToken();
                  if (!tok) {
                    this.fail("parseBlock: expected endblock, got end of file");
                  }
                  this.advanceAfterBlockEnd(tok.value);
                  return node;
                };
                _proto.parseExtends = function parseExtends() {
                  var tagName = "extends";
                  var tag = this.peekToken();
                  if (!this.skipSymbol(tagName)) {
                    this.fail("parseTemplateRef: expected " + tagName);
                  }
                  var node = new nodes.Extends(tag.lineno, tag.colno);
                  node.template = this.parseExpression();
                  this.advanceAfterBlockEnd(tag.value);
                  return node;
                };
                _proto.parseInclude = function parseInclude() {
                  var tagName = "include";
                  var tag = this.peekToken();
                  if (!this.skipSymbol(tagName)) {
                    this.fail("parseInclude: expected " + tagName);
                  }
                  var node = new nodes.Include(tag.lineno, tag.colno);
                  node.template = this.parseExpression();
                  if (this.skipSymbol("ignore") && this.skipSymbol("missing")) {
                    node.ignoreMissing = true;
                  }
                  this.advanceAfterBlockEnd(tag.value);
                  return node;
                };
                _proto.parseIf = function parseIf() {
                  var tag = this.peekToken();
                  var node;
                  if (this.skipSymbol("if") || this.skipSymbol("elif") || this.skipSymbol("elseif")) {
                    node = new nodes.If(tag.lineno, tag.colno);
                  } else if (this.skipSymbol("ifAsync")) {
                    node = new nodes.IfAsync(tag.lineno, tag.colno);
                  } else {
                    this.fail("parseIf: expected if, elif, or elseif", tag.lineno, tag.colno);
                  }
                  node.cond = this.parseExpression();
                  this.advanceAfterBlockEnd(tag.value);
                  node.body = this.parseUntilBlocks("elif", "elseif", "else", "endif");
                  var tok = this.peekToken();
                  switch (tok && tok.value) {
                    case "elseif":
                    case "elif":
                      node.else_ = this.parseIf();
                      break;
                    case "else":
                      this.advanceAfterBlockEnd();
                      node.else_ = this.parseUntilBlocks("endif");
                      this.advanceAfterBlockEnd();
                      break;
                    case "endif":
                      node.else_ = null;
                      this.advanceAfterBlockEnd();
                      break;
                    default:
                      this.fail("parseIf: expected elif, else, or endif, got end of file");
                  }
                  return node;
                };
                _proto.parseSet = function parseSet() {
                  var tag = this.peekToken();
                  if (!this.skipSymbol("set")) {
                    this.fail("parseSet: expected set", tag.lineno, tag.colno);
                  }
                  var node = new nodes.Set(tag.lineno, tag.colno, []);
                  var target;
                  while (target = this.parsePrimary()) {
                    node.targets.push(target);
                    if (!this.skip(lexer.TOKEN_COMMA)) {
                      break;
                    }
                  }
                  if (!this.skipValue(lexer.TOKEN_OPERATOR, "=")) {
                    if (!this.skip(lexer.TOKEN_BLOCK_END)) {
                      this.fail("parseSet: expected = or block end in set tag", tag.lineno, tag.colno);
                    } else {
                      node.body = new nodes.Capture(tag.lineno, tag.colno, this.parseUntilBlocks("endset"));
                      node.value = null;
                      this.advanceAfterBlockEnd();
                    }
                  } else {
                    node.value = this.parseExpression();
                    this.advanceAfterBlockEnd(tag.value);
                  }
                  return node;
                };
                _proto.parseSwitch = function parseSwitch() {
                  var switchStart = "switch";
                  var switchEnd = "endswitch";
                  var caseStart = "case";
                  var caseDefault = "default";
                  var tag = this.peekToken();
                  if (!this.skipSymbol(switchStart) && !this.skipSymbol(caseStart) && !this.skipSymbol(caseDefault)) {
                    this.fail('parseSwitch: expected "switch," "case" or "default"', tag.lineno, tag.colno);
                  }
                  var expr = this.parseExpression();
                  this.advanceAfterBlockEnd(switchStart);
                  this.parseUntilBlocks(caseStart, caseDefault, switchEnd);
                  var tok = this.peekToken();
                  var cases = [];
                  var defaultCase;
                  do {
                    this.skipSymbol(caseStart);
                    var cond = this.parseExpression();
                    this.advanceAfterBlockEnd(switchStart);
                    var body = this.parseUntilBlocks(caseStart, caseDefault, switchEnd);
                    cases.push(new nodes.Case(tok.line, tok.col, cond, body));
                    tok = this.peekToken();
                  } while (tok && tok.value === caseStart);
                  switch (tok.value) {
                    case caseDefault:
                      this.advanceAfterBlockEnd();
                      defaultCase = this.parseUntilBlocks(switchEnd);
                      this.advanceAfterBlockEnd();
                      break;
                    case switchEnd:
                      this.advanceAfterBlockEnd();
                      break;
                    default:
                      this.fail('parseSwitch: expected "case," "default" or "endswitch," got EOF.');
                  }
                  return new nodes.Switch(tag.lineno, tag.colno, expr, cases, defaultCase);
                };
                _proto.parseStatement = function parseStatement() {
                  var tok = this.peekToken();
                  var node;
                  if (tok.type !== lexer.TOKEN_SYMBOL) {
                    this.fail("tag name expected", tok.lineno, tok.colno);
                  }
                  if (this.breakOnBlocks && lib.indexOf(this.breakOnBlocks, tok.value) !== -1) {
                    return null;
                  }
                  switch (tok.value) {
                    case "raw":
                      return this.parseRaw();
                    case "verbatim":
                      return this.parseRaw("verbatim");
                    case "if":
                    case "ifAsync":
                      return this.parseIf();
                    case "for":
                    case "asyncEach":
                    case "asyncAll":
                      return this.parseFor();
                    case "block":
                      return this.parseBlock();
                    case "extends":
                      return this.parseExtends();
                    case "include":
                      return this.parseInclude();
                    case "set":
                      return this.parseSet();
                    case "macro":
                      return this.parseMacro();
                    case "call":
                      return this.parseCall();
                    case "import":
                      return this.parseImport();
                    case "from":
                      return this.parseFrom();
                    case "filter":
                      return this.parseFilterStatement();
                    case "switch":
                      return this.parseSwitch();
                    default:
                      if (this.extensions.length) {
                        for (var i = 0; i < this.extensions.length; i++) {
                          var ext = this.extensions[i];
                          if (lib.indexOf(ext.tags || [], tok.value) !== -1) {
                            return ext.parse(this, nodes, lexer);
                          }
                        }
                      }
                      this.fail("unknown block tag: " + tok.value, tok.lineno, tok.colno);
                  }
                  return node;
                };
                _proto.parseRaw = function parseRaw(tagName) {
                  tagName = tagName || "raw";
                  var endTagName = "end" + tagName;
                  var rawBlockRegex = new RegExp("([\\s\\S]*?){%\\s*(" + tagName + "|" + endTagName + ")\\s*(?=%})%}");
                  var rawLevel = 1;
                  var str = "";
                  var matches = null;
                  var begun = this.advanceAfterBlockEnd();
                  while ((matches = this.tokens._extractRegex(rawBlockRegex)) && rawLevel > 0) {
                    var all = matches[0];
                    var pre = matches[1];
                    var blockName = matches[2];
                    if (blockName === tagName) {
                      rawLevel += 1;
                    } else if (blockName === endTagName) {
                      rawLevel -= 1;
                    }
                    if (rawLevel === 0) {
                      str += pre;
                      this.tokens.backN(all.length - pre.length);
                    } else {
                      str += all;
                    }
                  }
                  return new nodes.Output(begun.lineno, begun.colno, [new nodes.TemplateData(begun.lineno, begun.colno, str)]);
                };
                _proto.parsePostfix = function parsePostfix(node) {
                  var lookup;
                  var tok = this.peekToken();
                  while (tok) {
                    if (tok.type === lexer.TOKEN_LEFT_PAREN) {
                      node = new nodes.FunCall(tok.lineno, tok.colno, node, this.parseSignature());
                    } else if (tok.type === lexer.TOKEN_LEFT_BRACKET) {
                      lookup = this.parseAggregate();
                      if (lookup.children.length > 1) {
                        this.fail("invalid index");
                      }
                      node = new nodes.LookupVal(tok.lineno, tok.colno, node, lookup.children[0]);
                    } else if (tok.type === lexer.TOKEN_OPERATOR && tok.value === ".") {
                      this.nextToken();
                      var val = this.nextToken();
                      if (val.type !== lexer.TOKEN_SYMBOL) {
                        this.fail("expected name as lookup value, got " + val.value, val.lineno, val.colno);
                      }
                      lookup = new nodes.Literal(val.lineno, val.colno, val.value);
                      node = new nodes.LookupVal(tok.lineno, tok.colno, node, lookup);
                    } else {
                      break;
                    }
                    tok = this.peekToken();
                  }
                  return node;
                };
                _proto.parseExpression = function parseExpression() {
                  var node = this.parseInlineIf();
                  return node;
                };
                _proto.parseInlineIf = function parseInlineIf() {
                  var node = this.parseOr();
                  if (this.skipSymbol("if")) {
                    var condNode = this.parseOr();
                    var bodyNode = node;
                    node = new nodes.InlineIf(node.lineno, node.colno);
                    node.body = bodyNode;
                    node.cond = condNode;
                    if (this.skipSymbol("else")) {
                      node.else_ = this.parseOr();
                    } else {
                      node.else_ = null;
                    }
                  }
                  return node;
                };
                _proto.parseOr = function parseOr() {
                  var node = this.parseAnd();
                  while (this.skipSymbol("or")) {
                    var node2 = this.parseAnd();
                    node = new nodes.Or(node.lineno, node.colno, node, node2);
                  }
                  return node;
                };
                _proto.parseAnd = function parseAnd() {
                  var node = this.parseNot();
                  while (this.skipSymbol("and")) {
                    var node2 = this.parseNot();
                    node = new nodes.And(node.lineno, node.colno, node, node2);
                  }
                  return node;
                };
                _proto.parseNot = function parseNot() {
                  var tok = this.peekToken();
                  if (this.skipSymbol("not")) {
                    return new nodes.Not(tok.lineno, tok.colno, this.parseNot());
                  }
                  return this.parseIn();
                };
                _proto.parseIn = function parseIn() {
                  var node = this.parseIs();
                  while (1) {
                    var tok = this.nextToken();
                    if (!tok) {
                      break;
                    }
                    var invert = tok.type === lexer.TOKEN_SYMBOL && tok.value === "not";
                    if (!invert) {
                      this.pushToken(tok);
                    }
                    if (this.skipSymbol("in")) {
                      var node2 = this.parseIs();
                      node = new nodes.In(node.lineno, node.colno, node, node2);
                      if (invert) {
                        node = new nodes.Not(node.lineno, node.colno, node);
                      }
                    } else {
                      if (invert) {
                        this.pushToken(tok);
                      }
                      break;
                    }
                  }
                  return node;
                };
                _proto.parseIs = function parseIs() {
                  var node = this.parseCompare();
                  if (this.skipSymbol("is")) {
                    var not = this.skipSymbol("not");
                    var node2 = this.parseCompare();
                    node = new nodes.Is(node.lineno, node.colno, node, node2);
                    if (not) {
                      node = new nodes.Not(node.lineno, node.colno, node);
                    }
                  }
                  return node;
                };
                _proto.parseCompare = function parseCompare() {
                  var compareOps = ["==", "===", "!=", "!==", "<", ">", "<=", ">="];
                  var expr = this.parseConcat();
                  var ops = [];
                  while (1) {
                    var tok = this.nextToken();
                    if (!tok) {
                      break;
                    } else if (compareOps.indexOf(tok.value) !== -1) {
                      ops.push(new nodes.CompareOperand(tok.lineno, tok.colno, this.parseConcat(), tok.value));
                    } else {
                      this.pushToken(tok);
                      break;
                    }
                  }
                  if (ops.length) {
                    return new nodes.Compare(ops[0].lineno, ops[0].colno, expr, ops);
                  } else {
                    return expr;
                  }
                };
                _proto.parseConcat = function parseConcat() {
                  var node = this.parseAdd();
                  while (this.skipValue(lexer.TOKEN_TILDE, "~")) {
                    var node2 = this.parseAdd();
                    node = new nodes.Concat(node.lineno, node.colno, node, node2);
                  }
                  return node;
                };
                _proto.parseAdd = function parseAdd() {
                  var node = this.parseSub();
                  while (this.skipValue(lexer.TOKEN_OPERATOR, "+")) {
                    var node2 = this.parseSub();
                    node = new nodes.Add(node.lineno, node.colno, node, node2);
                  }
                  return node;
                };
                _proto.parseSub = function parseSub() {
                  var node = this.parseMul();
                  while (this.skipValue(lexer.TOKEN_OPERATOR, "-")) {
                    var node2 = this.parseMul();
                    node = new nodes.Sub(node.lineno, node.colno, node, node2);
                  }
                  return node;
                };
                _proto.parseMul = function parseMul() {
                  var node = this.parseDiv();
                  while (this.skipValue(lexer.TOKEN_OPERATOR, "*")) {
                    var node2 = this.parseDiv();
                    node = new nodes.Mul(node.lineno, node.colno, node, node2);
                  }
                  return node;
                };
                _proto.parseDiv = function parseDiv() {
                  var node = this.parseFloorDiv();
                  while (this.skipValue(lexer.TOKEN_OPERATOR, "/")) {
                    var node2 = this.parseFloorDiv();
                    node = new nodes.Div(node.lineno, node.colno, node, node2);
                  }
                  return node;
                };
                _proto.parseFloorDiv = function parseFloorDiv() {
                  var node = this.parseMod();
                  while (this.skipValue(lexer.TOKEN_OPERATOR, "//")) {
                    var node2 = this.parseMod();
                    node = new nodes.FloorDiv(node.lineno, node.colno, node, node2);
                  }
                  return node;
                };
                _proto.parseMod = function parseMod() {
                  var node = this.parsePow();
                  while (this.skipValue(lexer.TOKEN_OPERATOR, "%")) {
                    var node2 = this.parsePow();
                    node = new nodes.Mod(node.lineno, node.colno, node, node2);
                  }
                  return node;
                };
                _proto.parsePow = function parsePow() {
                  var node = this.parseUnary();
                  while (this.skipValue(lexer.TOKEN_OPERATOR, "**")) {
                    var node2 = this.parseUnary();
                    node = new nodes.Pow(node.lineno, node.colno, node, node2);
                  }
                  return node;
                };
                _proto.parseUnary = function parseUnary(noFilters) {
                  var tok = this.peekToken();
                  var node;
                  if (this.skipValue(lexer.TOKEN_OPERATOR, "-")) {
                    node = new nodes.Neg(tok.lineno, tok.colno, this.parseUnary(true));
                  } else if (this.skipValue(lexer.TOKEN_OPERATOR, "+")) {
                    node = new nodes.Pos(tok.lineno, tok.colno, this.parseUnary(true));
                  } else {
                    node = this.parsePrimary();
                  }
                  if (!noFilters) {
                    node = this.parseFilter(node);
                  }
                  return node;
                };
                _proto.parsePrimary = function parsePrimary(noPostfix) {
                  var tok = this.nextToken();
                  var val;
                  var node = null;
                  if (!tok) {
                    this.fail("expected expression, got end of file");
                  } else if (tok.type === lexer.TOKEN_STRING) {
                    val = tok.value;
                  } else if (tok.type === lexer.TOKEN_INT) {
                    val = parseInt(tok.value, 10);
                  } else if (tok.type === lexer.TOKEN_FLOAT) {
                    val = parseFloat(tok.value);
                  } else if (tok.type === lexer.TOKEN_BOOLEAN) {
                    if (tok.value === "true") {
                      val = true;
                    } else if (tok.value === "false") {
                      val = false;
                    } else {
                      this.fail("invalid boolean: " + tok.value, tok.lineno, tok.colno);
                    }
                  } else if (tok.type === lexer.TOKEN_NONE) {
                    val = null;
                  } else if (tok.type === lexer.TOKEN_REGEX) {
                    val = new RegExp(tok.value.body, tok.value.flags);
                  }
                  if (val !== void 0) {
                    node = new nodes.Literal(tok.lineno, tok.colno, val);
                  } else if (tok.type === lexer.TOKEN_SYMBOL) {
                    node = new nodes.Symbol(tok.lineno, tok.colno, tok.value);
                  } else {
                    this.pushToken(tok);
                    node = this.parseAggregate();
                  }
                  if (!noPostfix) {
                    node = this.parsePostfix(node);
                  }
                  if (node) {
                    return node;
                  } else {
                    throw this.error("unexpected token: " + tok.value, tok.lineno, tok.colno);
                  }
                };
                _proto.parseFilterName = function parseFilterName() {
                  var tok = this.expect(lexer.TOKEN_SYMBOL);
                  var name = tok.value;
                  while (this.skipValue(lexer.TOKEN_OPERATOR, ".")) {
                    name += "." + this.expect(lexer.TOKEN_SYMBOL).value;
                  }
                  return new nodes.Symbol(tok.lineno, tok.colno, name);
                };
                _proto.parseFilterArgs = function parseFilterArgs(node) {
                  if (this.peekToken().type === lexer.TOKEN_LEFT_PAREN) {
                    var call = this.parsePostfix(node);
                    return call.args.children;
                  }
                  return [];
                };
                _proto.parseFilter = function parseFilter(node) {
                  while (this.skip(lexer.TOKEN_PIPE)) {
                    var name = this.parseFilterName();
                    node = new nodes.Filter(name.lineno, name.colno, name, new nodes.NodeList(name.lineno, name.colno, [node].concat(this.parseFilterArgs(node))));
                  }
                  return node;
                };
                _proto.parseFilterStatement = function parseFilterStatement() {
                  var filterTok = this.peekToken();
                  if (!this.skipSymbol("filter")) {
                    this.fail("parseFilterStatement: expected filter");
                  }
                  var name = this.parseFilterName();
                  var args = this.parseFilterArgs(name);
                  this.advanceAfterBlockEnd(filterTok.value);
                  var body = new nodes.Capture(name.lineno, name.colno, this.parseUntilBlocks("endfilter"));
                  this.advanceAfterBlockEnd();
                  var node = new nodes.Filter(name.lineno, name.colno, name, new nodes.NodeList(name.lineno, name.colno, [body].concat(args)));
                  return new nodes.Output(name.lineno, name.colno, [node]);
                };
                _proto.parseAggregate = function parseAggregate() {
                  var tok = this.nextToken();
                  var node;
                  switch (tok.type) {
                    case lexer.TOKEN_LEFT_PAREN:
                      node = new nodes.Group(tok.lineno, tok.colno);
                      break;
                    case lexer.TOKEN_LEFT_BRACKET:
                      node = new nodes.Array(tok.lineno, tok.colno);
                      break;
                    case lexer.TOKEN_LEFT_CURLY:
                      node = new nodes.Dict(tok.lineno, tok.colno);
                      break;
                    default:
                      return null;
                  }
                  while (1) {
                    var type = this.peekToken().type;
                    if (type === lexer.TOKEN_RIGHT_PAREN || type === lexer.TOKEN_RIGHT_BRACKET || type === lexer.TOKEN_RIGHT_CURLY) {
                      this.nextToken();
                      break;
                    }
                    if (node.children.length > 0) {
                      if (!this.skip(lexer.TOKEN_COMMA)) {
                        this.fail("parseAggregate: expected comma after expression", tok.lineno, tok.colno);
                      }
                    }
                    if (node instanceof nodes.Dict) {
                      var key = this.parsePrimary();
                      if (!this.skip(lexer.TOKEN_COLON)) {
                        this.fail("parseAggregate: expected colon after dict key", tok.lineno, tok.colno);
                      }
                      var value = this.parseExpression();
                      node.addChild(new nodes.Pair(key.lineno, key.colno, key, value));
                    } else {
                      var expr = this.parseExpression();
                      node.addChild(expr);
                    }
                  }
                  return node;
                };
                _proto.parseSignature = function parseSignature(tolerant, noParens) {
                  var tok = this.peekToken();
                  if (!noParens && tok.type !== lexer.TOKEN_LEFT_PAREN) {
                    if (tolerant) {
                      return null;
                    } else {
                      this.fail("expected arguments", tok.lineno, tok.colno);
                    }
                  }
                  if (tok.type === lexer.TOKEN_LEFT_PAREN) {
                    tok = this.nextToken();
                  }
                  var args = new nodes.NodeList(tok.lineno, tok.colno);
                  var kwargs = new nodes.KeywordArgs(tok.lineno, tok.colno);
                  var checkComma = false;
                  while (1) {
                    tok = this.peekToken();
                    if (!noParens && tok.type === lexer.TOKEN_RIGHT_PAREN) {
                      this.nextToken();
                      break;
                    } else if (noParens && tok.type === lexer.TOKEN_BLOCK_END) {
                      break;
                    }
                    if (checkComma && !this.skip(lexer.TOKEN_COMMA)) {
                      this.fail("parseSignature: expected comma after expression", tok.lineno, tok.colno);
                    } else {
                      var arg = this.parseExpression();
                      if (this.skipValue(lexer.TOKEN_OPERATOR, "=")) {
                        kwargs.addChild(new nodes.Pair(arg.lineno, arg.colno, arg, this.parseExpression()));
                      } else {
                        args.addChild(arg);
                      }
                    }
                    checkComma = true;
                  }
                  if (kwargs.children.length) {
                    args.addChild(kwargs);
                  }
                  return args;
                };
                _proto.parseUntilBlocks = function parseUntilBlocks() {
                  var prev = this.breakOnBlocks;
                  for (var _len = arguments.length, blockNames = new Array(_len), _key = 0; _key < _len; _key++) {
                    blockNames[_key] = arguments[_key];
                  }
                  this.breakOnBlocks = blockNames;
                  var ret = this.parse();
                  this.breakOnBlocks = prev;
                  return ret;
                };
                _proto.parseNodes = function parseNodes() {
                  var tok;
                  var buf = [];
                  while (tok = this.nextToken()) {
                    if (tok.type === lexer.TOKEN_DATA) {
                      var data = tok.value;
                      var nextToken = this.peekToken();
                      var nextVal = nextToken && nextToken.value;
                      if (this.dropLeadingWhitespace) {
                        data = data.replace(/^\s*/, "");
                        this.dropLeadingWhitespace = false;
                      }
                      if (nextToken && (nextToken.type === lexer.TOKEN_BLOCK_START && nextVal.charAt(nextVal.length - 1) === "-" || nextToken.type === lexer.TOKEN_VARIABLE_START && nextVal.charAt(this.tokens.tags.VARIABLE_START.length) === "-" || nextToken.type === lexer.TOKEN_COMMENT && nextVal.charAt(this.tokens.tags.COMMENT_START.length) === "-")) {
                        data = data.replace(/\s*$/, "");
                      }
                      buf.push(new nodes.Output(tok.lineno, tok.colno, [new nodes.TemplateData(tok.lineno, tok.colno, data)]));
                    } else if (tok.type === lexer.TOKEN_BLOCK_START) {
                      this.dropLeadingWhitespace = false;
                      var n = this.parseStatement();
                      if (!n) {
                        break;
                      }
                      buf.push(n);
                    } else if (tok.type === lexer.TOKEN_VARIABLE_START) {
                      var e = this.parseExpression();
                      this.dropLeadingWhitespace = false;
                      this.advanceAfterVariableEnd();
                      buf.push(new nodes.Output(tok.lineno, tok.colno, [e]));
                    } else if (tok.type === lexer.TOKEN_COMMENT) {
                      this.dropLeadingWhitespace = tok.value.charAt(tok.value.length - this.tokens.tags.COMMENT_END.length - 1) === "-";
                    } else {
                      this.fail("Unexpected token at top-level: " + tok.type, tok.lineno, tok.colno);
                    }
                  }
                  return buf;
                };
                _proto.parse = function parse() {
                  return new nodes.NodeList(0, 0, this.parseNodes());
                };
                _proto.parseAsRoot = function parseAsRoot() {
                  return new nodes.Root(0, 0, this.parseNodes());
                };
                return Parser2;
              })(Obj);
              module2.exports = {
                parse: function parse(src, extensions, opts) {
                  var p = new Parser(lexer.lex(src, opts));
                  if (extensions !== void 0) {
                    p.extensions = extensions;
                  }
                  return p.parseAsRoot();
                },
                Parser
              };
            }),
            /* 9 */
            /***/
            (function(module2, exports2, __webpack_require__) {
              "use strict";
              var lib = __webpack_require__(0);
              var whitespaceChars = " \n	\r\xA0";
              var delimChars = "()[]{}%*-+~/#,:|.<>=!";
              var intChars = "0123456789";
              var BLOCK_START = "{%";
              var BLOCK_END = "%}";
              var VARIABLE_START = "{{";
              var VARIABLE_END = "}}";
              var COMMENT_START = "{#";
              var COMMENT_END = "#}";
              var TOKEN_STRING = "string";
              var TOKEN_WHITESPACE = "whitespace";
              var TOKEN_DATA = "data";
              var TOKEN_BLOCK_START = "block-start";
              var TOKEN_BLOCK_END = "block-end";
              var TOKEN_VARIABLE_START = "variable-start";
              var TOKEN_VARIABLE_END = "variable-end";
              var TOKEN_COMMENT = "comment";
              var TOKEN_LEFT_PAREN = "left-paren";
              var TOKEN_RIGHT_PAREN = "right-paren";
              var TOKEN_LEFT_BRACKET = "left-bracket";
              var TOKEN_RIGHT_BRACKET = "right-bracket";
              var TOKEN_LEFT_CURLY = "left-curly";
              var TOKEN_RIGHT_CURLY = "right-curly";
              var TOKEN_OPERATOR = "operator";
              var TOKEN_COMMA = "comma";
              var TOKEN_COLON = "colon";
              var TOKEN_TILDE = "tilde";
              var TOKEN_PIPE = "pipe";
              var TOKEN_INT = "int";
              var TOKEN_FLOAT = "float";
              var TOKEN_BOOLEAN = "boolean";
              var TOKEN_NONE = "none";
              var TOKEN_SYMBOL = "symbol";
              var TOKEN_SPECIAL = "special";
              var TOKEN_REGEX = "regex";
              function token(type, value, lineno, colno) {
                return {
                  type,
                  value,
                  lineno,
                  colno
                };
              }
              var Tokenizer = /* @__PURE__ */ (function() {
                function Tokenizer2(str, opts) {
                  this.str = str;
                  this.index = 0;
                  this.len = str.length;
                  this.lineno = 0;
                  this.colno = 0;
                  this.in_code = false;
                  opts = opts || {};
                  var tags = opts.tags || {};
                  this.tags = {
                    BLOCK_START: tags.blockStart || BLOCK_START,
                    BLOCK_END: tags.blockEnd || BLOCK_END,
                    VARIABLE_START: tags.variableStart || VARIABLE_START,
                    VARIABLE_END: tags.variableEnd || VARIABLE_END,
                    COMMENT_START: tags.commentStart || COMMENT_START,
                    COMMENT_END: tags.commentEnd || COMMENT_END
                  };
                  this.trimBlocks = !!opts.trimBlocks;
                  this.lstripBlocks = !!opts.lstripBlocks;
                }
                var _proto = Tokenizer2.prototype;
                _proto.nextToken = function nextToken() {
                  var lineno = this.lineno;
                  var colno = this.colno;
                  var tok;
                  if (this.in_code) {
                    var cur = this.current();
                    if (this.isFinished()) {
                      return null;
                    } else if (cur === '"' || cur === "'") {
                      return token(TOKEN_STRING, this._parseString(cur), lineno, colno);
                    } else if (tok = this._extract(whitespaceChars)) {
                      return token(TOKEN_WHITESPACE, tok, lineno, colno);
                    } else if ((tok = this._extractString(this.tags.BLOCK_END)) || (tok = this._extractString("-" + this.tags.BLOCK_END))) {
                      this.in_code = false;
                      if (this.trimBlocks) {
                        cur = this.current();
                        if (cur === "\n") {
                          this.forward();
                        } else if (cur === "\r") {
                          this.forward();
                          cur = this.current();
                          if (cur === "\n") {
                            this.forward();
                          } else {
                            this.back();
                          }
                        }
                      }
                      return token(TOKEN_BLOCK_END, tok, lineno, colno);
                    } else if ((tok = this._extractString(this.tags.VARIABLE_END)) || (tok = this._extractString("-" + this.tags.VARIABLE_END))) {
                      this.in_code = false;
                      return token(TOKEN_VARIABLE_END, tok, lineno, colno);
                    } else if (cur === "r" && this.str.charAt(this.index + 1) === "/") {
                      this.forwardN(2);
                      var regexBody = "";
                      while (!this.isFinished()) {
                        if (this.current() === "/" && this.previous() !== "\\") {
                          this.forward();
                          break;
                        } else {
                          regexBody += this.current();
                          this.forward();
                        }
                      }
                      var POSSIBLE_FLAGS = ["g", "i", "m", "y"];
                      var regexFlags = "";
                      while (!this.isFinished()) {
                        var isCurrentAFlag = POSSIBLE_FLAGS.indexOf(this.current()) !== -1;
                        if (isCurrentAFlag) {
                          regexFlags += this.current();
                          this.forward();
                        } else {
                          break;
                        }
                      }
                      return token(TOKEN_REGEX, {
                        body: regexBody,
                        flags: regexFlags
                      }, lineno, colno);
                    } else if (delimChars.indexOf(cur) !== -1) {
                      this.forward();
                      var complexOps = ["==", "===", "!=", "!==", "<=", ">=", "//", "**"];
                      var curComplex = cur + this.current();
                      var type;
                      if (lib.indexOf(complexOps, curComplex) !== -1) {
                        this.forward();
                        cur = curComplex;
                        if (lib.indexOf(complexOps, curComplex + this.current()) !== -1) {
                          cur = curComplex + this.current();
                          this.forward();
                        }
                      }
                      switch (cur) {
                        case "(":
                          type = TOKEN_LEFT_PAREN;
                          break;
                        case ")":
                          type = TOKEN_RIGHT_PAREN;
                          break;
                        case "[":
                          type = TOKEN_LEFT_BRACKET;
                          break;
                        case "]":
                          type = TOKEN_RIGHT_BRACKET;
                          break;
                        case "{":
                          type = TOKEN_LEFT_CURLY;
                          break;
                        case "}":
                          type = TOKEN_RIGHT_CURLY;
                          break;
                        case ",":
                          type = TOKEN_COMMA;
                          break;
                        case ":":
                          type = TOKEN_COLON;
                          break;
                        case "~":
                          type = TOKEN_TILDE;
                          break;
                        case "|":
                          type = TOKEN_PIPE;
                          break;
                        default:
                          type = TOKEN_OPERATOR;
                      }
                      return token(type, cur, lineno, colno);
                    } else {
                      tok = this._extractUntil(whitespaceChars + delimChars);
                      if (tok.match(/^[-+]?[0-9]+$/)) {
                        if (this.current() === ".") {
                          this.forward();
                          var dec = this._extract(intChars);
                          return token(TOKEN_FLOAT, tok + "." + dec, lineno, colno);
                        } else {
                          return token(TOKEN_INT, tok, lineno, colno);
                        }
                      } else if (tok.match(/^(true|false)$/)) {
                        return token(TOKEN_BOOLEAN, tok, lineno, colno);
                      } else if (tok === "none") {
                        return token(TOKEN_NONE, tok, lineno, colno);
                      } else if (tok === "null") {
                        return token(TOKEN_NONE, tok, lineno, colno);
                      } else if (tok) {
                        return token(TOKEN_SYMBOL, tok, lineno, colno);
                      } else {
                        throw new Error("Unexpected value while parsing: " + tok);
                      }
                    }
                  } else {
                    var beginChars = this.tags.BLOCK_START.charAt(0) + this.tags.VARIABLE_START.charAt(0) + this.tags.COMMENT_START.charAt(0) + this.tags.COMMENT_END.charAt(0);
                    if (this.isFinished()) {
                      return null;
                    } else if ((tok = this._extractString(this.tags.BLOCK_START + "-")) || (tok = this._extractString(this.tags.BLOCK_START))) {
                      this.in_code = true;
                      return token(TOKEN_BLOCK_START, tok, lineno, colno);
                    } else if ((tok = this._extractString(this.tags.VARIABLE_START + "-")) || (tok = this._extractString(this.tags.VARIABLE_START))) {
                      this.in_code = true;
                      return token(TOKEN_VARIABLE_START, tok, lineno, colno);
                    } else {
                      tok = "";
                      var data;
                      var inComment = false;
                      if (this._matches(this.tags.COMMENT_START)) {
                        inComment = true;
                        tok = this._extractString(this.tags.COMMENT_START);
                      }
                      while ((data = this._extractUntil(beginChars)) !== null) {
                        tok += data;
                        if ((this._matches(this.tags.BLOCK_START) || this._matches(this.tags.VARIABLE_START) || this._matches(this.tags.COMMENT_START)) && !inComment) {
                          if (this.lstripBlocks && this._matches(this.tags.BLOCK_START) && this.colno > 0 && this.colno <= tok.length) {
                            var lastLine = tok.slice(-this.colno);
                            if (/^\s+$/.test(lastLine)) {
                              tok = tok.slice(0, -this.colno);
                              if (!tok.length) {
                                return this.nextToken();
                              }
                            }
                          }
                          break;
                        } else if (this._matches(this.tags.COMMENT_END)) {
                          if (!inComment) {
                            throw new Error("unexpected end of comment");
                          }
                          tok += this._extractString(this.tags.COMMENT_END);
                          break;
                        } else {
                          tok += this.current();
                          this.forward();
                        }
                      }
                      if (data === null && inComment) {
                        throw new Error("expected end of comment, got end of file");
                      }
                      return token(inComment ? TOKEN_COMMENT : TOKEN_DATA, tok, lineno, colno);
                    }
                  }
                };
                _proto._parseString = function _parseString(delimiter) {
                  this.forward();
                  var str = "";
                  while (!this.isFinished() && this.current() !== delimiter) {
                    var cur = this.current();
                    if (cur === "\\") {
                      this.forward();
                      switch (this.current()) {
                        case "n":
                          str += "\n";
                          break;
                        case "t":
                          str += "	";
                          break;
                        case "r":
                          str += "\r";
                          break;
                        default:
                          str += this.current();
                      }
                      this.forward();
                    } else {
                      str += cur;
                      this.forward();
                    }
                  }
                  this.forward();
                  return str;
                };
                _proto._matches = function _matches(str) {
                  if (this.index + str.length > this.len) {
                    return null;
                  }
                  var m = this.str.slice(this.index, this.index + str.length);
                  return m === str;
                };
                _proto._extractString = function _extractString(str) {
                  if (this._matches(str)) {
                    this.forwardN(str.length);
                    return str;
                  }
                  return null;
                };
                _proto._extractUntil = function _extractUntil(charString) {
                  return this._extractMatching(true, charString || "");
                };
                _proto._extract = function _extract(charString) {
                  return this._extractMatching(false, charString);
                };
                _proto._extractMatching = function _extractMatching(breakOnMatch, charString) {
                  if (this.isFinished()) {
                    return null;
                  }
                  var first = charString.indexOf(this.current());
                  if (breakOnMatch && first === -1 || !breakOnMatch && first !== -1) {
                    var t = this.current();
                    this.forward();
                    var idx = charString.indexOf(this.current());
                    while ((breakOnMatch && idx === -1 || !breakOnMatch && idx !== -1) && !this.isFinished()) {
                      t += this.current();
                      this.forward();
                      idx = charString.indexOf(this.current());
                    }
                    return t;
                  }
                  return "";
                };
                _proto._extractRegex = function _extractRegex(regex) {
                  var matches = this.currentStr().match(regex);
                  if (!matches) {
                    return null;
                  }
                  this.forwardN(matches[0].length);
                  return matches;
                };
                _proto.isFinished = function isFinished() {
                  return this.index >= this.len;
                };
                _proto.forwardN = function forwardN(n) {
                  for (var i = 0; i < n; i++) {
                    this.forward();
                  }
                };
                _proto.forward = function forward() {
                  this.index++;
                  if (this.previous() === "\n") {
                    this.lineno++;
                    this.colno = 0;
                  } else {
                    this.colno++;
                  }
                };
                _proto.backN = function backN(n) {
                  for (var i = 0; i < n; i++) {
                    this.back();
                  }
                };
                _proto.back = function back() {
                  this.index--;
                  if (this.current() === "\n") {
                    this.lineno--;
                    var idx = this.src.lastIndexOf("\n", this.index - 1);
                    if (idx === -1) {
                      this.colno = this.index;
                    } else {
                      this.colno = this.index - idx;
                    }
                  } else {
                    this.colno--;
                  }
                };
                _proto.current = function current() {
                  if (!this.isFinished()) {
                    return this.str.charAt(this.index);
                  }
                  return "";
                };
                _proto.currentStr = function currentStr() {
                  if (!this.isFinished()) {
                    return this.str.substr(this.index);
                  }
                  return "";
                };
                _proto.previous = function previous() {
                  return this.str.charAt(this.index - 1);
                };
                return Tokenizer2;
              })();
              module2.exports = {
                lex: function lex(src, opts) {
                  return new Tokenizer(src, opts);
                },
                TOKEN_STRING,
                TOKEN_WHITESPACE,
                TOKEN_DATA,
                TOKEN_BLOCK_START,
                TOKEN_BLOCK_END,
                TOKEN_VARIABLE_START,
                TOKEN_VARIABLE_END,
                TOKEN_COMMENT,
                TOKEN_LEFT_PAREN,
                TOKEN_RIGHT_PAREN,
                TOKEN_LEFT_BRACKET,
                TOKEN_RIGHT_BRACKET,
                TOKEN_LEFT_CURLY,
                TOKEN_RIGHT_CURLY,
                TOKEN_OPERATOR,
                TOKEN_COMMA,
                TOKEN_COLON,
                TOKEN_TILDE,
                TOKEN_PIPE,
                TOKEN_INT,
                TOKEN_FLOAT,
                TOKEN_BOOLEAN,
                TOKEN_NONE,
                TOKEN_SYMBOL,
                TOKEN_SPECIAL,
                TOKEN_REGEX
              };
            }),
            /* 10 */
            /***/
            (function(module2, exports2, __webpack_require__) {
              "use strict";
              function _inheritsLoose(subClass, superClass) {
                subClass.prototype = Object.create(superClass.prototype);
                subClass.prototype.constructor = subClass;
                _setPrototypeOf(subClass, superClass);
              }
              function _setPrototypeOf(o, p) {
                _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf2(o2, p2) {
                  o2.__proto__ = p2;
                  return o2;
                };
                return _setPrototypeOf(o, p);
              }
              var Loader = __webpack_require__(6);
              var _require = __webpack_require__(19), PrecompiledLoader = _require.PrecompiledLoader;
              var WebLoader = /* @__PURE__ */ (function(_Loader) {
                _inheritsLoose(WebLoader2, _Loader);
                function WebLoader2(baseURL, opts) {
                  var _this;
                  _this = _Loader.call(this) || this;
                  _this.baseURL = baseURL || ".";
                  opts = opts || {};
                  _this.useCache = !!opts.useCache;
                  _this.async = !!opts.async;
                  return _this;
                }
                var _proto = WebLoader2.prototype;
                _proto.resolve = function resolve(from, to) {
                  throw new Error("relative templates not support in the browser yet");
                };
                _proto.getSource = function getSource(name, cb) {
                  var _this2 = this;
                  var useCache = this.useCache;
                  var result;
                  this.fetch(this.baseURL + "/" + name, function(err, src) {
                    if (err) {
                      if (cb) {
                        cb(err.content);
                      } else if (err.status === 404) {
                        result = null;
                      } else {
                        throw err.content;
                      }
                    } else {
                      result = {
                        src,
                        path: name,
                        noCache: !useCache
                      };
                      _this2.emit("load", name, result);
                      if (cb) {
                        cb(null, result);
                      }
                    }
                  });
                  return result;
                };
                _proto.fetch = function fetch(url, cb) {
                  if (typeof window === "undefined") {
                    throw new Error("WebLoader can only by used in a browser");
                  }
                  var ajax = new XMLHttpRequest();
                  var loading = true;
                  ajax.onreadystatechange = function() {
                    if (ajax.readyState === 4 && loading) {
                      loading = false;
                      if (ajax.status === 0 || ajax.status === 200) {
                        cb(null, ajax.responseText);
                      } else {
                        cb({
                          status: ajax.status,
                          content: ajax.responseText
                        });
                      }
                    }
                  };
                  url += (url.indexOf("?") === -1 ? "?" : "&") + "s=" + (/* @__PURE__ */ new Date()).getTime();
                  ajax.open("GET", url, this.async);
                  ajax.send();
                };
                return WebLoader2;
              })(Loader);
              module2.exports = {
                WebLoader,
                PrecompiledLoader
              };
            }),
            /* 11 */
            /***/
            (function(module2, exports2, __webpack_require__) {
              "use strict";
              var lib = __webpack_require__(0);
              var _require = __webpack_require__(7), Environment = _require.Environment, Template = _require.Template;
              var Loader = __webpack_require__(6);
              var loaders = __webpack_require__(10);
              var precompile = __webpack_require__(23);
              var compiler = __webpack_require__(5);
              var parser = __webpack_require__(8);
              var lexer = __webpack_require__(9);
              var runtime = __webpack_require__(2);
              var nodes = __webpack_require__(3);
              var installJinjaCompat = __webpack_require__(25);
              var e;
              function configure(templatesPath, opts) {
                opts = opts || {};
                if (lib.isObject(templatesPath)) {
                  opts = templatesPath;
                  templatesPath = null;
                }
                var TemplateLoader;
                if (loaders.FileSystemLoader) {
                  TemplateLoader = new loaders.FileSystemLoader(templatesPath, {
                    watch: opts.watch,
                    noCache: opts.noCache
                  });
                } else if (loaders.WebLoader) {
                  TemplateLoader = new loaders.WebLoader(templatesPath, {
                    useCache: opts.web && opts.web.useCache,
                    async: opts.web && opts.web.async
                  });
                }
                e = new Environment(TemplateLoader, opts);
                if (opts && opts.express) {
                  e.express(opts.express);
                }
                return e;
              }
              module2.exports = {
                Environment,
                Template,
                Loader,
                FileSystemLoader: loaders.FileSystemLoader,
                NodeResolveLoader: loaders.NodeResolveLoader,
                PrecompiledLoader: loaders.PrecompiledLoader,
                WebLoader: loaders.WebLoader,
                compiler,
                parser,
                lexer,
                runtime,
                lib,
                nodes,
                installJinjaCompat,
                configure,
                reset: function reset() {
                  e = void 0;
                },
                compile: function compile(src, env, path, eagerCompile) {
                  if (!e) {
                    configure();
                  }
                  return new Template(src, env, path, eagerCompile);
                },
                render: function render2(name, ctx, cb) {
                  if (!e) {
                    configure();
                  }
                  return e.render(name, ctx, cb);
                },
                renderString: function renderString(src, ctx, cb) {
                  if (!e) {
                    configure();
                  }
                  return e.renderString(src, ctx, cb);
                },
                precompile: precompile ? precompile.precompile : void 0,
                precompileString: precompile ? precompile.precompileString : void 0
              };
            }),
            /* 12 */
            /***/
            (function(module2, exports2, __webpack_require__) {
              "use strict";
              var rawAsap = __webpack_require__(13);
              var freeTasks = [];
              var pendingErrors = [];
              var requestErrorThrow = rawAsap.makeRequestCallFromTimer(throwFirstError);
              function throwFirstError() {
                if (pendingErrors.length) {
                  throw pendingErrors.shift();
                }
              }
              module2.exports = asap;
              function asap(task) {
                var rawTask;
                if (freeTasks.length) {
                  rawTask = freeTasks.pop();
                } else {
                  rawTask = new RawTask();
                }
                rawTask.task = task;
                rawAsap(rawTask);
              }
              function RawTask() {
                this.task = null;
              }
              RawTask.prototype.call = function() {
                try {
                  this.task.call();
                } catch (error) {
                  if (asap.onerror) {
                    asap.onerror(error);
                  } else {
                    pendingErrors.push(error);
                    requestErrorThrow();
                  }
                } finally {
                  this.task = null;
                  freeTasks[freeTasks.length] = this;
                }
              };
            }),
            /* 13 */
            /***/
            (function(module2, exports2, __webpack_require__) {
              "use strict";
              (function(global) {
                module2.exports = rawAsap;
                function rawAsap(task) {
                  if (!queue.length) {
                    requestFlush();
                    flushing = true;
                  }
                  queue[queue.length] = task;
                }
                var queue = [];
                var flushing = false;
                var requestFlush;
                var index = 0;
                var capacity = 1024;
                function flush() {
                  while (index < queue.length) {
                    var currentIndex = index;
                    index = index + 1;
                    queue[currentIndex].call();
                    if (index > capacity) {
                      for (var scan = 0, newLength = queue.length - index; scan < newLength; scan++) {
                        queue[scan] = queue[scan + index];
                      }
                      queue.length -= index;
                      index = 0;
                    }
                  }
                  queue.length = 0;
                  index = 0;
                  flushing = false;
                }
                var scope = typeof global !== "undefined" ? global : self;
                var BrowserMutationObserver = scope.MutationObserver || scope.WebKitMutationObserver;
                if (typeof BrowserMutationObserver === "function") {
                  requestFlush = makeRequestCallFromMutationObserver(flush);
                } else {
                  requestFlush = makeRequestCallFromTimer(flush);
                }
                rawAsap.requestFlush = requestFlush;
                function makeRequestCallFromMutationObserver(callback) {
                  var toggle = 1;
                  var observer = new BrowserMutationObserver(callback);
                  var node = document.createTextNode("");
                  observer.observe(node, { characterData: true });
                  return function requestCall() {
                    toggle = -toggle;
                    node.data = toggle;
                  };
                }
                function makeRequestCallFromTimer(callback) {
                  return function requestCall() {
                    var timeoutHandle = setTimeout(handleTimer, 0);
                    var intervalHandle = setInterval(handleTimer, 50);
                    function handleTimer() {
                      clearTimeout(timeoutHandle);
                      clearInterval(intervalHandle);
                      callback();
                    }
                  };
                }
                rawAsap.makeRequestCallFromTimer = makeRequestCallFromTimer;
              }).call(exports2, __webpack_require__(14));
            }),
            /* 14 */
            /***/
            (function(module2, exports2) {
              var g;
              g = /* @__PURE__ */ (function() {
                return this;
              })();
              try {
                g = g || Function("return this")() || (1, eval)("this");
              } catch (e) {
                if (typeof window === "object")
                  g = window;
              }
              module2.exports = g;
            }),
            /* 15 */
            /***/
            (function(module2, exports2, __webpack_require__) {
              var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;
              (function(globals) {
                "use strict";
                var executeSync = function() {
                  var args = Array.prototype.slice.call(arguments);
                  if (typeof args[0] === "function") {
                    args[0].apply(null, args.splice(1));
                  }
                };
                var executeAsync = function(fn) {
                  if (typeof setImmediate === "function") {
                    setImmediate(fn);
                  } else if (typeof process !== "undefined" && process.nextTick) {
                    process.nextTick(fn);
                  } else {
                    setTimeout(fn, 0);
                  }
                };
                var makeIterator = function(tasks) {
                  var makeCallback = function(index) {
                    var fn = function() {
                      if (tasks.length) {
                        tasks[index].apply(null, arguments);
                      }
                      return fn.next();
                    };
                    fn.next = function() {
                      return index < tasks.length - 1 ? makeCallback(index + 1) : null;
                    };
                    return fn;
                  };
                  return makeCallback(0);
                };
                var _isArray = Array.isArray || function(maybeArray) {
                  return Object.prototype.toString.call(maybeArray) === "[object Array]";
                };
                var waterfall = function(tasks, callback, forceAsync) {
                  var nextTick = forceAsync ? executeAsync : executeSync;
                  callback = callback || function() {
                  };
                  if (!_isArray(tasks)) {
                    var err = new Error("First argument to waterfall must be an array of functions");
                    return callback(err);
                  }
                  if (!tasks.length) {
                    return callback();
                  }
                  var wrapIterator = function(iterator) {
                    return function(err2) {
                      if (err2) {
                        callback.apply(null, arguments);
                        callback = function() {
                        };
                      } else {
                        var args = Array.prototype.slice.call(arguments, 1);
                        var next = iterator.next();
                        if (next) {
                          args.push(wrapIterator(next));
                        } else {
                          args.push(callback);
                        }
                        nextTick(function() {
                          iterator.apply(null, args);
                        });
                      }
                    };
                  };
                  wrapIterator(makeIterator(tasks))();
                };
                if (true) {
                  !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = (function() {
                    return waterfall;
                  }).apply(exports2, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== void 0 && (module2.exports = __WEBPACK_AMD_DEFINE_RESULT__));
                } else if (typeof module2 !== "undefined" && module2.exports) {
                  module2.exports = waterfall;
                } else {
                  globals.waterfall = waterfall;
                }
              })(this);
            }),
            /* 16 */
            /***/
            (function(module2, exports2, __webpack_require__) {
              "use strict";
              var R = typeof Reflect === "object" ? Reflect : null;
              var ReflectApply = R && typeof R.apply === "function" ? R.apply : function ReflectApply2(target, receiver, args) {
                return Function.prototype.apply.call(target, receiver, args);
              };
              var ReflectOwnKeys;
              if (R && typeof R.ownKeys === "function") {
                ReflectOwnKeys = R.ownKeys;
              } else if (Object.getOwnPropertySymbols) {
                ReflectOwnKeys = function ReflectOwnKeys2(target) {
                  return Object.getOwnPropertyNames(target).concat(Object.getOwnPropertySymbols(target));
                };
              } else {
                ReflectOwnKeys = function ReflectOwnKeys2(target) {
                  return Object.getOwnPropertyNames(target);
                };
              }
              function ProcessEmitWarning(warning) {
                if (console && console.warn) console.warn(warning);
              }
              var NumberIsNaN = Number.isNaN || function NumberIsNaN2(value) {
                return value !== value;
              };
              function EventEmitter() {
                EventEmitter.init.call(this);
              }
              module2.exports = EventEmitter;
              module2.exports.once = once;
              EventEmitter.EventEmitter = EventEmitter;
              EventEmitter.prototype._events = void 0;
              EventEmitter.prototype._eventsCount = 0;
              EventEmitter.prototype._maxListeners = void 0;
              var defaultMaxListeners = 10;
              function checkListener(listener) {
                if (typeof listener !== "function") {
                  throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
                }
              }
              Object.defineProperty(EventEmitter, "defaultMaxListeners", {
                enumerable: true,
                get: function() {
                  return defaultMaxListeners;
                },
                set: function(arg) {
                  if (typeof arg !== "number" || arg < 0 || NumberIsNaN(arg)) {
                    throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + ".");
                  }
                  defaultMaxListeners = arg;
                }
              });
              EventEmitter.init = function() {
                if (this._events === void 0 || this._events === Object.getPrototypeOf(this)._events) {
                  this._events = /* @__PURE__ */ Object.create(null);
                  this._eventsCount = 0;
                }
                this._maxListeners = this._maxListeners || void 0;
              };
              EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
                if (typeof n !== "number" || n < 0 || NumberIsNaN(n)) {
                  throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + ".");
                }
                this._maxListeners = n;
                return this;
              };
              function _getMaxListeners(that) {
                if (that._maxListeners === void 0)
                  return EventEmitter.defaultMaxListeners;
                return that._maxListeners;
              }
              EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
                return _getMaxListeners(this);
              };
              EventEmitter.prototype.emit = function emit(type) {
                var args = [];
                for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
                var doError = type === "error";
                var events = this._events;
                if (events !== void 0)
                  doError = doError && events.error === void 0;
                else if (!doError)
                  return false;
                if (doError) {
                  var er;
                  if (args.length > 0)
                    er = args[0];
                  if (er instanceof Error) {
                    throw er;
                  }
                  var err = new Error("Unhandled error." + (er ? " (" + er.message + ")" : ""));
                  err.context = er;
                  throw err;
                }
                var handler = events[type];
                if (handler === void 0)
                  return false;
                if (typeof handler === "function") {
                  ReflectApply(handler, this, args);
                } else {
                  var len = handler.length;
                  var listeners = arrayClone(handler, len);
                  for (var i = 0; i < len; ++i)
                    ReflectApply(listeners[i], this, args);
                }
                return true;
              };
              function _addListener(target, type, listener, prepend) {
                var m;
                var events;
                var existing;
                checkListener(listener);
                events = target._events;
                if (events === void 0) {
                  events = target._events = /* @__PURE__ */ Object.create(null);
                  target._eventsCount = 0;
                } else {
                  if (events.newListener !== void 0) {
                    target.emit(
                      "newListener",
                      type,
                      listener.listener ? listener.listener : listener
                    );
                    events = target._events;
                  }
                  existing = events[type];
                }
                if (existing === void 0) {
                  existing = events[type] = listener;
                  ++target._eventsCount;
                } else {
                  if (typeof existing === "function") {
                    existing = events[type] = prepend ? [listener, existing] : [existing, listener];
                  } else if (prepend) {
                    existing.unshift(listener);
                  } else {
                    existing.push(listener);
                  }
                  m = _getMaxListeners(target);
                  if (m > 0 && existing.length > m && !existing.warned) {
                    existing.warned = true;
                    var w = new Error("Possible EventEmitter memory leak detected. " + existing.length + " " + String(type) + " listeners added. Use emitter.setMaxListeners() to increase limit");
                    w.name = "MaxListenersExceededWarning";
                    w.emitter = target;
                    w.type = type;
                    w.count = existing.length;
                    ProcessEmitWarning(w);
                  }
                }
                return target;
              }
              EventEmitter.prototype.addListener = function addListener(type, listener) {
                return _addListener(this, type, listener, false);
              };
              EventEmitter.prototype.on = EventEmitter.prototype.addListener;
              EventEmitter.prototype.prependListener = function prependListener(type, listener) {
                return _addListener(this, type, listener, true);
              };
              function onceWrapper() {
                if (!this.fired) {
                  this.target.removeListener(this.type, this.wrapFn);
                  this.fired = true;
                  if (arguments.length === 0)
                    return this.listener.call(this.target);
                  return this.listener.apply(this.target, arguments);
                }
              }
              function _onceWrap(target, type, listener) {
                var state = { fired: false, wrapFn: void 0, target, type, listener };
                var wrapped = onceWrapper.bind(state);
                wrapped.listener = listener;
                state.wrapFn = wrapped;
                return wrapped;
              }
              EventEmitter.prototype.once = function once2(type, listener) {
                checkListener(listener);
                this.on(type, _onceWrap(this, type, listener));
                return this;
              };
              EventEmitter.prototype.prependOnceListener = function prependOnceListener(type, listener) {
                checkListener(listener);
                this.prependListener(type, _onceWrap(this, type, listener));
                return this;
              };
              EventEmitter.prototype.removeListener = function removeListener(type, listener) {
                var list, events, position, i, originalListener;
                checkListener(listener);
                events = this._events;
                if (events === void 0)
                  return this;
                list = events[type];
                if (list === void 0)
                  return this;
                if (list === listener || list.listener === listener) {
                  if (--this._eventsCount === 0)
                    this._events = /* @__PURE__ */ Object.create(null);
                  else {
                    delete events[type];
                    if (events.removeListener)
                      this.emit("removeListener", type, list.listener || listener);
                  }
                } else if (typeof list !== "function") {
                  position = -1;
                  for (i = list.length - 1; i >= 0; i--) {
                    if (list[i] === listener || list[i].listener === listener) {
                      originalListener = list[i].listener;
                      position = i;
                      break;
                    }
                  }
                  if (position < 0)
                    return this;
                  if (position === 0)
                    list.shift();
                  else {
                    spliceOne(list, position);
                  }
                  if (list.length === 1)
                    events[type] = list[0];
                  if (events.removeListener !== void 0)
                    this.emit("removeListener", type, originalListener || listener);
                }
                return this;
              };
              EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
              EventEmitter.prototype.removeAllListeners = function removeAllListeners(type) {
                var listeners, events, i;
                events = this._events;
                if (events === void 0)
                  return this;
                if (events.removeListener === void 0) {
                  if (arguments.length === 0) {
                    this._events = /* @__PURE__ */ Object.create(null);
                    this._eventsCount = 0;
                  } else if (events[type] !== void 0) {
                    if (--this._eventsCount === 0)
                      this._events = /* @__PURE__ */ Object.create(null);
                    else
                      delete events[type];
                  }
                  return this;
                }
                if (arguments.length === 0) {
                  var keys = Object.keys(events);
                  var key;
                  for (i = 0; i < keys.length; ++i) {
                    key = keys[i];
                    if (key === "removeListener") continue;
                    this.removeAllListeners(key);
                  }
                  this.removeAllListeners("removeListener");
                  this._events = /* @__PURE__ */ Object.create(null);
                  this._eventsCount = 0;
                  return this;
                }
                listeners = events[type];
                if (typeof listeners === "function") {
                  this.removeListener(type, listeners);
                } else if (listeners !== void 0) {
                  for (i = listeners.length - 1; i >= 0; i--) {
                    this.removeListener(type, listeners[i]);
                  }
                }
                return this;
              };
              function _listeners(target, type, unwrap) {
                var events = target._events;
                if (events === void 0)
                  return [];
                var evlistener = events[type];
                if (evlistener === void 0)
                  return [];
                if (typeof evlistener === "function")
                  return unwrap ? [evlistener.listener || evlistener] : [evlistener];
                return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
              }
              EventEmitter.prototype.listeners = function listeners(type) {
                return _listeners(this, type, true);
              };
              EventEmitter.prototype.rawListeners = function rawListeners(type) {
                return _listeners(this, type, false);
              };
              EventEmitter.listenerCount = function(emitter, type) {
                if (typeof emitter.listenerCount === "function") {
                  return emitter.listenerCount(type);
                } else {
                  return listenerCount.call(emitter, type);
                }
              };
              EventEmitter.prototype.listenerCount = listenerCount;
              function listenerCount(type) {
                var events = this._events;
                if (events !== void 0) {
                  var evlistener = events[type];
                  if (typeof evlistener === "function") {
                    return 1;
                  } else if (evlistener !== void 0) {
                    return evlistener.length;
                  }
                }
                return 0;
              }
              EventEmitter.prototype.eventNames = function eventNames() {
                return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
              };
              function arrayClone(arr, n) {
                var copy = new Array(n);
                for (var i = 0; i < n; ++i)
                  copy[i] = arr[i];
                return copy;
              }
              function spliceOne(list, index) {
                for (; index + 1 < list.length; index++)
                  list[index] = list[index + 1];
                list.pop();
              }
              function unwrapListeners(arr) {
                var ret = new Array(arr.length);
                for (var i = 0; i < ret.length; ++i) {
                  ret[i] = arr[i].listener || arr[i];
                }
                return ret;
              }
              function once(emitter, name) {
                return new Promise(function(resolve, reject) {
                  function errorListener(err) {
                    emitter.removeListener(name, resolver);
                    reject(err);
                  }
                  function resolver() {
                    if (typeof emitter.removeListener === "function") {
                      emitter.removeListener("error", errorListener);
                    }
                    resolve([].slice.call(arguments));
                  }
                  ;
                  eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
                  if (name !== "error") {
                    addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
                  }
                });
              }
              function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
                if (typeof emitter.on === "function") {
                  eventTargetAgnosticAddListener(emitter, "error", handler, flags);
                }
              }
              function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
                if (typeof emitter.on === "function") {
                  if (flags.once) {
                    emitter.once(name, listener);
                  } else {
                    emitter.on(name, listener);
                  }
                } else if (typeof emitter.addEventListener === "function") {
                  emitter.addEventListener(name, function wrapListener(arg) {
                    if (flags.once) {
                      emitter.removeEventListener(name, wrapListener);
                    }
                    listener(arg);
                  });
                } else {
                  throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
                }
              }
            }),
            /* 17 */
            /***/
            (function(module2, exports2, __webpack_require__) {
              "use strict";
              var nodes = __webpack_require__(3);
              var lib = __webpack_require__(0);
              var sym = 0;
              function gensym() {
                return "hole_" + sym++;
              }
              function mapCOW(arr, func) {
                var res = null;
                for (var i = 0; i < arr.length; i++) {
                  var item = func(arr[i]);
                  if (item !== arr[i]) {
                    if (!res) {
                      res = arr.slice();
                    }
                    res[i] = item;
                  }
                }
                return res || arr;
              }
              function walk(ast, func, depthFirst) {
                if (!(ast instanceof nodes.Node)) {
                  return ast;
                }
                if (!depthFirst) {
                  var astT = func(ast);
                  if (astT && astT !== ast) {
                    return astT;
                  }
                }
                if (ast instanceof nodes.NodeList) {
                  var children = mapCOW(ast.children, function(node) {
                    return walk(node, func, depthFirst);
                  });
                  if (children !== ast.children) {
                    ast = new nodes[ast.typename](ast.lineno, ast.colno, children);
                  }
                } else if (ast instanceof nodes.CallExtension) {
                  var args = walk(ast.args, func, depthFirst);
                  var contentArgs = mapCOW(ast.contentArgs, function(node) {
                    return walk(node, func, depthFirst);
                  });
                  if (args !== ast.args || contentArgs !== ast.contentArgs) {
                    ast = new nodes[ast.typename](ast.extName, ast.prop, args, contentArgs);
                  }
                } else {
                  var props = ast.fields.map(function(field) {
                    return ast[field];
                  });
                  var propsT = mapCOW(props, function(prop) {
                    return walk(prop, func, depthFirst);
                  });
                  if (propsT !== props) {
                    ast = new nodes[ast.typename](ast.lineno, ast.colno);
                    propsT.forEach(function(prop, i) {
                      ast[ast.fields[i]] = prop;
                    });
                  }
                }
                return depthFirst ? func(ast) || ast : ast;
              }
              function depthWalk(ast, func) {
                return walk(ast, func, true);
              }
              function _liftFilters(node, asyncFilters, prop) {
                var children = [];
                var walked = depthWalk(prop ? node[prop] : node, function(descNode) {
                  var symbol;
                  if (descNode instanceof nodes.Block) {
                    return descNode;
                  } else if (descNode instanceof nodes.Filter && lib.indexOf(asyncFilters, descNode.name.value) !== -1 || descNode instanceof nodes.CallExtensionAsync) {
                    symbol = new nodes.Symbol(descNode.lineno, descNode.colno, gensym());
                    children.push(new nodes.FilterAsync(descNode.lineno, descNode.colno, descNode.name, descNode.args, symbol));
                  }
                  return symbol;
                });
                if (prop) {
                  node[prop] = walked;
                } else {
                  node = walked;
                }
                if (children.length) {
                  children.push(node);
                  return new nodes.NodeList(node.lineno, node.colno, children);
                } else {
                  return node;
                }
              }
              function liftFilters(ast, asyncFilters) {
                return depthWalk(ast, function(node) {
                  if (node instanceof nodes.Output) {
                    return _liftFilters(node, asyncFilters);
                  } else if (node instanceof nodes.Set) {
                    return _liftFilters(node, asyncFilters, "value");
                  } else if (node instanceof nodes.For) {
                    return _liftFilters(node, asyncFilters, "arr");
                  } else if (node instanceof nodes.If) {
                    return _liftFilters(node, asyncFilters, "cond");
                  } else if (node instanceof nodes.CallExtension) {
                    return _liftFilters(node, asyncFilters, "args");
                  } else {
                    return void 0;
                  }
                });
              }
              function liftSuper(ast) {
                return walk(ast, function(blockNode) {
                  if (!(blockNode instanceof nodes.Block)) {
                    return;
                  }
                  var hasSuper = false;
                  var symbol = gensym();
                  blockNode.body = walk(blockNode.body, function(node) {
                    if (node instanceof nodes.FunCall && node.name.value === "super") {
                      hasSuper = true;
                      return new nodes.Symbol(node.lineno, node.colno, symbol);
                    }
                  });
                  if (hasSuper) {
                    blockNode.body.children.unshift(new nodes.Super(0, 0, blockNode.name, new nodes.Symbol(0, 0, symbol)));
                  }
                });
              }
              function convertStatements(ast) {
                return depthWalk(ast, function(node) {
                  if (!(node instanceof nodes.If) && !(node instanceof nodes.For)) {
                    return void 0;
                  }
                  var async = false;
                  walk(node, function(child) {
                    if (child instanceof nodes.FilterAsync || child instanceof nodes.IfAsync || child instanceof nodes.AsyncEach || child instanceof nodes.AsyncAll || child instanceof nodes.CallExtensionAsync) {
                      async = true;
                      return child;
                    }
                    return void 0;
                  });
                  if (async) {
                    if (node instanceof nodes.If) {
                      return new nodes.IfAsync(node.lineno, node.colno, node.cond, node.body, node.else_);
                    } else if (node instanceof nodes.For && !(node instanceof nodes.AsyncAll)) {
                      return new nodes.AsyncEach(node.lineno, node.colno, node.arr, node.name, node.body, node.else_);
                    }
                  }
                  return void 0;
                });
              }
              function cps(ast, asyncFilters) {
                return convertStatements(liftSuper(liftFilters(ast, asyncFilters)));
              }
              function transform(ast, asyncFilters) {
                return cps(ast, asyncFilters || []);
              }
              module2.exports = {
                transform
              };
            }),
            /* 18 */
            /***/
            (function(module2, exports2, __webpack_require__) {
              "use strict";
              var lib = __webpack_require__(0);
              var r = __webpack_require__(2);
              var exports2 = module2.exports = {};
              function normalize(value, defaultValue) {
                if (value === null || value === void 0 || value === false) {
                  return defaultValue;
                }
                return value;
              }
              exports2.abs = Math.abs;
              function isNaN(num) {
                return num !== num;
              }
              function batch(arr, linecount, fillWith) {
                var i;
                var res = [];
                var tmp = [];
                for (i = 0; i < arr.length; i++) {
                  if (i % linecount === 0 && tmp.length) {
                    res.push(tmp);
                    tmp = [];
                  }
                  tmp.push(arr[i]);
                }
                if (tmp.length) {
                  if (fillWith) {
                    for (i = tmp.length; i < linecount; i++) {
                      tmp.push(fillWith);
                    }
                  }
                  res.push(tmp);
                }
                return res;
              }
              exports2.batch = batch;
              function capitalize(str) {
                str = normalize(str, "");
                var ret = str.toLowerCase();
                return r.copySafeness(str, ret.charAt(0).toUpperCase() + ret.slice(1));
              }
              exports2.capitalize = capitalize;
              function center(str, width) {
                str = normalize(str, "");
                width = width || 80;
                if (str.length >= width) {
                  return str;
                }
                var spaces = width - str.length;
                var pre = lib.repeat(" ", spaces / 2 - spaces % 2);
                var post = lib.repeat(" ", spaces / 2);
                return r.copySafeness(str, pre + str + post);
              }
              exports2.center = center;
              function default_(val, def, bool) {
                if (bool) {
                  return val || def;
                } else {
                  return val !== void 0 ? val : def;
                }
              }
              exports2["default"] = default_;
              function dictsort(val, caseSensitive, by) {
                if (!lib.isObject(val)) {
                  throw new lib.TemplateError("dictsort filter: val must be an object");
                }
                var array = [];
                for (var k in val) {
                  array.push([k, val[k]]);
                }
                var si;
                if (by === void 0 || by === "key") {
                  si = 0;
                } else if (by === "value") {
                  si = 1;
                } else {
                  throw new lib.TemplateError("dictsort filter: You can only sort by either key or value");
                }
                array.sort(function(t1, t2) {
                  var a = t1[si];
                  var b = t2[si];
                  if (!caseSensitive) {
                    if (lib.isString(a)) {
                      a = a.toUpperCase();
                    }
                    if (lib.isString(b)) {
                      b = b.toUpperCase();
                    }
                  }
                  return a > b ? 1 : a === b ? 0 : -1;
                });
                return array;
              }
              exports2.dictsort = dictsort;
              function dump(obj, spaces) {
                return JSON.stringify(obj, null, spaces);
              }
              exports2.dump = dump;
              function escape(str) {
                if (str instanceof r.SafeString) {
                  return str;
                }
                str = str === null || str === void 0 ? "" : str;
                return r.markSafe(lib.escape(str.toString()));
              }
              exports2.escape = escape;
              function safe(str) {
                if (str instanceof r.SafeString) {
                  return str;
                }
                str = str === null || str === void 0 ? "" : str;
                return r.markSafe(str.toString());
              }
              exports2.safe = safe;
              function first(arr) {
                return arr[0];
              }
              exports2.first = first;
              function forceescape(str) {
                str = str === null || str === void 0 ? "" : str;
                return r.markSafe(lib.escape(str.toString()));
              }
              exports2.forceescape = forceescape;
              function groupby(arr, attr) {
                return lib.groupBy(arr, attr, this.env.opts.throwOnUndefined);
              }
              exports2.groupby = groupby;
              function indent(str, width, indentfirst) {
                str = normalize(str, "");
                if (str === "") {
                  return "";
                }
                width = width || 4;
                var lines = str.split("\n");
                var sp = lib.repeat(" ", width);
                var res = lines.map(function(l, i) {
                  return i === 0 && !indentfirst ? l : "" + sp + l;
                }).join("\n");
                return r.copySafeness(str, res);
              }
              exports2.indent = indent;
              function join(arr, del, attr) {
                del = del || "";
                if (attr) {
                  arr = lib.map(arr, function(v) {
                    return v[attr];
                  });
                }
                return arr.join(del);
              }
              exports2.join = join;
              function last(arr) {
                return arr[arr.length - 1];
              }
              exports2.last = last;
              function lengthFilter(val) {
                var value = normalize(val, "");
                if (value !== void 0) {
                  if (typeof Map === "function" && value instanceof Map || typeof Set === "function" && value instanceof Set) {
                    return value.size;
                  }
                  if (lib.isObject(value) && !(value instanceof r.SafeString)) {
                    return lib.keys(value).length;
                  }
                  return value.length;
                }
                return 0;
              }
              exports2.length = lengthFilter;
              function list(val) {
                if (lib.isString(val)) {
                  return val.split("");
                } else if (lib.isObject(val)) {
                  return lib._entries(val || {}).map(function(_ref) {
                    var key = _ref[0], value = _ref[1];
                    return {
                      key,
                      value
                    };
                  });
                } else if (lib.isArray(val)) {
                  return val;
                } else {
                  throw new lib.TemplateError("list filter: type not iterable");
                }
              }
              exports2.list = list;
              function lower(str) {
                str = normalize(str, "");
                return str.toLowerCase();
              }
              exports2.lower = lower;
              function nl2br(str) {
                if (str === null || str === void 0) {
                  return "";
                }
                return r.copySafeness(str, str.replace(/\r\n|\n/g, "<br />\n"));
              }
              exports2.nl2br = nl2br;
              function random(arr) {
                return arr[Math.floor(Math.random() * arr.length)];
              }
              exports2.random = random;
              function getSelectOrReject(expectedTestResult) {
                function filter(arr, testName, secondArg) {
                  if (testName === void 0) {
                    testName = "truthy";
                  }
                  var context = this;
                  var test = context.env.getTest(testName);
                  return lib.toArray(arr).filter(function examineTestResult(item) {
                    return test.call(context, item, secondArg) === expectedTestResult;
                  });
                }
                return filter;
              }
              exports2.reject = getSelectOrReject(false);
              function rejectattr(arr, attr) {
                return arr.filter(function(item) {
                  return !item[attr];
                });
              }
              exports2.rejectattr = rejectattr;
              exports2.select = getSelectOrReject(true);
              function selectattr(arr, attr) {
                return arr.filter(function(item) {
                  return !!item[attr];
                });
              }
              exports2.selectattr = selectattr;
              function replace(str, old, new_, maxCount) {
                var originalStr = str;
                if (old instanceof RegExp) {
                  return str.replace(old, new_);
                }
                if (typeof maxCount === "undefined") {
                  maxCount = -1;
                }
                var res = "";
                if (typeof old === "number") {
                  old = "" + old;
                } else if (typeof old !== "string") {
                  return str;
                }
                if (typeof str === "number") {
                  str = "" + str;
                }
                if (typeof str !== "string" && !(str instanceof r.SafeString)) {
                  return str;
                }
                if (old === "") {
                  res = new_ + str.split("").join(new_) + new_;
                  return r.copySafeness(str, res);
                }
                var nextIndex = str.indexOf(old);
                if (maxCount === 0 || nextIndex === -1) {
                  return str;
                }
                var pos = 0;
                var count = 0;
                while (nextIndex > -1 && (maxCount === -1 || count < maxCount)) {
                  res += str.substring(pos, nextIndex) + new_;
                  pos = nextIndex + old.length;
                  count++;
                  nextIndex = str.indexOf(old, pos);
                }
                if (pos < str.length) {
                  res += str.substring(pos);
                }
                return r.copySafeness(originalStr, res);
              }
              exports2.replace = replace;
              function reverse(val) {
                var arr;
                if (lib.isString(val)) {
                  arr = list(val);
                } else {
                  arr = lib.map(val, function(v) {
                    return v;
                  });
                }
                arr.reverse();
                if (lib.isString(val)) {
                  return r.copySafeness(val, arr.join(""));
                }
                return arr;
              }
              exports2.reverse = reverse;
              function round(val, precision, method) {
                precision = precision || 0;
                var factor = Math.pow(10, precision);
                var rounder;
                if (method === "ceil") {
                  rounder = Math.ceil;
                } else if (method === "floor") {
                  rounder = Math.floor;
                } else {
                  rounder = Math.round;
                }
                return rounder(val * factor) / factor;
              }
              exports2.round = round;
              function slice(arr, slices, fillWith) {
                var sliceLength = Math.floor(arr.length / slices);
                var extra = arr.length % slices;
                var res = [];
                var offset = 0;
                for (var i = 0; i < slices; i++) {
                  var start = offset + i * sliceLength;
                  if (i < extra) {
                    offset++;
                  }
                  var end = offset + (i + 1) * sliceLength;
                  var currSlice = arr.slice(start, end);
                  if (fillWith && i >= extra) {
                    currSlice.push(fillWith);
                  }
                  res.push(currSlice);
                }
                return res;
              }
              exports2.slice = slice;
              function sum(arr, attr, start) {
                if (start === void 0) {
                  start = 0;
                }
                if (attr) {
                  arr = lib.map(arr, function(v) {
                    return v[attr];
                  });
                }
                return start + arr.reduce(function(a, b) {
                  return a + b;
                }, 0);
              }
              exports2.sum = sum;
              exports2.sort = r.makeMacro(["value", "reverse", "case_sensitive", "attribute"], [], function sortFilter(arr, reversed, caseSens, attr) {
                var _this = this;
                var array = lib.map(arr, function(v) {
                  return v;
                });
                var getAttribute = lib.getAttrGetter(attr);
                array.sort(function(a, b) {
                  var x = attr ? getAttribute(a) : a;
                  var y = attr ? getAttribute(b) : b;
                  if (_this.env.opts.throwOnUndefined && attr && (x === void 0 || y === void 0)) {
                    throw new TypeError('sort: attribute "' + attr + '" resolved to undefined');
                  }
                  if (!caseSens && lib.isString(x) && lib.isString(y)) {
                    x = x.toLowerCase();
                    y = y.toLowerCase();
                  }
                  if (x < y) {
                    return reversed ? 1 : -1;
                  } else if (x > y) {
                    return reversed ? -1 : 1;
                  } else {
                    return 0;
                  }
                });
                return array;
              });
              function string(obj) {
                return r.copySafeness(obj, obj);
              }
              exports2.string = string;
              function striptags(input, preserveLinebreaks) {
                input = normalize(input, "");
                var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>|<!--[\s\S]*?-->/gi;
                var trimmedInput = trim(input.replace(tags, ""));
                var res = "";
                if (preserveLinebreaks) {
                  res = trimmedInput.replace(/^ +| +$/gm, "").replace(/ +/g, " ").replace(/(\r\n)/g, "\n").replace(/\n\n\n+/g, "\n\n");
                } else {
                  res = trimmedInput.replace(/\s+/gi, " ");
                }
                return r.copySafeness(input, res);
              }
              exports2.striptags = striptags;
              function title(str) {
                str = normalize(str, "");
                var words = str.split(" ").map(function(word) {
                  return capitalize(word);
                });
                return r.copySafeness(str, words.join(" "));
              }
              exports2.title = title;
              function trim(str) {
                return r.copySafeness(str, str.replace(/^\s*|\s*$/g, ""));
              }
              exports2.trim = trim;
              function truncate(input, length, killwords, end) {
                var orig = input;
                input = normalize(input, "");
                length = length || 255;
                if (input.length <= length) {
                  return input;
                }
                if (killwords) {
                  input = input.substring(0, length);
                } else {
                  var idx = input.lastIndexOf(" ", length);
                  if (idx === -1) {
                    idx = length;
                  }
                  input = input.substring(0, idx);
                }
                input += end !== void 0 && end !== null ? end : "...";
                return r.copySafeness(orig, input);
              }
              exports2.truncate = truncate;
              function upper(str) {
                str = normalize(str, "");
                return str.toUpperCase();
              }
              exports2.upper = upper;
              function urlencode(obj) {
                var enc = encodeURIComponent;
                if (lib.isString(obj)) {
                  return enc(obj);
                } else {
                  var keyvals = lib.isArray(obj) ? obj : lib._entries(obj);
                  return keyvals.map(function(_ref2) {
                    var k = _ref2[0], v = _ref2[1];
                    return enc(k) + "=" + enc(v);
                  }).join("&");
                }
              }
              exports2.urlencode = urlencode;
              var puncRe = /^(?:\(|<|&lt;)?(.*?)(?:\.|,|\)|\n|&gt;)?$/;
              var emailRe = /^[\w.!#$%&'*+\-\/=?\^`{|}~]+@[a-z\d\-]+(\.[a-z\d\-]+)+$/i;
              var httpHttpsRe = /^https?:\/\/.*$/;
              var wwwRe = /^www\./;
              var tldRe = /\.(?:org|net|com)(?:\:|\/|$)/;
              function urlize(str, length, nofollow) {
                if (isNaN(length)) {
                  length = Infinity;
                }
                var noFollowAttr = nofollow === true ? ' rel="nofollow"' : "";
                var words = str.split(/(\s+)/).filter(function(word) {
                  return word && word.length;
                }).map(function(word) {
                  var matches = word.match(puncRe);
                  var possibleUrl = matches ? matches[1] : word;
                  var shortUrl = possibleUrl.substr(0, length);
                  if (httpHttpsRe.test(possibleUrl)) {
                    return '<a href="' + possibleUrl + '"' + noFollowAttr + ">" + shortUrl + "</a>";
                  }
                  if (wwwRe.test(possibleUrl)) {
                    return '<a href="http://' + possibleUrl + '"' + noFollowAttr + ">" + shortUrl + "</a>";
                  }
                  if (emailRe.test(possibleUrl)) {
                    return '<a href="mailto:' + possibleUrl + '">' + possibleUrl + "</a>";
                  }
                  if (tldRe.test(possibleUrl)) {
                    return '<a href="http://' + possibleUrl + '"' + noFollowAttr + ">" + shortUrl + "</a>";
                  }
                  return word;
                });
                return words.join("");
              }
              exports2.urlize = urlize;
              function wordcount(str) {
                str = normalize(str, "");
                var words = str ? str.match(/\w+/g) : null;
                return words ? words.length : null;
              }
              exports2.wordcount = wordcount;
              function float(val, def) {
                var res = parseFloat(val);
                return isNaN(res) ? def : res;
              }
              exports2.float = float;
              var intFilter = r.makeMacro(["value", "default", "base"], [], function doInt(value, defaultValue, base) {
                if (base === void 0) {
                  base = 10;
                }
                var res = parseInt(value, base);
                return isNaN(res) ? defaultValue : res;
              });
              exports2.int = intFilter;
              exports2.d = exports2.default;
              exports2.e = exports2.escape;
            }),
            /* 19 */
            /***/
            (function(module2, exports2, __webpack_require__) {
              "use strict";
              function _inheritsLoose(subClass, superClass) {
                subClass.prototype = Object.create(superClass.prototype);
                subClass.prototype.constructor = subClass;
                _setPrototypeOf(subClass, superClass);
              }
              function _setPrototypeOf(o, p) {
                _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf2(o2, p2) {
                  o2.__proto__ = p2;
                  return o2;
                };
                return _setPrototypeOf(o, p);
              }
              var Loader = __webpack_require__(6);
              var PrecompiledLoader = /* @__PURE__ */ (function(_Loader) {
                _inheritsLoose(PrecompiledLoader2, _Loader);
                function PrecompiledLoader2(compiledTemplates) {
                  var _this;
                  _this = _Loader.call(this) || this;
                  _this.precompiled = compiledTemplates || {};
                  return _this;
                }
                var _proto = PrecompiledLoader2.prototype;
                _proto.getSource = function getSource(name) {
                  if (this.precompiled[name]) {
                    return {
                      src: {
                        type: "code",
                        obj: this.precompiled[name]
                      },
                      path: name
                    };
                  }
                  return null;
                };
                return PrecompiledLoader2;
              })(Loader);
              module2.exports = {
                PrecompiledLoader
              };
            }),
            /* 20 */
            /***/
            (function(module2, exports2, __webpack_require__) {
              "use strict";
              var SafeString = __webpack_require__(2).SafeString;
              function callable(value) {
                return typeof value === "function";
              }
              exports2.callable = callable;
              function defined(value) {
                return value !== void 0;
              }
              exports2.defined = defined;
              function divisibleby(one, two) {
                return one % two === 0;
              }
              exports2.divisibleby = divisibleby;
              function escaped(value) {
                return value instanceof SafeString;
              }
              exports2.escaped = escaped;
              function equalto(one, two) {
                return one === two;
              }
              exports2.equalto = equalto;
              exports2.eq = exports2.equalto;
              exports2.sameas = exports2.equalto;
              function even(value) {
                return value % 2 === 0;
              }
              exports2.even = even;
              function falsy(value) {
                return !value;
              }
              exports2.falsy = falsy;
              function ge(one, two) {
                return one >= two;
              }
              exports2.ge = ge;
              function greaterthan(one, two) {
                return one > two;
              }
              exports2.greaterthan = greaterthan;
              exports2.gt = exports2.greaterthan;
              function le(one, two) {
                return one <= two;
              }
              exports2.le = le;
              function lessthan(one, two) {
                return one < two;
              }
              exports2.lessthan = lessthan;
              exports2.lt = exports2.lessthan;
              function lower(value) {
                return value.toLowerCase() === value;
              }
              exports2.lower = lower;
              function ne(one, two) {
                return one !== two;
              }
              exports2.ne = ne;
              function nullTest(value) {
                return value === null;
              }
              exports2.null = nullTest;
              function number(value) {
                return typeof value === "number";
              }
              exports2.number = number;
              function odd(value) {
                return value % 2 === 1;
              }
              exports2.odd = odd;
              function string(value) {
                return typeof value === "string";
              }
              exports2.string = string;
              function truthy(value) {
                return !!value;
              }
              exports2.truthy = truthy;
              function undefinedTest(value) {
                return value === void 0;
              }
              exports2.undefined = undefinedTest;
              function upper(value) {
                return value.toUpperCase() === value;
              }
              exports2.upper = upper;
              function iterable(value) {
                if (typeof Symbol !== "undefined") {
                  return !!value[Symbol.iterator];
                } else {
                  return Array.isArray(value) || typeof value === "string";
                }
              }
              exports2.iterable = iterable;
              function mapping(value) {
                var bool = value !== null && value !== void 0 && typeof value === "object" && !Array.isArray(value);
                if (Set) {
                  return bool && !(value instanceof Set);
                } else {
                  return bool;
                }
              }
              exports2.mapping = mapping;
            }),
            /* 21 */
            /***/
            (function(module2, exports2, __webpack_require__) {
              "use strict";
              function _cycler(items) {
                var index = -1;
                return {
                  current: null,
                  reset: function reset() {
                    index = -1;
                    this.current = null;
                  },
                  next: function next() {
                    index++;
                    if (index >= items.length) {
                      index = 0;
                    }
                    this.current = items[index];
                    return this.current;
                  }
                };
              }
              function _joiner(sep) {
                sep = sep || ",";
                var first = true;
                return function() {
                  var val = first ? "" : sep;
                  first = false;
                  return val;
                };
              }
              function globals() {
                return {
                  range: function range(start, stop, step) {
                    if (typeof stop === "undefined") {
                      stop = start;
                      start = 0;
                      step = 1;
                    } else if (!step) {
                      step = 1;
                    }
                    var arr = [];
                    if (step > 0) {
                      for (var i = start; i < stop; i += step) {
                        arr.push(i);
                      }
                    } else {
                      for (var _i = start; _i > stop; _i += step) {
                        arr.push(_i);
                      }
                    }
                    return arr;
                  },
                  cycler: function cycler() {
                    return _cycler(Array.prototype.slice.call(arguments));
                  },
                  joiner: function joiner(sep) {
                    return _joiner(sep);
                  }
                };
              }
              module2.exports = globals;
            }),
            /* 22 */
            /***/
            (function(module2, exports2, __webpack_require__) {
              var path = __webpack_require__(4);
              module2.exports = function express(env, app) {
                function NunjucksView(name, opts) {
                  this.name = name;
                  this.path = name;
                  this.defaultEngine = opts.defaultEngine;
                  this.ext = path.extname(name);
                  if (!this.ext && !this.defaultEngine) {
                    throw new Error("No default engine was specified and no extension was provided.");
                  }
                  if (!this.ext) {
                    this.name += this.ext = (this.defaultEngine[0] !== "." ? "." : "") + this.defaultEngine;
                  }
                }
                NunjucksView.prototype.render = function render2(opts, cb) {
                  env.render(this.name, opts, cb);
                };
                app.set("view", NunjucksView);
                app.set("nunjucksEnv", env);
                return env;
              };
            }),
            /* 23 */
            /***/
            (function(module2, exports2, __webpack_require__) {
              "use strict";
              var fs = __webpack_require__(4);
              var path = __webpack_require__(4);
              var _require = __webpack_require__(0), _prettifyError = _require._prettifyError;
              var compiler = __webpack_require__(5);
              var _require2 = __webpack_require__(7), Environment = _require2.Environment;
              var precompileGlobal = __webpack_require__(24);
              function match(filename, patterns) {
                if (!Array.isArray(patterns)) {
                  return false;
                }
                return patterns.some(function(pattern) {
                  return filename.match(pattern);
                });
              }
              function precompileString(str, opts) {
                opts = opts || {};
                opts.isString = true;
                var env = opts.env || new Environment([]);
                var wrapper = opts.wrapper || precompileGlobal;
                if (!opts.name) {
                  throw new Error('the "name" option is required when compiling a string');
                }
                return wrapper([_precompile(str, opts.name, env)], opts);
              }
              function precompile(input, opts) {
                opts = opts || {};
                var env = opts.env || new Environment([]);
                var wrapper = opts.wrapper || precompileGlobal;
                if (opts.isString) {
                  return precompileString(input, opts);
                }
                var pathStats = fs.existsSync(input) && fs.statSync(input);
                var precompiled = [];
                var templates = [];
                function addTemplates(dir) {
                  fs.readdirSync(dir).forEach(function(file) {
                    var filepath = path.join(dir, file);
                    var subpath = filepath.substr(path.join(input, "/").length);
                    var stat = fs.statSync(filepath);
                    if (stat && stat.isDirectory()) {
                      subpath += "/";
                      if (!match(subpath, opts.exclude)) {
                        addTemplates(filepath);
                      }
                    } else if (match(subpath, opts.include)) {
                      templates.push(filepath);
                    }
                  });
                }
                if (pathStats.isFile()) {
                  precompiled.push(_precompile(fs.readFileSync(input, "utf-8"), opts.name || input, env));
                } else if (pathStats.isDirectory()) {
                  addTemplates(input);
                  for (var i = 0; i < templates.length; i++) {
                    var name = templates[i].replace(path.join(input, "/"), "");
                    try {
                      precompiled.push(_precompile(fs.readFileSync(templates[i], "utf-8"), name, env));
                    } catch (e) {
                      if (opts.force) {
                        console.error(e);
                      } else {
                        throw e;
                      }
                    }
                  }
                }
                return wrapper(precompiled, opts);
              }
              function _precompile(str, name, env) {
                env = env || new Environment([]);
                var asyncFilters = env.asyncFilters;
                var extensions = env.extensionsList;
                var template;
                name = name.replace(/\\/g, "/");
                try {
                  template = compiler.compile(str, asyncFilters, extensions, name, env.opts);
                } catch (err) {
                  throw _prettifyError(name, false, err);
                }
                return {
                  name,
                  template
                };
              }
              module2.exports = {
                precompile,
                precompileString
              };
            }),
            /* 24 */
            /***/
            (function(module2, exports2, __webpack_require__) {
              "use strict";
              function precompileGlobal(templates, opts) {
                var out = "";
                opts = opts || {};
                for (var i = 0; i < templates.length; i++) {
                  var name = JSON.stringify(templates[i].name);
                  var template = templates[i].template;
                  out += "(function() {(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})[" + name + "] = (function() {\n" + template + "\n})();\n";
                  if (opts.asFunction) {
                    out += "return function(ctx, cb) { return nunjucks.render(" + name + ", ctx, cb); }\n";
                  }
                  out += "})();\n";
                }
                return out;
              }
              module2.exports = precompileGlobal;
            }),
            /* 25 */
            /***/
            (function(module2, exports2, __webpack_require__) {
              function installCompat() {
                "use strict";
                var runtime = this.runtime;
                var lib = this.lib;
                var Compiler = this.compiler.Compiler;
                var Parser = this.parser.Parser;
                var nodes = this.nodes;
                var lexer = this.lexer;
                var orig_contextOrFrameLookup = runtime.contextOrFrameLookup;
                var orig_memberLookup = runtime.memberLookup;
                var orig_Compiler_assertType;
                var orig_Parser_parseAggregate;
                if (Compiler) {
                  orig_Compiler_assertType = Compiler.prototype.assertType;
                }
                if (Parser) {
                  orig_Parser_parseAggregate = Parser.prototype.parseAggregate;
                }
                function uninstall() {
                  runtime.contextOrFrameLookup = orig_contextOrFrameLookup;
                  runtime.memberLookup = orig_memberLookup;
                  if (Compiler) {
                    Compiler.prototype.assertType = orig_Compiler_assertType;
                  }
                  if (Parser) {
                    Parser.prototype.parseAggregate = orig_Parser_parseAggregate;
                  }
                }
                runtime.contextOrFrameLookup = function contextOrFrameLookup(context, frame, key) {
                  var val = orig_contextOrFrameLookup.apply(this, arguments);
                  if (val !== void 0) {
                    return val;
                  }
                  switch (key) {
                    case "True":
                      return true;
                    case "False":
                      return false;
                    case "None":
                      return null;
                    default:
                      return void 0;
                  }
                };
                function getTokensState(tokens) {
                  return {
                    index: tokens.index,
                    lineno: tokens.lineno,
                    colno: tokens.colno
                  };
                }
                if (nodes && Compiler && Parser) {
                  var Slice = nodes.Node.extend("Slice", {
                    fields: ["start", "stop", "step"],
                    init: function init(lineno, colno, start, stop, step) {
                      start = start || new nodes.Literal(lineno, colno, null);
                      stop = stop || new nodes.Literal(lineno, colno, null);
                      step = step || new nodes.Literal(lineno, colno, 1);
                      this.parent(lineno, colno, start, stop, step);
                    }
                  });
                  Compiler.prototype.assertType = function assertType(node) {
                    if (node instanceof Slice) {
                      return;
                    }
                    orig_Compiler_assertType.apply(this, arguments);
                  };
                  Compiler.prototype.compileSlice = function compileSlice(node, frame) {
                    this._emit("(");
                    this._compileExpression(node.start, frame);
                    this._emit("),(");
                    this._compileExpression(node.stop, frame);
                    this._emit("),(");
                    this._compileExpression(node.step, frame);
                    this._emit(")");
                  };
                  Parser.prototype.parseAggregate = function parseAggregate() {
                    var _this = this;
                    var origState = getTokensState(this.tokens);
                    origState.colno--;
                    origState.index--;
                    try {
                      return orig_Parser_parseAggregate.apply(this);
                    } catch (e) {
                      var errState = getTokensState(this.tokens);
                      var rethrow = function rethrow2() {
                        lib._assign(_this.tokens, errState);
                        return e;
                      };
                      lib._assign(this.tokens, origState);
                      this.peeked = false;
                      var tok = this.peekToken();
                      if (tok.type !== lexer.TOKEN_LEFT_BRACKET) {
                        throw rethrow();
                      } else {
                        this.nextToken();
                      }
                      var node = new Slice(tok.lineno, tok.colno);
                      var isSlice = false;
                      for (var i = 0; i <= node.fields.length; i++) {
                        if (this.skip(lexer.TOKEN_RIGHT_BRACKET)) {
                          break;
                        }
                        if (i === node.fields.length) {
                          if (isSlice) {
                            this.fail("parseSlice: too many slice components", tok.lineno, tok.colno);
                          } else {
                            break;
                          }
                        }
                        if (this.skip(lexer.TOKEN_COLON)) {
                          isSlice = true;
                        } else {
                          var field = node.fields[i];
                          node[field] = this.parseExpression();
                          isSlice = this.skip(lexer.TOKEN_COLON) || isSlice;
                        }
                      }
                      if (!isSlice) {
                        throw rethrow();
                      }
                      return new nodes.Array(tok.lineno, tok.colno, [node]);
                    }
                  };
                }
                function sliceLookup(obj, start, stop, step) {
                  obj = obj || [];
                  if (start === null) {
                    start = step < 0 ? obj.length - 1 : 0;
                  }
                  if (stop === null) {
                    stop = step < 0 ? -1 : obj.length;
                  } else if (stop < 0) {
                    stop += obj.length;
                  }
                  if (start < 0) {
                    start += obj.length;
                  }
                  var results = [];
                  for (var i = start; ; i += step) {
                    if (i < 0 || i > obj.length) {
                      break;
                    }
                    if (step > 0 && i >= stop) {
                      break;
                    }
                    if (step < 0 && i <= stop) {
                      break;
                    }
                    results.push(runtime.memberLookup(obj, i));
                  }
                  return results;
                }
                function hasOwnProp(obj, key) {
                  return Object.prototype.hasOwnProperty.call(obj, key);
                }
                var ARRAY_MEMBERS = {
                  pop: function pop(index) {
                    if (index === void 0) {
                      return this.pop();
                    }
                    if (index >= this.length || index < 0) {
                      throw new Error("KeyError");
                    }
                    return this.splice(index, 1);
                  },
                  append: function append(element) {
                    return this.push(element);
                  },
                  remove: function remove(element) {
                    for (var i = 0; i < this.length; i++) {
                      if (this[i] === element) {
                        return this.splice(i, 1);
                      }
                    }
                    throw new Error("ValueError");
                  },
                  count: function count(element) {
                    var count2 = 0;
                    for (var i = 0; i < this.length; i++) {
                      if (this[i] === element) {
                        count2++;
                      }
                    }
                    return count2;
                  },
                  index: function index(element) {
                    var i;
                    if ((i = this.indexOf(element)) === -1) {
                      throw new Error("ValueError");
                    }
                    return i;
                  },
                  find: function find(element) {
                    return this.indexOf(element);
                  },
                  insert: function insert(index, elem) {
                    return this.splice(index, 0, elem);
                  }
                };
                var OBJECT_MEMBERS = {
                  items: function items() {
                    return lib._entries(this);
                  },
                  values: function values() {
                    return lib._values(this);
                  },
                  keys: function keys() {
                    return lib.keys(this);
                  },
                  get: function get(key, def) {
                    var output = this[key];
                    if (output === void 0) {
                      output = def;
                    }
                    return output;
                  },
                  has_key: function has_key(key) {
                    return hasOwnProp(this, key);
                  },
                  pop: function pop(key, def) {
                    var output = this[key];
                    if (output === void 0 && def !== void 0) {
                      output = def;
                    } else if (output === void 0) {
                      throw new Error("KeyError");
                    } else {
                      delete this[key];
                    }
                    return output;
                  },
                  popitem: function popitem() {
                    var keys = lib.keys(this);
                    if (!keys.length) {
                      throw new Error("KeyError");
                    }
                    var k = keys[0];
                    var val = this[k];
                    delete this[k];
                    return [k, val];
                  },
                  setdefault: function setdefault(key, def) {
                    if (def === void 0) {
                      def = null;
                    }
                    if (!(key in this)) {
                      this[key] = def;
                    }
                    return this[key];
                  },
                  update: function update(kwargs) {
                    lib._assign(this, kwargs);
                    return null;
                  }
                };
                OBJECT_MEMBERS.iteritems = OBJECT_MEMBERS.items;
                OBJECT_MEMBERS.itervalues = OBJECT_MEMBERS.values;
                OBJECT_MEMBERS.iterkeys = OBJECT_MEMBERS.keys;
                runtime.memberLookup = function memberLookup(obj, val, autoescape) {
                  if (arguments.length === 4) {
                    return sliceLookup.apply(this, arguments);
                  }
                  obj = obj || {};
                  if (lib.isArray(obj) && hasOwnProp(ARRAY_MEMBERS, val)) {
                    return ARRAY_MEMBERS[val].bind(obj);
                  }
                  if (lib.isObject(obj) && hasOwnProp(OBJECT_MEMBERS, val)) {
                    return OBJECT_MEMBERS[val].bind(obj);
                  }
                  return orig_memberLookup.apply(this, arguments);
                };
                return uninstall;
              }
              module2.exports = installCompat;
            })
            /******/
          ])
        );
      });
    }
  });

  // node_modules/dayjs/dayjs.min.js
  var require_dayjs_min = __commonJS({
    "node_modules/dayjs/dayjs.min.js"(exports, module) {
      !(function(t, e) {
        "object" == typeof exports && "undefined" != typeof module ? module.exports = e() : "function" == typeof define && define.amd ? define(e) : (t = "undefined" != typeof globalThis ? globalThis : t || self).dayjs = e();
      })(exports, (function() {
        "use strict";
        var t = 1e3, e = 6e4, n = 36e5, r = "millisecond", i = "second", s = "minute", u = "hour", a = "day", o = "week", c = "month", f = "quarter", h = "year", d = "date", l = "Invalid Date", $ = /^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/, y = /\[([^\]]+)]|YYYY|YY|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g, M = { name: "en", weekdays: "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"), months: "January_February_March_April_May_June_July_August_September_October_November_December".split("_"), ordinal: function(t2) {
          var e2 = ["th", "st", "nd", "rd"], n2 = t2 % 100;
          return "[" + t2 + (e2[(n2 - 20) % 10] || e2[n2] || e2[0]) + "]";
        } }, m = function(t2, e2, n2) {
          var r2 = String(t2);
          return !r2 || r2.length >= e2 ? t2 : "" + Array(e2 + 1 - r2.length).join(n2) + t2;
        }, v = { s: m, z: function(t2) {
          var e2 = -t2.utcOffset(), n2 = Math.abs(e2), r2 = Math.floor(n2 / 60), i2 = n2 % 60;
          return (e2 <= 0 ? "+" : "-") + m(r2, 2, "0") + ":" + m(i2, 2, "0");
        }, m: function t2(e2, n2) {
          if (e2.date() < n2.date()) return -t2(n2, e2);
          var r2 = 12 * (n2.year() - e2.year()) + (n2.month() - e2.month()), i2 = e2.clone().add(r2, c), s2 = n2 - i2 < 0, u2 = e2.clone().add(r2 + (s2 ? -1 : 1), c);
          return +(-(r2 + (n2 - i2) / (s2 ? i2 - u2 : u2 - i2)) || 0);
        }, a: function(t2) {
          return t2 < 0 ? Math.ceil(t2) || 0 : Math.floor(t2);
        }, p: function(t2) {
          return { M: c, y: h, w: o, d: a, D: d, h: u, m: s, s: i, ms: r, Q: f }[t2] || String(t2 || "").toLowerCase().replace(/s$/, "");
        }, u: function(t2) {
          return void 0 === t2;
        } }, g = "en", D = {};
        D[g] = M;
        var p = "$isDayjsObject", S = function(t2) {
          return t2 instanceof _ || !(!t2 || !t2[p]);
        }, w = function t2(e2, n2, r2) {
          var i2;
          if (!e2) return g;
          if ("string" == typeof e2) {
            var s2 = e2.toLowerCase();
            D[s2] && (i2 = s2), n2 && (D[s2] = n2, i2 = s2);
            var u2 = e2.split("-");
            if (!i2 && u2.length > 1) return t2(u2[0]);
          } else {
            var a2 = e2.name;
            D[a2] = e2, i2 = a2;
          }
          return !r2 && i2 && (g = i2), i2 || !r2 && g;
        }, O = function(t2, e2) {
          if (S(t2)) return t2.clone();
          var n2 = "object" == typeof e2 ? e2 : {};
          return n2.date = t2, n2.args = arguments, new _(n2);
        }, b = v;
        b.l = w, b.i = S, b.w = function(t2, e2) {
          return O(t2, { locale: e2.$L, utc: e2.$u, x: e2.$x, $offset: e2.$offset });
        };
        var _ = (function() {
          function M2(t2) {
            this.$L = w(t2.locale, null, true), this.parse(t2), this.$x = this.$x || t2.x || {}, this[p] = true;
          }
          var m2 = M2.prototype;
          return m2.parse = function(t2) {
            this.$d = (function(t3) {
              var e2 = t3.date, n2 = t3.utc;
              if (null === e2) return /* @__PURE__ */ new Date(NaN);
              if (b.u(e2)) return /* @__PURE__ */ new Date();
              if (e2 instanceof Date) return new Date(e2);
              if ("string" == typeof e2 && !/Z$/i.test(e2)) {
                var r2 = e2.match($);
                if (r2) {
                  var i2 = r2[2] - 1 || 0, s2 = (r2[7] || "0").substring(0, 3);
                  return n2 ? new Date(Date.UTC(r2[1], i2, r2[3] || 1, r2[4] || 0, r2[5] || 0, r2[6] || 0, s2)) : new Date(r2[1], i2, r2[3] || 1, r2[4] || 0, r2[5] || 0, r2[6] || 0, s2);
                }
              }
              return new Date(e2);
            })(t2), this.init();
          }, m2.init = function() {
            var t2 = this.$d;
            this.$y = t2.getFullYear(), this.$M = t2.getMonth(), this.$D = t2.getDate(), this.$W = t2.getDay(), this.$H = t2.getHours(), this.$m = t2.getMinutes(), this.$s = t2.getSeconds(), this.$ms = t2.getMilliseconds();
          }, m2.$utils = function() {
            return b;
          }, m2.isValid = function() {
            return !(this.$d.toString() === l);
          }, m2.isSame = function(t2, e2) {
            var n2 = O(t2);
            return this.startOf(e2) <= n2 && n2 <= this.endOf(e2);
          }, m2.isAfter = function(t2, e2) {
            return O(t2) < this.startOf(e2);
          }, m2.isBefore = function(t2, e2) {
            return this.endOf(e2) < O(t2);
          }, m2.$g = function(t2, e2, n2) {
            return b.u(t2) ? this[e2] : this.set(n2, t2);
          }, m2.unix = function() {
            return Math.floor(this.valueOf() / 1e3);
          }, m2.valueOf = function() {
            return this.$d.getTime();
          }, m2.startOf = function(t2, e2) {
            var n2 = this, r2 = !!b.u(e2) || e2, f2 = b.p(t2), l2 = function(t3, e3) {
              var i2 = b.w(n2.$u ? Date.UTC(n2.$y, e3, t3) : new Date(n2.$y, e3, t3), n2);
              return r2 ? i2 : i2.endOf(a);
            }, $2 = function(t3, e3) {
              return b.w(n2.toDate()[t3].apply(n2.toDate("s"), (r2 ? [0, 0, 0, 0] : [23, 59, 59, 999]).slice(e3)), n2);
            }, y2 = this.$W, M3 = this.$M, m3 = this.$D, v2 = "set" + (this.$u ? "UTC" : "");
            switch (f2) {
              case h:
                return r2 ? l2(1, 0) : l2(31, 11);
              case c:
                return r2 ? l2(1, M3) : l2(0, M3 + 1);
              case o:
                var g2 = this.$locale().weekStart || 0, D2 = (y2 < g2 ? y2 + 7 : y2) - g2;
                return l2(r2 ? m3 - D2 : m3 + (6 - D2), M3);
              case a:
              case d:
                return $2(v2 + "Hours", 0);
              case u:
                return $2(v2 + "Minutes", 1);
              case s:
                return $2(v2 + "Seconds", 2);
              case i:
                return $2(v2 + "Milliseconds", 3);
              default:
                return this.clone();
            }
          }, m2.endOf = function(t2) {
            return this.startOf(t2, false);
          }, m2.$set = function(t2, e2) {
            var n2, o2 = b.p(t2), f2 = "set" + (this.$u ? "UTC" : ""), l2 = (n2 = {}, n2[a] = f2 + "Date", n2[d] = f2 + "Date", n2[c] = f2 + "Month", n2[h] = f2 + "FullYear", n2[u] = f2 + "Hours", n2[s] = f2 + "Minutes", n2[i] = f2 + "Seconds", n2[r] = f2 + "Milliseconds", n2)[o2], $2 = o2 === a ? this.$D + (e2 - this.$W) : e2;
            if (o2 === c || o2 === h) {
              var y2 = this.clone().set(d, 1);
              y2.$d[l2]($2), y2.init(), this.$d = y2.set(d, Math.min(this.$D, y2.daysInMonth())).$d;
            } else l2 && this.$d[l2]($2);
            return this.init(), this;
          }, m2.set = function(t2, e2) {
            return this.clone().$set(t2, e2);
          }, m2.get = function(t2) {
            return this[b.p(t2)]();
          }, m2.add = function(r2, f2) {
            var d2, l2 = this;
            r2 = Number(r2);
            var $2 = b.p(f2), y2 = function(t2) {
              var e2 = O(l2);
              return b.w(e2.date(e2.date() + Math.round(t2 * r2)), l2);
            };
            if ($2 === c) return this.set(c, this.$M + r2);
            if ($2 === h) return this.set(h, this.$y + r2);
            if ($2 === a) return y2(1);
            if ($2 === o) return y2(7);
            var M3 = (d2 = {}, d2[s] = e, d2[u] = n, d2[i] = t, d2)[$2] || 1, m3 = this.$d.getTime() + r2 * M3;
            return b.w(m3, this);
          }, m2.subtract = function(t2, e2) {
            return this.add(-1 * t2, e2);
          }, m2.format = function(t2) {
            var e2 = this, n2 = this.$locale();
            if (!this.isValid()) return n2.invalidDate || l;
            var r2 = t2 || "YYYY-MM-DDTHH:mm:ssZ", i2 = b.z(this), s2 = this.$H, u2 = this.$m, a2 = this.$M, o2 = n2.weekdays, c2 = n2.months, f2 = n2.meridiem, h2 = function(t3, n3, i3, s3) {
              return t3 && (t3[n3] || t3(e2, r2)) || i3[n3].slice(0, s3);
            }, d2 = function(t3) {
              return b.s(s2 % 12 || 12, t3, "0");
            }, $2 = f2 || function(t3, e3, n3) {
              var r3 = t3 < 12 ? "AM" : "PM";
              return n3 ? r3.toLowerCase() : r3;
            };
            return r2.replace(y, (function(t3, r3) {
              return r3 || (function(t4) {
                switch (t4) {
                  case "YY":
                    return String(e2.$y).slice(-2);
                  case "YYYY":
                    return b.s(e2.$y, 4, "0");
                  case "M":
                    return a2 + 1;
                  case "MM":
                    return b.s(a2 + 1, 2, "0");
                  case "MMM":
                    return h2(n2.monthsShort, a2, c2, 3);
                  case "MMMM":
                    return h2(c2, a2);
                  case "D":
                    return e2.$D;
                  case "DD":
                    return b.s(e2.$D, 2, "0");
                  case "d":
                    return String(e2.$W);
                  case "dd":
                    return h2(n2.weekdaysMin, e2.$W, o2, 2);
                  case "ddd":
                    return h2(n2.weekdaysShort, e2.$W, o2, 3);
                  case "dddd":
                    return o2[e2.$W];
                  case "H":
                    return String(s2);
                  case "HH":
                    return b.s(s2, 2, "0");
                  case "h":
                    return d2(1);
                  case "hh":
                    return d2(2);
                  case "a":
                    return $2(s2, u2, true);
                  case "A":
                    return $2(s2, u2, false);
                  case "m":
                    return String(u2);
                  case "mm":
                    return b.s(u2, 2, "0");
                  case "s":
                    return String(e2.$s);
                  case "ss":
                    return b.s(e2.$s, 2, "0");
                  case "SSS":
                    return b.s(e2.$ms, 3, "0");
                  case "Z":
                    return i2;
                }
                return null;
              })(t3) || i2.replace(":", "");
            }));
          }, m2.utcOffset = function() {
            return 15 * -Math.round(this.$d.getTimezoneOffset() / 15);
          }, m2.diff = function(r2, d2, l2) {
            var $2, y2 = this, M3 = b.p(d2), m3 = O(r2), v2 = (m3.utcOffset() - this.utcOffset()) * e, g2 = this - m3, D2 = function() {
              return b.m(y2, m3);
            };
            switch (M3) {
              case h:
                $2 = D2() / 12;
                break;
              case c:
                $2 = D2();
                break;
              case f:
                $2 = D2() / 3;
                break;
              case o:
                $2 = (g2 - v2) / 6048e5;
                break;
              case a:
                $2 = (g2 - v2) / 864e5;
                break;
              case u:
                $2 = g2 / n;
                break;
              case s:
                $2 = g2 / e;
                break;
              case i:
                $2 = g2 / t;
                break;
              default:
                $2 = g2;
            }
            return l2 ? $2 : b.a($2);
          }, m2.daysInMonth = function() {
            return this.endOf(c).$D;
          }, m2.$locale = function() {
            return D[this.$L];
          }, m2.locale = function(t2, e2) {
            if (!t2) return this.$L;
            var n2 = this.clone(), r2 = w(t2, e2, true);
            return r2 && (n2.$L = r2), n2;
          }, m2.clone = function() {
            return b.w(this.$d, this);
          }, m2.toDate = function() {
            return new Date(this.valueOf());
          }, m2.toJSON = function() {
            return this.isValid() ? this.toISOString() : null;
          }, m2.toISOString = function() {
            return this.$d.toISOString();
          }, m2.toString = function() {
            return this.$d.toUTCString();
          }, M2;
        })(), Y = _.prototype;
        return O.prototype = Y, [["$ms", r], ["$s", i], ["$m", s], ["$H", u], ["$W", a], ["$M", c], ["$y", h], ["$D", d]].forEach((function(t2) {
          Y[t2[1]] = function(e2) {
            return this.$g(e2, t2[0], t2[1]);
          };
        })), O.extend = function(t2, e2) {
          return t2.$i || (t2(e2, _, O), t2.$i = true), O;
        }, O.locale = w, O.isDayjs = S, O.unix = function(t2) {
          return O(1e3 * t2);
        }, O.en = D[g], O.Ls = D, O.p = {}, O;
      }));
    }
  });

  // core/core.js
  var core_exports = {};
  __export(core_exports, {
    COLOR_NAMES: () => COLOR_NAMES,
    DEFAULT_FORMATS: () => DEFAULT_FORMATS,
    buildItemData: () => buildItemData,
    makeBlock: () => makeBlock,
    mapZoteroAnnotation: () => mapZoteroAnnotation,
    mergeNote: () => mergeNote,
    migrateLegacyAnnotations: () => migrateLegacyAnnotations,
    parseBlocks: () => parseBlocks,
    parseTemplateFile: () => parseTemplateFile,
    render: () => render,
    renderAnnotationsSection: () => renderAnnotationsSection,
    syncBlocks: () => syncBlocks,
    templateKind: () => templateKind,
    templateUserOwnedKeys: () => templateUserOwnedKeys,
    updateNoteAnnotations: () => updateNoteAnnotations
  });

  // src/render.js
  var import_nunjucks = __toESM(require_nunjucks(), 1);
  var import_dayjs = __toESM(require_dayjs_min(), 1);
  function PersistExtension() {
    this.tags = ["persist"];
    this.parse = function(parser, nodes) {
      const tok = parser.nextToken();
      const args = parser.parseSignature(null, true);
      parser.advanceAfterBlockEnd(tok.value);
      const body = parser.parseUntilBlocks("endpersist");
      parser.advanceAfterBlockEnd();
      return new nodes.CallExtension(this, "run", args, [body]);
    };
    this.run = function(_context, _key, body) {
      return new import_nunjucks.default.runtime.SafeString(body());
    };
  }
  function makeEnv() {
    const env = new import_nunjucks.default.Environment(null, {
      autoescape: false,
      // markdown, not HTML
      trimBlocks: false,
      lstripBlocks: false
    });
    env.addExtension("PersistExtension", new PersistExtension());
    env.addFilter("format", (value, fmt) => {
      if (value === void 0 || value === null || value === "") return "";
      const d = (0, import_dayjs.default)(value);
      return d.isValid() ? d.format(fmt) : String(value);
    });
    env.addFilter("filterby", (arr, prop, op, value) => {
      if (!Array.isArray(arr)) return [];
      if (value === void 0 || value === null || value === "") return arr;
      return arr.filter((x) => {
        const left = x?.[prop];
        switch (op) {
          case "dateafter":
            return new Date(left) > new Date(value);
          case "datebefore":
            return new Date(left) < new Date(value);
          case "equals":
            return left === value;
          default:
            return true;
        }
      });
    });
    return env;
  }
  function render(templateString, data) {
    const env = makeEnv();
    return env.renderString(templateString, data);
  }

  // src/item-data.js
  function journalFor(item, f) {
    switch (item.itemType) {
      case "journalArticle":
        return f("publicationTitle") || f("journalAbbreviation");
      case "book":
        return f("publisher");
      case "bookSection":
        return f("publicationTitle");
      case "thesis":
        return f("university");
      case "conferencePaper":
        return f("conferenceName") || f("proceedingsTitle");
      default:
        return f("publicationTitle");
    }
  }
  function zoteroSelectURI(item) {
    const isGroup = item.library && item.library.libraryType === "group";
    return isGroup ? `zotero://select/groups/${item.libraryID}/items/${item.key}` : `zotero://select/library/items/${item.key}`;
  }
  function authors(item) {
    const creators = item.getCreators ? item.getCreators() : [];
    return creators.filter((c) => c.creatorType === void 0 || c.creatorType === "author" || c.creatorTypeID === void 0 ? true : c.creatorType === "author").map((c) => ({
      firstName: c.firstName || "",
      lastName: c.lastName || c.name || ""
    })).filter((c) => c.firstName || c.lastName);
  }
  function tagString(item, opts) {
    if (opts.allTags != null) return opts.allTags;
    const tags = item.getTags ? item.getTags() : [];
    return tags.map((t) => typeof t === "string" ? t : t.tag).filter(Boolean).join(", ");
  }
  function buildItemData(item, opts = {}) {
    const f = (k) => {
      try {
        return item.getField && item.getField(k) || "";
      } catch (e) {
        return "";
      }
    };
    return {
      citekey: opts.citekey || "",
      title: f("title"),
      date: f("date"),
      itemType: item.itemType || "",
      publicationTitle: journalFor(item, f) || "",
      desktopURI: zoteroSelectURI(item),
      bibliography: opts.bibliography || "",
      abstractNote: f("abstractNote"),
      allTags: tagString(item, opts),
      markdownNotes: opts.markdownNotes || "",
      creators: authors(item),
      // Their template's annotation block; empty on first creation (annotations
      // are brought in by the sync path). lastImportDate null => render all.
      annotations: opts.annotations || [],
      lastImportDate: opts.lastImportDate ?? null,
      importDate: opts.importDate || ""
    };
  }

  // src/colors.js
  var MAP = {
    "#ffd400": "yellow",
    "#ff6666": "red",
    "#5fb236": "green",
    "#2ea8e5": "blue",
    "#a28ae5": "purple",
    "#e56eee": "magenta",
    "#f19837": "orange",
    "#aaaaaa": "grey",
    "#000000": "black"
  };
  var COLOR_NAMES = Object.values(MAP);
  function hexToColorName(hex) {
    if (!hex) return "";
    const h = String(hex).toLowerCase();
    return MAP[h] || h;
  }

  // src/annotations.js
  var ATTACH_FOLDER_DEFAULT = "References/Attachments";
  function esc(s) {
    return String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  }
  function pdfLink(a) {
    const page = a.pageIndex === void 0 || a.pageIndex === null ? "" : a.pageIndex;
    return `zotero://open-pdf/library/items/${a.attachmentKey}?page=${page}`;
  }
  function anchor(a) {
    return `%% ann:${a.key} %%`;
  }
  function commentSuffix(a) {
    const c = esc(a.comment);
    return c ? ` \u2014 *${c}*` : "";
  }
  function renderAnnotationLine(a, opts = {}) {
    const citekey = opts.citekey || "";
    const attachFolder = opts.attachmentFolder || ATTACH_FOLDER_DEFAULT;
    const page = `p.${esc(a.pageLabel)}`;
    const link = pdfLink(a);
    if (a.type === "highlight" || a.type === "underline") {
      const text = esc(a.annotatedText);
      if (!text) return null;
      return `- [${page}](${link}) "${text}"${commentSuffix(a)} ${anchor(a)}`;
    }
    if (a.type === "image" || a.type === "ink") {
      const embed = `![[${attachFolder}/${citekey}/${esc(a.imageBaseName)}]]`;
      return `- [${page}](${link}) ${embed}${commentSuffix(a)} ${anchor(a)}`;
    }
    if (a.type === "text" || a.type === "note") {
      const c = esc(a.comment);
      if (!c) return null;
      return `- [${page}](${link}) *Note:* ${c} ${anchor(a)}`;
    }
    return null;
  }
  function renderAnnotationsSection(annotations, opts = {}) {
    const sorted = [...annotations || []].sort((x, y) => {
      const sx = String(x.sortIndex ?? ""), sy = String(y.sortIndex ?? "");
      if (sx !== sy) return sx < sy ? -1 : 1;
      return String(x.key).localeCompare(String(y.key));
    });
    const lines = sorted.map((a) => renderAnnotationLine(a, opts)).filter(Boolean);
    return lines.join("\n\n");
  }
  function mapZoteroAnnotation(a, attachmentKey) {
    let pageIndex = 0;
    try {
      const pos = typeof a.annotationPosition === "string" ? JSON.parse(a.annotationPosition) : a.annotationPosition || {};
      if (pos && pos.pageIndex != null) pageIndex = pos.pageIndex;
    } catch (e) {
    }
    return {
      key: a.key,
      type: a.annotationType,
      annotatedText: a.annotationText || "",
      comment: a.annotationComment || "",
      pageLabel: a.annotationPageLabel || "",
      pageIndex,
      attachmentKey,
      color: a.annotationColor || "",
      colourName: hexToColorName(a.annotationColor),
      imageBaseName: a.imageBaseName || "",
      sortIndex: a.annotationSortIndex || ""
    };
  }

  // src/merge.js
  var ANN_ANCHOR = /%%\s*ann:([A-Za-z0-9]+)\s*%%/;
  var DEFAULTS = {
    // Frontmatter keys the user owns; never overwritten from the render if the
    // existing note already has a value for them.
    userOwnedKeys: ["KeyIdea", "Topics"],
    // Section headings (case-insensitive) whose body is preserved verbatim.
    proseSections: ["notes"],
    // Section headings merged by annotation anchor.
    annotationSections: ["annotations"]
  };
  function parseNote(md) {
    let frontmatter = null;
    let rest = md;
    const fm = md.match(/^---\n([\s\S]*?)\n---\n?/);
    if (fm) {
      frontmatter = fm[1];
      rest = md.slice(fm[0].length);
    }
    const lines = rest.split("\n");
    const sections = [];
    let preambleLines = [];
    let current = null;
    for (const line of lines) {
      const h = line.match(/^(#{1,6})\s/);
      if (h) {
        if (current) sections.push(current);
        else preambleLines = preambleLines;
        current = { heading: line, level: h[1].length, bodyLines: [] };
      } else if (current) {
        current.bodyLines.push(line);
      } else {
        preambleLines.push(line);
      }
    }
    if (current) sections.push(current);
    return {
      frontmatter,
      preamble: preambleLines.join("\n"),
      sections: sections.map((s) => ({
        heading: s.heading,
        level: s.level,
        body: s.bodyLines.join("\n")
      }))
    };
  }
  function sectionName(heading) {
    return heading.replace(/^#{1,6}\s+/, "").trim().toLowerCase();
  }
  function parseFrontmatter(fm) {
    if (!fm) return [];
    const lines = fm.split("\n");
    const entries = [];
    let current = null;
    for (const line of lines) {
      const m = line.match(/^([A-Za-z0-9_-]+):/);
      if (m && !/^\s/.test(line)) {
        if (current) entries.push(current);
        current = { key: m[1], lines: [line] };
      } else if (current) {
        current.lines.push(line);
      }
    }
    if (current) entries.push(current);
    return entries;
  }
  function mergeFrontmatter(existingFM, freshFM, userOwnedKeys) {
    const existing = parseFrontmatter(existingFM);
    const fresh = parseFrontmatter(freshFM);
    const existingByKey = new Map(existing.map((e) => [e.key, e]));
    const freshKeys = new Set(fresh.map((e) => e.key));
    const owned = new Set(userOwnedKeys);
    const out = [];
    for (const e of fresh) {
      if (owned.has(e.key) && existingByKey.has(e.key)) {
        out.push(existingByKey.get(e.key));
      } else {
        out.push(e);
      }
    }
    for (const e of existing) {
      if (!freshKeys.has(e.key)) out.push(e);
    }
    return out.map((e) => e.lines.join("\n")).join("\n");
  }
  function parseAnnotationBlocks(body) {
    const lines = body.split("\n");
    const blocks = [];
    let buf = [];
    let lead = [];
    let seenAnchor = false;
    for (const line of lines) {
      buf.push(line);
      const m = line.match(ANN_ANCHOR);
      if (m) {
        seenAnchor = true;
        while (buf.length && buf[0].trim() === "") buf.shift();
        blocks.push({ key: m[1], text: buf.join("\n").replace(/\s+$/, "") });
        buf = [];
      }
    }
    if (!seenAnchor) lead = lines;
    else if (buf.join("").trim() !== "") {
    }
    return { lead: seenAnchor ? [] : lead, blocks };
  }
  function mergeAnnotationSection(existingBody, freshBody) {
    const existing = parseAnnotationBlocks(existingBody);
    const fresh = parseAnnotationBlocks(freshBody);
    const existingByKey = new Map(existing.blocks.map((b) => [b.key, b]));
    const merged = fresh.blocks.map(
      (fb) => existingByKey.has(fb.key) ? existingByKey.get(fb.key) : fb
    );
    const parts = [];
    const lead = fresh.lead.join("\n").trim();
    if (lead) parts.push(lead);
    parts.push(...merged.map((b) => b.text));
    return parts.join("\n\n");
  }
  function mergeNote(existingMd, freshMd, opts = {}) {
    const o = { ...DEFAULTS, ...opts };
    if (existingMd == null || existingMd.trim() === "") existingMd = freshMd;
    const existing = parseNote(existingMd);
    const fresh = parseNote(freshMd);
    const frontmatter = mergeFrontmatter(
      existing.frontmatter,
      fresh.frontmatter,
      o.userOwnedKeys
    );
    const existingByName = new Map(
      existing.sections.map((s) => [sectionName(s.heading), s])
    );
    const freshNames = new Set(fresh.sections.map((s) => sectionName(s.heading)));
    const outSections = [];
    for (const fs of fresh.sections) {
      const name = sectionName(fs.heading);
      const es = existingByName.get(name);
      if (o.proseSections.includes(name) && es && es.body.trim() !== "") {
        outSections.push({ heading: fs.heading, body: es.body });
      } else if (o.annotationSections.includes(name)) {
        outSections.push({
          heading: fs.heading,
          body: mergeAnnotationSection(es ? es.body : "", fs.body)
        });
      } else {
        outSections.push({ heading: fs.heading, body: fs.body });
      }
    }
    for (const es of existing.sections) {
      if (!freshNames.has(sectionName(es.heading))) {
        outSections.push({ heading: es.heading, body: es.body });
      }
    }
    return assembleNote(frontmatter, fresh.preamble, outSections);
  }
  function assembleNote(frontmatter, preamble, sections) {
    const parts = [];
    if (frontmatter != null) parts.push(`---
${frontmatter}
---`);
    const pre = (preamble || "").trim();
    if (pre) parts.push(pre);
    for (const s of sections) {
      const body = (s.body || "").replace(/^\n+/, "").replace(/\s+$/, "");
      parts.push(body ? `${s.heading}
${body}` : s.heading);
    }
    return parts.join("\n\n") + "\n";
  }
  function updateNoteAnnotations(existingMd, annotations, opts = {}) {
    const o = { ...DEFAULTS, ...opts };
    const freshBody = renderAnnotationsSection(annotations, opts);
    const parsed = parseNote(existingMd);
    let found = false;
    const sections = parsed.sections.map((s) => {
      if (o.annotationSections.includes(sectionName(s.heading))) {
        found = true;
        return { heading: s.heading, body: mergeAnnotationSection(s.body, freshBody) };
      }
      return s;
    });
    if (!found) sections.push({ heading: "## Annotations", body: freshBody });
    return assembleNote(parsed.frontmatter, parsed.preamble, sections);
  }

  // src/formats.js
  var DEFAULT_FORMATS = {
    list: {
      item: `- [p.{{page}}]({{link}}) "{{text}}"{% if comment %} \u2014 *{{comment}}*{% endif %}`,
      sep: "\n"
    },
    quote: {
      item: `> {{text}}
> \u2014 [p.{{page}}]({{link}}){% if comment %}
>
> {{comment}}{% endif %}`,
      sep: "\n\n"
    },
    callout: {
      item: `> [!quote] p.{{page}}
> {{text}}{% if comment %}
>
> {{comment}}{% endif %}`,
      sep: "\n\n"
    },
    compact: {
      item: `- "{{text}}" (p.{{page}}){% if comment %} \u2014 {{comment}}{% endif %}`,
      sep: "\n"
    }
  };
  var DEFAULT_FORMAT_NAME = "list";

  // src/blocks.js
  var OPEN_RE = /^\s*%%\s*zon\s+([^%]*?)\s*%%\s*$/;
  var CLOSE_RE = /^\s*%%\s*\/zon\s*%%\s*$/;
  function parseConfig(str) {
    const cfg = {};
    for (const tok of String(str).trim().split(/\s+/)) {
      if (!tok) continue;
      const i = tok.indexOf("=");
      if (i > 0) cfg[tok.slice(0, i)] = tok.slice(i + 1);
      else cfg[tok] = true;
    }
    return cfg;
  }
  function configToString(cfg) {
    return Object.entries(cfg).map(([k, v]) => v === true ? k : `${k}=${v}`).join(" ");
  }
  function parseBlocks(md) {
    const lines = String(md).split("\n");
    const segs = [];
    let buf = [];
    const flush = () => {
      if (buf.length) {
        segs.push({ type: "text", text: buf.join("\n") });
        buf = [];
      }
    };
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(OPEN_RE);
      if (!m) {
        buf.push(lines[i]);
        continue;
      }
      flush();
      const openRaw = lines[i];
      const config = parseConfig(m[1]);
      const body = [];
      let closeRaw = "%% /zon %%";
      i++;
      for (; i < lines.length; i++) {
        if (CLOSE_RE.test(lines[i])) {
          closeRaw = lines[i];
          break;
        }
        body.push(lines[i]);
      }
      segs.push({ type: "block", config, openRaw, closeRaw, body: body.join("\n") });
    }
    flush();
    return segs;
  }
  function annotationContext(a, opts) {
    const pageIndex = a.pageIndex ?? 0;
    return {
      text: a.annotatedText || "",
      comment: a.comment || "",
      page: a.pageLabel || "",
      pageLabel: a.pageLabel || "",
      pageIndex,
      key: a.key,
      colour: a.colourName || "",
      color: a.colourName || "",
      type: a.type || "",
      link: `zotero://open-pdf/library/items/${a.attachmentKey}?page=${pageIndex}`,
      citekey: opts.citekey || "",
      imageBaseName: a.imageBaseName || ""
    };
  }
  function matchesFilter(a, cfg) {
    const wantColour = cfg.colour || cfg.color;
    if (wantColour && wantColour !== "all" && (a.colourName || "") !== wantColour) return false;
    if (cfg.type && cfg.type !== "all" && a.type !== cfg.type) return false;
    return true;
  }
  function renderBlockBody(config, annotations, opts = {}) {
    const formats = opts.formats || DEFAULT_FORMATS;
    const fmt = formats[config.format] || formats[DEFAULT_FORMAT_NAME];
    const env = opts.env || makeEnv();
    const anns = (annotations || []).filter((a) => matchesFilter(a, config)).sort((x, y) => {
      const sx = String(x.sortIndex ?? ""), sy = String(y.sortIndex ?? "");
      if (sx !== sy) return sx < sy ? -1 : 1;
      return String(x.key).localeCompare(String(y.key));
    });
    const items = anns.map((a) => env.renderString(fmt.item, annotationContext(a, opts)).replace(/\s+$/, ""));
    return items.join(fmt.sep || "\n");
  }
  function syncBlocks(md, annotations, opts = {}) {
    const env = opts.env || makeEnv();
    const segs = parseBlocks(md);
    const out = segs.map((s) => {
      if (s.type === "text") return s.text;
      const body = s.config.sync === "off" ? s.body : renderBlockBody(s.config, annotations, { ...opts, env });
      return `${s.openRaw}
${body}
${s.closeRaw}`;
    });
    return out.join("\n");
  }
  function makeBlock(config, annotations = [], opts = {}) {
    const body = renderBlockBody(config, annotations, opts);
    return `%% zon ${configToString(config)} %%
${body}
%% /zon %%`;
  }
  var LEGACY_RE = /%%\s*begin annotations\s*%%[\s\S]*?%%\s*end annotations\s*%%/i;
  var IMPORT_DATE_RE = /[ \t]*%%\s*Import Date:[^%]*%%[ \t]*\n?/i;
  function migrateLegacyAnnotations(md, opts = {}) {
    const cfg = opts.config || "kind=annotations colour=all sync=on format=list";
    const block = `%% zon ${cfg} %%
%% /zon %%`;
    let out = String(md);
    let changed = false;
    if (LEGACY_RE.test(out)) {
      out = out.replace(LEGACY_RE, block);
      changed = true;
    }
    if (IMPORT_DATE_RE.test(out)) {
      out = out.replace(IMPORT_DATE_RE, "");
      changed = true;
    }
    return { markdown: out, changed };
  }

  // src/templates.js
  var DIRECTIVE_RE = /^\s*%%!\s*([^%]*?)\s*%%\s*$/;
  function parseTemplateFile(text) {
    const raw = String(text).replace(/\s+$/, "");
    const lines = raw.split("\n");
    let defaults = {};
    let sepMode = null;
    if (lines.length && DIRECTIVE_RE.test(lines[0])) {
      const cfg = parseConfig(lines[0].match(DIRECTIVE_RE)[1]);
      if (cfg.sep) {
        sepMode = cfg.sep;
        delete cfg.sep;
      }
      if (cfg.color && !cfg.colour) {
        cfg.colour = cfg.color;
      }
      delete cfg.color;
      defaults = cfg;
      lines.shift();
    }
    const body = lines.join("\n").replace(/^\n+/, "").replace(/\s+$/, "");
    let sep;
    if (sepMode === "blank") sep = "\n\n";
    else if (sepMode === "newline") sep = "\n";
    else sep = body.includes("\n") ? "\n\n" : "\n";
    return { item: body, sep, defaults };
  }
  function templateKind(text) {
    const t = String(text || "");
    if (/^---\r?\n[\s\S]*?\r?\n---/.test(t)) return "document";
    if (/%%\s*zon\b/.test(t)) return "document";
    return "format";
  }
  function templateUserOwnedKeys(text) {
    const m = String(text || "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return [];
    const lines = m[1].split("\n");
    const keys = [];
    let cur = null;
    let hasExpr = false;
    const flush = () => {
      if (cur && !hasExpr) keys.push(cur);
    };
    const isExpr = (s) => /\{\{|\{%/.test(s);
    for (const line of lines) {
      const km = line.match(/^([A-Za-z0-9_-]+):/);
      if (km && !/^\s/.test(line)) {
        flush();
        cur = km[1];
        hasExpr = isExpr(line);
      } else if (cur && isExpr(line)) {
        hasExpr = true;
      }
    }
    flush();
    return keys;
  }
  return __toCommonJS(core_exports);
})();
