// Platform: test

// commit cd29cf0f224ccf25e9d422a33fd02ef67d3a78f4

// File generated at :: Wed May 22 2013 16:47:54 GMT+0200 (CEST)

/*
 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements.  See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership.  The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License.  You may obtain a copy of the License at
 
     http://www.apache.org/licenses/LICENSE-2.0
 
 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied.  See the License for the
 specific language governing permissions and limitations
 under the License.
*/

;(function() {

// file: lib/scripts/require.js

var require,
    define;

(function () {
    var modules = {};
    // Stack of moduleIds currently being built.
    var requireStack = [];
    // Map of module ID -> index into requireStack of modules currently being built.
    var inProgressModules = {};

    function build(module) {
        var factory = module.factory;
        module.exports = {};
        delete module.factory;
        factory(require, module.exports, module);
        return module.exports;
    }

    require = function (id) {
        if (!modules[id]) {
            throw "module " + id + " not found";
        } else if (id in inProgressModules) {
            var cycle = requireStack.slice(inProgressModules[id]).join('->') + '->' + id;
            throw "Cycle in require graph: " + cycle;
        }
        if (modules[id].factory) {
            try {
                inProgressModules[id] = requireStack.length;
                requireStack.push(id);
                return build(modules[id]);
            } finally {
                delete inProgressModules[id];
                requireStack.pop();
            }
        }
        return modules[id].exports;
    };

    define = function (id, factory) {
        if (modules[id]) {
            throw "module " + id + " already defined";
        }

        modules[id] = {
            id: id,
            factory: factory
        };
    };

    define.remove = function (id) {
        delete modules[id];
    };

    define.moduleMap = modules;
})();

//Export for use in node
if (typeof module === "object" && typeof require === "function") {
    module.exports.require = require;
    module.exports.define = define;
}

// file: lib/cordova.js
define("cordova", function(require, exports, module) {


var channel = require('cordova/channel');

/**
 * Listen for DOMContentLoaded and notify our channel subscribers.
 */
document.addEventListener('DOMContentLoaded', function() {
    channel.onDOMContentLoaded.fire();
}, false);
if (document.readyState == 'complete' || document.readyState == 'interactive') {
    channel.onDOMContentLoaded.fire();
}

/**
 * Intercept calls to addEventListener + removeEventListener and handle deviceready,
 * resume, and pause events.
 */
var m_document_addEventListener = document.addEventListener;
var m_document_removeEventListener = document.removeEventListener;
var m_window_addEventListener = window.addEventListener;
var m_window_removeEventListener = window.removeEventListener;

/**
 * Houses custom event handlers to intercept on document + window event listeners.
 */
var documentEventHandlers = {},
    windowEventHandlers = {};

document.addEventListener = function(evt, handler, capture) {
    var e = evt.toLowerCase();
    if (typeof documentEventHandlers[e] != 'undefined') {
        documentEventHandlers[e].subscribe(handler);
    } else {
        m_document_addEventListener.call(document, evt, handler, capture);
    }
};

window.addEventListener = function(evt, handler, capture) {
    var e = evt.toLowerCase();
    if (typeof windowEventHandlers[e] != 'undefined') {
        windowEventHandlers[e].subscribe(handler);
    } else {
        m_window_addEventListener.call(window, evt, handler, capture);
    }
};

document.removeEventListener = function(evt, handler, capture) {
    var e = evt.toLowerCase();
    // If unsubscribing from an event that is handled by a plugin
    if (typeof documentEventHandlers[e] != "undefined") {
        documentEventHandlers[e].unsubscribe(handler);
    } else {
        m_document_removeEventListener.call(document, evt, handler, capture);
    }
};

window.removeEventListener = function(evt, handler, capture) {
    var e = evt.toLowerCase();
    // If unsubscribing from an event that is handled by a plugin
    if (typeof windowEventHandlers[e] != "undefined") {
        windowEventHandlers[e].unsubscribe(handler);
    } else {
        m_window_removeEventListener.call(window, evt, handler, capture);
    }
};

function createEvent(type, data) {
    var event = document.createEvent('Events');
    event.initEvent(type, false, false);
    if (data) {
        for (var i in data) {
            if (data.hasOwnProperty(i)) {
                event[i] = data[i];
            }
        }
    }
    return event;
}

if(typeof window.console === "undefined") {
    window.console = {
        log:function(){}
    };
}

var cordova = {
    define:define,
    require:require,
    /**
     * Methods to add/remove your own addEventListener hijacking on document + window.
     */
    addWindowEventHandler:function(event) {
        return (windowEventHandlers[event] = channel.create(event));
    },
    addStickyDocumentEventHandler:function(event) {
        return (documentEventHandlers[event] = channel.createSticky(event));
    },
    addDocumentEventHandler:function(event) {
        return (documentEventHandlers[event] = channel.create(event));
    },
    removeWindowEventHandler:function(event) {
        delete windowEventHandlers[event];
    },
    removeDocumentEventHandler:function(event) {
        delete documentEventHandlers[event];
    },
    /**
     * Retrieve original event handlers that were replaced by Cordova
     *
     * @return object
     */
    getOriginalHandlers: function() {
        return {'document': {'addEventListener': m_document_addEventListener, 'removeEventListener': m_document_removeEventListener},
        'window': {'addEventListener': m_window_addEventListener, 'removeEventListener': m_window_removeEventListener}};
    },
    /**
     * Method to fire event from native code
     * bNoDetach is required for events which cause an exception which needs to be caught in native code
     */
    fireDocumentEvent: function(type, data, bNoDetach) {
        var evt = createEvent(type, data);
        if (typeof documentEventHandlers[type] != 'undefined') {
            if( bNoDetach ) {
              documentEventHandlers[type].fire(evt);
            }
            else {
              setTimeout(function() {
                  // Fire deviceready on listeners that were registered before cordova.js was loaded.
                  if (type == 'deviceready') {
                      document.dispatchEvent(evt);
                  }
                  documentEventHandlers[type].fire(evt);
              }, 0);
            }
        } else {
            document.dispatchEvent(evt);
        }
    },
    fireWindowEvent: function(type, data) {
        var evt = createEvent(type,data);
        if (typeof windowEventHandlers[type] != 'undefined') {
            setTimeout(function() {
                windowEventHandlers[type].fire(evt);
            }, 0);
        } else {
            window.dispatchEvent(evt);
        }
    },

    /**
     * Plugin callback mechanism.
     */
    // Randomize the starting callbackId to avoid collisions after refreshing or navigating.
    // This way, it's very unlikely that any new callback would get the same callbackId as an old callback.
    callbackId: Math.floor(Math.random() * 2000000000),
    callbacks:  {},
    callbackStatus: {
        NO_RESULT: 0,
        OK: 1,
        CLASS_NOT_FOUND_EXCEPTION: 2,
        ILLEGAL_ACCESS_EXCEPTION: 3,
        INSTANTIATION_EXCEPTION: 4,
        MALFORMED_URL_EXCEPTION: 5,
        IO_EXCEPTION: 6,
        INVALID_ACTION: 7,
        JSON_EXCEPTION: 8,
        ERROR: 9
    },

    /**
     * Called by native code when returning successful result from an action.
     */
    callbackSuccess: function(callbackId, args) {
        try {
            cordova.callbackFromNative(callbackId, true, args.status, [args.message], args.keepCallback);
        } catch (e) {
            console.log("Error in error callback: " + callbackId + " = "+e);
        }
    },

    /**
     * Called by native code when returning error result from an action.
     */
    callbackError: function(callbackId, args) {
        // TODO: Deprecate callbackSuccess and callbackError in favour of callbackFromNative.
        // Derive success from status.
        try {
            cordova.callbackFromNative(callbackId, false, args.status, [args.message], args.keepCallback);
        } catch (e) {
            console.log("Error in error callback: " + callbackId + " = "+e);
        }
    },

    /**
     * Called by native code when returning the result from an action.
     */
    callbackFromNative: function(callbackId, success, status, args, keepCallback) {
        var callback = cordova.callbacks[callbackId];
        if (callback) {
            if (success && status == cordova.callbackStatus.OK) {
                callback.success && callback.success.apply(null, args);
            } else if (!success) {
                callback.fail && callback.fail.apply(null, args);
            }

            // Clear callback if not expecting any more results
            if (!keepCallback) {
                delete cordova.callbacks[callbackId];
            }
        }
    },
    addConstructor: function(func) {
        channel.onCordovaReady.subscribe(function() {
            try {
                func();
            } catch(e) {
                console.log("Failed to run constructor: " + e);
            }
        });
    }
};

// Register pause, resume and deviceready channels as events on document.
channel.onPause = cordova.addDocumentEventHandler('pause');
channel.onResume = cordova.addDocumentEventHandler('resume');
channel.onDeviceReady = cordova.addStickyDocumentEventHandler('deviceready');

module.exports = cordova;

});

// file: lib/test/androidexec.js
define("cordova/androidexec", function(require, exports, module) {

/**
 * Execute a cordova command.  It is up to the native side whether this action
 * is synchronous or asynchronous.  The native side can return:
 *      Synchronous: PluginResult object as a JSON string
 *      Asynchronous: Empty string ""
 * If async, the native side will cordova.callbackSuccess or cordova.callbackError,
 * depending upon the result of the action.
 *
 * @param {Function} success    The success callback
 * @param {Function} fail       The fail callback
 * @param {String} service      The name of the service to use
 * @param {String} action       Action to be run in cordova
 * @param {String[]} [args]     Zero or more arguments to pass to the method
 */
var cordova = require('cordova'),
    nativeApiProvider = require('cordova/plugin/android/nativeapiprovider'),
    utils = require('cordova/utils'),
    jsToNativeModes = {
        PROMPT: 0,
        JS_OBJECT: 1,
        // This mode is currently for benchmarking purposes only. It must be enabled
        // on the native side through the ENABLE_LOCATION_CHANGE_EXEC_MODE
        // constant within CordovaWebViewClient.java before it will work.
        LOCATION_CHANGE: 2
    },
    nativeToJsModes = {
        // Polls for messages using the JS->Native bridge.
        POLLING: 0,
        // For LOAD_URL to be viable, it would need to have a work-around for
        // the bug where the soft-keyboard gets dismissed when a message is sent.
        LOAD_URL: 1,
        // For the ONLINE_EVENT to be viable, it would need to intercept all event
        // listeners (both through addEventListener and window.ononline) as well
        // as set the navigator property itself.
        ONLINE_EVENT: 2,
        // Uses reflection to access private APIs of the WebView that can send JS
        // to be executed.
        // Requires Android 3.2.4 or above.
        PRIVATE_API: 3
    },
    jsToNativeBridgeMode,  // Set lazily.
    nativeToJsBridgeMode = nativeToJsModes.ONLINE_EVENT,
    pollEnabled = false,
    messagesFromNative = [];

function androidExec(success, fail, service, action, args) {
    // Set default bridge modes if they have not already been set.
    // By default, we use the failsafe, since addJavascriptInterface breaks too often
    if (jsToNativeBridgeMode === undefined) {
        androidExec.setJsToNativeBridgeMode(jsToNativeModes.JS_OBJECT);
    }

    // Process any ArrayBuffers in the args into a string.
    for (var i = 0; i < args.length; i++) {
        if (utils.typeName(args[i]) == 'ArrayBuffer') {
            args[i] = window.btoa(String.fromCharCode.apply(null, new Uint8Array(args[i])));
        }
    }

    var callbackId = service + cordova.callbackId++,
        argsJson = JSON.stringify(args);

    if (success || fail) {
        cordova.callbacks[callbackId] = {success:success, fail:fail};
    }

    if (jsToNativeBridgeMode == jsToNativeModes.LOCATION_CHANGE) {
        window.location = 'http://cdv_exec/' + service + '#' + action + '#' + callbackId + '#' + argsJson;
    } else {
        var messages = nativeApiProvider.get().exec(service, action, callbackId, argsJson);
        // If argsJson was received by Java as null, try again with the PROMPT bridge mode.
        // This happens in rare circumstances, such as when certain Unicode characters are passed over the bridge on a Galaxy S2.  See CB-2666.
        if (jsToNativeBridgeMode == jsToNativeModes.JS_OBJECT && messages === "@Null arguments.") {
            androidExec.setJsToNativeBridgeMode(jsToNativeModes.PROMPT);
            androidExec(success, fail, service, action, args);
            androidExec.setJsToNativeBridgeMode(jsToNativeModes.JS_OBJECT);
            return;
        } else {
            androidExec.processMessages(messages);
        }
    }
}

function pollOnce() {
    var msg = nativeApiProvider.get().retrieveJsMessages();
    androidExec.processMessages(msg);
}

function pollingTimerFunc() {
    if (pollEnabled) {
        pollOnce();
        setTimeout(pollingTimerFunc, 50);
    }
}

function hookOnlineApis() {
    function proxyEvent(e) {
        cordova.fireWindowEvent(e.type);
    }
    // The network module takes care of firing online and offline events.
    // It currently fires them only on document though, so we bridge them
    // to window here (while first listening for exec()-releated online/offline
    // events).
    window.addEventListener('online', pollOnce, false);
    window.addEventListener('offline', pollOnce, false);
    cordova.addWindowEventHandler('online');
    cordova.addWindowEventHandler('offline');
    document.addEventListener('online', proxyEvent, false);
    document.addEventListener('offline', proxyEvent, false);
}

hookOnlineApis();

androidExec.jsToNativeModes = jsToNativeModes;
androidExec.nativeToJsModes = nativeToJsModes;

androidExec.setJsToNativeBridgeMode = function(mode) {
    if (mode == jsToNativeModes.JS_OBJECT && !window._cordovaNative) {
        console.log('Falling back on PROMPT mode since _cordovaNative is missing. Expected for Android 3.2 and lower only.');
        mode = jsToNativeModes.PROMPT;
    }
    nativeApiProvider.setPreferPrompt(mode == jsToNativeModes.PROMPT);
    jsToNativeBridgeMode = mode;
};

androidExec.setNativeToJsBridgeMode = function(mode) {
    if (mode == nativeToJsBridgeMode) {
        return;
    }
    if (nativeToJsBridgeMode == nativeToJsModes.POLLING) {
        pollEnabled = false;
    }

    nativeToJsBridgeMode = mode;
    // Tell the native side to switch modes.
    nativeApiProvider.get().setNativeToJsBridgeMode(mode);

    if (mode == nativeToJsModes.POLLING) {
        pollEnabled = true;
        setTimeout(pollingTimerFunc, 1);
    }
};

// Processes a single message, as encoded by NativeToJsMessageQueue.java.
function processMessage(message) {
    try {
        var firstChar = message.charAt(0);
        if (firstChar == 'J') {
            eval(message.slice(1));
        } else if (firstChar == 'S' || firstChar == 'F') {
            var success = firstChar == 'S';
            var keepCallback = message.charAt(1) == '1';
            var spaceIdx = message.indexOf(' ', 2);
            var status = +message.slice(2, spaceIdx);
            var nextSpaceIdx = message.indexOf(' ', spaceIdx + 1);
            var callbackId = message.slice(spaceIdx + 1, nextSpaceIdx);
            var payloadKind = message.charAt(nextSpaceIdx + 1);
            var payload;
            if (payloadKind == 's') {
                payload = message.slice(nextSpaceIdx + 2);
            } else if (payloadKind == 't') {
                payload = true;
            } else if (payloadKind == 'f') {
                payload = false;
            } else if (payloadKind == 'N') {
                payload = null;
            } else if (payloadKind == 'n') {
                payload = +message.slice(nextSpaceIdx + 2);
            } else if (payloadKind == 'A') {
                var data = message.slice(nextSpaceIdx + 2);
                var bytes = window.atob(data);
                var arraybuffer = new Uint8Array(bytes.length);
                for (var i = 0; i < bytes.length; i++) {
                    arraybuffer[i] = bytes.charCodeAt(i);
                }
                payload = arraybuffer.buffer;
            } else if (payloadKind == 'S') {
                payload = window.atob(message.slice(nextSpaceIdx + 2));
            } else {
                payload = JSON.parse(message.slice(nextSpaceIdx + 1));
            }
            cordova.callbackFromNative(callbackId, success, status, [payload], keepCallback);
        } else {
            console.log("processMessage failed: invalid message:" + message);
        }
    } catch (e) {
        console.log("processMessage failed: Message: " + message);
        console.log("processMessage failed: Error: " + e);
        console.log("processMessage failed: Stack: " + e.stack);
    }
}

// This is called from the NativeToJsMessageQueue.java.
androidExec.processMessages = function(messages) {
    if (messages) {
        messagesFromNative.push(messages);
        // Check for the reentrant case, and enqueue the message if that's the case.
        if (messagesFromNative.length > 1) {
            return;
        }
        while (messagesFromNative.length) {
            // Don't unshift until the end so that reentrancy can be detected.
            messages = messagesFromNative[0];
            // The Java side can send a * message to indicate that it
            // still has messages waiting to be retrieved.
            if (messages == '*') {
                messagesFromNative.shift();
                window.setTimeout(pollOnce, 0);
                return;
            }

            var spaceIdx = messages.indexOf(' ');
            var msgLen = +messages.slice(0, spaceIdx);
            var message = messages.substr(spaceIdx + 1, msgLen);
            messages = messages.slice(spaceIdx + msgLen + 1);
            processMessage(message);
            if (messages) {
                messagesFromNative[0] = messages;
            } else {
                messagesFromNative.shift();
            }
        }
    }
};

module.exports = androidExec;

});

// file: lib/common/argscheck.js
define("cordova/argscheck", function(require, exports, module) {

var exec = require('cordova/exec');
var utils = require('cordova/utils');

var moduleExports = module.exports;

var typeMap = {
    'A': 'Array',
    'D': 'Date',
    'N': 'Number',
    'S': 'String',
    'F': 'Function',
    'O': 'Object'
};

function extractParamName(callee, argIndex) {
  return (/.*?\((.*?)\)/).exec(callee)[1].split(', ')[argIndex];
}

function checkArgs(spec, functionName, args, opt_callee) {
    if (!moduleExports.enableChecks) {
        return;
    }
    var errMsg = null;
    var typeName;
    for (var i = 0; i < spec.length; ++i) {
        var c = spec.charAt(i),
            cUpper = c.toUpperCase(),
            arg = args[i];
        // Asterix means allow anything.
        if (c == '*') {
            continue;
        }
        typeName = utils.typeName(arg);
        if ((arg === null || arg === undefined) && c == cUpper) {
            continue;
        }
        if (typeName != typeMap[cUpper]) {
            errMsg = 'Expected ' + typeMap[cUpper];
            break;
        }
    }
    if (errMsg) {
        errMsg += ', but got ' + typeName + '.';
        errMsg = 'Wrong type for parameter "' + extractParamName(opt_callee || args.callee, i) + '" of ' + functionName + ': ' + errMsg;
        // Don't log when running jake test.
        if (typeof jasmine == 'undefined') {
            console.error(errMsg);
        }
        throw TypeError(errMsg);
    }
}

function getValue(value, defaultValue) {
    return value === undefined ? defaultValue : value;
}

moduleExports.checkArgs = checkArgs;
moduleExports.getValue = getValue;
moduleExports.enableChecks = true;


});

// file: lib/test/blackberryexec.js
define("cordova/blackberryexec", function(require, exports, module) {

var cordova = require('cordova'),
    platform = require('cordova/platform'),
    utils = require('cordova/utils');

/**
 * Execute a cordova command.  It is up to the native side whether this action
 * is synchronous or asynchronous.  The native side can return:
 *      Synchronous: PluginResult object as a JSON string
 *      Asynchronous: Empty string ""
 * If async, the native side will cordova.callbackSuccess or cordova.callbackError,
 * depending upon the result of the action.
 *
 * @param {Function} success    The success callback
 * @param {Function} fail       The fail callback
 * @param {String} service      The name of the service to use
 * @param {String} action       Action to be run in cordova
 * @param {String[]} [args]     Zero or more arguments to pass to the method
 */

module.exports = function(success, fail, service, action, args) {
    try {
        var manager = require('cordova/plugin/' + platform.runtime() + '/manager'),
            v = manager.exec(success, fail, service, action, args);

        // If status is OK, then return value back to caller
        if (v.status == cordova.callbackStatus.OK) {

            // If there is a success callback, then call it now with returned value
            if (success) {
                try {
                    success(v.message);
                }
                catch (e) {
                    console.log("Error in success callback: "+cordova.callbackId+" = "+e);
                }
            }
            return v.message;
        } else if (v.status == cordova.callbackStatus.NO_RESULT) {

        } else {
            // If error, then display error
            console.log("Error: Status="+v.status+" Message="+v.message);

            // If there is a fail callback, then call it now with returned value
            if (fail) {
                try {
                    fail(v.message);
                }
                catch (e) {
                    console.log("Error in error callback: "+cordova.callbackId+" = "+e);
                }
            }
            return null;
        }
    } catch (e) {
        utils.alert("Error: "+e);
    }
};

});

// file: lib/test/blackberryplatform.js
define("cordova/blackberryplatform", function(require, exports, module) {

module.exports = {
    id: "blackberry",
    runtime: function () {
        if (navigator.userAgent.indexOf("BB10") > -1) {
            return 'qnx';
        }
        else if (navigator.userAgent.indexOf("PlayBook") > -1) {
            return 'air';
        }
        else if (navigator.userAgent.indexOf("BlackBerry") > -1) {
            return 'java';
        }
        else {
            console.log("Unknown user agent?!?!? defaulting to java");
            return 'java';
        }
    },
    initialize: function() {
        var modulemapper = require('cordova/modulemapper'),
            platform = require('cordova/plugin/' + this.runtime() + '/platform');

        modulemapper.loadMatchingModules(/cordova.*\/symbols$/);
        modulemapper.loadMatchingModules(new RegExp('cordova/.*' + this.runtime() + '/.*bbsymbols$'));
        modulemapper.mapModules(this.contextObj);

        platform.initialize();
    },
    contextObj: this // Used for testing.
};

});

// file: lib/common/builder.js
define("cordova/builder", function(require, exports, module) {

var utils = require('cordova/utils');

function each(objects, func, context) {
    for (var prop in objects) {
        if (objects.hasOwnProperty(prop)) {
            func.apply(context, [objects[prop], prop]);
        }
    }
}

function clobber(obj, key, value) {
    exports.replaceHookForTesting(obj, key);
    obj[key] = value;
    // Getters can only be overridden by getters.
    if (obj[key] !== value) {
        utils.defineGetter(obj, key, function() {
            return value;
        });
    }
}

function assignOrWrapInDeprecateGetter(obj, key, value, message) {
    if (message) {
        utils.defineGetter(obj, key, function() {
            console.log(message);
            delete obj[key];
            clobber(obj, key, value);
            return value;
        });
    } else {
        clobber(obj, key, value);
    }
}

function include(parent, objects, clobber, merge) {
    each(objects, function (obj, key) {
        try {
          var result = obj.path ? require(obj.path) : {};

          if (clobber) {
              // Clobber if it doesn't exist.
              if (typeof parent[key] === 'undefined') {
                  assignOrWrapInDeprecateGetter(parent, key, result, obj.deprecated);
              } else if (typeof obj.path !== 'undefined') {
                  // If merging, merge properties onto parent, otherwise, clobber.
                  if (merge) {
                      recursiveMerge(parent[key], result);
                  } else {
                      assignOrWrapInDeprecateGetter(parent, key, result, obj.deprecated);
                  }
              }
              result = parent[key];
          } else {
            // Overwrite if not currently defined.
            if (typeof parent[key] == 'undefined') {
              assignOrWrapInDeprecateGetter(parent, key, result, obj.deprecated);
            } else {
              // Set result to what already exists, so we can build children into it if they exist.
              result = parent[key];
            }
          }

          if (obj.children) {
            include(result, obj.children, clobber, merge);
          }
        } catch(e) {
          utils.alert('Exception building cordova JS globals: ' + e + ' for key "' + key + '"');
        }
    });
}

/**
 * Merge properties from one object onto another recursively.  Properties from
 * the src object will overwrite existing target property.
 *
 * @param target Object to merge properties into.
 * @param src Object to merge properties from.
 */
function recursiveMerge(target, src) {
    for (var prop in src) {
        if (src.hasOwnProperty(prop)) {
            if (target.prototype && target.prototype.constructor === target) {
                // If the target object is a constructor override off prototype.
                clobber(target.prototype, prop, src[prop]);
            } else {
                if (typeof src[prop] === 'object' && typeof target[prop] === 'object') {
                    recursiveMerge(target[prop], src[prop]);
                } else {
                    clobber(target, prop, src[prop]);
                }
            }
        }
    }
}

exports.buildIntoButDoNotClobber = function(objects, target) {
    include(target, objects, false, false);
};
exports.buildIntoAndClobber = function(objects, target) {
    include(target, objects, true, false);
};
exports.buildIntoAndMerge = function(objects, target) {
    include(target, objects, true, true);
};
exports.recursiveMerge = recursiveMerge;
exports.assignOrWrapInDeprecateGetter = assignOrWrapInDeprecateGetter;
exports.replaceHookForTesting = function() {};

});

// file: lib/common/channel.js
define("cordova/channel", function(require, exports, module) {

var utils = require('cordova/utils'),
    nextGuid = 1;

/**
 * Custom pub-sub "channel" that can have functions subscribed to it
 * This object is used to define and control firing of events for
 * cordova initialization, as well as for custom events thereafter.
 *
 * The order of events during page load and Cordova startup is as follows:
 *
 * onDOMContentLoaded*         Internal event that is received when the web page is loaded and parsed.
 * onNativeReady*              Internal event that indicates the Cordova native side is ready.
 * onCordovaReady*             Internal event fired when all Cordova JavaScript objects have been created.
 * onCordovaInfoReady*         Internal event fired when device properties are available.
 * onCordovaConnectionReady*   Internal event fired when the connection property has been set.
 * onDeviceReady*              User event fired to indicate that Cordova is ready
 * onResume                    User event fired to indicate a start/resume lifecycle event
 * onPause                     User event fired to indicate a pause lifecycle event
 * onDestroy*                  Internal event fired when app is being destroyed (User should use window.onunload event, not this one).
 *
 * The events marked with an * are sticky. Once they have fired, they will stay in the fired state.
 * All listeners that subscribe after the event is fired will be executed right away.
 *
 * The only Cordova events that user code should register for are:
 *      deviceready           Cordova native code is initialized and Cordova APIs can be called from JavaScript
 *      pause                 App has moved to background
 *      resume                App has returned to foreground
 *
 * Listeners can be registered as:
 *      document.addEventListener("deviceready", myDeviceReadyListener, false);
 *      document.addEventListener("resume", myResumeListener, false);
 *      document.addEventListener("pause", myPauseListener, false);
 *
 * The DOM lifecycle events should be used for saving and restoring state
 *      window.onload
 *      window.onunload
 *
 */

/**
 * Channel
 * @constructor
 * @param type  String the channel name
 */
var Channel = function(type, sticky) {
    this.type = type;
    // Map of guid -> function.
    this.handlers = {};
    // 0 = Non-sticky, 1 = Sticky non-fired, 2 = Sticky fired.
    this.state = sticky ? 1 : 0;
    // Used in sticky mode to remember args passed to fire().
    this.fireArgs = null;
    // Used by onHasSubscribersChange to know if there are any listeners.
    this.numHandlers = 0;
    // Function that is called when the first listener is subscribed, or when
    // the last listener is unsubscribed.
    this.onHasSubscribersChange = null;
},
    channel = {
        /**
         * Calls the provided function only after all of the channels specified
         * have been fired. All channels must be sticky channels.
         */
        join: function(h, c) {
            var len = c.length,
                i = len,
                f = function() {
                    if (!(--i)) h();
                };
            for (var j=0; j<len; j++) {
                if (c[j].state === 0) {
                    throw Error('Can only use join with sticky channels.');
                }
                c[j].subscribe(f);
            }
            if (!len) h();
        },
        create: function(type) {
            return channel[type] = new Channel(type, false);
        },
        createSticky: function(type) {
            return channel[type] = new Channel(type, true);
        },

        /**
         * cordova Channels that must fire before "deviceready" is fired.
         */
        deviceReadyChannelsArray: [],
        deviceReadyChannelsMap: {},

        /**
         * Indicate that a feature needs to be initialized before it is ready to be used.
         * This holds up Cordova's "deviceready" event until the feature has been initialized
         * and Cordova.initComplete(feature) is called.
         *
         * @param feature {String}     The unique feature name
         */
        waitForInitialization: function(feature) {
            if (feature) {
                var c = channel[feature] || this.createSticky(feature);
                this.deviceReadyChannelsMap[feature] = c;
                this.deviceReadyChannelsArray.push(c);
            }
        },

        /**
         * Indicate that initialization code has completed and the feature is ready to be used.
         *
         * @param feature {String}     The unique feature name
         */
        initializationComplete: function(feature) {
            var c = this.deviceReadyChannelsMap[feature];
            if (c) {
                c.fire();
            }
        }
    };

function forceFunction(f) {
    if (typeof f != 'function') throw "Function required as first argument!";
}

/**
 * Subscribes the given function to the channel. Any time that
 * Channel.fire is called so too will the function.
 * Optionally specify an execution context for the function
 * and a guid that can be used to stop subscribing to the channel.
 * Returns the guid.
 */
Channel.prototype.subscribe = function(f, c) {
    // need a function to call
    forceFunction(f);
    if (this.state == 2) {
        f.apply(c || this, this.fireArgs);
        return;
    }

    var func = f,
        guid = f.observer_guid;
    if (typeof c == "object") { func = utils.close(c, f); }

    if (!guid) {
        // first time any channel has seen this subscriber
        guid = '' + nextGuid++;
    }
    func.observer_guid = guid;
    f.observer_guid = guid;

    // Don't add the same handler more than once.
    if (!this.handlers[guid]) {
        this.handlers[guid] = func;
        this.numHandlers++;
        if (this.numHandlers == 1) {
            this.onHasSubscribersChange && this.onHasSubscribersChange();
        }
    }
};

/**
 * Unsubscribes the function with the given guid from the channel.
 */
Channel.prototype.unsubscribe = function(f) {
    // need a function to unsubscribe
    forceFunction(f);

    var guid = f.observer_guid,
        handler = this.handlers[guid];
    if (handler) {
        delete this.handlers[guid];
        this.numHandlers--;
        if (this.numHandlers === 0) {
            this.onHasSubscribersChange && this.onHasSubscribersChange();
        }
    }
};

/**
 * Calls all functions subscribed to this channel.
 */
Channel.prototype.fire = function(e) {
    var fail = false,
        fireArgs = Array.prototype.slice.call(arguments);
    // Apply stickiness.
    if (this.state == 1) {
        this.state = 2;
        this.fireArgs = fireArgs;
    }
    if (this.numHandlers) {
        // Copy the values first so that it is safe to modify it from within
        // callbacks.
        var toCall = [];
        for (var item in this.handlers) {
            toCall.push(this.handlers[item]);
        }
        for (var i = 0; i < toCall.length; ++i) {
            toCall[i].apply(this, fireArgs);
        }
        if (this.state == 2 && this.numHandlers) {
            this.numHandlers = 0;
            this.handlers = {};
            this.onHasSubscribersChange && this.onHasSubscribersChange();
        }
    }
};


// defining them here so they are ready super fast!
// DOM event that is received when the web page is loaded and parsed.
channel.createSticky('onDOMContentLoaded');

// Event to indicate the Cordova native side is ready.
channel.createSticky('onNativeReady');

// Event to indicate that all Cordova JavaScript objects have been created
// and it's time to run plugin constructors.
channel.createSticky('onCordovaReady');

// Event to indicate that device properties are available
channel.createSticky('onCordovaInfoReady');

// Event to indicate that the connection property has been set.
channel.createSticky('onCordovaConnectionReady');

// Event to indicate that all automatically loaded JS plugins are loaded and ready.
channel.createSticky('onPluginsReady');

// Event to indicate that Cordova is ready
channel.createSticky('onDeviceReady');

// Event to indicate a resume lifecycle event
channel.create('onResume');

// Event to indicate a pause lifecycle event
channel.create('onPause');

// Event to indicate a destroy lifecycle event
channel.createSticky('onDestroy');

// Channels that must fire before "deviceready" is fired.
channel.waitForInitialization('onCordovaReady');
channel.waitForInitialization('onCordovaConnectionReady');
channel.waitForInitialization('onDOMContentLoaded');

module.exports = channel;

});

// file: lib/common/commandProxy.js
define("cordova/commandProxy", function(require, exports, module) {


// internal map of proxy function
var CommandProxyMap = {};

module.exports = {

    // example: cordova.commandProxy.add("Accelerometer",{getCurrentAcceleration: function(successCallback, errorCallback, options) {...},...);
    add:function(id,proxyObj) {
        console.log("adding proxy for " + id);
        CommandProxyMap[id] = proxyObj;
        return proxyObj;
    },

    // cordova.commandProxy.remove("Accelerometer");
    remove:function(id) {
        var proxy = CommandProxyMap[id];
        delete CommandProxyMap[id];
        CommandProxyMap[id] = null;
        return proxy;
    },

    get:function(service,action) {
        return ( CommandProxyMap[service] ? CommandProxyMap[service][action] : null );
    }
};
});

// file: lib/test/exec.js
define("cordova/exec", function(require, exports, module) {

module.exports = jasmine.createSpy();

});

// file: lib/test/iosexec.js
define("cordova/iosexec", function(require, exports, module) {

/**
 * Creates a gap bridge iframe used to notify the native code about queued
 * commands.
 *
 * @private
 */
var cordova = require('cordova'),
    channel = require('cordova/channel'),
    utils = require('cordova/utils'),
    jsToNativeModes = {
        IFRAME_NAV: 0,
        XHR_NO_PAYLOAD: 1,
        XHR_WITH_PAYLOAD: 2,
        XHR_OPTIONAL_PAYLOAD: 3
    },
    bridgeMode,
    execIframe,
    execXhr,
    requestCount = 0,
    vcHeaderValue = null,
    commandQueue = [], // Contains pending JS->Native messages.
    isInContextOfEvalJs = 0;

function createExecIframe() {
    var iframe = document.createElement("iframe");
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    return iframe;
}

function shouldBundleCommandJson() {
    if (bridgeMode == jsToNativeModes.XHR_WITH_PAYLOAD) {
        return true;
    }
    if (bridgeMode == jsToNativeModes.XHR_OPTIONAL_PAYLOAD) {
        var payloadLength = 0;
        for (var i = 0; i < commandQueue.length; ++i) {
            payloadLength += commandQueue[i].length;
        }
        // The value here was determined using the benchmark within CordovaLibApp on an iPad 3.
        return payloadLength < 4500;
    }
    return false;
}

function massageArgsJsToNative(args) {
    if (!args || utils.typeName(args) != 'Array') {
       return args;
    }
    var ret = [];
    var encodeArrayBufferAs8bitString = function(ab) {
        return String.fromCharCode.apply(null, new Uint8Array(ab));
    };
    var encodeArrayBufferAsBase64 = function(ab) {
        return window.btoa(encodeArrayBufferAs8bitString(ab));
    };
    args.forEach(function(arg, i) {
        if (utils.typeName(arg) == 'ArrayBuffer') {
            ret.push({
                'CDVType': 'ArrayBuffer',
                'data': encodeArrayBufferAsBase64(arg)
            });
        } else {
            ret.push(arg);
        }
    });
    return ret;
}

function massageMessageNativeToJs(message) {
    if (message.CDVType == 'ArrayBuffer') {
        var stringToArrayBuffer = function(str) {
            var ret = new Uint8Array(str.length);
            for (var i = 0; i < str.length; i++) {
                ret[i] = str.charCodeAt(i);
            }
            return ret.buffer;
        };
        var base64ToArrayBuffer = function(b64) {
            return stringToArrayBuffer(atob(b64));
        };
        message = base64ToArrayBuffer(message.data);
    }
    return message;
}

function convertMessageToArgsNativeToJs(message) {
    var args = [];
    if (!message || !message.hasOwnProperty('CDVType')) {
        args.push(message);
    } else if (message.CDVType == 'MultiPart') {
        message.messages.forEach(function(e) {
            args.push(massageMessageNativeToJs(e));
        });
    } else {
        args.push(massageMessageNativeToJs(message));
    }
    return args;
}

function iOSExec() {
    // XHR mode does not work on iOS 4.2, so default to IFRAME_NAV for such devices.
    // XHR mode's main advantage is working around a bug in -webkit-scroll, which
    // doesn't exist in 4.X devices anyways.
    if (bridgeMode === undefined) {
        bridgeMode = navigator.userAgent.indexOf(' 4_') == -1 ? jsToNativeModes.XHR_NO_PAYLOAD : jsToNativeModes.IFRAME_NAV;
    }

    var successCallback, failCallback, service, action, actionArgs, splitCommand;
    var callbackId = null;
    if (typeof arguments[0] !== "string") {
        // FORMAT ONE
        successCallback = arguments[0];
        failCallback = arguments[1];
        service = arguments[2];
        action = arguments[3];
        actionArgs = arguments[4];

        // Since we need to maintain backwards compatibility, we have to pass
        // an invalid callbackId even if no callback was provided since plugins
        // will be expecting it. The Cordova.exec() implementation allocates
        // an invalid callbackId and passes it even if no callbacks were given.
        callbackId = 'INVALID';
    } else {
        // FORMAT TWO, REMOVED
       try {
           splitCommand = arguments[0].split(".");
           action = splitCommand.pop();
           service = splitCommand.join(".");
           actionArgs = Array.prototype.splice.call(arguments, 1);

           console.log('The old format of this exec call has been removed (deprecated since 2.1). Change to: ' +
                       "cordova.exec(null, null, \"" + service + "\", " + action + "\"," + JSON.stringify(actionArgs) + ");"
                       );
           return;
       } catch (e) {
       }
    }

    // Register the callbacks and add the callbackId to the positional
    // arguments if given.
    if (successCallback || failCallback) {
        callbackId = service + cordova.callbackId++;
        cordova.callbacks[callbackId] =
            {success:successCallback, fail:failCallback};
    }

    actionArgs = massageArgsJsToNative(actionArgs);

    var command = [callbackId, service, action, actionArgs];

    // Stringify and queue the command. We stringify to command now to
    // effectively clone the command arguments in case they are mutated before
    // the command is executed.
    commandQueue.push(JSON.stringify(command));

    // If we're in the context of a stringByEvaluatingJavaScriptFromString call,
    // then the queue will be flushed when it returns; no need for a poke.
    // Also, if there is already a command in the queue, then we've already
    // poked the native side, so there is no reason to do so again.
    if (!isInContextOfEvalJs && commandQueue.length == 1) {
        if (bridgeMode != jsToNativeModes.IFRAME_NAV) {
            // This prevents sending an XHR when there is already one being sent.
            // This should happen only in rare circumstances (refer to unit tests).
            if (execXhr && execXhr.readyState != 4) {
                execXhr = null;
            }
            // Re-using the XHR improves exec() performance by about 10%.
            execXhr = execXhr || new XMLHttpRequest();
            // Changing this to a GET will make the XHR reach the URIProtocol on 4.2.
            // For some reason it still doesn't work though...
            // Add a timestamp to the query param to prevent caching.
            execXhr.open('HEAD', "/!gap_exec?" + (+new Date()), true);
            if (!vcHeaderValue) {
                vcHeaderValue = /.*\((.*)\)/.exec(navigator.userAgent)[1];
            }
            execXhr.setRequestHeader('vc', vcHeaderValue);
            execXhr.setRequestHeader('rc', ++requestCount);
            if (shouldBundleCommandJson()) {
                execXhr.setRequestHeader('cmds', iOSExec.nativeFetchMessages());
            }
            execXhr.send(null);
        } else {
            execIframe = execIframe || createExecIframe();
            execIframe.src = "gap://ready";
        }
    }
}

iOSExec.jsToNativeModes = jsToNativeModes;

iOSExec.setJsToNativeBridgeMode = function(mode) {
    // Remove the iFrame since it may be no longer required, and its existence
    // can trigger browser bugs.
    // https://issues.apache.org/jira/browse/CB-593
    if (execIframe) {
        execIframe.parentNode.removeChild(execIframe);
        execIframe = null;
    }
    bridgeMode = mode;
};

iOSExec.nativeFetchMessages = function() {
    // Each entry in commandQueue is a JSON string already.
    if (!commandQueue.length) {
        return '';
    }
    var json = '[' + commandQueue.join(',') + ']';
    commandQueue.length = 0;
    return json;
};

iOSExec.nativeCallback = function(callbackId, status, message, keepCallback) {
    return iOSExec.nativeEvalAndFetch(function() {
        var success = status === 0 || status === 1;
        var args = convertMessageToArgsNativeToJs(message);
        cordova.callbackFromNative(callbackId, success, status, args, keepCallback);
    });
};

iOSExec.nativeEvalAndFetch = function(func) {
    // This shouldn't be nested, but better to be safe.
    isInContextOfEvalJs++;
    try {
        func();
        return iOSExec.nativeFetchMessages();
    } finally {
        isInContextOfEvalJs--;
    }
};

module.exports = iOSExec;

});

// file: lib/test/mockxhr.js
define("cordova/mockxhr", function(require, exports, module) {

var utils = require('cordova/utils');
var activeXhrs = [];
var isInstalled = false;
var origXhr = this.XMLHttpRequest;

function MockXhr() {
    this.requestHeaders = {};
    this.readyState = 0;

    this.onreadystatechange = null;
    this.onload = null;
    this.onerror = null;
    this.clearResponse_();
}

MockXhr.prototype.clearResponse_ = function() {
    this.url = null;
    this.method = null;
    this.async = null;
    this.requestPayload = undefined;

    this.statusCode = 0;
    this.responseText = '';
    this.responseHeaders = {};
};

MockXhr.prototype.setReadyState_ = function(value) {
    this.readyState = value;
    this.onreadystatechange && this.onreadystatechange();
};

MockXhr.prototype.open = function(method, url, async) {
    if (this.readyState !== 0 && this.readyState !== 4) {
        throw Error('Tried to open MockXhr while request in progress.');
    }
    this.clearResponse_();
    this.method = method;
    this.url = url;
    this.async = async;
    this.setReadyState_(1);
};

MockXhr.prototype.setRequestHeader = function(key, val) {
    if (this.readyState != 1) {
        throw Error('Tried to setRequestHeader() without call to open()');
    }
    this.requestHeaders[key] = String(val);
};

MockXhr.prototype.send = function(payload) {
    if (this.readyState != 1) {
        throw Error('Tried to send MockXhr without call to open().');
    }
    this.requestPayload = payload;
    this.setReadyState_(2);

    activeXhrs.push(this);
};

MockXhr.prototype.simulateResponse = function(statusCode, responseText, responseHeaders) {
    if (this.readyState != 2) {
        throw Error('Call to simulateResponse() when MockXhr is in state ' + this.readyState);
    }
    for (var i = this.readyState; i <= 4; i++) {
        if (i == 2) {
            this.statusCode = statusCode;
            this.responseHeaders = responseHeaders || this.responseHeaders;
        }
        if (i == 4) {
            this.responseText = responseText;
        }
        this.setReadyState_(i);
    }
    if (statusCode == 200) {
        this.onload && this.onload();
    } else {
        this.onerror && this.onerror();
    }
    utils.arrayRemove(activeXhrs, this);
};

function install() {
    if (isInstalled) {
        throw Error('mockxhr.install called without uninstall.');
    }
    isInstalled = true;
    activeXhrs.length = 0;
    XMLHttpRequest = MockXhr;
}

function uninstall() {
    XMLHttpRequest = origXhr;
    isInstalled = false;
}

module.exports = {
    install: install,
    uninstall: uninstall,
    activeXhrs: activeXhrs
};

});

// file: lib/common/modulemapper.js
define("cordova/modulemapper", function(require, exports, module) {

var builder = require('cordova/builder'),
    moduleMap = define.moduleMap,
    symbolList,
    deprecationMap;

exports.reset = function() {
    symbolList = [];
    deprecationMap = {};
};

function addEntry(strategy, moduleName, symbolPath, opt_deprecationMessage) {
    if (!(moduleName in moduleMap)) {
        throw new Error('Module ' + moduleName + ' does not exist.');
    }
    symbolList.push(strategy, moduleName, symbolPath);
    if (opt_deprecationMessage) {
        deprecationMap[symbolPath] = opt_deprecationMessage;
    }
}

// Note: Android 2.3 does have Function.bind().
exports.clobbers = function(moduleName, symbolPath, opt_deprecationMessage) {
    addEntry('c', moduleName, symbolPath, opt_deprecationMessage);
};

exports.merges = function(moduleName, symbolPath, opt_deprecationMessage) {
    addEntry('m', moduleName, symbolPath, opt_deprecationMessage);
};

exports.defaults = function(moduleName, symbolPath, opt_deprecationMessage) {
    addEntry('d', moduleName, symbolPath, opt_deprecationMessage);
};

function prepareNamespace(symbolPath, context) {
    if (!symbolPath) {
        return context;
    }
    var parts = symbolPath.split('.');
    var cur = context;
    for (var i = 0, part; part = parts[i]; ++i) {
        cur = cur[part] = cur[part] || {};
    }
    return cur;
}

exports.mapModules = function(context) {
    var origSymbols = {};
    context.CDV_origSymbols = origSymbols;
    for (var i = 0, len = symbolList.length; i < len; i += 3) {
        var strategy = symbolList[i];
        var moduleName = symbolList[i + 1];
        var symbolPath = symbolList[i + 2];
        var lastDot = symbolPath.lastIndexOf('.');
        var namespace = symbolPath.substr(0, lastDot);
        var lastName = symbolPath.substr(lastDot + 1);

        var module = require(moduleName);
        var deprecationMsg = symbolPath in deprecationMap ? 'Access made to deprecated symbol: ' + symbolPath + '. ' + deprecationMsg : null;
        var parentObj = prepareNamespace(namespace, context);
        var target = parentObj[lastName];

        if (strategy == 'm' && target) {
            builder.recursiveMerge(target, module);
        } else if ((strategy == 'd' && !target) || (strategy != 'd')) {
            if (!(symbolPath in origSymbols)) {
                origSymbols[symbolPath] = target;
            }
            builder.assignOrWrapInDeprecateGetter(parentObj, lastName, module, deprecationMsg);
        }
    }
};

exports.getOriginalSymbol = function(context, symbolPath) {
    var origSymbols = context.CDV_origSymbols;
    if (origSymbols && (symbolPath in origSymbols)) {
        return origSymbols[symbolPath];
    }
    var parts = symbolPath.split('.');
    var obj = context;
    for (var i = 0; i < parts.length; ++i) {
        obj = obj && obj[parts[i]];
    }
    return obj;
};

exports.loadMatchingModules = function(matchingRegExp) {
    for (var k in moduleMap) {
        if (matchingRegExp.exec(k)) {
            require(k);
        }
    }
};

exports.reset();


});

// file: lib/test/modulereplacer.js
define("cordova/modulereplacer", function(require, exports, module) {

/*global spyOn:false */

var propertyreplacer = require('cordova/propertyreplacer');

exports.replace = function(moduleName, newValue) {
    propertyreplacer.stub(define.moduleMap, moduleName, null);
    define.remove(moduleName);
    define(moduleName, function(require, exports, module) {
        module.exports = newValue;
    });
};


});

// file: lib/test/platform.js
define("cordova/platform", function(require, exports, module) {

module.exports = {
    id: "test platform",
    runtime: function () {},
    initialize: function () {}
};

});

// file: lib/common/plugin/Acceleration.js
define("cordova/plugin/Acceleration", function(require, exports, module) {

var Acceleration = function(x, y, z, timestamp) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.timestamp = timestamp || (new Date()).getTime();
};

module.exports = Acceleration;

});

// file: lib/common/plugin/Camera.js
define("cordova/plugin/Camera", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec'),
    Camera = require('cordova/plugin/CameraConstants'),
    CameraPopoverHandle = require('cordova/plugin/CameraPopoverHandle');

var cameraExport = {};

// Tack on the Camera Constants to the base camera plugin.
for (var key in Camera) {
    cameraExport[key] = Camera[key];
}

/**
 * Gets a picture from source defined by "options.sourceType", and returns the
 * image as defined by the "options.destinationType" option.

 * The defaults are sourceType=CAMERA and destinationType=FILE_URI.
 *
 * @param {Function} successCallback
 * @param {Function} errorCallback
 * @param {Object} options
 */
cameraExport.getPicture = function(successCallback, errorCallback, options) {
    argscheck.checkArgs('fFO', 'Camera.getPicture', arguments);
    options = options || {};
    var getValue = argscheck.getValue;

    var quality = getValue(options.quality, 50);
    var destinationType = getValue(options.destinationType, Camera.DestinationType.FILE_URI);
    var sourceType = getValue(options.sourceType, Camera.PictureSourceType.CAMERA);
    var targetWidth = getValue(options.targetWidth, -1);
    var targetHeight = getValue(options.targetHeight, -1);
    var encodingType = getValue(options.encodingType, Camera.EncodingType.JPEG);
    var mediaType = getValue(options.mediaType, Camera.MediaType.PICTURE);
    var allowEdit = !!options.allowEdit;
    var correctOrientation = !!options.correctOrientation;
    var saveToPhotoAlbum = !!options.saveToPhotoAlbum;
    var popoverOptions = getValue(options.popoverOptions, null);
    var cameraDirection = getValue(options.cameraDirection, Camera.Direction.BACK);

    var args = [quality, destinationType, sourceType, targetWidth, targetHeight, encodingType,
                mediaType, allowEdit, correctOrientation, saveToPhotoAlbum, popoverOptions, cameraDirection];

    exec(successCallback, errorCallback, "Camera", "takePicture", args);
    return new CameraPopoverHandle();
};

cameraExport.cleanup = function(successCallback, errorCallback) {
    exec(successCallback, errorCallback, "Camera", "cleanup", []);
};

module.exports = cameraExport;

});

// file: lib/common/plugin/CameraConstants.js
define("cordova/plugin/CameraConstants", function(require, exports, module) {

module.exports = {
  DestinationType:{
    DATA_URL: 0,         // Return base64 encoded string
    FILE_URI: 1,         // Return file uri (content://media/external/images/media/2 for Android)
    NATIVE_URI: 2        // Return native uri (eg. asset-library://... for iOS)
  },
  EncodingType:{
    JPEG: 0,             // Return JPEG encoded image
    PNG: 1               // Return PNG encoded image
  },
  MediaType:{
    PICTURE: 0,          // allow selection of still pictures only. DEFAULT. Will return format specified via DestinationType
    VIDEO: 1,            // allow selection of video only, ONLY RETURNS URL
    ALLMEDIA : 2         // allow selection from all media types
  },
  PictureSourceType:{
    PHOTOLIBRARY : 0,    // Choose image from picture library (same as SAVEDPHOTOALBUM for Android)
    CAMERA : 1,          // Take picture from camera
    SAVEDPHOTOALBUM : 2  // Choose image from picture library (same as PHOTOLIBRARY for Android)
  },
  PopoverArrowDirection:{
      ARROW_UP : 1,        // matches iOS UIPopoverArrowDirection constants to specify arrow location on popover
      ARROW_DOWN : 2,
      ARROW_LEFT : 4,
      ARROW_RIGHT : 8,
      ARROW_ANY : 15
  },
  Direction:{
      BACK: 0,
      FRONT: 1
  }
};

});

// file: lib/common/plugin/CameraPopoverHandle.js
define("cordova/plugin/CameraPopoverHandle", function(require, exports, module) {

var exec = require('cordova/exec');

/**
 * A handle to an image picker popover.
 */
var CameraPopoverHandle = function() {
    this.setPosition = function(popoverOptions) {
        console.log('CameraPopoverHandle.setPosition is only supported on iOS.');
    };
};

module.exports = CameraPopoverHandle;

});

// file: lib/common/plugin/CameraPopoverOptions.js
define("cordova/plugin/CameraPopoverOptions", function(require, exports, module) {

var Camera = require('cordova/plugin/CameraConstants');

/**
 * Encapsulates options for iOS Popover image picker
 */
var CameraPopoverOptions = function(x,y,width,height,arrowDir){
    // information of rectangle that popover should be anchored to
    this.x = x || 0;
    this.y = y || 32;
    this.width = width || 320;
    this.height = height || 480;
    // The direction of the popover arrow
    this.arrowDir = arrowDir || Camera.PopoverArrowDirection.ARROW_ANY;
};

module.exports = CameraPopoverOptions;

});

// file: lib/common/plugin/CaptureAudioOptions.js
define("cordova/plugin/CaptureAudioOptions", function(require, exports, module) {

/**
 * Encapsulates all audio capture operation configuration options.
 */
var CaptureAudioOptions = function(){
    // Upper limit of sound clips user can record. Value must be equal or greater than 1.
    this.limit = 1;
    // Maximum duration of a single sound clip in seconds.
    this.duration = 0;
    // The selected audio mode. Must match with one of the elements in supportedAudioModes array.
    this.mode = null;
};

module.exports = CaptureAudioOptions;

});

// file: lib/common/plugin/CaptureError.js
define("cordova/plugin/CaptureError", function(require, exports, module) {

/**
 * The CaptureError interface encapsulates all errors in the Capture API.
 */
var CaptureError = function(c) {
   this.code = c || null;
};

// Camera or microphone failed to capture image or sound.
CaptureError.CAPTURE_INTERNAL_ERR = 0;
// Camera application or audio capture application is currently serving other capture request.
CaptureError.CAPTURE_APPLICATION_BUSY = 1;
// Invalid use of the API (e.g. limit parameter has value less than one).
CaptureError.CAPTURE_INVALID_ARGUMENT = 2;
// User exited camera application or audio capture application before capturing anything.
CaptureError.CAPTURE_NO_MEDIA_FILES = 3;
// The requested capture operation is not supported.
CaptureError.CAPTURE_NOT_SUPPORTED = 20;

module.exports = CaptureError;

});

// file: lib/common/plugin/CaptureImageOptions.js
define("cordova/plugin/CaptureImageOptions", function(require, exports, module) {

/**
 * Encapsulates all image capture operation configuration options.
 */
var CaptureImageOptions = function(){
    // Upper limit of images user can take. Value must be equal or greater than 1.
    this.limit = 1;
    // The selected image mode. Must match with one of the elements in supportedImageModes array.
    this.mode = null;
};

module.exports = CaptureImageOptions;

});

// file: lib/common/plugin/CaptureVideoOptions.js
define("cordova/plugin/CaptureVideoOptions", function(require, exports, module) {

/**
 * Encapsulates all video capture operation configuration options.
 */
var CaptureVideoOptions = function(){
    // Upper limit of videos user can record. Value must be equal or greater than 1.
    this.limit = 1;
    // Maximum duration of a single video clip in seconds.
    this.duration = 0;
    // The selected video mode. Must match with one of the elements in supportedVideoModes array.
    this.mode = null;
};

module.exports = CaptureVideoOptions;

});

// file: lib/common/plugin/CompassError.js
define("cordova/plugin/CompassError", function(require, exports, module) {

/**
 *  CompassError.
 *  An error code assigned by an implementation when an error has occurred
 * @constructor
 */
var CompassError = function(err) {
    this.code = (err !== undefined ? err : null);
};

CompassError.COMPASS_INTERNAL_ERR = 0;
CompassError.COMPASS_NOT_SUPPORTED = 20;

module.exports = CompassError;

});

// file: lib/common/plugin/CompassHeading.js
define("cordova/plugin/CompassHeading", function(require, exports, module) {

var CompassHeading = function(magneticHeading, trueHeading, headingAccuracy, timestamp) {
  this.magneticHeading = magneticHeading;
  this.trueHeading = trueHeading;
  this.headingAccuracy = headingAccuracy;
  this.timestamp = timestamp || new Date().getTime();
};

module.exports = CompassHeading;

});

// file: lib/common/plugin/ConfigurationData.js
define("cordova/plugin/ConfigurationData", function(require, exports, module) {

/**
 * Encapsulates a set of parameters that the capture device supports.
 */
function ConfigurationData() {
    // The ASCII-encoded string in lower case representing the media type.
    this.type = null;
    // The height attribute represents height of the image or video in pixels.
    // In the case of a sound clip this attribute has value 0.
    this.height = 0;
    // The width attribute represents width of the image or video in pixels.
    // In the case of a sound clip this attribute has value 0
    this.width = 0;
}

module.exports = ConfigurationData;

});

// file: lib/common/plugin/Connection.js
define("cordova/plugin/Connection", function(require, exports, module) {

/**
 * Network status
 */
module.exports = {
        UNKNOWN: "unknown",
        ETHERNET: "ethernet",
        WIFI: "wifi",
        CELL_2G: "2g",
        CELL_3G: "3g",
        CELL_4G: "4g",
        CELL:"cellular",
        NONE: "none"
};

});

// file: lib/common/plugin/Contact.js
define("cordova/plugin/Contact", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec'),
    ContactError = require('cordova/plugin/ContactError'),
    utils = require('cordova/utils');

/**
* Converts primitives into Complex Object
* Currently only used for Date fields
*/
function convertIn(contact) {
    var value = contact.birthday;
    try {
      contact.birthday = new Date(parseFloat(value));
    } catch (exception){
      console.log("Cordova Contact convertIn error: exception creating date.");
    }
    return contact;
}

/**
* Converts Complex objects into primitives
* Only conversion at present is for Dates.
**/

function convertOut(contact) {
    var value = contact.birthday;
    if (value !== null) {
        // try to make it a Date object if it is not already
        if (!utils.isDate(value)){
            try {
                value = new Date(value);
            } catch(exception){
                value = null;
            }
        }
        if (utils.isDate(value)){
            value = value.valueOf(); // convert to milliseconds
        }
        contact.birthday = value;
    }
    return contact;
}

/**
* Contains information about a single contact.
* @constructor
* @param {DOMString} id unique identifier
* @param {DOMString} displayName
* @param {ContactName} name
* @param {DOMString} nickname
* @param {Array.<ContactField>} phoneNumbers array of phone numbers
* @param {Array.<ContactField>} emails array of email addresses
* @param {Array.<ContactAddress>} addresses array of addresses
* @param {Array.<ContactField>} ims instant messaging user ids
* @param {Array.<ContactOrganization>} organizations
* @param {DOMString} birthday contact's birthday
* @param {DOMString} note user notes about contact
* @param {Array.<ContactField>} photos
* @param {Array.<ContactField>} categories
* @param {Array.<ContactField>} urls contact's web sites
*/
var Contact = function (id, displayName, name, nickname, phoneNumbers, emails, addresses,
    ims, organizations, birthday, note, photos, categories, urls) {
    this.id = id || null;
    this.rawId = null;
    this.displayName = displayName || null;
    this.name = name || null; // ContactName
    this.nickname = nickname || null;
    this.phoneNumbers = phoneNumbers || null; // ContactField[]
    this.emails = emails || null; // ContactField[]
    this.addresses = addresses || null; // ContactAddress[]
    this.ims = ims || null; // ContactField[]
    this.organizations = organizations || null; // ContactOrganization[]
    this.birthday = birthday || null;
    this.note = note || null;
    this.photos = photos || null; // ContactField[]
    this.categories = categories || null; // ContactField[]
    this.urls = urls || null; // ContactField[]
};

/**
* Removes contact from device storage.
* @param successCB success callback
* @param errorCB error callback
*/
Contact.prototype.remove = function(successCB, errorCB) {
    argscheck.checkArgs('FF', 'Contact.remove', arguments);
    var fail = errorCB && function(code) {
        errorCB(new ContactError(code));
    };
    if (this.id === null) {
        fail(ContactError.UNKNOWN_ERROR);
    }
    else {
        exec(successCB, fail, "Contacts", "remove", [this.id]);
    }
};

/**
* Creates a deep copy of this Contact.
* With the contact ID set to null.
* @return copy of this Contact
*/
Contact.prototype.clone = function() {
    var clonedContact = utils.clone(this);
    clonedContact.id = null;
    clonedContact.rawId = null;

    function nullIds(arr) {
        if (arr) {
            for (var i = 0; i < arr.length; ++i) {
                arr[i].id = null;
            }
        }
    }

    // Loop through and clear out any id's in phones, emails, etc.
    nullIds(clonedContact.phoneNumbers);
    nullIds(clonedContact.emails);
    nullIds(clonedContact.addresses);
    nullIds(clonedContact.ims);
    nullIds(clonedContact.organizations);
    nullIds(clonedContact.categories);
    nullIds(clonedContact.photos);
    nullIds(clonedContact.urls);
    return clonedContact;
};

/**
* Persists contact to device storage.
* @param successCB success callback
* @param errorCB error callback
*/
Contact.prototype.save = function(successCB, errorCB) {
    argscheck.checkArgs('FFO', 'Contact.save', arguments);
    var fail = errorCB && function(code) {
        errorCB(new ContactError(code));
    };
    var success = function(result) {
        if (result) {
            if (successCB) {
                var fullContact = require('cordova/plugin/contacts').create(result);
                successCB(convertIn(fullContact));
            }
        }
        else {
            // no Entry object returned
            fail(ContactError.UNKNOWN_ERROR);
        }
    };
    var dupContact = convertOut(utils.clone(this));
    exec(success, fail, "Contacts", "save", [dupContact]);
};


module.exports = Contact;

});

// file: lib/common/plugin/ContactAddress.js
define("cordova/plugin/ContactAddress", function(require, exports, module) {

/**
* Contact address.
* @constructor
* @param {DOMString} id unique identifier, should only be set by native code
* @param formatted // NOTE: not a W3C standard
* @param streetAddress
* @param locality
* @param region
* @param postalCode
* @param country
*/

var ContactAddress = function(pref, type, formatted, streetAddress, locality, region, postalCode, country) {
    this.id = null;
    this.pref = (typeof pref != 'undefined' ? pref : false);
    this.type = type || null;
    this.formatted = formatted || null;
    this.streetAddress = streetAddress || null;
    this.locality = locality || null;
    this.region = region || null;
    this.postalCode = postalCode || null;
    this.country = country || null;
};

module.exports = ContactAddress;

});

// file: lib/common/plugin/ContactError.js
define("cordova/plugin/ContactError", function(require, exports, module) {

/**
 *  ContactError.
 *  An error code assigned by an implementation when an error has occurred
 * @constructor
 */
var ContactError = function(err) {
    this.code = (typeof err != 'undefined' ? err : null);
};

/**
 * Error codes
 */
ContactError.UNKNOWN_ERROR = 0;
ContactError.INVALID_ARGUMENT_ERROR = 1;
ContactError.TIMEOUT_ERROR = 2;
ContactError.PENDING_OPERATION_ERROR = 3;
ContactError.IO_ERROR = 4;
ContactError.NOT_SUPPORTED_ERROR = 5;
ContactError.PERMISSION_DENIED_ERROR = 20;

module.exports = ContactError;

});

// file: lib/common/plugin/ContactField.js
define("cordova/plugin/ContactField", function(require, exports, module) {

/**
* Generic contact field.
* @constructor
* @param {DOMString} id unique identifier, should only be set by native code // NOTE: not a W3C standard
* @param type
* @param value
* @param pref
*/
var ContactField = function(type, value, pref) {
    this.id = null;
    this.type = (type && type.toString()) || null;
    this.value = (value && value.toString()) || null;
    this.pref = (typeof pref != 'undefined' ? pref : false);
};

module.exports = ContactField;

});

// file: lib/common/plugin/ContactFindOptions.js
define("cordova/plugin/ContactFindOptions", function(require, exports, module) {

/**
 * ContactFindOptions.
 * @constructor
 * @param filter used to match contacts against
 * @param multiple boolean used to determine if more than one contact should be returned
 */

var ContactFindOptions = function(filter, multiple) {
    this.filter = filter || '';
    this.multiple = (typeof multiple != 'undefined' ? multiple : false);
};

module.exports = ContactFindOptions;

});

// file: lib/common/plugin/ContactName.js
define("cordova/plugin/ContactName", function(require, exports, module) {

/**
* Contact name.
* @constructor
* @param formatted // NOTE: not part of W3C standard
* @param familyName
* @param givenName
* @param middle
* @param prefix
* @param suffix
*/
var ContactName = function(formatted, familyName, givenName, middle, prefix, suffix) {
    this.formatted = formatted || null;
    this.familyName = familyName || null;
    this.givenName = givenName || null;
    this.middleName = middle || null;
    this.honorificPrefix = prefix || null;
    this.honorificSuffix = suffix || null;
};

module.exports = ContactName;

});

// file: lib/common/plugin/ContactOrganization.js
define("cordova/plugin/ContactOrganization", function(require, exports, module) {

/**
* Contact organization.
* @constructor
* @param {DOMString} id unique identifier, should only be set by native code // NOTE: not a W3C standard
* @param name
* @param dept
* @param title
* @param startDate
* @param endDate
* @param location
* @param desc
*/

var ContactOrganization = function(pref, type, name, dept, title) {
    this.id = null;
    this.pref = (typeof pref != 'undefined' ? pref : false);
    this.type = type || null;
    this.name = name || null;
    this.department = dept || null;
    this.title = title || null;
};

module.exports = ContactOrganization;

});

// file: lib/common/plugin/Coordinates.js
define("cordova/plugin/Coordinates", function(require, exports, module) {

/**
 * This class contains position information.
 * @param {Object} lat
 * @param {Object} lng
 * @param {Object} alt
 * @param {Object} acc
 * @param {Object} head
 * @param {Object} vel
 * @param {Object} altacc
 * @constructor
 */
var Coordinates = function(lat, lng, alt, acc, head, vel, altacc) {
    /**
     * The latitude of the position.
     */
    this.latitude = lat;
    /**
     * The longitude of the position,
     */
    this.longitude = lng;
    /**
     * The accuracy of the position.
     */
    this.accuracy = acc;
    /**
     * The altitude of the position.
     */
    this.altitude = (alt !== undefined ? alt : null);
    /**
     * The direction the device is moving at the position.
     */
    this.heading = (head !== undefined ? head : null);
    /**
     * The velocity with which the device is moving at the position.
     */
    this.speed = (vel !== undefined ? vel : null);

    if (this.speed === 0 || this.speed === null) {
        this.heading = NaN;
    }

    /**
     * The altitude accuracy of the position.
     */
    this.altitudeAccuracy = (altacc !== undefined) ? altacc : null;
};

module.exports = Coordinates;

});

// file: lib/common/plugin/DirectoryEntry.js
define("cordova/plugin/DirectoryEntry", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec'),
    Entry = require('cordova/plugin/Entry'),
    FileError = require('cordova/plugin/FileError'),
    DirectoryReader = require('cordova/plugin/DirectoryReader');

/**
 * An interface representing a directory on the file system.
 *
 * {boolean} isFile always false (readonly)
 * {boolean} isDirectory always true (readonly)
 * {DOMString} name of the directory, excluding the path leading to it (readonly)
 * {DOMString} fullPath the absolute full path to the directory (readonly)
 * TODO: implement this!!! {FileSystem} filesystem on which the directory resides (readonly)
 */
var DirectoryEntry = function(name, fullPath) {
     DirectoryEntry.__super__.constructor.call(this, false, true, name, fullPath);
};

utils.extend(DirectoryEntry, Entry);

/**
 * Creates a new DirectoryReader to read entries from this directory
 */
DirectoryEntry.prototype.createReader = function() {
    return new DirectoryReader(this.fullPath);
};

/**
 * Creates or looks up a directory
 *
 * @param {DOMString} path either a relative or absolute path from this directory in which to look up or create a directory
 * @param {Flags} options to create or exclusively create the directory
 * @param {Function} successCallback is called with the new entry
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.getDirectory = function(path, options, successCallback, errorCallback) {
    argscheck.checkArgs('sOFF', 'DirectoryEntry.getDirectory', arguments);
    var win = successCallback && function(result) {
        var entry = new DirectoryEntry(result.name, result.fullPath);
        successCallback(entry);
    };
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };
    exec(win, fail, "File", "getDirectory", [this.fullPath, path, options]);
};

/**
 * Deletes a directory and all of it's contents
 *
 * @param {Function} successCallback is called with no parameters
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.removeRecursively = function(successCallback, errorCallback) {
    argscheck.checkArgs('FF', 'DirectoryEntry.removeRecursively', arguments);
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };
    exec(successCallback, fail, "File", "removeRecursively", [this.fullPath]);
};

/**
 * Creates or looks up a file
 *
 * @param {DOMString} path either a relative or absolute path from this directory in which to look up or create a file
 * @param {Flags} options to create or exclusively create the file
 * @param {Function} successCallback is called with the new entry
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.getFile = function(path, options, successCallback, errorCallback) {
    argscheck.checkArgs('sOFF', 'DirectoryEntry.getFile', arguments);
    var win = successCallback && function(result) {
        var FileEntry = require('cordova/plugin/FileEntry');
        var entry = new FileEntry(result.name, result.fullPath);
        successCallback(entry);
    };
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };
    exec(win, fail, "File", "getFile", [this.fullPath, path, options]);
};

module.exports = DirectoryEntry;

});

// file: lib/common/plugin/DirectoryReader.js
define("cordova/plugin/DirectoryReader", function(require, exports, module) {

var exec = require('cordova/exec'),
    FileError = require('cordova/plugin/FileError') ;

/**
 * An interface that lists the files and directories in a directory.
 */
function DirectoryReader(path) {
    this.path = path || null;
}

/**
 * Returns a list of entries from a directory.
 *
 * @param {Function} successCallback is called with a list of entries
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryReader.prototype.readEntries = function(successCallback, errorCallback) {
    var win = typeof successCallback !== 'function' ? null : function(result) {
        var retVal = [];
        for (var i=0; i<result.length; i++) {
            var entry = null;
            if (result[i].isDirectory) {
                entry = new (require('cordova/plugin/DirectoryEntry'))();
            }
            else if (result[i].isFile) {
                entry = new (require('cordova/plugin/FileEntry'))();
            }
            entry.isDirectory = result[i].isDirectory;
            entry.isFile = result[i].isFile;
            entry.name = result[i].name;
            entry.fullPath = result[i].fullPath;
            retVal.push(entry);
        }
        successCallback(retVal);
    };
    var fail = typeof errorCallback !== 'function' ? null : function(code) {
        errorCallback(new FileError(code));
    };
    exec(win, fail, "File", "readEntries", [this.path]);
};

module.exports = DirectoryReader;

});

// file: lib/common/plugin/Entry.js
define("cordova/plugin/Entry", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec'),
    FileError = require('cordova/plugin/FileError'),
    Metadata = require('cordova/plugin/Metadata');

/**
 * Represents a file or directory on the local file system.
 *
 * @param isFile
 *            {boolean} true if Entry is a file (readonly)
 * @param isDirectory
 *            {boolean} true if Entry is a directory (readonly)
 * @param name
 *            {DOMString} name of the file or directory, excluding the path
 *            leading to it (readonly)
 * @param fullPath
 *            {DOMString} the absolute full path to the file or directory
 *            (readonly)
 */
function Entry(isFile, isDirectory, name, fullPath, fileSystem) {
    this.isFile = !!isFile;
    this.isDirectory = !!isDirectory;
    this.name = name || '';
    this.fullPath = fullPath || '';
    this.filesystem = fileSystem || null;
}

/**
 * Look up the metadata of the entry.
 *
 * @param successCallback
 *            {Function} is called with a Metadata object
 * @param errorCallback
 *            {Function} is called with a FileError
 */
Entry.prototype.getMetadata = function(successCallback, errorCallback) {
    argscheck.checkArgs('FF', 'Entry.getMetadata', arguments);
    var success = successCallback && function(lastModified) {
        var metadata = new Metadata(lastModified);
        successCallback(metadata);
    };
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };

    exec(success, fail, "File", "getMetadata", [this.fullPath]);
};

/**
 * Set the metadata of the entry.
 *
 * @param successCallback
 *            {Function} is called with a Metadata object
 * @param errorCallback
 *            {Function} is called with a FileError
 * @param metadataObject
 *            {Object} keys and values to set
 */
Entry.prototype.setMetadata = function(successCallback, errorCallback, metadataObject) {
    argscheck.checkArgs('FFO', 'Entry.setMetadata', arguments);
    exec(successCallback, errorCallback, "File", "setMetadata", [this.fullPath, metadataObject]);
};

/**
 * Move a file or directory to a new location.
 *
 * @param parent
 *            {DirectoryEntry} the directory to which to move this entry
 * @param newName
 *            {DOMString} new name of the entry, defaults to the current name
 * @param successCallback
 *            {Function} called with the new DirectoryEntry object
 * @param errorCallback
 *            {Function} called with a FileError
 */
Entry.prototype.moveTo = function(parent, newName, successCallback, errorCallback) {
    argscheck.checkArgs('oSFF', 'Entry.moveTo', arguments);
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };
    // source path
    var srcPath = this.fullPath,
        // entry name
        name = newName || this.name,
        success = function(entry) {
            if (entry) {
                if (successCallback) {
                    // create appropriate Entry object
                    var result = (entry.isDirectory) ? new (require('cordova/plugin/DirectoryEntry'))(entry.name, entry.fullPath) : new (require('cordova/plugin/FileEntry'))(entry.name, entry.fullPath);
                    successCallback(result);
                }
            }
            else {
                // no Entry object returned
                fail && fail(FileError.NOT_FOUND_ERR);
            }
        };

    // copy
    exec(success, fail, "File", "moveTo", [srcPath, parent.fullPath, name]);
};

/**
 * Copy a directory to a different location.
 *
 * @param parent
 *            {DirectoryEntry} the directory to which to copy the entry
 * @param newName
 *            {DOMString} new name of the entry, defaults to the current name
 * @param successCallback
 *            {Function} called with the new Entry object
 * @param errorCallback
 *            {Function} called with a FileError
 */
Entry.prototype.copyTo = function(parent, newName, successCallback, errorCallback) {
    argscheck.checkArgs('oSFF', 'Entry.copyTo', arguments);
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };

        // source path
    var srcPath = this.fullPath,
        // entry name
        name = newName || this.name,
        // success callback
        success = function(entry) {
            if (entry) {
                if (successCallback) {
                    // create appropriate Entry object
                    var result = (entry.isDirectory) ? new (require('cordova/plugin/DirectoryEntry'))(entry.name, entry.fullPath) : new (require('cordova/plugin/FileEntry'))(entry.name, entry.fullPath);
                    successCallback(result);
                }
            }
            else {
                // no Entry object returned
                fail && fail(FileError.NOT_FOUND_ERR);
            }
        };

    // copy
    exec(success, fail, "File", "copyTo", [srcPath, parent.fullPath, name]);
};

/**
 * Return a URL that can be used to identify this entry.
 */
Entry.prototype.toURL = function() {
    // fullPath attribute contains the full URL
    return this.fullPath;
};

/**
 * Returns a URI that can be used to identify this entry.
 *
 * @param {DOMString} mimeType for a FileEntry, the mime type to be used to interpret the file, when loaded through this URI.
 * @return uri
 */
Entry.prototype.toURI = function(mimeType) {
    console.log("DEPRECATED: Update your code to use 'toURL'");
    // fullPath attribute contains the full URI
    return this.toURL();
};

/**
 * Remove a file or directory. It is an error to attempt to delete a
 * directory that is not empty. It is an error to attempt to delete a
 * root directory of a file system.
 *
 * @param successCallback {Function} called with no parameters
 * @param errorCallback {Function} called with a FileError
 */
Entry.prototype.remove = function(successCallback, errorCallback) {
    argscheck.checkArgs('FF', 'Entry.remove', arguments);
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };
    exec(successCallback, fail, "File", "remove", [this.fullPath]);
};

/**
 * Look up the parent DirectoryEntry of this entry.
 *
 * @param successCallback {Function} called with the parent DirectoryEntry object
 * @param errorCallback {Function} called with a FileError
 */
Entry.prototype.getParent = function(successCallback, errorCallback) {
    argscheck.checkArgs('FF', 'Entry.getParent', arguments);
    var win = successCallback && function(result) {
        var DirectoryEntry = require('cordova/plugin/DirectoryEntry');
        var entry = new DirectoryEntry(result.name, result.fullPath);
        successCallback(entry);
    };
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };
    exec(win, fail, "File", "getParent", [this.fullPath]);
};

module.exports = Entry;

});

// file: lib/common/plugin/File.js
define("cordova/plugin/File", function(require, exports, module) {

/**
 * Constructor.
 * name {DOMString} name of the file, without path information
 * fullPath {DOMString} the full path of the file, including the name
 * type {DOMString} mime type
 * lastModifiedDate {Date} last modified date
 * size {Number} size of the file in bytes
 */

var File = function(name, fullPath, type, lastModifiedDate, size){
    this.name = name || '';
    this.fullPath = fullPath || null;
    this.type = type || null;
    this.lastModifiedDate = lastModifiedDate || null;
    this.size = size || 0;

    // These store the absolute start and end for slicing the file.
    this.start = 0;
    this.end = this.size;
};

/**
 * Returns a "slice" of the file. Since Cordova Files don't contain the actual
 * content, this really returns a File with adjusted start and end.
 * Slices of slices are supported.
 * start {Number} The index at which to start the slice (inclusive).
 * end {Number} The index at which to end the slice (exclusive).
 */
File.prototype.slice = function(start, end) {
    var size = this.end - this.start;
    var newStart = 0;
    var newEnd = size;
    if (arguments.length) {
        if (start < 0) {
            newStart = Math.max(size + start, 0);
        } else {
            newStart = Math.min(size, start);
        }
    }

    if (arguments.length >= 2) {
        if (end < 0) {
            newEnd = Math.max(size + end, 0);
        } else {
            newEnd = Math.min(end, size);
        }
    }

    var newFile = new File(this.name, this.fullPath, this.type, this.lastModifiedData, this.size);
    newFile.start = this.start + newStart;
    newFile.end = this.start + newEnd;
    return newFile;
};


module.exports = File;

});

// file: lib/common/plugin/FileEntry.js
define("cordova/plugin/FileEntry", function(require, exports, module) {

var utils = require('cordova/utils'),
    exec = require('cordova/exec'),
    Entry = require('cordova/plugin/Entry'),
    FileWriter = require('cordova/plugin/FileWriter'),
    File = require('cordova/plugin/File'),
    FileError = require('cordova/plugin/FileError');

/**
 * An interface representing a file on the file system.
 *
 * {boolean} isFile always true (readonly)
 * {boolean} isDirectory always false (readonly)
 * {DOMString} name of the file, excluding the path leading to it (readonly)
 * {DOMString} fullPath the absolute full path to the file (readonly)
 * {FileSystem} filesystem on which the file resides (readonly)
 */
var FileEntry = function(name, fullPath) {
     FileEntry.__super__.constructor.apply(this, [true, false, name, fullPath]);
};

utils.extend(FileEntry, Entry);

/**
 * Creates a new FileWriter associated with the file that this FileEntry represents.
 *
 * @param {Function} successCallback is called with the new FileWriter
 * @param {Function} errorCallback is called with a FileError
 */
FileEntry.prototype.createWriter = function(successCallback, errorCallback) {
    this.file(function(filePointer) {
        var writer = new FileWriter(filePointer);

        if (writer.fileName === null || writer.fileName === "") {
            errorCallback && errorCallback(new FileError(FileError.INVALID_STATE_ERR));
        } else {
            successCallback && successCallback(writer);
        }
    }, errorCallback);
};

/**
 * Returns a File that represents the current state of the file that this FileEntry represents.
 *
 * @param {Function} successCallback is called with the new File object
 * @param {Function} errorCallback is called with a FileError
 */
FileEntry.prototype.file = function(successCallback, errorCallback) {
    var win = successCallback && function(f) {
        var file = new File(f.name, f.fullPath, f.type, f.lastModifiedDate, f.size);
        successCallback(file);
    };
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };
    exec(win, fail, "File", "getFileMetadata", [this.fullPath]);
};


module.exports = FileEntry;

});

// file: lib/common/plugin/FileError.js
define("cordova/plugin/FileError", function(require, exports, module) {

/**
 * FileError
 */
function FileError(error) {
  this.code = error || null;
}

// File error codes
// Found in DOMException
FileError.NOT_FOUND_ERR = 1;
FileError.SECURITY_ERR = 2;
FileError.ABORT_ERR = 3;

// Added by File API specification
FileError.NOT_READABLE_ERR = 4;
FileError.ENCODING_ERR = 5;
FileError.NO_MODIFICATION_ALLOWED_ERR = 6;
FileError.INVALID_STATE_ERR = 7;
FileError.SYNTAX_ERR = 8;
FileError.INVALID_MODIFICATION_ERR = 9;
FileError.QUOTA_EXCEEDED_ERR = 10;
FileError.TYPE_MISMATCH_ERR = 11;
FileError.PATH_EXISTS_ERR = 12;

module.exports = FileError;

});

// file: lib/common/plugin/FileReader.js
define("cordova/plugin/FileReader", function(require, exports, module) {

var exec = require('cordova/exec'),
    modulemapper = require('cordova/modulemapper'),
    utils = require('cordova/utils'),
    File = require('cordova/plugin/File'),
    FileError = require('cordova/plugin/FileError'),
    ProgressEvent = require('cordova/plugin/ProgressEvent'),
    origFileReader = modulemapper.getOriginalSymbol(this, 'FileReader');

/**
 * This class reads the mobile device file system.
 *
 * For Android:
 *      The root directory is the root of the file system.
 *      To read from the SD card, the file name is "sdcard/my_file.txt"
 * @constructor
 */
var FileReader = function() {
    this._readyState = 0;
    this._error = null;
    this._result = null;
    this._fileName = '';
    this._realReader = origFileReader ? new origFileReader() : {};
};

// States
FileReader.EMPTY = 0;
FileReader.LOADING = 1;
FileReader.DONE = 2;

utils.defineGetter(FileReader.prototype, 'readyState', function() {
    return this._fileName ? this._readyState : this._realReader.readyState;
});

utils.defineGetter(FileReader.prototype, 'error', function() {
    return this._fileName ? this._error: this._realReader.error;
});

utils.defineGetter(FileReader.prototype, 'result', function() {
    return this._fileName ? this._result: this._realReader.result;
});

function defineEvent(eventName) {
    utils.defineGetterSetter(FileReader.prototype, eventName, function() {
        return this._realReader[eventName] || null;
    }, function(value) {
        this._realReader[eventName] = value;
    });
}
defineEvent('onloadstart');    // When the read starts.
defineEvent('onprogress');     // While reading (and decoding) file or fileBlob data, and reporting partial file data (progress.loaded/progress.total)
defineEvent('onload');         // When the read has successfully completed.
defineEvent('onerror');        // When the read has failed (see errors).
defineEvent('onloadend');      // When the request has completed (either in success or failure).
defineEvent('onabort');        // When the read has been aborted. For instance, by invoking the abort() method.

function initRead(reader, file) {
    // Already loading something
    if (reader.readyState == FileReader.LOADING) {
      throw new FileError(FileError.INVALID_STATE_ERR);
    }

    reader._result = null;
    reader._error = null;
    reader._readyState = FileReader.LOADING;

    if (typeof file == 'string') {
        // Deprecated in Cordova 2.4.
        console.warn('Using a string argument with FileReader.readAs functions is deprecated.');
        reader._fileName = file;
    } else if (typeof file.fullPath == 'string') {
        reader._fileName = file.fullPath;
    } else {
        reader._fileName = '';
        return true;
    }

    reader.onloadstart && reader.onloadstart(new ProgressEvent("loadstart", {target:reader}));
}

/**
 * Abort reading file.
 */
FileReader.prototype.abort = function() {
    if (origFileReader && !this._fileName) {
        return this._realReader.abort();
    }
    this._result = null;

    if (this._readyState == FileReader.DONE || this._readyState == FileReader.EMPTY) {
      return;
    }

    this._readyState = FileReader.DONE;

    // If abort callback
    if (typeof this.onabort === 'function') {
        this.onabort(new ProgressEvent('abort', {target:this}));
    }
    // If load end callback
    if (typeof this.onloadend === 'function') {
        this.onloadend(new ProgressEvent('loadend', {target:this}));
    }
};

/**
 * Read text file.
 *
 * @param file          {File} File object containing file properties
 * @param encoding      [Optional] (see http://www.iana.org/assignments/character-sets)
 */
FileReader.prototype.readAsText = function(file, encoding) {
    if (initRead(this, file)) {
        return this._realReader.readAsText(file, encoding);
    }

    // Default encoding is UTF-8
    var enc = encoding ? encoding : "UTF-8";
    var me = this;
    var execArgs = [this._fileName, enc, file.start, file.end];

    // Read file
    exec(
        // Success callback
        function(r) {
            // If DONE (cancelled), then don't do anything
            if (me._readyState === FileReader.DONE) {
                return;
            }

            // Save result
            me._result = r;

            // If onload callback
            if (typeof me.onload === "function") {
                me.onload(new ProgressEvent("load", {target:me}));
            }

            // DONE state
            me._readyState = FileReader.DONE;

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", {target:me}));
            }
        },
        // Error callback
        function(e) {
            // If DONE (cancelled), then don't do anything
            if (me._readyState === FileReader.DONE) {
                return;
            }

            // DONE state
            me._readyState = FileReader.DONE;

            // null result
            me._result = null;

            // Save error
            me._error = new FileError(e);

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror(new ProgressEvent("error", {target:me}));
            }

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", {target:me}));
            }
        }, "File", "readAsText", execArgs);
};


/**
 * Read file and return data as a base64 encoded data url.
 * A data url is of the form:
 *      data:[<mediatype>][;base64],<data>
 *
 * @param file          {File} File object containing file properties
 */
FileReader.prototype.readAsDataURL = function(file) {
    if (initRead(this, file)) {
        return this._realReader.readAsDataURL(file);
    }

    var me = this;
    var execArgs = [this._fileName, file.start, file.end];

    // Read file
    exec(
        // Success callback
        function(r) {
            // If DONE (cancelled), then don't do anything
            if (me._readyState === FileReader.DONE) {
                return;
            }

            // DONE state
            me._readyState = FileReader.DONE;

            // Save result
            me._result = r;

            // If onload callback
            if (typeof me.onload === "function") {
                me.onload(new ProgressEvent("load", {target:me}));
            }

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", {target:me}));
            }
        },
        // Error callback
        function(e) {
            // If DONE (cancelled), then don't do anything
            if (me._readyState === FileReader.DONE) {
                return;
            }

            // DONE state
            me._readyState = FileReader.DONE;

            me._result = null;

            // Save error
            me._error = new FileError(e);

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror(new ProgressEvent("error", {target:me}));
            }

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", {target:me}));
            }
        }, "File", "readAsDataURL", execArgs);
};

/**
 * Read file and return data as a binary data.
 *
 * @param file          {File} File object containing file properties
 */
FileReader.prototype.readAsBinaryString = function(file) {
    if (initRead(this, file)) {
        return this._realReader.readAsBinaryString(file);
    }

    var me = this;
    var execArgs = [this._fileName, file.start, file.end];

    // Read file
    exec(
        // Success callback
        function(r) {
            // If DONE (cancelled), then don't do anything
            if (me._readyState === FileReader.DONE) {
                return;
            }

            // DONE state
            me._readyState = FileReader.DONE;

            me._result = r;

            // If onload callback
            if (typeof me.onload === "function") {
                me.onload(new ProgressEvent("load", {target:me}));
            }

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", {target:me}));
            }
        },
        // Error callback
        function(e) {
            // If DONE (cancelled), then don't do anything
            if (me._readyState === FileReader.DONE) {
                return;
            }

            // DONE state
            me._readyState = FileReader.DONE;

            me._result = null;

            // Save error
            me._error = new FileError(e);

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror(new ProgressEvent("error", {target:me}));
            }

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", {target:me}));
            }
        }, "File", "readAsBinaryString", execArgs);
};

/**
 * Read file and return data as a binary data.
 *
 * @param file          {File} File object containing file properties
 */
FileReader.prototype.readAsArrayBuffer = function(file) {
    if (initRead(this, file)) {
        return this._realReader.readAsArrayBuffer(file);
    }

    var me = this;
    var execArgs = [this._fileName, file.start, file.end];

    // Read file
    exec(
        // Success callback
        function(r) {
            // If DONE (cancelled), then don't do anything
            if (me._readyState === FileReader.DONE) {
                return;
            }

            // DONE state
            me._readyState = FileReader.DONE;

            me._result = r;

            // If onload callback
            if (typeof me.onload === "function") {
                me.onload(new ProgressEvent("load", {target:me}));
            }

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", {target:me}));
            }
        },
        // Error callback
        function(e) {
            // If DONE (cancelled), then don't do anything
            if (me._readyState === FileReader.DONE) {
                return;
            }

            // DONE state
            me._readyState = FileReader.DONE;

            me._result = null;

            // Save error
            me._error = new FileError(e);

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror(new ProgressEvent("error", {target:me}));
            }

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", {target:me}));
            }
        }, "File", "readAsArrayBuffer", execArgs);
};

module.exports = FileReader;

});

// file: lib/common/plugin/FileSystem.js
define("cordova/plugin/FileSystem", function(require, exports, module) {

var DirectoryEntry = require('cordova/plugin/DirectoryEntry');

/**
 * An interface representing a file system
 *
 * @constructor
 * {DOMString} name the unique name of the file system (readonly)
 * {DirectoryEntry} root directory of the file system (readonly)
 */
var FileSystem = function(name, root) {
    this.name = name || null;
    if (root) {
        this.root = new DirectoryEntry(root.name, root.fullPath);
    }
};

module.exports = FileSystem;

});

// file: lib/common/plugin/FileTransfer.js
define("cordova/plugin/FileTransfer", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec'),
    FileTransferError = require('cordova/plugin/FileTransferError'),
    ProgressEvent = require('cordova/plugin/ProgressEvent');

function newProgressEvent(result) {
    var pe = new ProgressEvent();
    pe.lengthComputable = result.lengthComputable;
    pe.loaded = result.loaded;
    pe.total = result.total;
    return pe;
}

function getBasicAuthHeader(urlString) {
    var header =  null;

    if (window.btoa) {
        // parse the url using the Location object
        var url = document.createElement('a');
        url.href = urlString;

        var credentials = null;
        var protocol = url.protocol + "//";
        var origin = protocol + url.host;

        // check whether there are the username:password credentials in the url
        if (url.href.indexOf(origin) !== 0) { // credentials found
            var atIndex = url.href.indexOf("@");
            credentials = url.href.substring(protocol.length, atIndex);
        }

        if (credentials) {
            var authHeader = "Authorization";
            var authHeaderValue = "Basic " + window.btoa(credentials);

            header = {
                name : authHeader,
                value : authHeaderValue
            };
        }
    }

    return header;
}

var idCounter = 0;

/**
 * FileTransfer uploads a file to a remote server.
 * @constructor
 */
var FileTransfer = function() {
    this._id = ++idCounter;
    this.onprogress = null; // optional callback
};

/**
* Given an absolute file path, uploads a file on the device to a remote server
* using a multipart HTTP request.
* @param filePath {String}           Full path of the file on the device
* @param server {String}             URL of the server to receive the file
* @param successCallback (Function}  Callback to be invoked when upload has completed
* @param errorCallback {Function}    Callback to be invoked upon error
* @param options {FileUploadOptions} Optional parameters such as file name and mimetype
* @param trustAllHosts {Boolean} Optional trust all hosts (e.g. for self-signed certs), defaults to false
*/
FileTransfer.prototype.upload = function(filePath, server, successCallback, errorCallback, options, trustAllHosts) {
    argscheck.checkArgs('ssFFO*', 'FileTransfer.upload', arguments);
    // check for options
    var fileKey = null;
    var fileName = null;
    var mimeType = null;
    var params = null;
    var chunkedMode = true;
    var headers = null;
    var httpMethod = null;
    var basicAuthHeader = getBasicAuthHeader(server);
    if (basicAuthHeader) {
        options = options || {};
        options.headers = options.headers || {};
        options.headers[basicAuthHeader.name] = basicAuthHeader.value;
    }

    if (options) {
        fileKey = options.fileKey;
        fileName = options.fileName;
        mimeType = options.mimeType;
        headers = options.headers;
        httpMethod = options.httpMethod || "POST";
        if (httpMethod.toUpperCase() == "PUT"){
            httpMethod = "PUT";
        } else {
            httpMethod = "POST";
        }
        if (options.chunkedMode !== null || typeof options.chunkedMode != "undefined") {
            chunkedMode = options.chunkedMode;
        }
        if (options.params) {
            params = options.params;
        }
        else {
            params = {};
        }
    }

    var fail = errorCallback && function(e) {
        var error = new FileTransferError(e.code, e.source, e.target, e.http_status, e.body);
        errorCallback(error);
    };

    var self = this;
    var win = function(result) {
        if (typeof result.lengthComputable != "undefined") {
            if (self.onprogress) {
                self.onprogress(newProgressEvent(result));
            }
        } else {
            successCallback && successCallback(result);
        }
    };
    exec(win, fail, 'FileTransfer', 'upload', [filePath, server, fileKey, fileName, mimeType, params, trustAllHosts, chunkedMode, headers, this._id, httpMethod]);
};

/**
 * Downloads a file form a given URL and saves it to the specified directory.
 * @param source {String}          URL of the server to receive the file
 * @param target {String}         Full path of the file on the device
 * @param successCallback (Function}  Callback to be invoked when upload has completed
 * @param errorCallback {Function}    Callback to be invoked upon error
 * @param trustAllHosts {Boolean} Optional trust all hosts (e.g. for self-signed certs), defaults to false
 * @param options {FileDownloadOptions} Optional parameters such as headers
 */
FileTransfer.prototype.download = function(source, target, successCallback, errorCallback, trustAllHosts, options) {
    argscheck.checkArgs('ssFF*', 'FileTransfer.download', arguments);
    var self = this;

    var basicAuthHeader = getBasicAuthHeader(source);
    if (basicAuthHeader) {
        options = options || {};
        options.headers = options.headers || {};
        options.headers[basicAuthHeader.name] = basicAuthHeader.value;
    }

    var headers = null;
    if (options) {
        headers = options.headers || null;
    }

    var win = function(result) {
        if (typeof result.lengthComputable != "undefined") {
            if (self.onprogress) {
                return self.onprogress(newProgressEvent(result));
            }
        } else if (successCallback) {
            var entry = null;
            if (result.isDirectory) {
                entry = new (require('cordova/plugin/DirectoryEntry'))();
            }
            else if (result.isFile) {
                entry = new (require('cordova/plugin/FileEntry'))();
            }
            entry.isDirectory = result.isDirectory;
            entry.isFile = result.isFile;
            entry.name = result.name;
            entry.fullPath = result.fullPath;
            successCallback(entry);
        }
    };

    var fail = errorCallback && function(e) {
        var error = new FileTransferError(e.code, e.source, e.target, e.http_status, e.body);
        errorCallback(error);
    };

    exec(win, fail, 'FileTransfer', 'download', [source, target, trustAllHosts, this._id, headers]);
};

/**
 * Aborts the ongoing file transfer on this object. The original error
 * callback for the file transfer will be called if necessary.
 */
FileTransfer.prototype.abort = function() {
    exec(null, null, 'FileTransfer', 'abort', [this._id]);
};

module.exports = FileTransfer;

});

// file: lib/common/plugin/FileTransferError.js
define("cordova/plugin/FileTransferError", function(require, exports, module) {

/**
 * FileTransferError
 * @constructor
 */
var FileTransferError = function(code, source, target, status, body) {
    this.code = code || null;
    this.source = source || null;
    this.target = target || null;
    this.http_status = status || null;
    this.body = body || null;
};

FileTransferError.FILE_NOT_FOUND_ERR = 1;
FileTransferError.INVALID_URL_ERR = 2;
FileTransferError.CONNECTION_ERR = 3;
FileTransferError.ABORT_ERR = 4;

module.exports = FileTransferError;

});

// file: lib/common/plugin/FileUploadOptions.js
define("cordova/plugin/FileUploadOptions", function(require, exports, module) {

/**
 * Options to customize the HTTP request used to upload files.
 * @constructor
 * @param fileKey {String}   Name of file request parameter.
 * @param fileName {String}  Filename to be used by the server. Defaults to image.jpg.
 * @param mimeType {String}  Mimetype of the uploaded file. Defaults to image/jpeg.
 * @param params {Object}    Object with key: value params to send to the server.
 * @param headers {Object}   Keys are header names, values are header values. Multiple
 *                           headers of the same name are not supported.
 */
var FileUploadOptions = function(fileKey, fileName, mimeType, params, headers, httpMethod) {
    this.fileKey = fileKey || null;
    this.fileName = fileName || null;
    this.mimeType = mimeType || null;
    this.params = params || null;
    this.headers = headers || null;
    this.httpMethod = httpMethod || null;
};

module.exports = FileUploadOptions;

});

// file: lib/common/plugin/FileUploadResult.js
define("cordova/plugin/FileUploadResult", function(require, exports, module) {

/**
 * FileUploadResult
 * @constructor
 */
var FileUploadResult = function() {
    this.bytesSent = 0;
    this.responseCode = null;
    this.response = null;
};

module.exports = FileUploadResult;

});

// file: lib/common/plugin/FileWriter.js
define("cordova/plugin/FileWriter", function(require, exports, module) {

var exec = require('cordova/exec'),
    FileError = require('cordova/plugin/FileError'),
    ProgressEvent = require('cordova/plugin/ProgressEvent');

/**
 * This class writes to the mobile device file system.
 *
 * For Android:
 *      The root directory is the root of the file system.
 *      To write to the SD card, the file name is "sdcard/my_file.txt"
 *
 * @constructor
 * @param file {File} File object containing file properties
 * @param append if true write to the end of the file, otherwise overwrite the file
 */
var FileWriter = function(file) {
    this.fileName = "";
    this.length = 0;
    if (file) {
        this.fileName = file.fullPath || file;
        this.length = file.size || 0;
    }
    // default is to write at the beginning of the file
    this.position = 0;

    this.readyState = 0; // EMPTY

    this.result = null;

    // Error
    this.error = null;

    // Event handlers
    this.onwritestart = null;   // When writing starts
    this.onprogress = null;     // While writing the file, and reporting partial file data
    this.onwrite = null;        // When the write has successfully completed.
    this.onwriteend = null;     // When the request has completed (either in success or failure).
    this.onabort = null;        // When the write has been aborted. For instance, by invoking the abort() method.
    this.onerror = null;        // When the write has failed (see errors).
};

// States
FileWriter.INIT = 0;
FileWriter.WRITING = 1;
FileWriter.DONE = 2;

/**
 * Abort writing file.
 */
FileWriter.prototype.abort = function() {
    // check for invalid state
    if (this.readyState === FileWriter.DONE || this.readyState === FileWriter.INIT) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    // set error
    this.error = new FileError(FileError.ABORT_ERR);

    this.readyState = FileWriter.DONE;

    // If abort callback
    if (typeof this.onabort === "function") {
        this.onabort(new ProgressEvent("abort", {"target":this}));
    }

    // If write end callback
    if (typeof this.onwriteend === "function") {
        this.onwriteend(new ProgressEvent("writeend", {"target":this}));
    }
};

/**
 * Writes data to the file
 *
 * @param text to be written
 */
FileWriter.prototype.write = function(text) {
    // Throw an exception if we are already writing a file
    if (this.readyState === FileWriter.WRITING) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    // WRITING state
    this.readyState = FileWriter.WRITING;

    var me = this;

    // If onwritestart callback
    if (typeof me.onwritestart === "function") {
        me.onwritestart(new ProgressEvent("writestart", {"target":me}));
    }

    // Write file
    exec(
        // Success callback
        function(r) {
            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileWriter.DONE) {
                return;
            }

            // position always increases by bytes written because file would be extended
            me.position += r;
            // The length of the file is now where we are done writing.

            me.length = me.position;

            // DONE state
            me.readyState = FileWriter.DONE;

            // If onwrite callback
            if (typeof me.onwrite === "function") {
                me.onwrite(new ProgressEvent("write", {"target":me}));
            }

            // If onwriteend callback
            if (typeof me.onwriteend === "function") {
                me.onwriteend(new ProgressEvent("writeend", {"target":me}));
            }
        },
        // Error callback
        function(e) {
            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileWriter.DONE) {
                return;
            }

            // DONE state
            me.readyState = FileWriter.DONE;

            // Save error
            me.error = new FileError(e);

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror(new ProgressEvent("error", {"target":me}));
            }

            // If onwriteend callback
            if (typeof me.onwriteend === "function") {
                me.onwriteend(new ProgressEvent("writeend", {"target":me}));
            }
        }, "File", "write", [this.fileName, text, this.position]);
};

/**
 * Moves the file pointer to the location specified.
 *
 * If the offset is a negative number the position of the file
 * pointer is rewound.  If the offset is greater than the file
 * size the position is set to the end of the file.
 *
 * @param offset is the location to move the file pointer to.
 */
FileWriter.prototype.seek = function(offset) {
    // Throw an exception if we are already writing a file
    if (this.readyState === FileWriter.WRITING) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    if (!offset && offset !== 0) {
        return;
    }

    // See back from end of file.
    if (offset < 0) {
        this.position = Math.max(offset + this.length, 0);
    }
    // Offset is bigger than file size so set position
    // to the end of the file.
    else if (offset > this.length) {
        this.position = this.length;
    }
    // Offset is between 0 and file size so set the position
    // to start writing.
    else {
        this.position = offset;
    }
};

/**
 * Truncates the file to the size specified.
 *
 * @param size to chop the file at.
 */
FileWriter.prototype.truncate = function(size) {
    // Throw an exception if we are already writing a file
    if (this.readyState === FileWriter.WRITING) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    // WRITING state
    this.readyState = FileWriter.WRITING;

    var me = this;

    // If onwritestart callback
    if (typeof me.onwritestart === "function") {
        me.onwritestart(new ProgressEvent("writestart", {"target":this}));
    }

    // Write file
    exec(
        // Success callback
        function(r) {
            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileWriter.DONE) {
                return;
            }

            // DONE state
            me.readyState = FileWriter.DONE;

            // Update the length of the file
            me.length = r;
            me.position = Math.min(me.position, r);

            // If onwrite callback
            if (typeof me.onwrite === "function") {
                me.onwrite(new ProgressEvent("write", {"target":me}));
            }

            // If onwriteend callback
            if (typeof me.onwriteend === "function") {
                me.onwriteend(new ProgressEvent("writeend", {"target":me}));
            }
        },
        // Error callback
        function(e) {
            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileWriter.DONE) {
                return;
            }

            // DONE state
            me.readyState = FileWriter.DONE;

            // Save error
            me.error = new FileError(e);

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror(new ProgressEvent("error", {"target":me}));
            }

            // If onwriteend callback
            if (typeof me.onwriteend === "function") {
                me.onwriteend(new ProgressEvent("writeend", {"target":me}));
            }
        }, "File", "truncate", [this.fileName, size]);
};

module.exports = FileWriter;

});

// file: lib/common/plugin/Flags.js
define("cordova/plugin/Flags", function(require, exports, module) {

/**
 * Supplies arguments to methods that lookup or create files and directories.
 *
 * @param create
 *            {boolean} file or directory if it doesn't exist
 * @param exclusive
 *            {boolean} used with create; if true the command will fail if
 *            target path exists
 */
function Flags(create, exclusive) {
    this.create = create || false;
    this.exclusive = exclusive || false;
}

module.exports = Flags;

});

// file: lib/common/plugin/GlobalizationError.js
define("cordova/plugin/GlobalizationError", function(require, exports, module) {


/**
 * Globalization error object
 *
 * @constructor
 * @param code
 * @param message
 */
var GlobalizationError = function(code, message) {
    this.code = code || null;
    this.message = message || '';
};

// Globalization error codes
GlobalizationError.UNKNOWN_ERROR = 0;
GlobalizationError.FORMATTING_ERROR = 1;
GlobalizationError.PARSING_ERROR = 2;
GlobalizationError.PATTERN_ERROR = 3;

module.exports = GlobalizationError;

});

// file: lib/common/plugin/InAppBrowser.js
define("cordova/plugin/InAppBrowser", function(require, exports, module) {

var exec = require('cordova/exec');
var channel = require('cordova/channel');
var modulemapper = require('cordova/modulemapper');

function InAppBrowser() {
   this.channels = {
        'loadstart': channel.create('loadstart'),
        'loadstop' : channel.create('loadstop'),
        'loaderror' : channel.create('loaderror'),
        'exit' : channel.create('exit')
   };
}

InAppBrowser.prototype = {
    _eventHandler: function (event) {
        if (event.type in this.channels) {
            this.channels[event.type].fire(event);
        }
    },
    close: function (eventname) {
        exec(null, null, "InAppBrowser", "close", []);
    },
    addEventListener: function (eventname,f) {
        if (eventname in this.channels) {
            this.channels[eventname].subscribe(f);
        }
    },
    removeEventListener: function(eventname, f) {
        if (eventname in this.channels) {
            this.channels[eventname].unsubscribe(f);
        }
    },

    executeScript: function(injectDetails, cb) {
        if (injectDetails.code) {
            exec(cb, null, "InAppBrowser", "injectScriptCode", [injectDetails.code, !!cb]);
        } else if (injectDetails.file) {
            exec(cb, null, "InAppBrowser", "injectScriptFile", [injectDetails.file, !!cb]);
        } else {
            throw new Error('executeScript requires exactly one of code or file to be specified');
        }
    },

    insertCSS: function(injectDetails, cb) {
        if (injectDetails.code) {
            exec(cb, null, "InAppBrowser", "injectStyleCode", [injectDetails.code, !!cb]);
        } else if (injectDetails.file) {
            exec(cb, null, "InAppBrowser", "injectStyleFile", [injectDetails.file, !!cb]);
        } else {
            throw new Error('insertCSS requires exactly one of code or file to be specified');
        }
    }
};

module.exports = function(strUrl, strWindowName, strWindowFeatures) {
    var iab = new InAppBrowser();
    var cb = function(eventname) {
       iab._eventHandler(eventname);
    };

    // Don't catch calls that write to existing frames (e.g. named iframes).
    if (window.frames && window.frames[strWindowName]) {
        var origOpenFunc = modulemapper.getOriginalSymbol(window, 'open');
        return origOpenFunc.apply(window, arguments);
    }

    exec(cb, cb, "InAppBrowser", "open", [strUrl, strWindowName, strWindowFeatures]);
    return iab;
};


});

// file: lib/common/plugin/LocalFileSystem.js
define("cordova/plugin/LocalFileSystem", function(require, exports, module) {

var exec = require('cordova/exec');

/**
 * Represents a local file system.
 */
var LocalFileSystem = function() {

};

LocalFileSystem.TEMPORARY = 0; //temporary, with no guarantee of persistence
LocalFileSystem.PERSISTENT = 1; //persistent

module.exports = LocalFileSystem;

});

// file: lib/common/plugin/Media.js
define("cordova/plugin/Media", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec');

var mediaObjects = {};

/**
 * This class provides access to the device media, interfaces to both sound and video
 *
 * @constructor
 * @param src                   The file name or url to play
 * @param successCallback       The callback to be called when the file is done playing or recording.
 *                                  successCallback()
 * @param errorCallback         The callback to be called if there is an error.
 *                                  errorCallback(int errorCode) - OPTIONAL
 * @param statusCallback        The callback to be called when media status has changed.
 *                                  statusCallback(int statusCode) - OPTIONAL
 */
var Media = function(src, successCallback, errorCallback, statusCallback) {
    argscheck.checkArgs('SFFF', 'Media', arguments);
    this.id = utils.createUUID();
    mediaObjects[this.id] = this;
    this.src = src;
    this.successCallback = successCallback;
    this.errorCallback = errorCallback;
    this.statusCallback = statusCallback;
    this._duration = -1;
    this._position = -1;
    exec(null, this.errorCallback, "Media", "create", [this.id, this.src]);
};

// Media messages
Media.MEDIA_STATE = 1;
Media.MEDIA_DURATION = 2;
Media.MEDIA_POSITION = 3;
Media.MEDIA_ERROR = 9;

// Media states
Media.MEDIA_NONE = 0;
Media.MEDIA_STARTING = 1;
Media.MEDIA_RUNNING = 2;
Media.MEDIA_PAUSED = 3;
Media.MEDIA_STOPPED = 4;
Media.MEDIA_MSG = ["None", "Starting", "Running", "Paused", "Stopped"];

// "static" function to return existing objs.
Media.get = function(id) {
    return mediaObjects[id];
};

/**
 * Start or resume playing audio file.
 */
Media.prototype.play = function(options) {
    exec(null, null, "Media", "startPlayingAudio", [this.id, this.src, options]);
};

/**
 * Stop playing audio file.
 */
Media.prototype.stop = function() {
    var me = this;
    exec(function() {
        me._position = 0;
    }, this.errorCallback, "Media", "stopPlayingAudio", [this.id]);
};

/**
 * Seek or jump to a new time in the track..
 */
Media.prototype.seekTo = function(milliseconds) {
    var me = this;
    exec(function(p) {
        me._position = p;
    }, this.errorCallback, "Media", "seekToAudio", [this.id, milliseconds]);
};

/**
 * Pause playing audio file.
 */
Media.prototype.pause = function() {
    exec(null, this.errorCallback, "Media", "pausePlayingAudio", [this.id]);
};

/**
 * Get duration of an audio file.
 * The duration is only set for audio that is playing, paused or stopped.
 *
 * @return      duration or -1 if not known.
 */
Media.prototype.getDuration = function() {
    return this._duration;
};

/**
 * Get position of audio.
 */
Media.prototype.getCurrentPosition = function(success, fail) {
    var me = this;
    exec(function(p) {
        me._position = p;
        success(p);
    }, fail, "Media", "getCurrentPositionAudio", [this.id]);
};

/**
 * Start recording audio file.
 */
Media.prototype.startRecord = function() {
    exec(null, this.errorCallback, "Media", "startRecordingAudio", [this.id, this.src]);
};

/**
 * Stop recording audio file.
 */
Media.prototype.stopRecord = function() {
    exec(null, this.errorCallback, "Media", "stopRecordingAudio", [this.id]);
};

/**
 * Release the resources.
 */
Media.prototype.release = function() {
    exec(null, this.errorCallback, "Media", "release", [this.id]);
};

/**
 * Adjust the volume.
 */
Media.prototype.setVolume = function(volume) {
    exec(null, null, "Media", "setVolume", [this.id, volume]);
};

/**
 * Audio has status update.
 * PRIVATE
 *
 * @param id            The media object id (string)
 * @param msgType       The 'type' of update this is
 * @param value         Use of value is determined by the msgType
 */
Media.onStatus = function(id, msgType, value) {

    var media = mediaObjects[id];

    if(media) {
        switch(msgType) {
            case Media.MEDIA_STATE :
                media.statusCallback && media.statusCallback(value);
                if(value == Media.MEDIA_STOPPED) {
                    media.successCallback && media.successCallback();
                }
                break;
            case Media.MEDIA_DURATION :
                media._duration = value;
                break;
            case Media.MEDIA_ERROR :
                media.errorCallback && media.errorCallback(value);
                break;
            case Media.MEDIA_POSITION :
                media._position = Number(value);
                break;
            default :
                console.error && console.error("Unhandled Media.onStatus :: " + msgType);
                break;
        }
    }
    else {
         console.error && console.error("Received Media.onStatus callback for unknown media :: " + id);
    }

};

module.exports = Media;

});

// file: lib/common/plugin/MediaError.js
define("cordova/plugin/MediaError", function(require, exports, module) {

/**
 * This class contains information about any Media errors.
*/
/*
 According to :: http://dev.w3.org/html5/spec-author-view/video.html#mediaerror
 We should never be creating these objects, we should just implement the interface
 which has 1 property for an instance, 'code'

 instead of doing :
    errorCallbackFunction( new MediaError(3,'msg') );
we should simply use a literal :
    errorCallbackFunction( {'code':3} );
 */

 var _MediaError = window.MediaError;


if(!_MediaError) {
    window.MediaError = _MediaError = function(code, msg) {
        this.code = (typeof code != 'undefined') ? code : null;
        this.message = msg || ""; // message is NON-standard! do not use!
    };
}

_MediaError.MEDIA_ERR_NONE_ACTIVE    = _MediaError.MEDIA_ERR_NONE_ACTIVE    || 0;
_MediaError.MEDIA_ERR_ABORTED        = _MediaError.MEDIA_ERR_ABORTED        || 1;
_MediaError.MEDIA_ERR_NETWORK        = _MediaError.MEDIA_ERR_NETWORK        || 2;
_MediaError.MEDIA_ERR_DECODE         = _MediaError.MEDIA_ERR_DECODE         || 3;
_MediaError.MEDIA_ERR_NONE_SUPPORTED = _MediaError.MEDIA_ERR_NONE_SUPPORTED || 4;
// TODO: MediaError.MEDIA_ERR_NONE_SUPPORTED is legacy, the W3 spec now defines it as below.
// as defined by http://dev.w3.org/html5/spec-author-view/video.html#error-codes
_MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED = _MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || 4;

module.exports = _MediaError;

});

// file: lib/common/plugin/MediaFile.js
define("cordova/plugin/MediaFile", function(require, exports, module) {

var utils = require('cordova/utils'),
    exec = require('cordova/exec'),
    File = require('cordova/plugin/File'),
    CaptureError = require('cordova/plugin/CaptureError');
/**
 * Represents a single file.
 *
 * name {DOMString} name of the file, without path information
 * fullPath {DOMString} the full path of the file, including the name
 * type {DOMString} mime type
 * lastModifiedDate {Date} last modified date
 * size {Number} size of the file in bytes
 */
var MediaFile = function(name, fullPath, type, lastModifiedDate, size){
    MediaFile.__super__.constructor.apply(this, arguments);
};

utils.extend(MediaFile, File);

/**
 * Request capture format data for a specific file and type
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 */
MediaFile.prototype.getFormatData = function(successCallback, errorCallback) {
    if (typeof this.fullPath === "undefined" || this.fullPath === null) {
        errorCallback(new CaptureError(CaptureError.CAPTURE_INVALID_ARGUMENT));
    } else {
        exec(successCallback, errorCallback, "Capture", "getFormatData", [this.fullPath, this.type]);
    }
};

module.exports = MediaFile;

});

// file: lib/common/plugin/MediaFileData.js
define("cordova/plugin/MediaFileData", function(require, exports, module) {

/**
 * MediaFileData encapsulates format information of a media file.
 *
 * @param {DOMString} codecs
 * @param {long} bitrate
 * @param {long} height
 * @param {long} width
 * @param {float} duration
 */
var MediaFileData = function(codecs, bitrate, height, width, duration){
    this.codecs = codecs || null;
    this.bitrate = bitrate || 0;
    this.height = height || 0;
    this.width = width || 0;
    this.duration = duration || 0;
};

module.exports = MediaFileData;

});

// file: lib/common/plugin/Metadata.js
define("cordova/plugin/Metadata", function(require, exports, module) {

/**
 * Information about the state of the file or directory
 *
 * {Date} modificationTime (readonly)
 */
var Metadata = function(time) {
    this.modificationTime = (typeof time != 'undefined'?new Date(time):null);
};

module.exports = Metadata;

});

// file: lib/common/plugin/Position.js
define("cordova/plugin/Position", function(require, exports, module) {

var Coordinates = require('cordova/plugin/Coordinates');

var Position = function(coords, timestamp) {
    if (coords) {
        this.coords = new Coordinates(coords.latitude, coords.longitude, coords.altitude, coords.accuracy, coords.heading, coords.velocity, coords.altitudeAccuracy);
    } else {
        this.coords = new Coordinates();
    }
    this.timestamp = (timestamp !== undefined) ? timestamp : new Date();
};

module.exports = Position;

});

// file: lib/common/plugin/PositionError.js
define("cordova/plugin/PositionError", function(require, exports, module) {

/**
 * Position error object
 *
 * @constructor
 * @param code
 * @param message
 */
var PositionError = function(code, message) {
    this.code = code || null;
    this.message = message || '';
};

PositionError.PERMISSION_DENIED = 1;
PositionError.POSITION_UNAVAILABLE = 2;
PositionError.TIMEOUT = 3;

module.exports = PositionError;

});

// file: lib/common/plugin/ProgressEvent.js
define("cordova/plugin/ProgressEvent", function(require, exports, module) {

// If ProgressEvent exists in global context, use it already, otherwise use our own polyfill
// Feature test: See if we can instantiate a native ProgressEvent;
// if so, use that approach,
// otherwise fill-in with our own implementation.
//
// NOTE: right now we always fill in with our own. Down the road would be nice if we can use whatever is native in the webview.
var ProgressEvent = (function() {
    /*
    var createEvent = function(data) {
        var event = document.createEvent('Events');
        event.initEvent('ProgressEvent', false, false);
        if (data) {
            for (var i in data) {
                if (data.hasOwnProperty(i)) {
                    event[i] = data[i];
                }
            }
            if (data.target) {
                // TODO: cannot call <some_custom_object>.dispatchEvent
                // need to first figure out how to implement EventTarget
            }
        }
        return event;
    };
    try {
        var ev = createEvent({type:"abort",target:document});
        return function ProgressEvent(type, data) {
            data.type = type;
            return createEvent(data);
        };
    } catch(e){
    */
        return function ProgressEvent(type, dict) {
            this.type = type;
            this.bubbles = false;
            this.cancelBubble = false;
            this.cancelable = false;
            this.lengthComputable = false;
            this.loaded = dict && dict.loaded ? dict.loaded : 0;
            this.total = dict && dict.total ? dict.total : 0;
            this.target = dict && dict.target ? dict.target : null;
        };
    //}
})();

module.exports = ProgressEvent;

});

// file: lib/common/plugin/accelerometer.js
define("cordova/plugin/accelerometer", function(require, exports, module) {

/**
 * This class provides access to device accelerometer data.
 * @constructor
 */
var argscheck = require('cordova/argscheck'),
    utils = require("cordova/utils"),
    exec = require("cordova/exec"),
    Acceleration = require('cordova/plugin/Acceleration');

// Is the accel sensor running?
var running = false;

// Keeps reference to watchAcceleration calls.
var timers = {};

// Array of listeners; used to keep track of when we should call start and stop.
var listeners = [];

// Last returned acceleration object from native
var accel = null;

// Tells native to start.
function start() {
    exec(function(a) {
        var tempListeners = listeners.slice(0);
        accel = new Acceleration(a.x, a.y, a.z, a.timestamp);
        for (var i = 0, l = tempListeners.length; i < l; i++) {
            tempListeners[i].win(accel);
        }
    }, function(e) {
        var tempListeners = listeners.slice(0);
        for (var i = 0, l = tempListeners.length; i < l; i++) {
            tempListeners[i].fail(e);
        }
    }, "Accelerometer", "start", []);
    running = true;
}

// Tells native to stop.
function stop() {
    exec(null, null, "Accelerometer", "stop", []);
    running = false;
}

// Adds a callback pair to the listeners array
function createCallbackPair(win, fail) {
    return {win:win, fail:fail};
}

// Removes a win/fail listener pair from the listeners array
function removeListeners(l) {
    var idx = listeners.indexOf(l);
    if (idx > -1) {
        listeners.splice(idx, 1);
        if (listeners.length === 0) {
            stop();
        }
    }
}

var accelerometer = {
    /**
     * Asynchronously acquires the current acceleration.
     *
     * @param {Function} successCallback    The function to call when the acceleration data is available
     * @param {Function} errorCallback      The function to call when there is an error getting the acceleration data. (OPTIONAL)
     * @param {AccelerationOptions} options The options for getting the accelerometer data such as timeout. (OPTIONAL)
     */
    getCurrentAcceleration: function(successCallback, errorCallback, options) {
        argscheck.checkArgs('fFO', 'accelerometer.getCurrentAcceleration', arguments);

        var p;
        var win = function(a) {
            removeListeners(p);
            successCallback(a);
        };
        var fail = function(e) {
            removeListeners(p);
            errorCallback && errorCallback(e);
        };

        p = createCallbackPair(win, fail);
        listeners.push(p);

        if (!running) {
            start();
        }
    },

    /**
     * Asynchronously acquires the acceleration repeatedly at a given interval.
     *
     * @param {Function} successCallback    The function to call each time the acceleration data is available
     * @param {Function} errorCallback      The function to call when there is an error getting the acceleration data. (OPTIONAL)
     * @param {AccelerationOptions} options The options for getting the accelerometer data such as timeout. (OPTIONAL)
     * @return String                       The watch id that must be passed to #clearWatch to stop watching.
     */
    watchAcceleration: function(successCallback, errorCallback, options) {
        argscheck.checkArgs('fFO', 'accelerometer.watchAcceleration', arguments);
        // Default interval (10 sec)
        var frequency = (options && options.frequency && typeof options.frequency == 'number') ? options.frequency : 10000;

        // Keep reference to watch id, and report accel readings as often as defined in frequency
        var id = utils.createUUID();

        var p = createCallbackPair(function(){}, function(e) {
            removeListeners(p);
            errorCallback && errorCallback(e);
        });
        listeners.push(p);

        timers[id] = {
            timer:window.setInterval(function() {
                if (accel) {
                    successCallback(accel);
                }
            }, frequency),
            listeners:p
        };

        if (running) {
            // If we're already running then immediately invoke the success callback
            // but only if we have retrieved a value, sample code does not check for null ...
            if (accel) {
                successCallback(accel);
            }
        } else {
            start();
        }

        return id;
    },

    /**
     * Clears the specified accelerometer watch.
     *
     * @param {String} id       The id of the watch returned from #watchAcceleration.
     */
    clearWatch: function(id) {
        // Stop javascript timer & remove from timer list
        if (id && timers[id]) {
            window.clearInterval(timers[id].timer);
            removeListeners(timers[id].listeners);
            delete timers[id];
        }
    }
};

module.exports = accelerometer;

});

// file: lib/common/plugin/accelerometer/symbols.js
define("cordova/plugin/accelerometer/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.defaults('cordova/plugin/Acceleration', 'Acceleration');
modulemapper.defaults('cordova/plugin/accelerometer', 'navigator.accelerometer');

});

// file: lib/blackberry/plugin/air/DirectoryEntry.js
define("cordova/plugin/air/DirectoryEntry", function(require, exports, module) {

var DirectoryEntry = require('cordova/plugin/DirectoryEntry'),
    DirectoryReader = require('cordova/plugin/air/DirectoryReader'),
    FileEntry = require('cordova/plugin/FileEntry'),
    FileError = require('cordova/plugin/FileError');

var validFileRe = new RegExp('^[a-zA-Z][0-9a-zA-Z._ ]*$');

module.exports = {
    createReader : function() {
        return new DirectoryReader(this.fullPath);
    },
    /**
     * Creates or looks up a directory; override for BlackBerry.
     *
     * @param path
     *            {DOMString} either a relative or absolute path from this
     *            directory in which to look up or create a directory
     * @param options
     *            {Flags} options to create or exclusively create the directory
     * @param successCallback
     *            {Function} called with the new DirectoryEntry
     * @param errorCallback
     *            {Function} called with a FileError
     */
    getDirectory : function(path, options, successCallback, errorCallback) {
    // create directory if it doesn't exist
        var create = (options && options.create === true) ? true : false,
        // if true, causes failure if create is true and path already exists
        exclusive = (options && options.exclusive === true) ? true : false,
        // directory exists
        exists,
        // create a new DirectoryEntry object and invoke success callback
        createEntry = function() {
            var path_parts = path.split('/'),
                name = path_parts[path_parts.length - 1],
                dirEntry = new DirectoryEntry(name, path);

            // invoke success callback
            if (typeof successCallback === 'function') {
                successCallback(dirEntry);
            }
        };

        var fail = function(error) {
            if (typeof errorCallback === 'function') {
                errorCallback(new FileError(error));
            }
        };

        // invalid path
        if(!validFileRe.exec(path)){
            fail(FileError.ENCODING_ERR);
            return;
        }

        // determine if path is relative or absolute
        if (!path) {
            fail(FileError.ENCODING_ERR);
            return;
        } else if (path.indexOf(this.fullPath) !== 0) {
            // path does not begin with the fullPath of this directory
            // therefore, it is relative
            path = this.fullPath + '/' + path;
        }

        // determine if directory exists
        try {
            // will return true if path exists AND is a directory
            exists = blackberry.io.dir.exists(path);
        } catch (e) {
            // invalid path
            // TODO this will not work on playbook - need to think how to find invalid urls
            fail(FileError.ENCODING_ERR);
            return;
        }


        // path is a directory
        if (exists) {
            if (create && exclusive) {
                // can't guarantee exclusivity
                fail(FileError.PATH_EXISTS_ERR);
            } else {
                // create entry for existing directory
                createEntry();
            }
        }
        // will return true if path exists AND is a file
        else if (blackberry.io.file.exists(path)) {
            // the path is a file
            fail(FileError.TYPE_MISMATCH_ERR);
        }
        // path does not exist, create it
        else if (create) {
            try {
                // directory path must have trailing slash
                var dirPath = path;
                if (dirPath.substr(-1) !== '/') {
                    dirPath += '/';
                }
                console.log('creating dir path at: ' + dirPath);
                blackberry.io.dir.createNewDir(dirPath);
                createEntry();
            } catch (eone) {
                // unable to create directory
                fail(FileError.NOT_FOUND_ERR);
            }
        }
        // path does not exist, don't create
        else {
            // directory doesn't exist
            fail(FileError.NOT_FOUND_ERR);
        }
    },

    /**
     * Create or look up a file.
     *
     * @param path {DOMString}
     *            either a relative or absolute path from this directory in
     *            which to look up or create a file
     * @param options {Flags}
     *            options to create or exclusively create the file
     * @param successCallback {Function}
     *            called with the new FileEntry object
     * @param errorCallback {Function}
     *            called with a FileError object if error occurs
     */
    getFile : function(path, options, successCallback, errorCallback) {
        // create file if it doesn't exist
        var create = (options && options.create === true) ? true : false,
            // if true, causes failure if create is true and path already exists
            exclusive = (options && options.exclusive === true) ? true : false,
            // file exists
            exists,
            // create a new FileEntry object and invoke success callback
            createEntry = function() {
                var path_parts = path.split('/'),
                    name = path_parts[path_parts.length - 1],
                    fileEntry = new FileEntry(name, path);

                // invoke success callback
                if (typeof successCallback === 'function') {
                    successCallback(fileEntry);
                }
            };

        var fail = function(error) {
            if (typeof errorCallback === 'function') {
                errorCallback(new FileError(error));
            }
        };

        // invalid path
        if(!validFileRe.exec(path)){
            fail(FileError.ENCODING_ERR);
            return;
        }
        // determine if path is relative or absolute
        if (!path) {
            fail(FileError.ENCODING_ERR);
            return;
        }
        else if (path.indexOf(this.fullPath) !== 0) {
            // path does not begin with the fullPath of this directory
            // therefore, it is relative
            path = this.fullPath + '/' + path;
        }

        // determine if file exists
        try {
            // will return true if path exists AND is a file
            exists = blackberry.io.file.exists(path);
        }
        catch (e) {
            // invalid path
            fail(FileError.ENCODING_ERR);
            return;
        }

        // path is a file
        if (exists) {
            if (create && exclusive) {
                // can't guarantee exclusivity
                fail(FileError.PATH_EXISTS_ERR);
            }
            else {
                // create entry for existing file
                createEntry();
            }
        }
        // will return true if path exists AND is a directory
        else if (blackberry.io.dir.exists(path)) {
            // the path is a directory
            fail(FileError.TYPE_MISMATCH_ERR);
        }
        // path does not exist, create it
        else if (create) {
            // create empty file
            var emptyBlob = blackberry.utils.stringToBlob('');
            blackberry.io.file.saveFile(path,emptyBlob);
            createEntry();
        }
        // path does not exist, don't create
        else {
            // file doesn't exist
            fail(FileError.NOT_FOUND_ERR);
        }
    },

    /**
     * Delete a directory and all of it's contents.
     *
     * @param successCallback {Function} called with no parameters
     * @param errorCallback {Function} called with a FileError
     */
    removeRecursively : function(successCallback, errorCallback) {
        // we're removing THIS directory
        var path = this.fullPath;

        var fail = function(error) {
            if (typeof errorCallback === 'function') {
                errorCallback(new FileError(error));
            }
        };

        // attempt to delete directory
        if (blackberry.io.dir.exists(path)) {
            // it is an error to attempt to remove the file system root
            //exec(null, null, "File", "isFileSystemRoot", [ path ]) === true
            if (false) {
                fail(FileError.NO_MODIFICATION_ALLOWED_ERR);
            }
            else {
                try {
                    // delete the directory, setting recursive flag to true
                    blackberry.io.dir.deleteDirectory(path, true);
                    if (typeof successCallback === "function") {
                        successCallback();
                    }
                } catch (e) {
                    // permissions don't allow deletion
                    console.log(e);
                    fail(FileError.NO_MODIFICATION_ALLOWED_ERR);
                }
            }
        }
        // it's a file, not a directory
        else if (blackberry.io.file.exists(path)) {
            fail(FileError.TYPE_MISMATCH_ERR);
        }
        // not found
        else {
            fail(FileError.NOT_FOUND_ERR);
        }
    }
};

});

// file: lib/blackberry/plugin/air/DirectoryReader.js
define("cordova/plugin/air/DirectoryReader", function(require, exports, module) {

var FileError = require('cordova/plugin/FileError');

/**
 * An interface that lists the files and directories in a directory.
 */
function DirectoryReader(path) {
    this.path = path || null;
}

/**
 * Returns a list of entries from a directory.
 *
 * @param {Function} successCallback is called with a list of entries
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryReader.prototype.readEntries = function(successCallback, errorCallback) {
    var win = typeof successCallback !== 'function' ? null : function(result) {
        var retVal = [];
        for (var i=0; i<result.length; i++) {
            var entry = null;
            if (result[i].isDirectory) {
                entry = new (require('cordova/plugin/DirectoryEntry'))();
            }
            else if (result[i].isFile) {
                entry = new (require('cordova/plugin/FileEntry'))();
            }
            entry.isDirectory = result[i].isDirectory;
            entry.isFile = result[i].isFile;
            entry.name = result[i].name;
            entry.fullPath = result[i].fullPath;
            retVal.push(entry);
        }
        successCallback(retVal);
    };
    var fail = typeof errorCallback !== 'function' ? null : function(code) {
        errorCallback(new FileError(code));
    };

    var theEntries = [];
    // Entry object is borked - unable to instantiate a new Entry object so just create one
    var anEntry = function (isDirectory, name, fullPath) {
        this.isDirectory = (isDirectory ? true : false);
        this.isFile = (isDirectory ? false : true);
        this.name = name;
        this.fullPath = fullPath;
    };

    if(blackberry.io.dir.exists(this.path)){
        var theDirectories = blackberry.io.dir.listDirectories(this.path);
        var theFiles = blackberry.io.dir.listFiles(this.path);

        var theDirectoriesLength = theDirectories.length;
        var theFilesLength = theFiles.length;
        for(var i=0;i<theDirectoriesLength;i++){
            theEntries.push(new anEntry(true, theDirectories[i], this.path+theDirectories[i]));
        }

        for(var j=0;j<theFilesLength;j++){
            theEntries.push(new anEntry(false, theFiles[j], this.path+theFiles[j]));
        }
        win(theEntries);
    }else{
        fail(FileError.NOT_FOUND_ERR);
    }


};

module.exports = DirectoryReader;

});

// file: lib/blackberry/plugin/air/Entry.js
define("cordova/plugin/air/Entry", function(require, exports, module) {

var FileError = require('cordova/plugin/FileError'),
    LocalFileSystem = require('cordova/plugin/LocalFileSystem'),
    Metadata = require('cordova/plugin/Metadata'),
    resolveLocalFileSystemURI = require('cordova/plugin/air/resolveLocalFileSystemURI'),
    DirectoryEntry = require('cordova/plugin/DirectoryEntry'),
    FileEntry = require('cordova/plugin/FileEntry'),
    requestFileSystem = require('cordova/plugin/air/requestFileSystem');

var recursiveCopy = function(srcDirPath, dstDirPath){
    // get all the contents (file+dir) of the dir
    var files = blackberry.io.dir.listFiles(srcDirPath);
    var dirs = blackberry.io.dir.listDirectories(srcDirPath);

    for(var i=0;i<files.length;i++){
        blackberry.io.file.copy(srcDirPath + '/' + files[i], dstDirPath + '/' + files[i]);
    }

    for(var j=0;j<dirs.length;j++){
        if(!blackberry.io.dir.exists(dstDirPath + '/' + dirs[j])){
            blackberry.io.dir.createNewDir(dstDirPath + '/' + dirs[j]);
        }
        recursiveCopy(srcDirPath + '/' + dirs[j], dstDirPath + '/' + dirs[j]);
    }
};

var validFileRe = new RegExp('^[a-zA-Z][0-9a-zA-Z._ ]*$');

module.exports = {
    getMetadata : function(successCallback, errorCallback){
        var success = typeof successCallback !== 'function' ? null : function(lastModified) {
          var metadata = new Metadata(lastModified);
          successCallback(metadata);
        };
        var fail = typeof errorCallback !== 'function' ? null : function(code) {
          errorCallback(new FileError(code));
        };

        if(this.isFile){
            if(blackberry.io.file.exists(this.fullPath)){
                var theFileProperties = blackberry.io.file.getFileProperties(this.fullPath);
                success(theFileProperties.dateModified);
            }
        }else{
            console.log('Unsupported for directories');
            fail(FileError.INVALID_MODIFICATION_ERR);
        }
    },

    setMetadata : function(successCallback, errorCallback , metadataObject){
        console.log('setMetadata is unsupported for PlayBook');
    },

    moveTo : function(parent, newName, successCallback, errorCallback){
        var fail = function(code) {
            if (typeof errorCallback === 'function') {
                errorCallback(new FileError(code));
            }
        };
        // user must specify parent Entry
        if (!parent) {
            fail(FileError.NOT_FOUND_ERR);
            return;
        }
        // source path
        var srcPath = this.fullPath,
            // entry name
            name = newName || this.name,
            success = function(entry) {
                if (entry) {
                    if (typeof successCallback === 'function') {
                        // create appropriate Entry object
                        var result = (entry.isDirectory) ? new DirectoryEntry(entry.name, entry.fullPath) : new FileEntry(entry.name, entry.fullPath);
                        try {
                            successCallback(result);
                        }
                        catch (e) {
                            console.log('Error invoking callback: ' + e);
                        }
                    }
                }
                else {
                    // no Entry object returned
                    fail(FileError.NOT_FOUND_ERR);
                }
            };


        // Entry object is borked
        var theEntry = {};
        var dstPath = parent.fullPath + '/' + name;

        // invalid path
        if(!validFileRe.exec(name)){
            fail(FileError.ENCODING_ERR);
            return;
        }

        if(this.isFile){
            if(srcPath != dstPath){
                if(blackberry.io.file.exists(dstPath)){
                    blackberry.io.file.deleteFile(dstPath);
                    blackberry.io.file.copy(srcPath,dstPath);
                    blackberry.io.file.deleteFile(srcPath);

                    theEntry.fullPath = dstPath;
                    theEntry.name = name;
                    theEntry.isDirectory = false;
                    theEntry.isFile = true;
                    success(theEntry);
                }else if(blackberry.io.dir.exists(dstPath)){
                    // destination path is a directory
                    fail(FileError.INVALID_MODIFICATION_ERR);
                }else{
                    // make sure the directory that we are moving to actually exists
                    if(blackberry.io.dir.exists(parent.fullPath)){
                        blackberry.io.file.copy(srcPath,dstPath);
                        blackberry.io.file.deleteFile(srcPath);

                        theEntry.fullPath = dstPath;
                        theEntry.name = name;
                        theEntry.isDirectory = false;
                        theEntry.isFile = true;
                        success(theEntry);
                    }else{
                        fail(FileError.NOT_FOUND_ERR);
                    }
                }
            }else{
                // file onto itself
                fail(FileError.INVALID_MODIFICATION_ERR);
            }
        }else{
            if(srcPath != dstPath){
                if(blackberry.io.file.exists(dstPath) || srcPath == parent.fullPath){
                    // destination path is either a file path or moving into parent
                    fail(FileError.INVALID_MODIFICATION_ERR);
                }else{
                    if(!blackberry.io.dir.exists(dstPath)){
                        blackberry.io.dir.createNewDir(dstPath);
                        recursiveCopy(srcPath,dstPath);
                        blackberry.io.dir.deleteDirectory(srcPath, true);
                        theEntry.fullPath = dstPath;
                        theEntry.name = name;
                        theEntry.isDirectory = true;
                        theEntry.isFile = false;
                        success(theEntry);
                    }else{
                        var numOfEntries = 0;
                        numOfEntries += blackberry.io.dir.listDirectories(dstPath).length;
                        numOfEntries += blackberry.io.dir.listFiles(dstPath).length;
                        if(numOfEntries === 0){
                            blackberry.io.dir.createNewDir(dstPath);
                            recursiveCopy(srcPath,dstPath);
                            blackberry.io.dir.deleteDirectory(srcPath, true);
                            theEntry.fullPath = dstPath;
                            theEntry.name = name;
                            theEntry.isDirectory = true;
                            theEntry.isFile = false;
                            success(theEntry);
                        }else{
                            // destination directory not empty
                            fail(FileError.INVALID_MODIFICATION_ERR);
                        }
                    }
                }
            }else{
                // directory onto itself
                fail(FileError.INVALID_MODIFICATION_ERR);
            }
        }

    },

    copyTo : function(parent, newName, successCallback, errorCallback) {
        var fail = function(code) {
            if (typeof errorCallback === 'function') {
                errorCallback(new FileError(code));
            }
        };
        // user must specify parent Entry
        if (!parent) {
            fail(FileError.NOT_FOUND_ERR);
            return;
        }
        // source path
        var srcPath = this.fullPath,
            // entry name
            name = newName || this.name,
            success = function(entry) {
                if (entry) {
                    if (typeof successCallback === 'function') {
                        // create appropriate Entry object
                        var result = (entry.isDirectory) ? new DirectoryEntry(entry.name, entry.fullPath) : new FileEntry(entry.name, entry.fullPath);
                        try {
                            successCallback(result);
                        }
                        catch (e) {
                            console.log('Error invoking callback: ' + e);
                        }
                    }
                }
                else {
                    // no Entry object returned
                    fail(FileError.NOT_FOUND_ERR);
                }
            };

        // Entry object is borked
        var theEntry = {};
        var dstPath = parent.fullPath + '/' + name;

        // invalid path
        if(!validFileRe.exec(name)){
            fail(FileError.ENCODING_ERR);
            return;
        }

        if(this.isFile){
            if(srcPath != dstPath){
                if(blackberry.io.file.exists(dstPath)){
                    if(blackberry.io.dir.exists(dstPath)){
                        blackberry.io.file.copy(srcPath,dstPath);

                        theEntry.fullPath = dstPath;
                        theEntry.name = name;
                        theEntry.isDirectory = false;
                        theEntry.isFile = true;
                        success(theEntry);
                    }else{
                        // destination directory doesn't exist
                        fail(FileError.NOT_FOUND_ERR);
                    }

                }else{
                    blackberry.io.file.copy(srcPath,dstPath);

                    theEntry.fullPath = dstPath;
                    theEntry.name = name;
                    theEntry.isDirectory = false;
                    theEntry.isFile = true;
                    success(theEntry);
                }
            }else{
                // file onto itself
                fail(FileError.INVALID_MODIFICATION_ERR);
            }
        }else{
            if(srcPath != dstPath){
                // allow back up to the root but not child dirs
                if((parent.name != "root" && dstPath.indexOf(srcPath)>=0) || blackberry.io.file.exists(dstPath)){
                    // copying directory into child or is file path
                    fail(FileError.INVALID_MODIFICATION_ERR);
                }else{
                    recursiveCopy(srcPath, dstPath);

                    theEntry.fullPath = dstPath;
                    theEntry.name = name;
                    theEntry.isDirectory = true;
                    theEntry.isFile = false;
                    success(theEntry);
                }
            }else{
                // directory onto itself
                fail(FileError.INVALID_MODIFICATION_ERR);
            }
        }

    },

    remove : function(successCallback, errorCallback) {
        var path = this.fullPath,
            // directory contents
            contents = [];

        var fail = function(error) {
            if (typeof errorCallback === 'function') {
                errorCallback(new FileError(error));
            }
        };

        // file
        if (blackberry.io.file.exists(path)) {
            try {
                blackberry.io.file.deleteFile(path);
                if (typeof successCallback === "function") {
                    successCallback();
                }
            } catch (e) {
                // permissions don't allow
                fail(FileError.INVALID_MODIFICATION_ERR);
            }
        }
        // directory
        else if (blackberry.io.dir.exists(path)) {
            // it is an error to attempt to remove the file system root
            console.log('entry directory');
            // TODO: gotta figure out how to get root dirs on playbook -
            // getRootDirs doesn't work
            if (false) {
                fail(FileError.NO_MODIFICATION_ALLOWED_ERR);
            } else {
                // check to see if directory is empty
                contents = blackberry.io.dir.listFiles(path);
                if (contents.length !== 0) {
                    fail(FileError.INVALID_MODIFICATION_ERR);
                } else {
                    try {
                        // delete
                        blackberry.io.dir.deleteDirectory(path, false);
                        if (typeof successCallback === "function") {
                            successCallback();
                        }
                    } catch (eone) {
                        // permissions don't allow
                        fail(FileError.NO_MODIFICATION_ALLOWED_ERR);
                    }
                }
            }
        }
        // not found
        else {
            fail(FileError.NOT_FOUND_ERR);
        }
    },
    getParent : function(successCallback, errorCallback) {
        var that = this;

        try {
            // On BlackBerry, the TEMPORARY file system is actually a temporary
            // directory that is created on a per-application basis. This is
            // to help ensure that applications do not share the same temporary
            // space. So we check to see if this is the TEMPORARY file system
            // (directory). If it is, we must return this Entry, rather than
            // the Entry for its parent.
            requestFileSystem(LocalFileSystem.TEMPORARY, 0,
                    function(fileSystem) {
                        if (fileSystem.root.fullPath === that.fullPath) {
                            if (typeof successCallback === 'function') {
                                successCallback(fileSystem.root);
                            }
                        } else {
                            resolveLocalFileSystemURI(blackberry.io.dir
                                    .getParentDirectory(that.fullPath),
                                    successCallback, errorCallback);
                        }
                    }, errorCallback);
        } catch (e) {
            if (typeof errorCallback === 'function') {
                errorCallback(new FileError(FileError.NOT_FOUND_ERR));
            }
        }
    }
};


});

// file: lib/blackberry/plugin/air/File.js
define("cordova/plugin/air/File", function(require, exports, module) {

/**
 * Constructor.
 * name {DOMString} name of the file, without path information
 * fullPath {DOMString} the full path of the file, including the name
 * type {DOMString} mime type
 * lastModifiedDate {Date} last modified date
 * size {Number} size of the file in bytes
 */

var File = function(name, fullPath, type, lastModifiedDate, size){
    this.name = name || '';
    this.fullPath = fullPath || null;
    this.type = type || null;
    this.lastModifiedDate = lastModifiedDate || null;
    this.size = size || 0;
};

module.exports = File;

});

// file: lib/blackberry/plugin/air/FileEntry.js
define("cordova/plugin/air/FileEntry", function(require, exports, module) {

var FileEntry = require('cordova/plugin/FileEntry'),
    Entry = require('cordova/plugin/air/Entry'),
    FileWriter = require('cordova/plugin/air/FileWriter'),
    File = require('cordova/plugin/air/File'),
    FileError = require('cordova/plugin/FileError');

module.exports = {
    /**
     * Creates a new FileWriter associated with the file that this FileEntry represents.
     *
     * @param {Function} successCallback is called with the new FileWriter
     * @param {Function} errorCallback is called with a FileError
     */
    createWriter : function(successCallback, errorCallback) {
        this.file(function(filePointer) {
            var writer = new FileWriter(filePointer);

            if (writer.fileName === null || writer.fileName === "") {
                if (typeof errorCallback === "function") {
                    errorCallback(new FileError(FileError.INVALID_STATE_ERR));
                }
            } else {
                if (typeof successCallback === "function") {
                    successCallback(writer);
                }
            }
        }, errorCallback);
    },

    /**
     * Returns a File that represents the current state of the file that this FileEntry represents.
     *
     * @param {Function} successCallback is called with the new File object
     * @param {Function} errorCallback is called with a FileError
     */
    file : function(successCallback, errorCallback) {
        var win = typeof successCallback !== 'function' ? null : function(f) {
            var file = new File(f.name, f.fullPath, f.type, f.lastModifiedDate, f.size);
            successCallback(file);
        };
        var fail = typeof errorCallback !== 'function' ? null : function(code) {
            errorCallback(new FileError(code));
        };

        if(blackberry.io.file.exists(this.fullPath)){
            var theFileProperties = blackberry.io.file.getFileProperties(this.fullPath);
            var theFile = {};

            theFile.fullPath = this.fullPath;
            theFile.type = theFileProperties.fileExtension;
            theFile.lastModifiedDate = theFileProperties.dateModified;
            theFile.size = theFileProperties.size;
            win(theFile);
        }else{
            fail(FileError.NOT_FOUND_ERR);
        }
    }
};


});

// file: lib/blackberry/plugin/air/FileReader.js
define("cordova/plugin/air/FileReader", function(require, exports, module) {

var FileError = require('cordova/plugin/FileError'),
    ProgressEvent = require('cordova/plugin/ProgressEvent');

/**
 * This class reads the mobile device file system.
 *
 * For Android:
 *      The root directory is the root of the file system.
 *      To read from the SD card, the file name is "sdcard/my_file.txt"
 * @constructor
 */
var FileReader = function() {
    this.fileName = "";

    this.readyState = 0; // FileReader.EMPTY

    // File data
    this.result = null;

    // Error
    this.error = null;

    // Event handlers
    this.onloadstart = null;    // When the read starts.
    this.onprogress = null;     // While reading (and decoding) file or fileBlob data, and reporting partial file data (progress.loaded/progress.total)
    this.onload = null;         // When the read has successfully completed.
    this.onerror = null;        // When the read has failed (see errors).
    this.onloadend = null;      // When the request has completed (either in success or failure).
    this.onabort = null;        // When the read has been aborted. For instance, by invoking the abort() method.
};

// States
FileReader.EMPTY = 0;
FileReader.LOADING = 1;
FileReader.DONE = 2;

/**
 * Abort reading file.
 */
FileReader.prototype.abort = function() {
    this.result = null;

    if (this.readyState == FileReader.DONE || this.readyState == FileReader.EMPTY) {
      return;
    }

    this.readyState = FileReader.DONE;

    // If abort callback
    if (typeof this.onabort === 'function') {
        this.onabort(new ProgressEvent('abort', {target:this}));
    }
    // If load end callback
    if (typeof this.onloadend === 'function') {
        this.onloadend(new ProgressEvent('loadend', {target:this}));
    }
};

/**
 * Read text file.
 *
 * @param file          {File} File object containing file properties
 * @param encoding      [Optional] (see http://www.iana.org/assignments/character-sets)
 */
FileReader.prototype.readAsText = function(file, encoding) {
    // Figure out pathing
    this.fileName = '';
    if (typeof file.fullPath === 'undefined') {
        this.fileName = file;
    } else {
        this.fileName = file.fullPath;
    }

    // Already loading something
    if (this.readyState == FileReader.LOADING) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    // LOADING state
    this.readyState = FileReader.LOADING;

    // If loadstart callback
    if (typeof this.onloadstart === "function") {
        this.onloadstart(new ProgressEvent("loadstart", {target:this}));
    }

    // Default encoding is UTF-8
    var enc = encoding ? encoding : "UTF-8";

    var me = this;
    // Read file
    if(blackberry.io.file.exists(this.fileName)){
        var theText = '';
        var getFileContents = function(path,blob){
            if(blob){

                theText = blackberry.utils.blobToString(blob, enc);
                me.result = theText;

                if (typeof me.onload === "function") {
                    me.onload(new ProgressEvent("load", {target:me}));
                }

                me.readyState = FileReader.DONE;

                if (typeof me.onloadend === "function") {
                    me.onloadend(new ProgressEvent("loadend", {target:me}));
                }
            }
        };
        // setting asynch to off
        blackberry.io.file.readFile(this.fileName, getFileContents, false);

    }else{
        // If DONE (cancelled), then don't do anything
        if (me.readyState === FileReader.DONE) {
            return;
        }

        // DONE state
        me.readyState = FileReader.DONE;

        me.result = null;

        // Save error
        me.error = new FileError(FileError.NOT_FOUND_ERR);

        // If onerror callback
        if (typeof me.onerror === "function") {
            me.onerror(new ProgressEvent("error", {target:me}));
        }

        // If onloadend callback
        if (typeof me.onloadend === "function") {
            me.onloadend(new ProgressEvent("loadend", {target:me}));
        }
    }
};


/**
 * Read file and return data as a base64 encoded data url.
 * A data url is of the form:
 *      data:[<mediatype>][;base64],<data>
 *
 * @param file          {File} File object containing file properties
 */
FileReader.prototype.readAsDataURL = function(file) {
    this.fileName = "";
    if (typeof file.fullPath === "undefined") {
        this.fileName = file;
    } else {
        this.fileName = file.fullPath;
    }

    // Already loading something
    if (this.readyState == FileReader.LOADING) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    // LOADING state
    this.readyState = FileReader.LOADING;

    // If loadstart callback
    if (typeof this.onloadstart === "function") {
        this.onloadstart(new ProgressEvent("loadstart", {target:this}));
    }

    var enc = "BASE64";

    var me = this;

    // Read file
    if(blackberry.io.file.exists(this.fileName)){
        var theText = '';
        var getFileContents = function(path,blob){
            if(blob){
                theText = blackberry.utils.blobToString(blob, enc);
                me.result = "data:text/plain;base64," +theText;

                if (typeof me.onload === "function") {
                    me.onload(new ProgressEvent("load", {target:me}));
                }

                me.readyState = FileReader.DONE;

                if (typeof me.onloadend === "function") {
                    me.onloadend(new ProgressEvent("loadend", {target:me}));
                }
            }
        };
        // setting asynch to off
        blackberry.io.file.readFile(this.fileName, getFileContents, false);

    }else{
        // If DONE (cancelled), then don't do anything
        if (me.readyState === FileReader.DONE) {
            return;
        }

        // DONE state
        me.readyState = FileReader.DONE;

        me.result = null;

        // Save error
        me.error = new FileError(FileError.NOT_FOUND_ERR);

        // If onerror callback
        if (typeof me.onerror === "function") {
            me.onerror(new ProgressEvent("error", {target:me}));
        }

        // If onloadend callback
        if (typeof me.onloadend === "function") {
            me.onloadend(new ProgressEvent("loadend", {target:me}));
        }
    }
};

/**
 * Read file and return data as a binary data.
 *
 * @param file          {File} File object containing file properties
 */
FileReader.prototype.readAsBinaryString = function(file) {
    // TODO - Can't return binary data to browser.
    console.log('method "readAsBinaryString" is not supported at this time.');
};

/**
 * Read file and return data as a binary data.
 *
 * @param file          {File} File object containing file properties
 */
FileReader.prototype.readAsArrayBuffer = function(file) {
    // TODO - Can't return binary data to browser.
    console.log('This method is not supported at this time.');
};

module.exports = FileReader;

});

// file: lib/blackberry/plugin/air/FileTransfer.js
define("cordova/plugin/air/FileTransfer", function(require, exports, module) {

var cordova = require('cordova'),
FileTransferError = require('cordova/plugin/FileTransferError'),
FileUploadResult = require('cordova/plugin/FileUploadResult');

var validURLProtocol = new RegExp('^(https?|ftp):\/\/');

function getParentPath(filePath) {
    var pos = filePath.lastIndexOf('/');
    return filePath.substring(0, pos + 1);
}

function getFileName(filePath) {
    var pos = filePath.lastIndexOf('/');
    return filePath.substring(pos + 1);
}

module.exports = {
    upload: function (args, win, fail) {
        var filePath = args[0],
            server = args[1],
            fileKey = args[2],
            fileName = args[3],
            mimeType = args[4],
            params = args[5],
            trustAllHosts = args[6],
            chunkedMode = args[7],
            headers = args[8];

        if(!validURLProtocol.exec(server)){
            return { "status" : cordova.callbackStatus.ERROR, "message" : new FileTransferError(FileTransferError.INVALID_URL_ERR) };
        }

        window.resolveLocalFileSystemURI(filePath, fileWin, fail);

        function fileWin(entryObject){
            blackberry.io.file.readFile(filePath, readWin, false);
        }

        function readWin(filePath, blobFile){
            var fd = new FormData();

            fd.append(fileKey, blobFile, fileName);
            for (var prop in params) {
                if(params.hasOwnProperty(prop)) {
                    fd.append(prop, params[prop]);
                }
            }

            var xhr = new XMLHttpRequest();
            xhr.open("POST", server);
            xhr.onload = function(evt) {
                if (xhr.status == 200) {
                    var result = new FileUploadResult();
                    result.bytesSent = xhr.response.length;
                    result.responseCode = xhr.status;
                    result.response = xhr.response;
                    win(result);
                } else if (xhr.status == 404) {
                    fail(new FileTransferError(FileTransferError.INVALID_URL_ERR, null, null, xhr.status));
                } else if (xhr.status == 403) {
                    fail(new FileTransferError(FileTransferError.INVALID_URL_ERR, null, null, xhr.status));
                } else {
                    fail(new FileTransferError(FileTransferError.CONNECTION_ERR, null, null, xhr.status));
                }
            };
            xhr.ontimeout = function(evt) {
                fail(new FileTransferError(FileTransferError.CONNECTION_ERR, null, null, xhr.status));
            };

            if(headers){
                for(var i in headers){
                    xhr.setRequestHeader(i, headers[i]);
                }
            }
            xhr.send(fd);
        }

        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "WebWorks Is On It" };
    },

    download: function(args, win, fail){
        var url = args[0],
            filePath = args[1];

        if(!validURLProtocol.exec(url)){
            return { "status" : cordova.callbackStatus.ERROR, "message" : new FileTransferError(FileTransferError.INVALID_URL_ERR) };
        }

        var xhr = new XMLHttpRequest();

        function writeFile(fileEntry) {
            fileEntry.createWriter(function(writer) {
                writer.onwriteend = function(evt) {
                    if (!evt.target.error) {
                        win(new window.FileEntry(fileEntry.name, fileEntry.toURL()));
                    } else {
                        fail(new FileTransferError(FileTransferError.FILE_NOT_FOUND_ERR));
                    }
                };

                writer.onerror = function(evt) {
                    fail(new FileTransferError(FileTransferError.FILE_NOT_FOUND_ERR));
                };

                var blob = blackberry.utils.stringToBlob(xhr.response);
                writer.write(blob);

            },
            function(error) {
                fail(new FileTransferError(FileTransferError.FILE_NOT_FOUND_ERR));
            });
        }

        xhr.onreadystatechange = function () {
            if (xhr.readyState == xhr.DONE) {
                if (xhr.status == 200 && xhr.response) {
                    window.resolveLocalFileSystemURI(getParentPath(filePath), function(dir) {
                        dir.getFile(getFileName(filePath), {create: true}, writeFile, function(error) {
                            fail(new FileTransferError(FileTransferError.FILE_NOT_FOUND_ERR));
                        });
                    }, function(error) {
                        fail(new FileTransferError(FileTransferError.FILE_NOT_FOUND_ERR));
                    });
                } else if (xhr.status == 404) {
                    fail(new FileTransferError(FileTransferError.INVALID_URL_ERR, null, null, xhr.status));
                } else {
                    fail(new FileTransferError(FileTransferError.CONNECTION_ERR, null, null, xhr.status));
                }
            }
        };

        xhr.open("GET", url, true);
        xhr.responseType = "arraybuffer";
        xhr.send();

        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "WebWorks Is On It" };
    }
};

});

// file: lib/blackberry/plugin/air/FileWriter.js
define("cordova/plugin/air/FileWriter", function(require, exports, module) {

var FileError = require('cordova/plugin/FileError'),
    ProgressEvent = require('cordova/plugin/ProgressEvent');

/**
 * @constructor
 * @param file {File} File object containing file properties
 * @param append if true write to the end of the file, otherwise overwrite the file
 */
var FileWriter = function(file) {
    this.fileName = "";
    this.length = 0;
    if (file) {
        this.fileName = file.fullPath || file;
        this.length = file.size || 0;
    }
    // default is to write at the beginning of the file
    this.position = 0;

    this.readyState = 0; // EMPTY

    this.result = null;

    // Error
    this.error = null;

    // Event handlers
    this.onwritestart = null;   // When writing starts
    this.onprogress = null;     // While writing the file, and reporting partial file data
    this.onwrite = null;        // When the write has successfully completed.
    this.onwriteend = null;     // When the request has completed (either in success or failure).
    this.onabort = null;        // When the write has been aborted. For instance, by invoking the abort() method.
    this.onerror = null;        // When the write has failed (see errors).
};

// States
FileWriter.INIT = 0;
FileWriter.WRITING = 1;
FileWriter.DONE = 2;

/**
 * Abort writing file.
 */
FileWriter.prototype.abort = function() {
    // check for invalid state
    if (this.readyState === FileWriter.DONE || this.readyState === FileWriter.INIT) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    // set error
    this.error = new FileError(FileError.ABORT_ERR);

    this.readyState = FileWriter.DONE;

    // If abort callback
    if (typeof this.onabort === "function") {
        this.onabort(new ProgressEvent("abort", {"target":this}));
    }

    // If write end callback
    if (typeof this.onwriteend === "function") {
        this.onwriteend(new ProgressEvent("writeend", {"target":this}));
    }
};

/**
 * Writes data to the file
 *
 * @param text to be written
 */
FileWriter.prototype.write = function(text) {
    // Throw an exception if we are already writing a file
    if (this.readyState === FileWriter.WRITING) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    // WRITING state
    this.readyState = FileWriter.WRITING;

    var me = this;

    // If onwritestart callback
    if (typeof me.onwritestart === "function") {
        me.onwritestart(new ProgressEvent("writestart", {"target":me}));
    }

    var textBlob = blackberry.utils.stringToBlob(text);

    if(blackberry.io.file.exists(this.fileName)){

        var oldText = '';
        var newText = text;

        var getFileContents = function(path,blob){

            if(blob){
                oldText = blackberry.utils.blobToString(blob);
                if(oldText.length>0){
                    newText = oldText.substr(0,me.position) + text;
                }
            }

            var tempFile = me.fileName+'temp';
            if(blackberry.io.file.exists(tempFile)){
                blackberry.io.file.deleteFile(tempFile);
            }

            var newTextBlob = blackberry.utils.stringToBlob(newText);

            // crete a temp file, delete file we are 'overwriting', then rename temp file
            blackberry.io.file.saveFile(tempFile, newTextBlob);
            blackberry.io.file.deleteFile(me.fileName);
            blackberry.io.file.rename(tempFile, me.fileName.split('/').pop());

            me.position = newText.length;
            me.length = me.position;

            if (typeof me.onwrite === "function") {
                me.onwrite(new ProgressEvent("write", {"target":me}));
            }
        };

        // setting asynch to off
        blackberry.io.file.readFile(this.fileName, getFileContents, false);

    }else{

        // file is new so just save it
        blackberry.io.file.saveFile(this.fileName, textBlob);
        me.position = text.length;
        me.length = me.position;
    }

    me.readyState = FileWriter.DONE;

    if (typeof me.onwriteend === "function") {
                me.onwriteend(new ProgressEvent("writeend", {"target":me}));
    }
};

/**
 * Moves the file pointer to the location specified.
 *
 * If the offset is a negative number the position of the file
 * pointer is rewound.  If the offset is greater than the file
 * size the position is set to the end of the file.
 *
 * @param offset is the location to move the file pointer to.
 */
FileWriter.prototype.seek = function(offset) {
    // Throw an exception if we are already writing a file
    if (this.readyState === FileWriter.WRITING) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    if (!offset && offset !== 0) {
        return;
    }

    // See back from end of file.
    if (offset < 0) {
        this.position = Math.max(offset + this.length, 0);
    }
    // Offset is bigger than file size so set position
    // to the end of the file.
    else if (offset > this.length) {
        this.position = this.length;
    }
    // Offset is between 0 and file size so set the position
    // to start writing.
    else {
        this.position = offset;
    }
};

/**
 * Truncates the file to the size specified.
 *
 * @param size to chop the file at.
 */
FileWriter.prototype.truncate = function(size) {
    // Throw an exception if we are already writing a file
    if (this.readyState === FileWriter.WRITING) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    // WRITING state
    this.readyState = FileWriter.WRITING;

    var me = this;

    // If onwritestart callback
    if (typeof me.onwritestart === "function") {
        me.onwritestart(new ProgressEvent("writestart", {"target":this}));
    }

    if(blackberry.io.file.exists(this.fileName)){

        var oldText = '';
        var newText = '';

        var getFileContents = function(path,blob){

            if(blob){
                oldText = blackberry.utils.blobToString(blob);
                if(oldText.length>0){
                    newText = oldText.slice(0,size);
                }else{
                    // TODO: throw error
                }
            }

            var tempFile = me.fileName+'temp';
            if(blackberry.io.file.exists(tempFile)){
                blackberry.io.file.deleteFile(tempFile);
            }

            var newTextBlob = blackberry.utils.stringToBlob(newText);

            // crete a temp file, delete file we are 'overwriting', then rename temp file
            blackberry.io.file.saveFile(tempFile, newTextBlob);
            blackberry.io.file.deleteFile(me.fileName);
            blackberry.io.file.rename(tempFile, me.fileName.split('/').pop());

            me.position = newText.length;
            me.length = me.position;

            if (typeof me.onwrite === "function") {
                 me.onwrite(new ProgressEvent("write", {"target":me}));
            }
        };

        // setting asynch to off - worry about making this all callbacks later
        blackberry.io.file.readFile(this.fileName, getFileContents, false);

    }else{

        // TODO: file doesn't exist - throw error

    }

    me.readyState = FileWriter.DONE;

    if (typeof me.onwriteend === "function") {
                me.onwriteend(new ProgressEvent("writeend", {"target":me}));
    }
};

module.exports = FileWriter;

});

// file: lib/blackberry/plugin/air/battery.js
define("cordova/plugin/air/battery", function(require, exports, module) {

var cordova = require('cordova');

module.exports = {
    start: function (args, win, fail) {
        // Register one listener to each of the level and state change
        // events using WebWorks API.
        blackberry.system.event.deviceBatteryStateChange(function(state) {
            var me = navigator.battery;
            // state is either CHARGING or UNPLUGGED
            if (state === 2 || state === 3) {
                var info = {
                    "level" : me._level,
                    "isPlugged" : state === 2
                };

                if (me._isPlugged !== info.isPlugged && typeof win === 'function') {
                    win(info);
                }
            }
        });
        blackberry.system.event.deviceBatteryLevelChange(function(level) {
            var me = navigator.battery;
            if (level != me._level && typeof win === 'function') {
                win({'level' : level, 'isPlugged' : me._isPlugged});
            }
        });

        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "WebWorks Is On It" };
    },
    stop: function (args, win, fail) {
        // Unregister battery listeners.
        blackberry.system.event.deviceBatteryStateChange(null);
        blackberry.system.event.deviceBatteryLevelChange(null);
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "WebWorks Is On It" };
    }
};

});

// file: lib/blackberry/plugin/air/camera.js
define("cordova/plugin/air/camera", function(require, exports, module) {

var cordova = require('cordova');

module.exports = {
    takePicture: function (args, win, fail) {
        var onCaptured = blackberry.events.registerEventHandler("onCaptured", win),
            onCameraClosed = blackberry.events.registerEventHandler("onCameraClosed", function () {}),
            onError = blackberry.events.registerEventHandler("onError", fail),
            request = new blackberry.transport.RemoteFunctionCall('blackberry/media/camera/takePicture');

        request.addParam("onCaptured", onCaptured);
        request.addParam("onCameraClosed", onCameraClosed);
        request.addParam("onError", onError);

        //HACK: this is a sync call due to:
        //https://github.com/blackberry/WebWorks-TabletOS/issues/51
        request.makeSyncCall();
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "WebWorks Is On It" };
    }
};

});

// file: lib/blackberry/plugin/air/capture.js
define("cordova/plugin/air/capture", function(require, exports, module) {

var cordova = require('cordova');

function capture(action, win, fail) {
    var onCaptured = blackberry.events.registerEventHandler("onCaptured", function (path) {
            var file = blackberry.io.file.getFileProperties(path);
            win([{
                fullPath: path,
                lastModifiedDate: file.dateModified,
                name: path.replace(file.directory + "/", ""),
                size: file.size,
                type: file.fileExtension
            }]);
        }),
        onCameraClosed = blackberry.events.registerEventHandler("onCameraClosed", function () {}),
        onError = blackberry.events.registerEventHandler("onError", fail),
        request = new blackberry.transport.RemoteFunctionCall('blackberry/media/camera/' + action);

    request.addParam("onCaptured", onCaptured);
    request.addParam("onCameraClosed", onCameraClosed);
    request.addParam("onError", onError);

    //HACK: this is a sync call due to:
    //https://github.com/blackberry/WebWorks-TabletOS/issues/51
    request.makeSyncCall();
}

module.exports = {
    getSupportedAudioModes: function (args, win, fail) {
        return {"status": cordova.callbackStatus.OK, "message": []};
    },
    getSupportedImageModes: function (args, win, fail) {
        return {"status": cordova.callbackStatus.OK, "message": []};
    },
    getSupportedVideoModes: function (args, win, fail) {
        return {"status": cordova.callbackStatus.OK, "message": []};
    },
    captureImage: function (args, win, fail) {
        if (args[0].limit > 0) {
            capture("takePicture", win, fail);
        }
        else {
            win([]);
        }

        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "WebWorks Is On It" };
    },
    captureVideo: function (args, win, fail) {
        if (args[0].limit > 0) {
            capture("takeVideo", win, fail);
        }
        else {
            win([]);
        }

        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "WebWorks Is On It" };
    },
    captureAudio: function (args, win, fail) {
        var onCaptureAudioWin = function(filePath){
        // for some reason the filePath is coming back as a string between two double quotes
        filePath = filePath.slice(1, filePath.length-1);
            var file = blackberry.io.file.getFileProperties(filePath);

            win([{
                fullPath: filePath,
                lastModifiedDate: file.dateModified,
                name: filePath.replace(file.directory + "/", ""),
                size: file.size,
                type: file.fileExtension
            }]);
        };

        var onCaptureAudioFail = function(){
            fail([]);
        };

        if (args[0].limit > 0 && args[0].duration){
            // a sloppy way of creating a uuid since there's no built in date function to get milliseconds since epoch
            // might be better to instead check files within directory and then figure out the next file name should be
            // ie, img000 -> img001 though that would take awhile and would add a whole bunch of checks
            var id = new Date();
            id = (id.getDay()).toString() + (id.getHours()).toString() + (id.getSeconds()).toString() + (id.getMilliseconds()).toString() + (id.getYear()).toString();

            var fileName = blackberry.io.dir.appDirs.shared.music.path+'/audio'+id+'.wav';
            blackberry.media.microphone.record(fileName, onCaptureAudioWin, onCaptureAudioFail);
            // multiple duration by a 1000 since it comes in as seconds
            setTimeout(blackberry.media.microphone.stop,args[0].duration*1000);
        }
        else {
            win([]);
        }
        return {"status": cordova.callbackStatus.NO_RESULT, "message": "WebWorks Is On It"};
    }
};

});

// file: lib/blackberry/plugin/air/device.js
define("cordova/plugin/air/device", function(require, exports, module) {

var channel = require('cordova/channel'),
    cordova = require('cordova');

// Tell cordova channel to wait on the CordovaInfoReady event
channel.waitForInitialization('onCordovaInfoReady');

module.exports = {
    getDeviceInfo : function(args, win, fail){
        //Register an event handler for the networkChange event
        var callback = blackberry.events.registerEventHandler("deviceInfo", function (info) {
                win({
                    platform: "BlackBerry",
                    version: info.version,
                    model: "PlayBook",
                    name: "PlayBook", // deprecated: please use device.model
                    uuid: info.uuid,
                    cordova: "2.7.0"
                });
            }),
            request = new blackberry.transport.RemoteFunctionCall("org/apache/cordova/getDeviceInfo");

        request.addParam("id", callback);
        request.makeSyncCall();

        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "" };
    }
};

});

// file: lib/blackberry/plugin/air/file/bbsymbols.js
define("cordova/plugin/air/file/bbsymbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/air/DirectoryReader', 'DirectoryReader');
modulemapper.clobbers('cordova/plugin/air/File', 'File');
modulemapper.clobbers('cordova/plugin/air/FileReader', 'FileReader');
modulemapper.clobbers('cordova/plugin/air/FileWriter', 'FileWriter');
modulemapper.clobbers('cordova/plugin/air/requestFileSystem', 'requestFileSystem');
modulemapper.clobbers('cordova/plugin/air/resolveLocalFileSystemURI', 'resolveLocalFileSystemURI');
modulemapper.merges('cordova/plugin/air/DirectoryEntry', 'DirectoryEntry');
modulemapper.merges('cordova/plugin/air/Entry', 'Entry');
modulemapper.merges('cordova/plugin/air/FileEntry', 'FileEntry');


});

// file: lib/blackberry/plugin/air/manager.js
define("cordova/plugin/air/manager", function(require, exports, module) {

var cordova = require('cordova'),
    plugins = {
        'Device' : require('cordova/plugin/air/device'),
        'Battery' : require('cordova/plugin/air/battery'),
        'Camera' : require('cordova/plugin/air/camera'),
        'Logger' : require('cordova/plugin/webworks/logger'),
        'Media' : require('cordova/plugin/webworks/media'),
        'Capture' : require('cordova/plugin/air/capture'),
        'Accelerometer' : require('cordova/plugin/webworks/accelerometer'),
        'NetworkStatus' : require('cordova/plugin/air/network'),
        'Notification' : require('cordova/plugin/webworks/notification'),
        'FileTransfer' : require('cordova/plugin/air/FileTransfer')
    };

module.exports = {
    addPlugin: function (key, module) {
        plugins[key] = require(module);
    },
    exec: function (win, fail, clazz, action, args) {
        var result = {"status" : cordova.callbackStatus.CLASS_NOT_FOUND_EXCEPTION, "message" : "Class " + clazz + " cannot be found"};

        if (plugins[clazz]) {
            if (plugins[clazz][action]) {
                result = plugins[clazz][action](args, win, fail);
            }
            else {
                result = { "status" : cordova.callbackStatus.INVALID_ACTION, "message" : "Action not found: " + action };
            }
        }

        return result;
    },
    resume: function () {},
    pause: function () {},
    destroy: function () {}
};

});

// file: lib/blackberry/plugin/air/network.js
define("cordova/plugin/air/network", function(require, exports, module) {

var cordova = require('cordova'),
    connection = require('cordova/plugin/Connection');

module.exports = {
    getConnectionInfo: function (args, win, fail) {
        var connectionType = connection.NONE,
            eventType = "offline",
            callbackID,
            request;

        /**
         * For PlayBooks, we currently only have WiFi connections, so
         * return WiFi if there is any access at all.
         * TODO: update if/when PlayBook gets other connection types...
         */
        if (blackberry.system.hasDataCoverage()) {
            connectionType = connection.WIFI;
            eventType = "online";
        }

        //Register an event handler for the networkChange event
        callbackID = blackberry.events.registerEventHandler("networkChange", function (status) {
            win(status.type);
        });

        //pass our callback id down to our network extension
        request = new blackberry.transport.RemoteFunctionCall("org/apache/cordova/getConnectionInfo");
        request.addParam("networkStatusChangedID", callbackID);
        request.makeSyncCall();

        return { "status": cordova.callbackStatus.OK, "message": connectionType};
    }
};

});

// file: lib/blackberry/plugin/air/platform.js
define("cordova/plugin/air/platform", function(require, exports, module) {

module.exports = {
    id: "playbook",
    initialize:function() {}
};

});

// file: lib/blackberry/plugin/air/requestFileSystem.js
define("cordova/plugin/air/requestFileSystem", function(require, exports, module) {

var DirectoryEntry = require('cordova/plugin/DirectoryEntry'),
FileError = require('cordova/plugin/FileError'),
FileSystem = require('cordova/plugin/FileSystem'),
LocalFileSystem = require('cordova/plugin/LocalFileSystem');

/**
 * Request a file system in which to store application data.
 * @param type  local file system type
 * @param size  indicates how much storage space, in bytes, the application expects to need
 * @param successCallback  invoked with a FileSystem object
 * @param errorCallback  invoked if error occurs retrieving file system
 */
var requestFileSystem = function(type, size, successCallback, errorCallback) {
    var fail = function(code) {
        if (typeof errorCallback === 'function') {
            errorCallback(new FileError(code));
        }
    };

    if (type < 0 || type > 3) {
        fail(FileError.SYNTAX_ERR);
    } else {
        // if successful, return a FileSystem object
        var success = function(file_system) {
            if (file_system) {
                if (typeof successCallback === 'function') {
                    successCallback(file_system);
                }
            }
            else {
                // no FileSystem object returned
                fail(FileError.NOT_FOUND_ERR);
            }
        };

        // guessing the max file size is 2GB - 1 bytes?
        // https://bdsc.webapps.blackberry.com/native/documentation/com.qnx.doc.neutrino.user_guide/topic/limits_filesystems.html

        if(size>=2147483648){
            fail(FileError.QUOTA_EXCEEDED_ERR);
            return;
        }


        var theFileSystem;
        try{
            // is there a way to get space for the app that doesn't point to the appDirs folder?
            if(type==LocalFileSystem.TEMPORARY){
                theFileSystem = new FileSystem('temporary', new DirectoryEntry('root', blackberry.io.dir.appDirs.app.storage.path));
            }else if(type==LocalFileSystem.PERSISTENT){
                theFileSystem = new FileSystem('persistent', new DirectoryEntry('root', blackberry.io.dir.appDirs.app.storage.path));
            }
            success(theFileSystem);
        }catch(e){
            fail(FileError.SYNTAX_ERR);
        }
    }
};
module.exports = requestFileSystem;

});

// file: lib/blackberry/plugin/air/resolveLocalFileSystemURI.js
define("cordova/plugin/air/resolveLocalFileSystemURI", function(require, exports, module) {

var DirectoryEntry = require('cordova/plugin/DirectoryEntry'),
    FileEntry = require('cordova/plugin/FileEntry'),
    FileError = require('cordova/plugin/FileError');

/**
 * Look up file system Entry referred to by local URI.
 * @param {DOMString} uri  URI referring to a local file or directory
 * @param successCallback  invoked with Entry object corresponding to URI
 * @param errorCallback    invoked if error occurs retrieving file system entry
 */
module.exports = function(uri, successCallback, errorCallback) {
    // error callback
    var fail = function(error) {
        if (typeof errorCallback === 'function') {
            errorCallback(new FileError(error));
        }
    };
    // if successful, return either a file or directory entry
    var success = function(entry) {
        var result;

        if (entry) {
            if (typeof successCallback === 'function') {
                // create appropriate Entry object
                result = (entry.isDirectory) ? new DirectoryEntry(entry.name, entry.fullPath) : new FileEntry(entry.name, entry.fullPath);
                try {
                    successCallback(result);
                }
                catch (e) {
                    console.log('Error invoking callback: ' + e);
                }
            }
        }
        else {
            // no Entry object returned
            fail(FileError.NOT_FOUND_ERR);
            return;
        }
    };

    if(!uri || uri === ""){
        fail(FileError.NOT_FOUND_ERR);
        return;
    }

    // decode uri if % char found
    if(uri.indexOf('%')>=0){
        uri = decodeURI(uri);
    }

    // pop the parameters if any
    if(uri.indexOf('?')>=0){
        uri = uri.split('?')[0];
    }

    // check for leading /
    if(uri.indexOf('/')===0){
        fail(FileError.ENCODING_ERR);
        return;
    }

    // Entry object is borked - unable to instantiate a new Entry object so just create one
    var theEntry = {};
    if(blackberry.io.dir.exists(uri)){
        theEntry.isDirectory = true;
        theEntry.name = uri.split('/').pop();
        theEntry.fullPath = uri;

        success(theEntry);
    }else if(blackberry.io.file.exists(uri)){
        theEntry.isDirectory = false;
        theEntry.name = uri.split('/').pop();
        theEntry.fullPath = uri;
        success(theEntry);
        return;
    }else{
        fail(FileError.NOT_FOUND_ERR);
        return;
    }

};

});

// file: lib/android/plugin/android/app.js
define("cordova/plugin/android/app", function(require, exports, module) {

var exec = require('cordova/exec');

module.exports = {
  /**
   * Clear the resource cache.
   */
  clearCache:function() {
    exec(null, null, "App", "clearCache", []);
  },

  /**
   * Load the url into the webview or into new browser instance.
   *
   * @param url           The URL to load
   * @param props         Properties that can be passed in to the activity:
   *      wait: int                           => wait msec before loading URL
   *      loadingDialog: "Title,Message"      => display a native loading dialog
   *      loadUrlTimeoutValue: int            => time in msec to wait before triggering a timeout error
   *      clearHistory: boolean              => clear webview history (default=false)
   *      openExternal: boolean              => open in a new browser (default=false)
   *
   * Example:
   *      navigator.app.loadUrl("http://server/myapp/index.html", {wait:2000, loadingDialog:"Wait,Loading App", loadUrlTimeoutValue: 60000});
   */
  loadUrl:function(url, props) {
    exec(null, null, "App", "loadUrl", [url, props]);
  },

  /**
   * Cancel loadUrl that is waiting to be loaded.
   */
  cancelLoadUrl:function() {
    exec(null, null, "App", "cancelLoadUrl", []);
  },

  /**
   * Clear web history in this web view.
   * Instead of BACK button loading the previous web page, it will exit the app.
   */
  clearHistory:function() {
    exec(null, null, "App", "clearHistory", []);
  },

  /**
   * Go to previous page displayed.
   * This is the same as pressing the backbutton on Android device.
   */
  backHistory:function() {
    exec(null, null, "App", "backHistory", []);
  },

  /**
   * Override the default behavior of the Android back button.
   * If overridden, when the back button is pressed, the "backKeyDown" JavaScript event will be fired.
   *
   * Note: The user should not have to call this method.  Instead, when the user
   *       registers for the "backbutton" event, this is automatically done.
   *
   * @param override        T=override, F=cancel override
   */
  overrideBackbutton:function(override) {
    exec(null, null, "App", "overrideBackbutton", [override]);
  },

  /**
   * Exit and terminate the application.
   */
  exitApp:function() {
    return exec(null, null, "App", "exitApp", []);
  }
};

});

// file: lib/android/plugin/android/device.js
define("cordova/plugin/android/device", function(require, exports, module) {

var channel = require('cordova/channel'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec'),
    app = require('cordova/plugin/android/app');

module.exports = {
    /*
     * DEPRECATED
     * This is only for Android.
     *
     * You must explicitly override the back button.
     */
    overrideBackButton:function() {
        console.log("Device.overrideBackButton() is deprecated.  Use App.overrideBackbutton(true).");
        app.overrideBackbutton(true);
    },

    /*
     * DEPRECATED
     * This is only for Android.
     *
     * This resets the back button to the default behavior
     */
    resetBackButton:function() {
        console.log("Device.resetBackButton() is deprecated.  Use App.overrideBackbutton(false).");
        app.overrideBackbutton(false);
    },

    /*
     * DEPRECATED
     * This is only for Android.
     *
     * This terminates the activity!
     */
    exitApp:function() {
        console.log("Device.exitApp() is deprecated.  Use App.exitApp().");
        app.exitApp();
    }
};

});

// file: lib/android/plugin/android/nativeapiprovider.js
define("cordova/plugin/android/nativeapiprovider", function(require, exports, module) {

var nativeApi = this._cordovaNative || require('cordova/plugin/android/promptbasednativeapi');
var currentApi = nativeApi;

module.exports = {
    get: function() { return currentApi; },
    setPreferPrompt: function(value) {
        currentApi = value ? require('cordova/plugin/android/promptbasednativeapi') : nativeApi;
    },
    // Used only by tests.
    set: function(value) {
        currentApi = value;
    }
};

});

// file: lib/android/plugin/android/notification.js
define("cordova/plugin/android/notification", function(require, exports, module) {

var exec = require('cordova/exec');

/**
 * Provides Android enhanced notification API.
 */
module.exports = {
    activityStart : function(title, message) {
        // If title and message not specified then mimic Android behavior of
        // using default strings.
        if (typeof title === "undefined" && typeof message == "undefined") {
            title = "Busy";
            message = 'Please wait...';
        }

        exec(null, null, 'Notification', 'activityStart', [ title, message ]);
    },

    /**
     * Close an activity dialog
     */
    activityStop : function() {
        exec(null, null, 'Notification', 'activityStop', []);
    },

    /**
     * Display a progress dialog with progress bar that goes from 0 to 100.
     *
     * @param {String}
     *            title Title of the progress dialog.
     * @param {String}
     *            message Message to display in the dialog.
     */
    progressStart : function(title, message) {
        exec(null, null, 'Notification', 'progressStart', [ title, message ]);
    },

    /**
     * Close the progress dialog.
     */
    progressStop : function() {
        exec(null, null, 'Notification', 'progressStop', []);
    },

    /**
     * Set the progress dialog value.
     *
     * @param {Number}
     *            value 0-100
     */
    progressValue : function(value) {
        exec(null, null, 'Notification', 'progressValue', [ value ]);
    }
};

});

// file: lib/android/plugin/android/promptbasednativeapi.js
define("cordova/plugin/android/promptbasednativeapi", function(require, exports, module) {

module.exports = {
    exec: function(service, action, callbackId, argsJson) {
        return prompt(argsJson, 'gap:'+JSON.stringify([service, action, callbackId]));
    },
    setNativeToJsBridgeMode: function(value) {
        prompt(value, 'gap_bridge_mode:');
    },
    retrieveJsMessages: function() {
        return prompt('', 'gap_poll:');
    }
};

});

// file: lib/android/plugin/android/storage.js
define("cordova/plugin/android/storage", function(require, exports, module) {

var utils = require('cordova/utils'),
    exec = require('cordova/exec'),
    channel = require('cordova/channel');

var queryQueue = {};

/**
 * SQL result set object
 * PRIVATE METHOD
 * @constructor
 */
var DroidDB_Rows = function() {
    this.resultSet = [];    // results array
    this.length = 0;        // number of rows
};

/**
 * Get item from SQL result set
 *
 * @param row           The row number to return
 * @return              The row object
 */
DroidDB_Rows.prototype.item = function(row) {
    return this.resultSet[row];
};

/**
 * SQL result set that is returned to user.
 * PRIVATE METHOD
 * @constructor
 */
var DroidDB_Result = function() {
    this.rows = new DroidDB_Rows();
};

/**
 * Callback from native code when query is complete.
 * PRIVATE METHOD
 *
 * @param id   Query id
 */
function completeQuery(id, data) {
    var query = queryQueue[id];
    if (query) {
        try {
            delete queryQueue[id];

            // Get transaction
            var tx = query.tx;

            // If transaction hasn't failed
            // Note: We ignore all query results if previous query
            //       in the same transaction failed.
            if (tx && tx.queryList[id]) {

                // Save query results
                var r = new DroidDB_Result();
                r.rows.resultSet = data;
                r.rows.length = data.length;
                try {
                    if (typeof query.successCallback === 'function') {
                        query.successCallback(query.tx, r);
                    }
                } catch (ex) {
                    console.log("executeSql error calling user success callback: "+ex);
                }

                tx.queryComplete(id);
            }
        } catch (e) {
            console.log("executeSql error: "+e);
        }
    }
}

/**
 * Callback from native code when query fails
 * PRIVATE METHOD
 *
 * @param reason            Error message
 * @param id                Query id
 */
function failQuery(reason, id) {
    var query = queryQueue[id];
    if (query) {
        try {
            delete queryQueue[id];

            // Get transaction
            var tx = query.tx;

            // If transaction hasn't failed
            // Note: We ignore all query results if previous query
            //       in the same transaction failed.
            if (tx && tx.queryList[id]) {
                tx.queryList = {};

                try {
                    if (typeof query.errorCallback === 'function') {
                        query.errorCallback(query.tx, reason);
                    }
                } catch (ex) {
                    console.log("executeSql error calling user error callback: "+ex);
                }

                tx.queryFailed(id, reason);
            }

        } catch (e) {
            console.log("executeSql error: "+e);
        }
    }
}

/**
 * SQL query object
 * PRIVATE METHOD
 *
 * @constructor
 * @param tx                The transaction object that this query belongs to
 */
var DroidDB_Query = function(tx) {

    // Set the id of the query
    this.id = utils.createUUID();

    // Add this query to the queue
    queryQueue[this.id] = this;

    // Init result
    this.resultSet = [];

    // Set transaction that this query belongs to
    this.tx = tx;

    // Add this query to transaction list
    this.tx.queryList[this.id] = this;

    // Callbacks
    this.successCallback = null;
    this.errorCallback = null;

};

/**
 * Transaction object
 * PRIVATE METHOD
 * @constructor
 */
var DroidDB_Tx = function() {

    // Set the id of the transaction
    this.id = utils.createUUID();

    // Callbacks
    this.successCallback = null;
    this.errorCallback = null;

    // Query list
    this.queryList = {};
};

/**
 * Mark query in transaction as complete.
 * If all queries are complete, call the user's transaction success callback.
 *
 * @param id                Query id
 */
DroidDB_Tx.prototype.queryComplete = function(id) {
    delete this.queryList[id];

    // If no more outstanding queries, then fire transaction success
    if (this.successCallback) {
        var count = 0;
        var i;
        for (i in this.queryList) {
            if (this.queryList.hasOwnProperty(i)) {
                count++;
            }
        }
        if (count === 0) {
            try {
                this.successCallback();
            } catch(e) {
                console.log("Transaction error calling user success callback: " + e);
            }
        }
    }
};

/**
 * Mark query in transaction as failed.
 *
 * @param id                Query id
 * @param reason            Error message
 */
DroidDB_Tx.prototype.queryFailed = function(id, reason) {

    // The sql queries in this transaction have already been run, since
    // we really don't have a real transaction implemented in native code.
    // However, the user callbacks for the remaining sql queries in transaction
    // will not be called.
    this.queryList = {};

    if (this.errorCallback) {
        try {
            this.errorCallback(reason);
        } catch(e) {
            console.log("Transaction error calling user error callback: " + e);
        }
    }
};

/**
 * Execute SQL statement
 *
 * @param sql                   SQL statement to execute
 * @param params                Statement parameters
 * @param successCallback       Success callback
 * @param errorCallback         Error callback
 */
DroidDB_Tx.prototype.executeSql = function(sql, params, successCallback, errorCallback) {

    // Init params array
    if (typeof params === 'undefined') {
        params = [];
    }

    // Create query and add to queue
    var query = new DroidDB_Query(this);
    queryQueue[query.id] = query;

    // Save callbacks
    query.successCallback = successCallback;
    query.errorCallback = errorCallback;

    // Call native code
    exec(null, null, "Storage", "executeSql", [sql, params, query.id]);
};

var DatabaseShell = function() {
};

/**
 * Start a transaction.
 * Does not support rollback in event of failure.
 *
 * @param process {Function}            The transaction function
 * @param successCallback {Function}
 * @param errorCallback {Function}
 */
DatabaseShell.prototype.transaction = function(process, errorCallback, successCallback) {
    var tx = new DroidDB_Tx();
    tx.successCallback = successCallback;
    tx.errorCallback = errorCallback;
    try {
        process(tx);
    } catch (e) {
        console.log("Transaction error: "+e);
        if (tx.errorCallback) {
            try {
                tx.errorCallback(e);
            } catch (ex) {
                console.log("Transaction error calling user error callback: "+e);
            }
        }
    }
};

/**
 * Open database
 *
 * @param name              Database name
 * @param version           Database version
 * @param display_name      Database display name
 * @param size              Database size in bytes
 * @return                  Database object
 */
var DroidDB_openDatabase = function(name, version, display_name, size) {
    exec(null, null, "Storage", "openDatabase", [name, version, display_name, size]);
    var db = new DatabaseShell();
    return db;
};


module.exports = {
  openDatabase:DroidDB_openDatabase,
  failQuery:failQuery,
  completeQuery:completeQuery
};

});

// file: lib/android/plugin/android/storage/openDatabase.js
define("cordova/plugin/android/storage/openDatabase", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper'),
    storage = require('cordova/plugin/android/storage');

var originalOpenDatabase = modulemapper.getOriginalSymbol(window, 'openDatabase');

module.exports = function(name, version, desc, size) {
    // First patch WebSQL if necessary
    if (!originalOpenDatabase) {
        // Not defined, create an openDatabase function for all to use!
        return storage.openDatabase.apply(this, arguments);
    }

    // Defined, but some Android devices will throw a SECURITY_ERR -
    // so we wrap the whole thing in a try-catch and shim in our own
    // if the device has Android bug 16175.
    try {
        return originalOpenDatabase(name, version, desc, size);
    } catch (ex) {
        if (ex.code !== 18) {
            throw ex;
        }
    }
    return storage.openDatabase(name, version, desc, size);
};



});

// file: lib/android/plugin/android/storage/symbols.js
define("cordova/plugin/android/storage/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/android/storage/openDatabase', 'openDatabase');


});

// file: lib/bada/plugin/bada/Accelerometer.js
define("cordova/plugin/bada/Accelerometer", function(require, exports, module) {

var Acceleration = require('cordova/plugin/Acceleration');

module.exports = {
    getCurrentAcceleration: function(successCallback, errorCallback, options) {
        var success = function(acceleration) {
            console.log("Accelerometer:getAcceleration:success");
            var accel = new Acceleration(acceleration.xAxis, acceleration.yAxis, acceleration.zAxis);
            successCallback(accel);
        };
        var error = function(err) {
            console.log("Accelerometer:getAcceleration:error");
            if (err.code == err.TYPE_MISMATCH_ERR) {
                console.log("TYPE MISMATCH ERROR");
            }

            errorCallback(err);
        };
        deviceapis.accelerometer.getCurrentAcceleration(success, error);
    },
    watchAcceleration: function(successCallback, errorCallback, options) {
        var success = function(acceleration) {
            console.log("accelerometer:watchAcceleration:success");
            var accel = new Acceleration(acceleration.xAxis, acceleration.yAxis, acceleration.zAxis);
            successCallback(accel);
        };
        var error = function(err) {
            console.log("accelerometer:watchAcceleration:error");
            errorCallback(err);
        };
        return deviceapis.accelerometer.watchAcceleration(success, error);
    },
    clearWatch: function(watchID) {
        deviceapis.accelerometer.clearWatch(watchID);
    }
};

});

// file: lib/bada/plugin/bada/Camera.js
define("cordova/plugin/bada/Camera", function(require, exports, module) {

module.exports = {
    _mainCamera: null,
    _cams: [],
    takePicture: function(success, fail, cameraOptions) {
        var dataList = [];
        dataList[0] = "type:camera";

        var appcontrolobject = Osp.App.AppManager.findAppControl("osp.appcontrol.provider.camera", "osp.appcontrol.operation.capture");

        if(appcontrolobject) {
            appcontrolobject.start(dataList, function(cbtype, appControlId, operationId, resultList) {
                var i;
                if(cbtype === "onAppControlCompleted") {
                    if(resultList.length > 1 && resultList[1]) {
                        success(resultList[1]);
                    }
                } else {
                    var error = {message: "An error occurred while capturing image", code: 0};
                    fail(error);
                }
            });
        }
    },
    showPreview: function(nodeId) {
        var self = this;
        var onCreatePreviewNodeSuccess = function(previewObject) {
            var previewDiv = document.getElementById(nodeId);
            previewDiv.appendChild(previewObject);
            previewObject.style.visibility = "visible";
        };
        var error = function(e) {
            alert("An error occurred: " + e.message);
        };

        var success = function(cams) {
            if (cams.length > 0) {
             self._cams = cams;
                self._mainCamera = cams[0];
                self._mainCamera.createPreviewNode(onCreatePreviewNodeSuccess, error);
                return;
            }
            alert("Sorry, no cameras available.");
        };
        if(nodeId) {
            deviceapis.camera.getCameras(success, error);
        } else {
            console.log("camera::getPreview: must provide a nodeId");
        }
    },
    hidePreview: function(nodeId) {
        var preview = document.getElementById(nodeId);
        if(preview.childNodes[0]) {
            preview.removeChild(preview.childNodes[0]);
        }
    }

};


});

// file: lib/bada/plugin/bada/Capture.js
define("cordova/plugin/bada/Capture", function(require, exports, module) {

module.exports = {
    startVideoCapture: function(success, fail, options) {
        var camera = navigator.camera._mainCamera;
        camera.startVideoCapture(success, fail, options);
    },
    stopVideoCapture: function() {
        navigator.camera._mainCamera.stopVideoCapture();
    },
    captureImage2: function(success, fail, options) {
        try {
            navigator.camera._mainCamera.captureImage(success, fail, options);
        } catch(exp) {
            alert("Exception :[" + exp.code + "] " + exp.message);
        }
    },
    captureAudio: function() {
        console.log("navigator.capture.captureAudio unsupported!");
    },
    captureImage: function(success, fail, options) {
        var dataList = [];
        dataList[0] = "type:camera";

        var appcontrolobject = Osp.App.AppManager.findAppControl("osp.appcontrol.provider.camera", "osp.appcontrol.operation.capture");

        if(appcontrolobject) {
            appcontrolobject.start(dataList, function(cbtype, appControlId, operationId, resultList) {
                var i;
                var pluginResult = [];
                if(cbtype === "onAppControlCompleted") {
                    for(i = 1 ; i < resultList.length ; i += 1) {
                       if(resultList[i]) {
                           //console.log("resultList[" + i + "] = " + resultList[i]);
                           pluginResult.push( {fullPath: resultList[i]} );
                       }
                    }
                    success(pluginResult);
                } else {
                    var error = {message: "An error occurred while capturing image", code: 0};
                    fail(error);
                }
            });
        }
    },
    captureVideo: function(success, fail, options) {
        var dataList = [];
        dataList[0] = "type:camcorder";

        var appcontrolobject = Osp.App.AppManager.findAppControl("osp.appcontrol.provider.camera", "osp.appcontrol.operation.record");

        if(appcontrolobject) {
            appcontrolobject.start(dataList, function(cbtype, appControlId, operationId, resultList) {
                var i;
                var mediaFiles = [];
                if(cbtype === "onAppControlCompleted") {
                    for(i = 1 ; i < resultList.length ; i += 1) {
                       if(resultList[i]) {
                           //console.log("resultList[" + i + "] = " + resultList[i]);
                           mediaFiles.push( {fullPath: resultList[i]} );
                       }
                    }
                    success(mediaFiles);
                } else {
                    var error = {message: "An error occurred while capturing image", code: 0};
                    fail(error);
                }
            });
        }

    }
};

});

// file: lib/bada/plugin/bada/Compass.js
define("cordova/plugin/bada/Compass", function(require, exports, module) {

var CompassHeading = require('cordova/plugin/CompassHeading');

module.exports = {
        getHeading: function(compassSuccess, compassError, compassOptions) {
            if(deviceapis.orientation === undefined) {
                console.log("navigator.compass.getHeading", "Operation not supported!");
                return -1;
            }
            var success = function(orientation) {
                var heading = 360 - orientation.alpha;
                var compassHeading = new CompassHeading(heading, heading, 0);
                compassSuccess(compassHeading);
            };
            var error = function(error) {
                compassError(error);
            };
            deviceapis.orientation.getCurrentOrientation(success, error);
        }
};

});

// file: lib/bada/plugin/bada/Contacts.js
define("cordova/plugin/bada/Contacts", function(require, exports, module) {

var allowedAddressTypes = ["WORK", "HOME", "PREF"];

var allowedPhoneNumberTypes = ["WORK", "PREF", "HOME", "VOICE", "FAX", "MSG", "CELL", "PAGER","BBS", "MODEM", "CAR", "ISDN","VIDEO", "PCS"];

var allowedFilters = ["firstName", "lastName", "phoneticName", "nickname", "phoneNumber", "email", "address"];

function _pgToWac(contact) {
    var i, j;
    var wacContact = {};

    if(contact.id) {
        wacContact.id = contact.id;
    }

    // name
    if(contact.name) {
       wacContact.firstName = contact.name.givenName;
       wacContact.lastName = contact.name.familyName;
    }

    // nickname
    if(contact.nickname) {
        wacContact.nicknames = [contact.nickname];
    }

    // phoneNumbers
    if(contact.phoneNumbers && contact.phoneNumbers.length > 0) {
        wacContact.phoneNumbers = {};
        for(i = 0, j = contact.phoneNumbers.length ; i < j ; i += 1) {
            var wacPhoneNumber = {};
            wacPhoneNumber.number = contact.phoneNumbers[i].value;
            if(allowedPhoneNumberTypes.indexOf(contact.phoneNumbers[i].type) != -1) {
                wacPhoneNumber.types = [contact.phoneNumbers[i].type];
                if(contact.phoneNumbers[i].pref === true) {
                    wacPhoneNumber.types.push('PREF');
                }
                wacContact.phoneNumbers.push(wacPhoneNumber);
            }
        }
    }

    // emails
    if(contact.emails &&  contact.emails.length > 0) {
        wacContact.emails = [];
        for(i = 0, j = contact.emails.length ; i < j ; i +=1) {
            var wacEmailAddress = {};
            wacEmailAddress.email = contact.emails[i].value;
            if(allowedAddressTypes.indexOf(contact.emails[i].type) != -1) {
                wacEmailAddress.types = [contact.emails[i].type];
                if(contact.emails[i].pref === true) {
                    wacEmailAddress.types.push('PREF');
                }
                wacContact.emails.push(wacEmailAddress);
            }
        }
    }
    // addresses
    if(contact.addresses && contact.addresses.length > 0) {
        wacContact.addresses = [];
        for(i = 0, j = contact.emails.length ; i < j ; i +=1) {
            var wacAddress = {};
            wacAddress.country = contact.addresses[i].country;
            wacAddress.postalCode = contact.addresses[i].postalCode;
            wacAddress.region = contact.addresses[i].region;
            wacAddress.city = contact.addresses[i].locality;
            wacAddress.streetAddress = contact.addresses[i].streetAddress;
            if(allowedAddressTypes.indexOf(contact.addresses[i].type) != -1) {
                wacAddress.types = [contact.addresses[i].type];
                if(contact.addresses[i].pref === true) {
                    wacAddress.types.push('PREF');
                }
            }
            wacContact.addresses.push(wacAddress);
        }

    }

    // photos
    // can only store one photo URL
    if(contact.photos && contact.photos.length > 0) {
       wacContact.photoURL = contact.photos[0].value;
    }

    return wacContact;

}

function _wacToPg(contact) {
    var i, j;
    var pgContact = {};

    if(contact.id) {
        pgContact.id = contact.id;
    }

    // name
    if(contact.firstName || contact.lastName) {
        pgContact.name = {};
        pgContact.name.givenName = contact.firstName;
        pgContact.name.familyName = contact.lastName;
        pgContact.displayName = contact.firstName + ' ' + contact.lastName;
    }

    // nicknames
    if(contact.nicknames && contact.nicknames.length > 0) {
        pgContact.nickname = contact.nicknames[0];
    }

    // phoneNumbers
    if(contact.phoneNumbers && contact.phoneNumbers.length > 0) {
        pgContact.phoneNumbers = [];
        for(i = 0, j = contact.phoneNumbers.length ; i < j ; i += 1) {
            var pgPhoneNumber = {};
            pgPhoneNumber.value = contact.phoneNumbers[i].number;
            if(contact.phoneNumbers[i].types &&
               contact.phoneNumbers[i].types.length > 0) {
                pgPhoneNumber.type = contact.phoneNumbers[i].types[0];
                if(contact.phoneNumbers[i].types.indexOf('PREF') != -1) {
                    pgPhoneNumber.pref = true;
                }
            }
            pgContact.phoneNumbers.push(pgPhoneNumber);
        }
    }

    // emails
    if(contact.emails && contact.emails.length > 0) {
        pgContact.emails = [];
        for(i = 0, j = contact.emails.length ; i < j ; i += 1) {
            var pgEmailAddress = {};
            pgEmailAddress.value = contact.emails[i].email;
            if(contact.emails[i].types &&
               contact.emails[i].types.length > 0) {
                pgEmailAddress.type = contact.emails[i].types[0];
                if(contact.emails[i].types.indexOf('PREF') != -1) {
                    pgEmailAddress.pref = true;
                }
            }
            pgContact.emails.push(pgEmailAddress);
        }
    }

    // addresses
    if(contact.addresses && contact.addresses.length > 0) {
        pgContact.addresses = [];
        for(i = 0, j = contact.addresses.length ; i < j ; i += 1) {
            var pgAddress = {};
            pgAddress.country = contact.addresses[i].country;
            pgAddress.postalCode = contact.addresses[i].postalCode;
            pgAddress.region = contact.addresses[i].region;
            pgAddress.locality = contact.addresses[i].city;
            pgAddress.streetAddress = contact.addresses[i].streetAddress;
            if(contact.addresses[i].types &&
               contact.addresses[i].types.length > 0) {
                pgAddress.type = contact.addresses[i].types[0];
                if(contact.addresses[i].types.indexOf('PREF') != -1) {
                    pgAddress.pref = true;
                }
            }
            pgContact.addresses.push(pgAddress);
        }
    }

    // photos
    // can only store one photo URL
    if(contact.photoURL) {
       pgContact.photos = [{value: contact.photoURL, type: "DEFAULT"}];
    }

    return pgContact;
}

function _buildWacFilters(fields, options) {
    var i, j;
    var wacFilters = {};
    for(i = 0, j = fields.length ; i < j ; i += 1) {
        if(allowedFilters.indexOf(fields[i]) != -1) {
           wacFilters[fields[i]] = options.filter;
        }
    }
}

module.exports = {
    save: function(success, fail, params) {
        var pContact = params[0];
        var gotBooks = function(books) {
            var book = books[0];
            var i, j;
            var saveSuccess = function(wContact) {
                success(_wacToPg(wContact));
            };
            var saveError = function(e) {
                fail(e);
            };
            if(pContact.id) {
                book.updateContact(saveSuccess, saveError, _pgToWac(pContact));
            } else {
                var wContact = book.createContact(_pgToWac(pContact));
                book.addContact(saveSuccess, saveError, wContact);
            }
        };
        var gotError = function(e) {
            fail(e);
        };
        deviceapis.pim.contact.getAddressBooks(gotBooks, gotError);
    },
    remove: function(success, fail, params) {
        var id = params[0];
        var gotBooks = function(books) {
            var book = books[0];
            var removeSuccess = function() {
                success();
            };
            var removeError = function(e) {
                fail(e);
            };
            var toDelete = function(contacts) {
                if(contacts.length === 1) {
                    book.deleteContact(removeSuccess, removeError, contacts[0].id);
                }
            };
            if(id) {
                book.findContacts(toDelete, removeError, {id: id});
            }
        };
        var gotError = function(e) {
            fail(e);
        };
        deviceapis.pim.contact.getAddressBooks(gotBooks, gotError);
    },
    search: function(success, fail, params) {
        var fields = params[0];
        var options = params[1];
        var wacFilters = _buildWacFilters(fields, options);
        var gotBooks = function(books) {
            var book = books[0];
            var gotContacts = function(contacts) {
                var i, j;
                var pgContacts = [];
                for(i = 0, j = contacts.length ; i < j ; i += 1) {
                    pgContacts.push(_wacToPg(contacts[i]));
                }
                success(pgContacts);
            };
            var gotError = function(e) {
                fail(e);
            };
            book.findContacts(gotContacts, gotError, wacFilters);
        };
        var gotError = function(e) {
            fail(e);
        };
        deviceapis.pim.contact.getAddressBooks(gotBooks, gotError);
    }
};

});

// file: lib/bada/plugin/bada/NetworkStatus.js
define("cordova/plugin/bada/NetworkStatus", function(require, exports, module) {

var channel = require('cordova/channel'),
    Connection = require("cordova/plugin/Connection");

// We can't tell if a cell connection is 2, 3 or 4G.
// We just know if it's connected and the signal strength
// if it's roaming and the network name etc..so unless WiFi we default to CELL_2G
// if connected to cellular network

module.exports = {
    getConnectionInfo: function(success, fail) {
        var connectionType = Connection.NONE;
        var networkInfo = ["cellular", "wifi"]; // might be a better way to do this
        var gotConnectionInfo = function() {
            networkInfo.pop();
            if(networkInfo.length === 0) {
                channel.onCordovaConnectionReady.fire();
                success(connectionType);
            }
        };
        var error = function(e) {
            console.log("Error "+e.message);
            gotConnectionInfo();
        };
        deviceapis.devicestatus.getPropertyValue(function(value) {
            console.log("Device Cellular network status: "+value);
            if(connectionType === Connection.NONE) {
                connectionType = Connection.CELL_2G;
            }
            gotConnectionInfo();
        }, error, {aspect: "CellularNetwork", property: "signalStrength"});

        deviceapis.devicestatus.getPropertyValue(function(value) {
            console.log("Device WiFi network status: "+value);
            if(value == "connected") {
                connectionType = Connection.WIFI;
            }
            gotConnectionInfo();
        }, error, {aspect: "WiFiNetwork", property: "networkStatus"});
    }
};

});

// file: lib/bada/plugin/bada/Notification.js
define("cordova/plugin/bada/Notification", function(require, exports, module) {

module.exports = {
    alert: function(message, alertCallback, title, buttonName) {
        alert(message);
    },
    confirm: function(message, confirmCallback, title, buttonLabels) {
        alert(message);
    },
    beep: function(times, milliseconds) {
        try {
            deviceapis.deviceinteraction.stopNotify();
            if(times === 0) {
                return;
            }
            deviceapis.deviceinteraction.startNotify(function() {
                console.log("Notifying");
            },
            function(e) {
                console.log("Failed to notify: " + e);
            },
            milliseconds);
            Osp.Core.Function.delay(this.beep, 1000+milliseconds, this, times - 1, milliseconds);
        }
        catch(e) {
            console.log("Exception thrown: " + e);
        }
    },
    vibrate: function(milliseconds) {
        try {
            deviceapis.deviceinteraction.startVibrate(function() {
                console.log("Vibrating...");
            },
            function(e) {
                console.log("Failed to vibrate: " + e);
            },
            milliseconds);
        }
        catch(e) {
            console.log("Exception thrown: " + e);
        }
        },
    lightOn: function(milliseconds) {
        deviceapis.deviceinteraction.lightOn(function() {
            console.log("Lighting for "+milliseconds+" second");
        },
        function() {
            console.log("Failed to light");
        },
        milliseconds);
    }
};

});

// file: lib/bada/plugin/bada/device.js
define("cordova/plugin/bada/device", function(require, exports, module) {

var channel = require('cordova/channel'),
    utils = require('cordova/utils');

function Device() {
    this.platform = null;
    this.version = null;
    this.name = null;
    this.uuid = null;
    this.cordova = null;

    var me = this;

    channel.onCordovaReady.subscribe(function() {
       me.getDeviceInfo(function (device) {
           me.platform = device.platform;
           me.version  = device.version;
           me.name     = device.name;
           me.uuid     = device.uuid;
           me.cordova  = device.cordova;

           channel.onCordovaInfoReady.fire();
       },
       function (e) {
           me.available = false;
           utils.alert("error initializing cordova: " + e);
       });
    });
}


Device.prototype.getDeviceInfo = function(success, fail, args) {
   var info = deviceapis.devicestatus;
   var properties = ["name", "uuid", "os_name", "os_vendor", "os_version"];

   var me = this;

   var name = null,
       platform = null,
       uuid = null,
       os_name = null,
       os_version = null,
       os_vendor = null;

   var checkProperties = function() {
       properties.pop();
       if(properties.length === 0) {
           me.name = name;
           me.platform = os_vendor + " " + os_name;
           me.version = os_version;
           me.uuid = uuid;
           me.cordova = "2.7.0";
           success(me);
       }
   };

   info.getPropertyValue(function(value) {
           //console.log("Device IMEI: "+value);
           uuid = value;
           checkProperties();
           }, fail, {aspect: "Device", property: "imei"});
   info.getPropertyValue(function(value) {
           //console.log("Device name: "+value);
           name = value;
           checkProperties();
           }, fail, {aspect: "Device", property: "version"});
   info.getPropertyValue(function(value) {
           //console.log("OperatingSystem name: "+value);
           os_name = value;
           checkProperties();
           }, fail, {aspect: "OperatingSystem", property: "name"});
   info.getPropertyValue(function(value) {
           //console.log("OperatingSystem version: "+value);
           os_version = value;
           checkProperties();
           }, fail, {aspect: "OperatingSystem", property: "version"});
   info.getPropertyValue(function(value) {
           //console.log("OperatingSystem vendor: "+value);
           os_vendor = value;
           checkProperties();
           }, fail, {aspect: "OperatingSystem", property: "vendor"});
};

module.exports = new Device();

});

// file: lib/common/plugin/battery.js
define("cordova/plugin/battery", function(require, exports, module) {

/**
 * This class contains information about the current battery status.
 * @constructor
 */
var cordova = require('cordova'),
    exec = require('cordova/exec');

function handlers() {
  return battery.channels.batterystatus.numHandlers +
         battery.channels.batterylow.numHandlers +
         battery.channels.batterycritical.numHandlers;
}

var Battery = function() {
    this._level = null;
    this._isPlugged = null;
    // Create new event handlers on the window (returns a channel instance)
    this.channels = {
      batterystatus:cordova.addWindowEventHandler("batterystatus"),
      batterylow:cordova.addWindowEventHandler("batterylow"),
      batterycritical:cordova.addWindowEventHandler("batterycritical")
    };
    for (var key in this.channels) {
        this.channels[key].onHasSubscribersChange = Battery.onHasSubscribersChange;
    }
};
/**
 * Event handlers for when callbacks get registered for the battery.
 * Keep track of how many handlers we have so we can start and stop the native battery listener
 * appropriately (and hopefully save on battery life!).
 */
Battery.onHasSubscribersChange = function() {
  // If we just registered the first handler, make sure native listener is started.
  if (this.numHandlers === 1 && handlers() === 1) {
      exec(battery._status, battery._error, "Battery", "start", []);
  } else if (handlers() === 0) {
      exec(null, null, "Battery", "stop", []);
  }
};

/**
 * Callback for battery status
 *
 * @param {Object} info            keys: level, isPlugged
 */
Battery.prototype._status = function(info) {
    if (info) {
        var me = battery;
    var level = info.level;
        if (me._level !== level || me._isPlugged !== info.isPlugged) {
            // Fire batterystatus event
            cordova.fireWindowEvent("batterystatus", info);

            // Fire low battery event
            if (level === 20 || level === 5) {
                if (level === 20) {
                    cordova.fireWindowEvent("batterylow", info);
                }
                else {
                    cordova.fireWindowEvent("batterycritical", info);
                }
            }
        }
        me._level = level;
        me._isPlugged = info.isPlugged;
    }
};

/**
 * Error callback for battery start
 */
Battery.prototype._error = function(e) {
    console.log("Error initializing Battery: " + e);
};

var battery = new Battery();

module.exports = battery;

});

// file: lib/common/plugin/battery/symbols.js
define("cordova/plugin/battery/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.defaults('cordova/plugin/battery', 'navigator.battery');

});

// file: lib/common/plugin/camera/symbols.js
define("cordova/plugin/camera/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.defaults('cordova/plugin/Camera', 'navigator.camera');
modulemapper.defaults('cordova/plugin/CameraConstants', 'Camera');
modulemapper.defaults('cordova/plugin/CameraPopoverOptions', 'CameraPopoverOptions');

});

// file: lib/common/plugin/capture.js
define("cordova/plugin/capture", function(require, exports, module) {

var exec = require('cordova/exec'),
    MediaFile = require('cordova/plugin/MediaFile');

/**
 * Launches a capture of different types.
 *
 * @param (DOMString} type
 * @param {Function} successCB
 * @param {Function} errorCB
 * @param {CaptureVideoOptions} options
 */
function _capture(type, successCallback, errorCallback, options) {
    var win = function(pluginResult) {
        var mediaFiles = [];
        var i;
        for (i = 0; i < pluginResult.length; i++) {
            var mediaFile = new MediaFile();
            mediaFile.name = pluginResult[i].name;
            mediaFile.fullPath = pluginResult[i].fullPath;
            mediaFile.type = pluginResult[i].type;
            mediaFile.lastModifiedDate = pluginResult[i].lastModifiedDate;
            mediaFile.size = pluginResult[i].size;
            mediaFiles.push(mediaFile);
        }
        successCallback(mediaFiles);
    };
    exec(win, errorCallback, "Capture", type, [options]);
}
/**
 * The Capture interface exposes an interface to the camera and microphone of the hosting device.
 */
function Capture() {
    this.supportedAudioModes = [];
    this.supportedImageModes = [];
    this.supportedVideoModes = [];
}

/**
 * Launch audio recorder application for recording audio clip(s).
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 * @param {CaptureAudioOptions} options
 */
Capture.prototype.captureAudio = function(successCallback, errorCallback, options){
    _capture("captureAudio", successCallback, errorCallback, options);
};

/**
 * Launch camera application for taking image(s).
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 * @param {CaptureImageOptions} options
 */
Capture.prototype.captureImage = function(successCallback, errorCallback, options){
    _capture("captureImage", successCallback, errorCallback, options);
};

/**
 * Launch device camera application for recording video(s).
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 * @param {CaptureVideoOptions} options
 */
Capture.prototype.captureVideo = function(successCallback, errorCallback, options){
    _capture("captureVideo", successCallback, errorCallback, options);
};


module.exports = new Capture();

});

// file: lib/common/plugin/capture/symbols.js
define("cordova/plugin/capture/symbols", function(require, exports, module) {

var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/CaptureError', 'CaptureError');
modulemapper.clobbers('cordova/plugin/CaptureAudioOptions', 'CaptureAudioOptions');
modulemapper.clobbers('cordova/plugin/CaptureImageOptions', 'CaptureImageOptions');
modulemapper.clobbers('cordova/plugin/CaptureVideoOptions', 'CaptureVideoOptions');
modulemapper.clobbers('cordova/plugin/ConfigurationData', 'ConfigurationData');
modulemapper.clobbers('cordova/plugin/MediaFile', 'MediaFile');
modulemapper.clobbers('cordova/plugin/MediaFileData', 'MediaFileData');
modulemapper.clobbers('cordova/plugin/capture', 'navigator.device.capture');

});

// file: lib/common/plugin/compass.js
define("cordova/plugin/compass", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec'),
    utils = require('cordova/utils'),
    CompassHeading = require('cordova/plugin/CompassHeading'),
    CompassError = require('cordova/plugin/CompassError'),
    timers = {},
    compass = {
        /**
         * Asynchronously acquires the current heading.
         * @param {Function} successCallback The function to call when the heading
         * data is available
         * @param {Function} errorCallback The function to call when there is an error
         * getting the heading data.
         * @param {CompassOptions} options The options for getting the heading data (not used).
         */
        getCurrentHeading:function(successCallback, errorCallback, options) {
            argscheck.checkArgs('fFO', 'compass.getCurrentHeading', arguments);

            var win = function(result) {
                var ch = new CompassHeading(result.magneticHeading, result.trueHeading, result.headingAccuracy, result.timestamp);
                successCallback(ch);
            };
            var fail = errorCallback && function(code) {
                var ce = new CompassError(code);
                errorCallback(ce);
            };

            // Get heading
            exec(win, fail, "Compass", "getHeading", [options]);
        },

        /**
         * Asynchronously acquires the heading repeatedly at a given interval.
         * @param {Function} successCallback The function to call each time the heading
         * data is available
         * @param {Function} errorCallback The function to call when there is an error
         * getting the heading data.
         * @param {HeadingOptions} options The options for getting the heading data
         * such as timeout and the frequency of the watch. For iOS, filter parameter
         * specifies to watch via a distance filter rather than time.
         */
        watchHeading:function(successCallback, errorCallback, options) {
            argscheck.checkArgs('fFO', 'compass.watchHeading', arguments);
            // Default interval (100 msec)
            var frequency = (options !== undefined && options.frequency !== undefined) ? options.frequency : 100;
            var filter = (options !== undefined && options.filter !== undefined) ? options.filter : 0;

            var id = utils.createUUID();
            if (filter > 0) {
                // is an iOS request for watch by filter, no timer needed
                timers[id] = "iOS";
                compass.getCurrentHeading(successCallback, errorCallback, options);
            } else {
                // Start watch timer to get headings
                timers[id] = window.setInterval(function() {
                    compass.getCurrentHeading(successCallback, errorCallback);
                }, frequency);
            }

            return id;
        },

        /**
         * Clears the specified heading watch.
         * @param {String} watchId The ID of the watch returned from #watchHeading.
         */
        clearWatch:function(id) {
            // Stop javascript timer & remove from timer list
            if (id && timers[id]) {
                if (timers[id] != "iOS") {
                    clearInterval(timers[id]);
                } else {
                    // is iOS watch by filter so call into device to stop
                    exec(null, null, "Compass", "stopHeading", []);
                }
                delete timers[id];
            }
        }
    };

module.exports = compass;

});

// file: lib/common/plugin/compass/symbols.js
define("cordova/plugin/compass/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/CompassHeading', 'CompassHeading');
modulemapper.clobbers('cordova/plugin/CompassError', 'CompassError');
modulemapper.clobbers('cordova/plugin/compass', 'navigator.compass');

});

// file: lib/common/plugin/console-via-logger.js
define("cordova/plugin/console-via-logger", function(require, exports, module) {

//------------------------------------------------------------------------------

var logger = require("cordova/plugin/logger");
var utils  = require("cordova/utils");

//------------------------------------------------------------------------------
// object that we're exporting
//------------------------------------------------------------------------------
var console = module.exports;

//------------------------------------------------------------------------------
// copy of the original console object
//------------------------------------------------------------------------------
var WinConsole = window.console;

//------------------------------------------------------------------------------
// whether to use the logger
//------------------------------------------------------------------------------
var UseLogger = false;

//------------------------------------------------------------------------------
// Timers
//------------------------------------------------------------------------------
var Timers = {};

//------------------------------------------------------------------------------
// used for unimplemented methods
//------------------------------------------------------------------------------
function noop() {}

//------------------------------------------------------------------------------
// used for unimplemented methods
//------------------------------------------------------------------------------
console.useLogger = function (value) {
    if (arguments.length) UseLogger = !!value;

    if (UseLogger) {
        if (logger.useConsole()) {
            throw new Error("console and logger are too intertwingly");
        }
    }

    return UseLogger;
};

//------------------------------------------------------------------------------
console.log = function() {
    if (logger.useConsole()) return;
    logger.log.apply(logger, [].slice.call(arguments));
};

//------------------------------------------------------------------------------
console.error = function() {
    if (logger.useConsole()) return;
    logger.error.apply(logger, [].slice.call(arguments));
};

//------------------------------------------------------------------------------
console.warn = function() {
    if (logger.useConsole()) return;
    logger.warn.apply(logger, [].slice.call(arguments));
};

//------------------------------------------------------------------------------
console.info = function() {
    if (logger.useConsole()) return;
    logger.info.apply(logger, [].slice.call(arguments));
};

//------------------------------------------------------------------------------
console.debug = function() {
    if (logger.useConsole()) return;
    logger.debug.apply(logger, [].slice.call(arguments));
};

//------------------------------------------------------------------------------
console.assert = function(expression) {
    if (expression) return;

    var message = logger.format.apply(logger.format, [].slice.call(arguments, 1));
    console.log("ASSERT: " + message);
};

//------------------------------------------------------------------------------
console.clear = function() {};

//------------------------------------------------------------------------------
console.dir = function(object) {
    console.log("%o", object);
};

//------------------------------------------------------------------------------
console.dirxml = function(node) {
    console.log(node.innerHTML);
};

//------------------------------------------------------------------------------
console.trace = noop;

//------------------------------------------------------------------------------
console.group = console.log;

//------------------------------------------------------------------------------
console.groupCollapsed = console.log;

//------------------------------------------------------------------------------
console.groupEnd = noop;

//------------------------------------------------------------------------------
console.time = function(name) {
    Timers[name] = new Date().valueOf();
};

//------------------------------------------------------------------------------
console.timeEnd = function(name) {
    var timeStart = Timers[name];
    if (!timeStart) {
        console.warn("unknown timer: " + name);
        return;
    }

    var timeElapsed = new Date().valueOf() - timeStart;
    console.log(name + ": " + timeElapsed + "ms");
};

//------------------------------------------------------------------------------
console.timeStamp = noop;

//------------------------------------------------------------------------------
console.profile = noop;

//------------------------------------------------------------------------------
console.profileEnd = noop;

//------------------------------------------------------------------------------
console.count = noop;

//------------------------------------------------------------------------------
console.exception = console.log;

//------------------------------------------------------------------------------
console.table = function(data, columns) {
    console.log("%o", data);
};

//------------------------------------------------------------------------------
// return a new function that calls both functions passed as args
//------------------------------------------------------------------------------
function wrappedOrigCall(orgFunc, newFunc) {
    return function() {
        var args = [].slice.call(arguments);
        try { orgFunc.apply(WinConsole, args); } catch (e) {}
        try { newFunc.apply(console,    args); } catch (e) {}
    };
}

//------------------------------------------------------------------------------
// For every function that exists in the original console object, that
// also exists in the new console object, wrap the new console method
// with one that calls both
//------------------------------------------------------------------------------
for (var key in console) {
    if (typeof WinConsole[key] == "function") {
        console[key] = wrappedOrigCall(WinConsole[key], console[key]);
    }
}

});

// file: lib/common/plugin/contacts.js
define("cordova/plugin/contacts", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec'),
    ContactError = require('cordova/plugin/ContactError'),
    utils = require('cordova/utils'),
    Contact = require('cordova/plugin/Contact');

/**
* Represents a group of Contacts.
* @constructor
*/
var contacts = {
    /**
     * Returns an array of Contacts matching the search criteria.
     * @param fields that should be searched
     * @param successCB success callback
     * @param errorCB error callback
     * @param {ContactFindOptions} options that can be applied to contact searching
     * @return array of Contacts matching search criteria
     */
    find:function(fields, successCB, errorCB, options) {
        argscheck.checkArgs('afFO', 'contacts.find', arguments);
        if (!fields.length) {
            errorCB && errorCB(new ContactError(ContactError.INVALID_ARGUMENT_ERROR));
        } else {
            var win = function(result) {
                var cs = [];
                for (var i = 0, l = result.length; i < l; i++) {
                    cs.push(contacts.create(result[i]));
                }
                successCB(cs);
            };
            exec(win, errorCB, "Contacts", "search", [fields, options]);
        }
    },

    /**
     * This function creates a new contact, but it does not persist the contact
     * to device storage. To persist the contact to device storage, invoke
     * contact.save().
     * @param properties an object whose properties will be examined to create a new Contact
     * @returns new Contact object
     */
    create:function(properties) {
        argscheck.checkArgs('O', 'contacts.create', arguments);
        var contact = new Contact();
        for (var i in properties) {
            if (typeof contact[i] !== 'undefined' && properties.hasOwnProperty(i)) {
                contact[i] = properties[i];
            }
        }
        return contact;
    }
};

module.exports = contacts;

});

// file: lib/common/plugin/contacts/symbols.js
define("cordova/plugin/contacts/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/contacts', 'navigator.contacts');
modulemapper.clobbers('cordova/plugin/Contact', 'Contact');
modulemapper.clobbers('cordova/plugin/ContactAddress', 'ContactAddress');
modulemapper.clobbers('cordova/plugin/ContactError', 'ContactError');
modulemapper.clobbers('cordova/plugin/ContactField', 'ContactField');
modulemapper.clobbers('cordova/plugin/ContactFindOptions', 'ContactFindOptions');
modulemapper.clobbers('cordova/plugin/ContactName', 'ContactName');
modulemapper.clobbers('cordova/plugin/ContactOrganization', 'ContactOrganization');

});

// file: lib/common/plugin/device.js
define("cordova/plugin/device", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    channel = require('cordova/channel'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec');

// Tell cordova channel to wait on the CordovaInfoReady event
channel.waitForInitialization('onCordovaInfoReady');

/**
 * This represents the mobile device, and provides properties for inspecting the model, version, UUID of the
 * phone, etc.
 * @constructor
 */
function Device() {
    this.available = false;
    this.platform = null;
    this.version = null;
    this.name = null;
    this.uuid = null;
    this.cordova = null;
    this.model = null;

    var me = this;

    channel.onCordovaReady.subscribe(function() {
        me.getInfo(function(info) {
            me.available = true;
            me.platform = info.platform;
            me.version = info.version;
            me.name = info.name;
            me.uuid = info.uuid;
            me.cordova = info.cordova;
            me.model = info.model;
            channel.onCordovaInfoReady.fire();
        },function(e) {
            me.available = false;
            utils.alert("[ERROR] Error initializing Cordova: " + e);
        });
    });
}

/**
 * Get device info
 *
 * @param {Function} successCallback The function to call when the heading data is available
 * @param {Function} errorCallback The function to call when there is an error getting the heading data. (OPTIONAL)
 */
Device.prototype.getInfo = function(successCallback, errorCallback) {
    argscheck.checkArgs('fF', 'Device.getInfo', arguments);
    exec(successCallback, errorCallback, "Device", "getDeviceInfo", []);
};

module.exports = new Device();

});

// file: lib/common/plugin/device/symbols.js
define("cordova/plugin/device/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/device', 'device');

});

// file: lib/common/plugin/echo.js
define("cordova/plugin/echo", function(require, exports, module) {

var exec = require('cordova/exec'),
    utils = require('cordova/utils');

/**
 * Sends the given message through exec() to the Echo plugin, which sends it back to the successCallback.
 * @param successCallback  invoked with a FileSystem object
 * @param errorCallback  invoked if error occurs retrieving file system
 * @param message  The string to be echoed.
 * @param forceAsync  Whether to force an async return value (for testing native->js bridge).
 */
module.exports = function(successCallback, errorCallback, message, forceAsync) {
    var action = 'echo';
    var messageIsMultipart = (utils.typeName(message) == "Array");
    var args = messageIsMultipart ? message : [message];

    if (utils.typeName(message) == 'ArrayBuffer') {
        if (forceAsync) {
            console.warn('Cannot echo ArrayBuffer with forced async, falling back to sync.');
        }
        action += 'ArrayBuffer';
    } else if (messageIsMultipart) {
        if (forceAsync) {
            console.warn('Cannot echo MultiPart Array with forced async, falling back to sync.');
        }
        action += 'MultiPart';
    } else if (forceAsync) {
        action += 'Async';
    }

    exec(successCallback, errorCallback, "Echo", action, args);
};


});

// file: lib/common/plugin/file/symbols.js
define("cordova/plugin/file/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper'),
    symbolshelper = require('cordova/plugin/file/symbolshelper');

symbolshelper(modulemapper.defaults);

});

// file: lib/common/plugin/file/symbolshelper.js
define("cordova/plugin/file/symbolshelper", function(require, exports, module) {

module.exports = function(exportFunc) {
    exportFunc('cordova/plugin/DirectoryEntry', 'DirectoryEntry');
    exportFunc('cordova/plugin/DirectoryReader', 'DirectoryReader');
    exportFunc('cordova/plugin/Entry', 'Entry');
    exportFunc('cordova/plugin/File', 'File');
    exportFunc('cordova/plugin/FileEntry', 'FileEntry');
    exportFunc('cordova/plugin/FileError', 'FileError');
    exportFunc('cordova/plugin/FileReader', 'FileReader');
    exportFunc('cordova/plugin/FileSystem', 'FileSystem');
    exportFunc('cordova/plugin/FileUploadOptions', 'FileUploadOptions');
    exportFunc('cordova/plugin/FileUploadResult', 'FileUploadResult');
    exportFunc('cordova/plugin/FileWriter', 'FileWriter');
    exportFunc('cordova/plugin/Flags', 'Flags');
    exportFunc('cordova/plugin/LocalFileSystem', 'LocalFileSystem');
    exportFunc('cordova/plugin/Metadata', 'Metadata');
    exportFunc('cordova/plugin/ProgressEvent', 'ProgressEvent');
    exportFunc('cordova/plugin/requestFileSystem', 'requestFileSystem');
    exportFunc('cordova/plugin/resolveLocalFileSystemURI', 'resolveLocalFileSystemURI');
};

});

// file: lib/common/plugin/filetransfer/symbols.js
define("cordova/plugin/filetransfer/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/FileTransfer', 'FileTransfer');
modulemapper.clobbers('cordova/plugin/FileTransferError', 'FileTransferError');

});

// file: lib/firefoxos/plugin/firefoxos/accelerometer.js
define("cordova/plugin/firefoxos/accelerometer", function(require, exports, module) {

var cordova = require('cordova'),
    callback;

module.exports = {
    start: function (win, fail, args) {
        window.removeEventListener("devicemotion", callback);
        callback = function (motion) {
            win({
                x: motion.accelerationIncludingGravity.x,
                y: motion.accelerationIncludingGravity.y,
                z: motion.accelerationIncludingGravity.z,
                timestamp: motion.timestamp
            });
        };
        window.addEventListener("devicemotion", callback);
    },
    stop: function (win, fail, args) {
        window.removeEventListener("devicemotion", callback);
    }
};

});

// file: lib/firefoxos/plugin/firefoxos/device.js
define("cordova/plugin/firefoxos/device", function(require, exports, module) {

var channel = require('cordova/channel'),
    cordova = require('cordova');

// Tell cordova channel to wait on the CordovaInfoReady event
channel.waitForInitialization('onCordovaInfoReady');

module.exports = {
    getDeviceInfo : function(win, fail, args){
        win({
            platform: "Firefox OS",
            version: "0.0.1",
            model: "Beta Phone",
            name: "Beta Phone", // deprecated: please use device.model
            uuid: "somestring",
            cordova: "2.4.0rc1"
        });
    }
};

});

// file: lib/firefoxos/plugin/firefoxos/network.js
define("cordova/plugin/firefoxos/network", function(require, exports, module) {

var cordova = require('cordova');

module.exports = {
    getConnectionInfo: function (win, fail, args) {
        win("3G");
    }
};

});

// file: lib/firefoxos/plugin/firefoxos/notification.js
define("cordova/plugin/firefoxos/notification", function(require, exports, module) {

module.exports = {

    vibrate: function(milliseconds) {
        console.log ("milliseconds" , milliseconds);

        if (navigator.vibrate) {
            navigator.vibrate(milliseconds);
        } else {
            console.log ("cordova/plugin/firefoxos/notification, vibrate API does not exist");
        }
    }

};

});

// file: lib/firefoxos/plugin/firefoxos/orientation.js
define("cordova/plugin/firefoxos/orientation", function(require, exports, module) {

// user must have event listener registered for orientation to work
// window.addEventListener("orientationchange", onorientationchange, true);

module.exports = {

    getCurrentOrientation: function() {
          return window.screen.orientation;
    }

};

});

// file: lib/common/plugin/geolocation.js
define("cordova/plugin/geolocation", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec'),
    PositionError = require('cordova/plugin/PositionError'),
    Position = require('cordova/plugin/Position');

var timers = {};   // list of timers in use

// Returns default params, overrides if provided with values
function parseParameters(options) {
    var opt = {
        maximumAge: 0,
        enableHighAccuracy: false,
        timeout: Infinity
    };

    if (options) {
        if (options.maximumAge !== undefined && !isNaN(options.maximumAge) && options.maximumAge > 0) {
            opt.maximumAge = options.maximumAge;
        }
        if (options.enableHighAccuracy !== undefined) {
            opt.enableHighAccuracy = options.enableHighAccuracy;
        }
        if (options.timeout !== undefined && !isNaN(options.timeout)) {
            if (options.timeout < 0) {
                opt.timeout = 0;
            } else {
                opt.timeout = options.timeout;
            }
        }
    }

    return opt;
}

// Returns a timeout failure, closed over a specified timeout value and error callback.
function createTimeout(errorCallback, timeout) {
    var t = setTimeout(function() {
        clearTimeout(t);
        t = null;
        errorCallback({
            code:PositionError.TIMEOUT,
            message:"Position retrieval timed out."
        });
    }, timeout);
    return t;
}

var geolocation = {
    lastPosition:null, // reference to last known (cached) position returned
    /**
   * Asynchronously acquires the current position.
   *
   * @param {Function} successCallback    The function to call when the position data is available
   * @param {Function} errorCallback      The function to call when there is an error getting the heading position. (OPTIONAL)
   * @param {PositionOptions} options     The options for getting the position data. (OPTIONAL)
   */
    getCurrentPosition:function(successCallback, errorCallback, options) {
        argscheck.checkArgs('fFO', 'geolocation.getCurrentPosition', arguments);
        options = parseParameters(options);

        // Timer var that will fire an error callback if no position is retrieved from native
        // before the "timeout" param provided expires
        var timeoutTimer = {timer:null};

        var win = function(p) {
            clearTimeout(timeoutTimer.timer);
            if (!(timeoutTimer.timer)) {
                // Timeout already happened, or native fired error callback for
                // this geo request.
                // Don't continue with success callback.
                return;
            }
            var pos = new Position(
                {
                    latitude:p.latitude,
                    longitude:p.longitude,
                    altitude:p.altitude,
                    accuracy:p.accuracy,
                    heading:p.heading,
                    velocity:p.velocity,
                    altitudeAccuracy:p.altitudeAccuracy
                },
                (p.timestamp === undefined ? new Date() : ((p.timestamp instanceof Date) ? p.timestamp : new Date(p.timestamp)))
            );
            geolocation.lastPosition = pos;
            successCallback(pos);
        };
        var fail = function(e) {
            clearTimeout(timeoutTimer.timer);
            timeoutTimer.timer = null;
            var err = new PositionError(e.code, e.message);
            if (errorCallback) {
                errorCallback(err);
            }
        };

        // Check our cached position, if its timestamp difference with current time is less than the maximumAge, then just
        // fire the success callback with the cached position.
        if (geolocation.lastPosition && options.maximumAge && (((new Date()).getTime() - geolocation.lastPosition.timestamp.getTime()) <= options.maximumAge)) {
            successCallback(geolocation.lastPosition);
        // If the cached position check failed and the timeout was set to 0, error out with a TIMEOUT error object.
        } else if (options.timeout === 0) {
            fail({
                code:PositionError.TIMEOUT,
                message:"timeout value in PositionOptions set to 0 and no cached Position object available, or cached Position object's age exceeds provided PositionOptions' maximumAge parameter."
            });
        // Otherwise we have to call into native to retrieve a position.
        } else {
            if (options.timeout !== Infinity) {
                // If the timeout value was not set to Infinity (default), then
                // set up a timeout function that will fire the error callback
                // if no successful position was retrieved before timeout expired.
                timeoutTimer.timer = createTimeout(fail, options.timeout);
            } else {
                // This is here so the check in the win function doesn't mess stuff up
                // may seem weird but this guarantees timeoutTimer is
                // always truthy before we call into native
                timeoutTimer.timer = true;
            }
            exec(win, fail, "Geolocation", "getLocation", [options.enableHighAccuracy, options.maximumAge]);
        }
        return timeoutTimer;
    },
    /**
     * Asynchronously watches the geolocation for changes to geolocation.  When a change occurs,
     * the successCallback is called with the new location.
     *
     * @param {Function} successCallback    The function to call each time the location data is available
     * @param {Function} errorCallback      The function to call when there is an error getting the location data. (OPTIONAL)
     * @param {PositionOptions} options     The options for getting the location data such as frequency. (OPTIONAL)
     * @return String                       The watch id that must be passed to #clearWatch to stop watching.
     */
    watchPosition:function(successCallback, errorCallback, options) {
        argscheck.checkArgs('fFO', 'geolocation.getCurrentPosition', arguments);
        options = parseParameters(options);

        var id = utils.createUUID();

        // Tell device to get a position ASAP, and also retrieve a reference to the timeout timer generated in getCurrentPosition
        timers[id] = geolocation.getCurrentPosition(successCallback, errorCallback, options);

        var fail = function(e) {
            clearTimeout(timers[id].timer);
            var err = new PositionError(e.code, e.message);
            if (errorCallback) {
                errorCallback(err);
            }
        };

        var win = function(p) {
            clearTimeout(timers[id].timer);
            if (options.timeout !== Infinity) {
                timers[id].timer = createTimeout(fail, options.timeout);
            }
            var pos = new Position(
                {
                    latitude:p.latitude,
                    longitude:p.longitude,
                    altitude:p.altitude,
                    accuracy:p.accuracy,
                    heading:p.heading,
                    velocity:p.velocity,
                    altitudeAccuracy:p.altitudeAccuracy
                },
                (p.timestamp === undefined ? new Date() : ((p.timestamp instanceof Date) ? p.timestamp : new Date(p.timestamp)))
            );
            geolocation.lastPosition = pos;
            successCallback(pos);
        };

        exec(win, fail, "Geolocation", "addWatch", [id, options.enableHighAccuracy]);

        return id;
    },
    /**
     * Clears the specified heading watch.
     *
     * @param {String} id       The ID of the watch returned from #watchPosition
     */
    clearWatch:function(id) {
        if (id && timers[id] !== undefined) {
            clearTimeout(timers[id].timer);
            timers[id].timer = false;
            exec(null, null, "Geolocation", "clearWatch", [id]);
        }
    }
};

module.exports = geolocation;

});

// file: lib/common/plugin/geolocation/symbols.js
define("cordova/plugin/geolocation/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.defaults('cordova/plugin/geolocation', 'navigator.geolocation');
modulemapper.clobbers('cordova/plugin/PositionError', 'PositionError');
modulemapper.clobbers('cordova/plugin/Position', 'Position');
modulemapper.clobbers('cordova/plugin/Coordinates', 'Coordinates');

});

// file: lib/common/plugin/globalization.js
define("cordova/plugin/globalization", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec'),
    GlobalizationError = require('cordova/plugin/GlobalizationError');

var globalization = {

/**
* Returns the string identifier for the client's current language.
* It returns the language identifier string to the successCB callback with a
* properties object as a parameter. If there is an error getting the language,
* then the errorCB callback is invoked.
*
* @param {Function} successCB
* @param {Function} errorCB
*
* @return Object.value {String}: The language identifier
*
* @error GlobalizationError.UNKNOWN_ERROR
*
* Example
*    globalization.getPreferredLanguage(function (language) {alert('language:' + language.value + '\n');},
*                                function () {});
*/
getPreferredLanguage:function(successCB, failureCB) {
    argscheck.checkArgs('fF', 'Globalization.getPreferredLanguage', arguments);
    exec(successCB, failureCB, "Globalization","getPreferredLanguage", []);
},

/**
* Returns the string identifier for the client's current locale setting.
* It returns the locale identifier string to the successCB callback with a
* properties object as a parameter. If there is an error getting the locale,
* then the errorCB callback is invoked.
*
* @param {Function} successCB
* @param {Function} errorCB
*
* @return Object.value {String}: The locale identifier
*
* @error GlobalizationError.UNKNOWN_ERROR
*
* Example
*    globalization.getLocaleName(function (locale) {alert('locale:' + locale.value + '\n');},
*                                function () {});
*/
getLocaleName:function(successCB, failureCB) {
    argscheck.checkArgs('fF', 'Globalization.getLocaleName', arguments);
    exec(successCB, failureCB, "Globalization","getLocaleName", []);
},


/**
* Returns a date formatted as a string according to the client's user preferences and
* calendar using the time zone of the client. It returns the formatted date string to the
* successCB callback with a properties object as a parameter. If there is an error
* formatting the date, then the errorCB callback is invoked.
*
* The defaults are: formatLenght="short" and selector="date and time"
*
* @param {Date} date
* @param {Function} successCB
* @param {Function} errorCB
* @param {Object} options {optional}
*            formatLength {String}: 'short', 'medium', 'long', or 'full'
*            selector {String}: 'date', 'time', or 'date and time'
*
* @return Object.value {String}: The localized date string
*
* @error GlobalizationError.FORMATTING_ERROR
*
* Example
*    globalization.dateToString(new Date(),
*                function (date) {alert('date:' + date.value + '\n');},
*                function (errorCode) {alert(errorCode);},
*                {formatLength:'short'});
*/
dateToString:function(date, successCB, failureCB, options) {
    argscheck.checkArgs('dfFO', 'Globalization.dateToString', arguments);
    var dateValue = date.valueOf();
    exec(successCB, failureCB, "Globalization", "dateToString", [{"date": dateValue, "options": options}]);
},


/**
* Parses a date formatted as a string according to the client's user
* preferences and calendar using the time zone of the client and returns
* the corresponding date object. It returns the date to the successCB
* callback with a properties object as a parameter. If there is an error
* parsing the date string, then the errorCB callback is invoked.
*
* The defaults are: formatLength="short" and selector="date and time"
*
* @param {String} dateString
* @param {Function} successCB
* @param {Function} errorCB
* @param {Object} options {optional}
*            formatLength {String}: 'short', 'medium', 'long', or 'full'
*            selector {String}: 'date', 'time', or 'date and time'
*
* @return    Object.year {Number}: The four digit year
*            Object.month {Number}: The month from (0 - 11)
*            Object.day {Number}: The day from (1 - 31)
*            Object.hour {Number}: The hour from (0 - 23)
*            Object.minute {Number}: The minute from (0 - 59)
*            Object.second {Number}: The second from (0 - 59)
*            Object.millisecond {Number}: The milliseconds (from 0 - 999),
*                                        not available on all platforms
*
* @error GlobalizationError.PARSING_ERROR
*
* Example
*    globalization.stringToDate('4/11/2011',
*                function (date) { alert('Month:' + date.month + '\n' +
*                    'Day:' + date.day + '\n' +
*                    'Year:' + date.year + '\n');},
*                function (errorCode) {alert(errorCode);},
*                {selector:'date'});
*/
stringToDate:function(dateString, successCB, failureCB, options) {
    argscheck.checkArgs('sfFO', 'Globalization.stringToDate', arguments);
    exec(successCB, failureCB, "Globalization", "stringToDate", [{"dateString": dateString, "options": options}]);
},


/**
* Returns a pattern string for formatting and parsing dates according to the client's
* user preferences. It returns the pattern to the successCB callback with a
* properties object as a parameter. If there is an error obtaining the pattern,
* then the errorCB callback is invoked.
*
* The defaults are: formatLength="short" and selector="date and time"
*
* @param {Function} successCB
* @param {Function} errorCB
* @param {Object} options {optional}
*            formatLength {String}: 'short', 'medium', 'long', or 'full'
*            selector {String}: 'date', 'time', or 'date and time'
*
* @return    Object.pattern {String}: The date and time pattern for formatting and parsing dates.
*                                    The patterns follow Unicode Technical Standard #35
*                                    http://unicode.org/reports/tr35/tr35-4.html
*            Object.timezone {String}: The abbreviated name of the time zone on the client
*            Object.utc_offset {Number}: The current difference in seconds between the client's
*                                        time zone and coordinated universal time.
*            Object.dst_offset {Number}: The current daylight saving time offset in seconds
*                                        between the client's non-daylight saving's time zone
*                                        and the client's daylight saving's time zone.
*
* @error GlobalizationError.PATTERN_ERROR
*
* Example
*    globalization.getDatePattern(
*                function (date) {alert('pattern:' + date.pattern + '\n');},
*                function () {},
*                {formatLength:'short'});
*/
getDatePattern:function(successCB, failureCB, options) {
    argscheck.checkArgs('fFO', 'Globalization.getDatePattern', arguments);
    exec(successCB, failureCB, "Globalization", "getDatePattern", [{"options": options}]);
},


/**
* Returns an array of either the names of the months or days of the week
* according to the client's user preferences and calendar. It returns the array of names to the
* successCB callback with a properties object as a parameter. If there is an error obtaining the
* names, then the errorCB callback is invoked.
*
* The defaults are: type="wide" and item="months"
*
* @param {Function} successCB
* @param {Function} errorCB
* @param {Object} options {optional}
*            type {String}: 'narrow' or 'wide'
*            item {String}: 'months', or 'days'
*
* @return Object.value {Array{String}}: The array of names starting from either
*                                        the first month in the year or the
*                                        first day of the week.
* @error GlobalizationError.UNKNOWN_ERROR
*
* Example
*    globalization.getDateNames(function (names) {
*        for(var i = 0; i < names.value.length; i++) {
*            alert('Month:' + names.value[i] + '\n');}},
*        function () {});
*/
getDateNames:function(successCB, failureCB, options) {
    argscheck.checkArgs('fFO', 'Globalization.getDateNames', arguments);
    exec(successCB, failureCB, "Globalization", "getDateNames", [{"options": options}]);
},

/**
* Returns whether daylight savings time is in effect for a given date using the client's
* time zone and calendar. It returns whether or not daylight savings time is in effect
* to the successCB callback with a properties object as a parameter. If there is an error
* reading the date, then the errorCB callback is invoked.
*
* @param {Date} date
* @param {Function} successCB
* @param {Function} errorCB
*
* @return Object.dst {Boolean}: The value "true" indicates that daylight savings time is
*                                in effect for the given date and "false" indicate that it is not.
*
* @error GlobalizationError.UNKNOWN_ERROR
*
* Example
*    globalization.isDayLightSavingsTime(new Date(),
*                function (date) {alert('dst:' + date.dst + '\n');}
*                function () {});
*/
isDayLightSavingsTime:function(date, successCB, failureCB) {
    argscheck.checkArgs('dfF', 'Globalization.isDayLightSavingsTime', arguments);
    var dateValue = date.valueOf();
    exec(successCB, failureCB, "Globalization", "isDayLightSavingsTime", [{"date": dateValue}]);
},

/**
* Returns the first day of the week according to the client's user preferences and calendar.
* The days of the week are numbered starting from 1 where 1 is considered to be Sunday.
* It returns the day to the successCB callback with a properties object as a parameter.
* If there is an error obtaining the pattern, then the errorCB callback is invoked.
*
* @param {Function} successCB
* @param {Function} errorCB
*
* @return Object.value {Number}: The number of the first day of the week.
*
* @error GlobalizationError.UNKNOWN_ERROR
*
* Example
*    globalization.getFirstDayOfWeek(function (day)
*                { alert('Day:' + day.value + '\n');},
*                function () {});
*/
getFirstDayOfWeek:function(successCB, failureCB) {
    argscheck.checkArgs('fF', 'Globalization.getFirstDayOfWeek', arguments);
    exec(successCB, failureCB, "Globalization", "getFirstDayOfWeek", []);
},


/**
* Returns a number formatted as a string according to the client's user preferences.
* It returns the formatted number string to the successCB callback with a properties object as a
* parameter. If there is an error formatting the number, then the errorCB callback is invoked.
*
* The defaults are: type="decimal"
*
* @param {Number} number
* @param {Function} successCB
* @param {Function} errorCB
* @param {Object} options {optional}
*            type {String}: 'decimal', "percent", or 'currency'
*
* @return Object.value {String}: The formatted number string.
*
* @error GlobalizationError.FORMATTING_ERROR
*
* Example
*    globalization.numberToString(3.25,
*                function (number) {alert('number:' + number.value + '\n');},
*                function () {},
*                {type:'decimal'});
*/
numberToString:function(number, successCB, failureCB, options) {
    argscheck.checkArgs('nfFO', 'Globalization.numberToString', arguments);
    exec(successCB, failureCB, "Globalization", "numberToString", [{"number": number, "options": options}]);
},

/**
* Parses a number formatted as a string according to the client's user preferences and
* returns the corresponding number. It returns the number to the successCB callback with a
* properties object as a parameter. If there is an error parsing the number string, then
* the errorCB callback is invoked.
*
* The defaults are: type="decimal"
*
* @param {String} numberString
* @param {Function} successCB
* @param {Function} errorCB
* @param {Object} options {optional}
*            type {String}: 'decimal', "percent", or 'currency'
*
* @return Object.value {Number}: The parsed number.
*
* @error GlobalizationError.PARSING_ERROR
*
* Example
*    globalization.stringToNumber('1234.56',
*                function (number) {alert('Number:' + number.value + '\n');},
*                function () { alert('Error parsing number');});
*/
stringToNumber:function(numberString, successCB, failureCB, options) {
    argscheck.checkArgs('sfFO', 'Globalization.stringToNumber', arguments);
    exec(successCB, failureCB, "Globalization", "stringToNumber", [{"numberString": numberString, "options": options}]);
},

/**
* Returns a pattern string for formatting and parsing numbers according to the client's user
* preferences. It returns the pattern to the successCB callback with a properties object as a
* parameter. If there is an error obtaining the pattern, then the errorCB callback is invoked.
*
* The defaults are: type="decimal"
*
* @param {Function} successCB
* @param {Function} errorCB
* @param {Object} options {optional}
*            type {String}: 'decimal', "percent", or 'currency'
*
* @return    Object.pattern {String}: The number pattern for formatting and parsing numbers.
*                                    The patterns follow Unicode Technical Standard #35.
*                                    http://unicode.org/reports/tr35/tr35-4.html
*            Object.symbol {String}: The symbol to be used when formatting and parsing
*                                    e.g., percent or currency symbol.
*            Object.fraction {Number}: The number of fractional digits to use when parsing and
*                                    formatting numbers.
*            Object.rounding {Number}: The rounding increment to use when parsing and formatting.
*            Object.positive {String}: The symbol to use for positive numbers when parsing and formatting.
*            Object.negative: {String}: The symbol to use for negative numbers when parsing and formatting.
*            Object.decimal: {String}: The decimal symbol to use for parsing and formatting.
*            Object.grouping: {String}: The grouping symbol to use for parsing and formatting.
*
* @error GlobalizationError.PATTERN_ERROR
*
* Example
*    globalization.getNumberPattern(
*                function (pattern) {alert('Pattern:' + pattern.pattern + '\n');},
*                function () {});
*/
getNumberPattern:function(successCB, failureCB, options) {
    argscheck.checkArgs('fFO', 'Globalization.getNumberPattern', arguments);
    exec(successCB, failureCB, "Globalization", "getNumberPattern", [{"options": options}]);
},

/**
* Returns a pattern string for formatting and parsing currency values according to the client's
* user preferences and ISO 4217 currency code. It returns the pattern to the successCB callback with a
* properties object as a parameter. If there is an error obtaining the pattern, then the errorCB
* callback is invoked.
*
* @param {String} currencyCode
* @param {Function} successCB
* @param {Function} errorCB
*
* @return    Object.pattern {String}: The currency pattern for formatting and parsing currency values.
*                                    The patterns follow Unicode Technical Standard #35
*                                    http://unicode.org/reports/tr35/tr35-4.html
*            Object.code {String}: The ISO 4217 currency code for the pattern.
*            Object.fraction {Number}: The number of fractional digits to use when parsing and
*                                    formatting currency.
*            Object.rounding {Number}: The rounding increment to use when parsing and formatting.
*            Object.decimal: {String}: The decimal symbol to use for parsing and formatting.
*            Object.grouping: {String}: The grouping symbol to use for parsing and formatting.
*
* @error GlobalizationError.FORMATTING_ERROR
*
* Example
*    globalization.getCurrencyPattern('EUR',
*                function (currency) {alert('Pattern:' + currency.pattern + '\n');}
*                function () {});
*/
getCurrencyPattern:function(currencyCode, successCB, failureCB) {
    argscheck.checkArgs('sfF', 'Globalization.getCurrencyPattern', arguments);
    exec(successCB, failureCB, "Globalization", "getCurrencyPattern", [{"currencyCode": currencyCode}]);
}

};

module.exports = globalization;

});

// file: lib/common/plugin/globalization/symbols.js
define("cordova/plugin/globalization/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/globalization', 'navigator.globalization');
modulemapper.clobbers('cordova/plugin/GlobalizationError', 'GlobalizationError');

});

// file: lib/ios/plugin/ios/Contact.js
define("cordova/plugin/ios/Contact", function(require, exports, module) {

var exec = require('cordova/exec'),
    ContactError = require('cordova/plugin/ContactError');

/**
 * Provides iOS Contact.display API.
 */
module.exports = {
    display : function(errorCB, options) {
        /*
         *    Display a contact using the iOS Contact Picker UI
         *    NOT part of W3C spec so no official documentation
         *
         *    @param errorCB error callback
         *    @param options object
         *    allowsEditing: boolean AS STRING
         *        "true" to allow editing the contact
         *        "false" (default) display contact
         */

        if (this.id === null) {
            if (typeof errorCB === "function") {
                var errorObj = new ContactError(ContactError.UNKNOWN_ERROR);
                errorCB(errorObj);
            }
        }
        else {
            exec(null, errorCB, "Contacts","displayContact", [this.id, options]);
        }
    }
};

});

// file: lib/ios/plugin/ios/Entry.js
define("cordova/plugin/ios/Entry", function(require, exports, module) {

module.exports = {
    toURL:function() {
        // TODO: refactor path in a cross-platform way so we can eliminate
        // these kinds of platform-specific hacks.
        return "file://localhost" + this.fullPath;
    },
    toURI: function() {
        console.log("DEPRECATED: Update your code to use 'toURL'");
        return "file://localhost" + this.fullPath;
    }
};

});

// file: lib/ios/plugin/ios/contacts.js
define("cordova/plugin/ios/contacts", function(require, exports, module) {

var exec = require('cordova/exec');

/**
 * Provides iOS enhanced contacts API.
 */
module.exports = {
    newContactUI : function(successCallback) {
        /*
         *    Create a contact using the iOS Contact Picker UI
         *    NOT part of W3C spec so no official documentation
         *
         * returns:  the id of the created contact as param to successCallback
         */
        exec(successCallback, null, "Contacts","newContact", []);
    },
    chooseContact : function(successCallback, options) {
        /*
         *    Select a contact using the iOS Contact Picker UI
         *    NOT part of W3C spec so no official documentation
         *
         *    @param errorCB error callback
         *    @param options object
         *    allowsEditing: boolean AS STRING
         *        "true" to allow editing the contact
         *        "false" (default) display contact
         *      fields: array of fields to return in contact object (see ContactOptions.fields)
         *
         *    @returns
         *        id of contact selected
         *        ContactObject
         *            if no fields provided contact contains just id information
         *            if fields provided contact object contains information for the specified fields
         *
         */
         var win = function(result) {
             var fullContact = require('cordova/plugin/contacts').create(result);
            successCallback(fullContact.id, fullContact);
       };
        exec(win, null, "Contacts","chooseContact", [options]);
    }
};

});

// file: lib/ios/plugin/ios/contacts/symbols.js
define("cordova/plugin/ios/contacts/symbols", function(require, exports, module) {

require('cordova/plugin/contacts/symbols');

var modulemapper = require('cordova/modulemapper');

modulemapper.merges('cordova/plugin/ios/contacts', 'navigator.contacts');
modulemapper.merges('cordova/plugin/ios/Contact', 'Contact');

});

// file: lib/ios/plugin/ios/geolocation/symbols.js
define("cordova/plugin/ios/geolocation/symbols", function(require, exports, module) {

var modulemapper = require('cordova/modulemapper');

modulemapper.merges('cordova/plugin/geolocation', 'navigator.geolocation');

});

// file: lib/ios/plugin/ios/logger/plugininit.js
define("cordova/plugin/ios/logger/plugininit", function(require, exports, module) {

// use the native logger
var logger = require("cordova/plugin/logger");
logger.useConsole(false);

});

// file: lib/ios/plugin/ios/logger/symbols.js
define("cordova/plugin/ios/logger/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/logger', 'console');

});

// file: lib/ios/plugin/ios/notification.js
define("cordova/plugin/ios/notification", function(require, exports, module) {

var Media = require('cordova/plugin/Media');

module.exports = {
    beep:function(count) {
        (new Media('beep.wav')).play();
    }
};

});

// file: lib/blackberry/plugin/java/Contact.js
define("cordova/plugin/java/Contact", function(require, exports, module) {

var ContactError = require('cordova/plugin/ContactError'),
    ContactUtils = require('cordova/plugin/java/ContactUtils'),
    utils = require('cordova/utils'),
    ContactAddress = require('cordova/plugin/ContactAddress'),
    exec = require('cordova/exec');

// ------------------
// Utility functions
// ------------------

/**
 * Retrieves a BlackBerry contact from the device by unique id.
 *
 * @param uid
 *            Unique id of the contact on the device
 * @return {blackberry.pim.Contact} BlackBerry contact or null if contact with
 *         specified id is not found
 */
var findByUniqueId = function(uid) {
    if (!uid) {
        return null;
    }
    var bbContacts = blackberry.pim.Contact.find(new blackberry.find.FilterExpression("uid", "==", uid));
    return bbContacts[0] || null;
};

/**
 * Creates a BlackBerry contact object from the W3C Contact object and persists
 * it to device storage.
 *
 * @param {Contact}
 *            contact The contact to save
 * @return a new contact object with all properties set
 */
var saveToDevice = function(contact) {

    if (!contact) {
        return;
    }

    var bbContact = null;
    var update = false;

    // if the underlying BlackBerry contact already exists, retrieve it for
    // update
    if (contact.id) {
        // we must attempt to retrieve the BlackBerry contact from the device
        // because this may be an update operation
        bbContact = findByUniqueId(contact.id);
    }

    // contact not found on device, create a new one
    if (!bbContact) {
        bbContact = new blackberry.pim.Contact();
    }
    // update the existing contact
    else {
        update = true;
    }

    // NOTE: The user may be working with a partial Contact object, because only
    // user-specified Contact fields are returned from a find operation (blame
    // the W3C spec). If this is an update to an existing Contact, we don't
    // want to clear an attribute from the contact database simply because the
    // Contact object that the user passed in contains a null value for that
    // attribute. So we only copy the non-null Contact attributes to the
    // BlackBerry contact object before saving.
    //
    // This means that a user must explicitly set a Contact attribute to a
    // non-null value in order to update it in the contact database.
    //
    // name
    if (contact.name !== null) {
        if (contact.name.givenName) {
            bbContact.firstName = contact.name.givenName;
        }
        if (contact.name.familyName) {
            bbContact.lastName = contact.name.familyName;
        }
        if (contact.name.honorificPrefix) {
            bbContact.title = contact.name.honorificPrefix;
        }
    }

    // display name
    if (contact.displayName !== null) {
        bbContact.user1 = contact.displayName;
    }

    // note
    if (contact.note !== null) {
        bbContact.note = contact.note;
    }

    // birthday
    //
    // user may pass in Date object or a string representation of a date
    // if it is a string, we don't know the date format, so try to create a
    // new Date with what we're given
    //
    // NOTE: BlackBerry's Date.parse() does not work well, so use new Date()
    //
    if (contact.birthday !== null) {
        if (utils.isDate(contact.birthday)) {
            bbContact.birthday = contact.birthday;
        } else {
            var bday = contact.birthday.toString();
            bbContact.birthday = (bday.length > 0) ? new Date(bday) : "";
        }
    }

    // BlackBerry supports three email addresses
    if (contact.emails && utils.isArray(contact.emails)) {

        // if this is an update, re-initialize email addresses
        if (update) {
            bbContact.email1 = "";
            bbContact.email2 = "";
            bbContact.email3 = "";
        }

        // copy the first three email addresses found
        var email = null;
        for ( var i = 0; i < contact.emails.length; i += 1) {
            email = contact.emails[i];
            if (!email || !email.value) {
                continue;
            }
            if (bbContact.email1 === "") {
                bbContact.email1 = email.value;
            } else if (bbContact.email2 === "") {
                bbContact.email2 = email.value;
            } else if (bbContact.email3 === "") {
                bbContact.email3 = email.value;
            }
        }
    }

    // BlackBerry supports a finite number of phone numbers
    // copy into appropriate fields based on type
    if (contact.phoneNumbers && utils.isArray(contact.phoneNumbers)) {

        // if this is an update, re-initialize phone numbers
        if (update) {
            bbContact.homePhone = "";
            bbContact.homePhone2 = "";
            bbContact.workPhone = "";
            bbContact.workPhone2 = "";
            bbContact.mobilePhone = "";
            bbContact.faxPhone = "";
            bbContact.pagerPhone = "";
            bbContact.otherPhone = "";
        }

        var type = null;
        var number = null;
        for ( var j = 0; j < contact.phoneNumbers.length; j += 1) {
            if (!contact.phoneNumbers[j] || !contact.phoneNumbers[j].value) {
                continue;
            }
            type = contact.phoneNumbers[j].type;
            number = contact.phoneNumbers[j].value;
            if (type === 'home') {
                if (bbContact.homePhone === "") {
                    bbContact.homePhone = number;
                } else if (bbContact.homePhone2 === "") {
                    bbContact.homePhone2 = number;
                }
            } else if (type === 'work') {
                if (bbContact.workPhone === "") {
                    bbContact.workPhone = number;
                } else if (bbContact.workPhone2 === "") {
                    bbContact.workPhone2 = number;
                }
            } else if (type === 'mobile' && bbContact.mobilePhone === "") {
                bbContact.mobilePhone = number;
            } else if (type === 'fax' && bbContact.faxPhone === "") {
                bbContact.faxPhone = number;
            } else if (type === 'pager' && bbContact.pagerPhone === "") {
                bbContact.pagerPhone = number;
            } else if (bbContact.otherPhone === "") {
                bbContact.otherPhone = number;
            }
        }
    }

    // BlackBerry supports two addresses: home and work
    // copy the first two addresses found from Contact
    if (contact.addresses && utils.isArray(contact.addresses)) {

        // if this is an update, re-initialize addresses
        if (update) {
            bbContact.homeAddress = null;
            bbContact.workAddress = null;
        }

        var address = null;
        var bbHomeAddress = null;
        var bbWorkAddress = null;
        for ( var k = 0; k < contact.addresses.length; k += 1) {
            address = contact.addresses[k];
            if (!address || address.id === undefined || address.pref === undefined || address.type === undefined || address.formatted === undefined) {
                continue;
            }

            if (bbHomeAddress === null && (!address.type || address.type === "home")) {
                bbHomeAddress = createBlackBerryAddress(address);
                bbContact.homeAddress = bbHomeAddress;
            } else if (bbWorkAddress === null && (!address.type || address.type === "work")) {
                bbWorkAddress = createBlackBerryAddress(address);
                bbContact.workAddress = bbWorkAddress;
            }
        }
    }

    // copy first url found to BlackBerry 'webpage' field
    if (contact.urls && utils.isArray(contact.urls)) {

        // if this is an update, re-initialize web page
        if (update) {
            bbContact.webpage = "";
        }

        var url = null;
        for ( var m = 0; m < contact.urls.length; m += 1) {
            url = contact.urls[m];
            if (!url || !url.value) {
                continue;
            }
            if (bbContact.webpage === "") {
                bbContact.webpage = url.value;
                break;
            }
        }
    }

    // copy fields from first organization to the
    // BlackBerry 'company' and 'jobTitle' fields
    if (contact.organizations && utils.isArray(contact.organizations)) {

        // if this is an update, re-initialize org attributes
        if (update) {
            bbContact.company = "";
        }

        var org = null;
        for ( var n = 0; n < contact.organizations.length; n += 1) {
            org = contact.organizations[n];
            if (!org) {
                continue;
            }
            if (bbContact.company === "") {
                bbContact.company = org.name || "";
                bbContact.jobTitle = org.title || "";
                break;
            }
        }
    }

    // categories
    if (contact.categories && utils.isArray(contact.categories)) {
        bbContact.categories = [];
        var category = null;
        for ( var o = 0; o < contact.categories.length; o += 1) {
            category = contact.categories[o];
            if (typeof category == "string") {
                bbContact.categories.push(category);
            }
        }
    }

    // save to device
    bbContact.save();

    // invoke native side to save photo
    // fail gracefully if photo URL is no good, but log the error
    if (contact.photos && utils.isArray(contact.photos)) {
        var photo = null;
        for ( var p = 0; p < contact.photos.length; p += 1) {
            photo = contact.photos[p];
            if (!photo || !photo.value) {
                continue;
            }
            exec(
            // success
            function() {
            },
            // fail
            function(e) {
                console.log('Contact.setPicture failed:' + e);
            }, "Contacts", "setPicture", [ bbContact.uid, photo.type,
                    photo.value ]);
            break;
        }
    }

    // Use the fully populated BlackBerry contact object to create a
    // corresponding W3C contact object.
    return ContactUtils.createContact(bbContact, [ "*" ]);
};

/**
 * Creates a BlackBerry Address object from a W3C ContactAddress.
 *
 * @return {blackberry.pim.Address} a BlackBerry address object
 */
var createBlackBerryAddress = function(address) {
    var bbAddress = new blackberry.pim.Address();

    if (!address) {
        return bbAddress;
    }

    bbAddress.address1 = address.streetAddress || "";
    bbAddress.city = address.locality || "";
    bbAddress.stateProvince = address.region || "";
    bbAddress.zipPostal = address.postalCode || "";
    bbAddress.country = address.country || "";

    return bbAddress;
};

module.exports = {
    /**
     * Persists contact to device storage.
     */
    save : function(success, fail) {
        try {
            // save the contact and store it's unique id
            var fullContact = saveToDevice(this);
            this.id = fullContact.id;

            // This contact object may only have a subset of properties
            // if the save was an update of an existing contact. This is
            // because the existing contact was likely retrieved using a
            // subset of properties, so only those properties were set in the
            // object. For this reason, invoke success with the contact object
            // returned by saveToDevice since it is fully populated.
            if (typeof success === 'function') {
                success(fullContact);
            }
        } catch (e) {
            console.log('Error saving contact: ' + e);
            if (typeof fail === 'function') {
                fail(new ContactError(ContactError.UNKNOWN_ERROR));
            }
        }
    },

    /**
     * Removes contact from device storage.
     *
     * @param success
     *            success callback
     * @param fail
     *            error callback
     */
    remove : function(success, fail) {
        try {
            // retrieve contact from device by id
            var bbContact = null;
            if (this.id) {
                bbContact = findByUniqueId(this.id);
            }

            // if contact was found, remove it
            if (bbContact) {
                console.log('removing contact: ' + bbContact.uid);
                bbContact.remove();
                if (typeof success === 'function') {
                    success(this);
                }
            }
            // attempting to remove a contact that hasn't been saved
            else if (typeof fail === 'function') {
                fail(new ContactError(ContactError.UNKNOWN_ERROR));
            }
        } catch (e) {
            console.log('Error removing contact ' + this.id + ": " + e);
            if (typeof fail === 'function') {
                fail(new ContactError(ContactError.UNKNOWN_ERROR));
            }
        }
    }
};

});

// file: lib/blackberry/plugin/java/ContactUtils.js
define("cordova/plugin/java/ContactUtils", function(require, exports, module) {

var ContactAddress = require('cordova/plugin/ContactAddress'),
    ContactName = require('cordova/plugin/ContactName'),
    ContactField = require('cordova/plugin/ContactField'),
    ContactOrganization = require('cordova/plugin/ContactOrganization'),
    utils = require('cordova/utils'),
    Contact = require('cordova/plugin/Contact');

/**
 * Mappings for each Contact field that may be used in a find operation. Maps
 * W3C Contact fields to one or more fields in a BlackBerry contact object.
 *
 * Example: user searches with a filter on the Contact 'name' field:
 *
 * <code>Contacts.find(['name'], onSuccess, onFail, {filter:'Bob'});</code>
 *
 * The 'name' field does not exist in a BlackBerry contact. Instead, a filter
 * expression will be built to search the BlackBerry contacts using the
 * BlackBerry 'title', 'firstName' and 'lastName' fields.
 */
var fieldMappings = {
    "id" : "uid",
    "displayName" : "user1",
    "name" : [ "title", "firstName", "lastName" ],
    "name.formatted" : [ "title", "firstName", "lastName" ],
    "name.givenName" : "firstName",
    "name.familyName" : "lastName",
    "name.honorificPrefix" : "title",
    "phoneNumbers" : [ "faxPhone", "homePhone", "homePhone2", "mobilePhone",
            "pagerPhone", "otherPhone", "workPhone", "workPhone2" ],
    "phoneNumbers.value" : [ "faxPhone", "homePhone", "homePhone2",
            "mobilePhone", "pagerPhone", "otherPhone", "workPhone",
            "workPhone2" ],
    "emails" : [ "email1", "email2", "email3" ],
    "addresses" : [ "homeAddress.address1", "homeAddress.address2",
            "homeAddress.city", "homeAddress.stateProvince",
            "homeAddress.zipPostal", "homeAddress.country",
            "workAddress.address1", "workAddress.address2", "workAddress.city",
            "workAddress.stateProvince", "workAddress.zipPostal",
            "workAddress.country" ],
    "addresses.formatted" : [ "homeAddress.address1", "homeAddress.address2",
            "homeAddress.city", "homeAddress.stateProvince",
            "homeAddress.zipPostal", "homeAddress.country",
            "workAddress.address1", "workAddress.address2", "workAddress.city",
            "workAddress.stateProvince", "workAddress.zipPostal",
            "workAddress.country" ],
    "addresses.streetAddress" : [ "homeAddress.address1",
            "homeAddress.address2", "workAddress.address1",
            "workAddress.address2" ],
    "addresses.locality" : [ "homeAddress.city", "workAddress.city" ],
    "addresses.region" : [ "homeAddress.stateProvince",
            "workAddress.stateProvince" ],
    "addresses.country" : [ "homeAddress.country", "workAddress.country" ],
    "organizations" : [ "company", "jobTitle" ],
    "organizations.name" : "company",
    "organizations.title" : "jobTitle",
    "birthday" : "birthday",
    "note" : "note",
    "categories" : "categories",
    "urls" : "webpage",
    "urls.value" : "webpage"
};

/*
 * Build an array of all of the valid W3C Contact fields. This is used to
 * substitute all the fields when ["*"] is specified.
 */
var allFields = [];
for ( var key in fieldMappings) {
    if (fieldMappings.hasOwnProperty(key)) {
        allFields.push(key);
    }
}

/**
 * Create a W3C ContactAddress object from a BlackBerry Address object.
 *
 * @param {String}
 *            type the type of address (e.g. work, home)
 * @param {blackberry.pim.Address}
 *            bbAddress a BlackBerry Address object
 * @return {ContactAddress} a contact address object or null if the specified
 *         address is null
 */
var createContactAddress = function(type, bbAddress) {

    if (!bbAddress) {
        return null;
    }

    var address1 = bbAddress.address1 || "";
    var address2 = bbAddress.address2 || "";
    var streetAddress = address1 + ", " + address2;
    var locality = bbAddress.city || "";
    var region = bbAddress.stateProvince || "";
    var postalCode = bbAddress.zipPostal || "";
    var country = bbAddress.country || "";
    var formatted = streetAddress + ", " + locality + ", " + region + ", " + postalCode + ", " + country;

    return new ContactAddress(null, type, formatted, streetAddress, locality,
            region, postalCode, country);
};

module.exports = {
    /**
     * Builds a BlackBerry filter expression for contact search using the
     * contact fields and search filter provided.
     *
     * @param {String[]}
     *            fields Array of Contact fields to search
     * @param {String}
     *            filter Filter, or search string
     * @return filter expression or null if fields is empty or filter is null or
     *         empty
     */
    buildFilterExpression : function(fields, filter) {

        // ensure filter exists
        if (!filter || filter === "") {
            return null;
        }

        if (fields.length == 1 && fields[0] === "*") {
            // Cordova enhancement to allow fields value of ["*"] to indicate
            // all supported fields.
            fields = allFields;
        }

        // BlackBerry API uses specific operators to build filter expressions
        // for
        // querying Contact lists. The operators are
        // ["!=","==","<",">","<=",">="].
        // Use of regex is also an option, and the only one we can use to
        // simulate
        // an SQL '%LIKE%' clause.
        //
        // Note: The BlackBerry regex implementation doesn't seem to support
        // conventional regex switches that would enable a case insensitive
        // search.
        // It does not honor the (?i) switch (which causes Contact.find() to
        // fail).
        // We need case INsensitivity to match the W3C Contacts API spec.
        // So the guys at RIM proposed this method:
        //
        // original filter = "norm"
        // case insensitive filter = "[nN][oO][rR][mM]"
        //
        var ciFilter = "";
        for ( var i = 0; i < filter.length; i++) {
            ciFilter = ciFilter + "[" + filter[i].toLowerCase() + filter[i].toUpperCase() + "]";
        }

        // match anything that contains our filter string
        filter = ".*" + ciFilter + ".*";

        // build a filter expression using all Contact fields provided
        var filterExpression = null;
        if (fields && utils.isArray(fields)) {
            var fe = null;
            for (var f = 0; f < fields.length; f++) {
                if (!fields[f]) {
                    continue;
                }

                // retrieve the BlackBerry contact fields that map to the one
                // specified
                var bbFields = fieldMappings[fields[f]];

                // BlackBerry doesn't support the field specified
                if (!bbFields) {
                    continue;
                }

                if (!utils.isArray(bbFields)) {
                    bbFields = [bbFields];
                }

                // construct the filter expression using the BlackBerry fields
                for (var j = 0; j < bbFields.length; j++) {
                    fe = new blackberry.find.FilterExpression(bbFields[j],
                            "REGEX", filter);
                    if (filterExpression === null) {
                        filterExpression = fe;
                    } else {
                        // combine the filters
                        filterExpression = new blackberry.find.FilterExpression(
                                filterExpression, "OR", fe);
                    }
                }
            }
        }

        return filterExpression;
    },

    /**
     * Creates a Contact object from a BlackBerry Contact object, copying only
     * the fields specified.
     *
     * This is intended as a privately used function but it is made globally
     * available so that a Contact.save can convert a BlackBerry contact object
     * into its W3C equivalent.
     *
     * @param {blackberry.pim.Contact}
     *            bbContact BlackBerry Contact object
     * @param {String[]}
     *            fields array of contact fields that should be copied
     * @return {Contact} a contact object containing the specified fields or
     *         null if the specified contact is null
     */
    createContact : function(bbContact, fields) {

        if (!bbContact) {
            return null;
        }

        // construct a new contact object
        // always copy the contact id and displayName fields
        var contact = new Contact(bbContact.uid, bbContact.user1);

        // nothing to do
        if (!fields || !(utils.isArray(fields)) || fields.length === 0) {
            return contact;
        } else if (fields.length == 1 && fields[0] === "*") {
            // Cordova enhancement to allow fields value of ["*"] to indicate
            // all supported fields.
            fields = allFields;
        }

        // add the fields specified
        for (var i = 0; i < fields.length; i++) {
            var field = fields[i];

            if (!field) {
                continue;
            }

            // name
            if (field.indexOf('name') === 0) {
                var formattedName = bbContact.title + ' ' + bbContact.firstName + ' ' + bbContact.lastName;
                contact.name = new ContactName(formattedName,
                        bbContact.lastName, bbContact.firstName, null,
                        bbContact.title, null);
            }
            // phone numbers
            else if (field.indexOf('phoneNumbers') === 0) {
                var phoneNumbers = [];
                if (bbContact.homePhone) {
                    phoneNumbers.push(new ContactField('home',
                            bbContact.homePhone));
                }
                if (bbContact.homePhone2) {
                    phoneNumbers.push(new ContactField('home',
                            bbContact.homePhone2));
                }
                if (bbContact.workPhone) {
                    phoneNumbers.push(new ContactField('work',
                            bbContact.workPhone));
                }
                if (bbContact.workPhone2) {
                    phoneNumbers.push(new ContactField('work',
                            bbContact.workPhone2));
                }
                if (bbContact.mobilePhone) {
                    phoneNumbers.push(new ContactField('mobile',
                            bbContact.mobilePhone));
                }
                if (bbContact.faxPhone) {
                    phoneNumbers.push(new ContactField('fax',
                            bbContact.faxPhone));
                }
                if (bbContact.pagerPhone) {
                    phoneNumbers.push(new ContactField('pager',
                            bbContact.pagerPhone));
                }
                if (bbContact.otherPhone) {
                    phoneNumbers.push(new ContactField('other',
                            bbContact.otherPhone));
                }
                contact.phoneNumbers = phoneNumbers.length > 0 ? phoneNumbers
                        : null;
            }
            // emails
            else if (field.indexOf('emails') === 0) {
                var emails = [];
                if (bbContact.email1) {
                    emails.push(new ContactField(null, bbContact.email1, null));
                }
                if (bbContact.email2) {
                    emails.push(new ContactField(null, bbContact.email2, null));
                }
                if (bbContact.email3) {
                    emails.push(new ContactField(null, bbContact.email3, null));
                }
                contact.emails = emails.length > 0 ? emails : null;
            }
            // addresses
            else if (field.indexOf('addresses') === 0) {
                var addresses = [];
                if (bbContact.homeAddress) {
                    addresses.push(createContactAddress("home",
                            bbContact.homeAddress));
                }
                if (bbContact.workAddress) {
                    addresses.push(createContactAddress("work",
                            bbContact.workAddress));
                }
                contact.addresses = addresses.length > 0 ? addresses : null;
            }
            // birthday
            else if (field.indexOf('birthday') === 0) {
                if (bbContact.birthday) {
                    contact.birthday = bbContact.birthday;
                }
            }
            // note
            else if (field.indexOf('note') === 0) {
                if (bbContact.note) {
                    contact.note = bbContact.note;
                }
            }
            // organizations
            else if (field.indexOf('organizations') === 0) {
                var organizations = [];
                if (bbContact.company || bbContact.jobTitle) {
                    organizations.push(new ContactOrganization(null, null,
                            bbContact.company, null, bbContact.jobTitle));
                }
                contact.organizations = organizations.length > 0 ? organizations
                        : null;
            }
            // categories
            else if (field.indexOf('categories') === 0) {
                if (bbContact.categories && bbContact.categories.length > 0) {
                    contact.categories = bbContact.categories;
                } else {
                    contact.categories = null;
                }
            }
            // urls
            else if (field.indexOf('urls') === 0) {
                var urls = [];
                if (bbContact.webpage) {
                    urls.push(new ContactField(null, bbContact.webpage));
                }
                contact.urls = urls.length > 0 ? urls : null;
            }
            // photos
            else if (field.indexOf('photos') === 0) {
                var photos = [];
                // The BlackBerry Contact object will have a picture attribute
                // with Base64 encoded image
                if (bbContact.picture) {
                    photos.push(new ContactField('base64', bbContact.picture));
                }
                contact.photos = photos.length > 0 ? photos : null;
            }
        }

        return contact;
    }
};

});

// file: lib/blackberry/plugin/java/DirectoryEntry.js
define("cordova/plugin/java/DirectoryEntry", function(require, exports, module) {

var DirectoryEntry = require('cordova/plugin/DirectoryEntry'),
    FileEntry = require('cordova/plugin/FileEntry'),
    FileError = require('cordova/plugin/FileError'),
    exec = require('cordova/exec');

module.exports = {
    /**
     * Creates or looks up a directory; override for BlackBerry.
     *
     * @param path
     *            {DOMString} either a relative or absolute path from this
     *            directory in which to look up or create a directory
     * @param options
     *            {Flags} options to create or exclusively create the directory
     * @param successCallback
     *            {Function} called with the new DirectoryEntry
     * @param errorCallback
     *            {Function} called with a FileError
     */
    getDirectory : function(path, options, successCallback, errorCallback) {
        // create directory if it doesn't exist
        var create = (options && options.create === true) ? true : false,
        // if true, causes failure if create is true and path already exists
        exclusive = (options && options.exclusive === true) ? true : false,
        // directory exists
        exists,
        // create a new DirectoryEntry object and invoke success callback
        createEntry = function() {
            var path_parts = path.split('/'),
                name = path_parts[path_parts.length - 1],
                dirEntry = new DirectoryEntry(name, path);

            // invoke success callback
            if (typeof successCallback === 'function') {
                successCallback(dirEntry);
            }
        };

        var fail = function(error) {
            if (typeof errorCallback === 'function') {
                errorCallback(new FileError(error));
            }
        };

        // determine if path is relative or absolute
        if (!path) {
            fail(FileError.ENCODING_ERR);
            return;
        } else if (path.indexOf(this.fullPath) !== 0) {
            // path does not begin with the fullPath of this directory
            // therefore, it is relative
            path = this.fullPath + '/' + path;
        }

        // determine if directory exists
        try {
            // will return true if path exists AND is a directory
            exists = blackberry.io.dir.exists(path);
        } catch (e) {
            // invalid path
            fail(FileError.ENCODING_ERR);
            return;
        }

        // path is a directory
        if (exists) {
            if (create && exclusive) {
                // can't guarantee exclusivity
                fail(FileError.PATH_EXISTS_ERR);
            } else {
                // create entry for existing directory
                createEntry();
            }
        }
        // will return true if path exists AND is a file
        else if (blackberry.io.file.exists(path)) {
            // the path is a file
            fail(FileError.TYPE_MISMATCH_ERR);
        }
        // path does not exist, create it
        else if (create) {
            try {
                // directory path must have trailing slash
                var dirPath = path;
                if (dirPath.substr(-1) !== '/') {
                    dirPath += '/';
                }
                blackberry.io.dir.createNewDir(dirPath);
                createEntry();
            } catch (eone) {
                // unable to create directory
                fail(FileError.NOT_FOUND_ERR);
            }
        }
        // path does not exist, don't create
        else {
            // directory doesn't exist
            fail(FileError.NOT_FOUND_ERR);
        }
    },
    /**
     * Create or look up a file.
     *
     * @param path {DOMString}
     *            either a relative or absolute path from this directory in
     *            which to look up or create a file
     * @param options {Flags}
     *            options to create or exclusively create the file
     * @param successCallback {Function}
     *            called with the new FileEntry object
     * @param errorCallback {Function}
     *            called with a FileError object if error occurs
     */
    getFile:function(path, options, successCallback, errorCallback) {
        // create file if it doesn't exist
        var create = (options && options.create === true) ? true : false,
            // if true, causes failure if create is true and path already exists
            exclusive = (options && options.exclusive === true) ? true : false,
            // file exists
            exists,
            // create a new FileEntry object and invoke success callback
            createEntry = function() {
                var path_parts = path.split('/'),
                    name = path_parts[path_parts.length - 1],
                    fileEntry = new FileEntry(name, path);

                // invoke success callback
                if (typeof successCallback === 'function') {
                    successCallback(fileEntry);
                }
            };

        var fail = function(error) {
            if (typeof errorCallback === 'function') {
                errorCallback(new FileError(error));
            }
        };

        // determine if path is relative or absolute
        if (!path) {
            fail(FileError.ENCODING_ERR);
            return;
        }
        else if (path.indexOf(this.fullPath) !== 0) {
            // path does not begin with the fullPath of this directory
            // therefore, it is relative
            path = this.fullPath + '/' + path;
        }

        // determine if file exists
        try {
            // will return true if path exists AND is a file
            exists = blackberry.io.file.exists(path);
        }
        catch (e) {
            // invalid path
            fail(FileError.ENCODING_ERR);
            return;
        }

        // path is a file
        if (exists) {
            if (create && exclusive) {
                // can't guarantee exclusivity
                fail(FileError.PATH_EXISTS_ERR);
            }
            else {
                // create entry for existing file
                createEntry();
            }
        }
        // will return true if path exists AND is a directory
        else if (blackberry.io.dir.exists(path)) {
            // the path is a directory
            fail(FileError.TYPE_MISMATCH_ERR);
        }
        // path does not exist, create it
        else if (create) {
            // create empty file
            exec(
                function(result) {
                    // file created
                    createEntry();
                },
                fail, "File", "write", [ path, "", 0 ]);
        }
        // path does not exist, don't create
        else {
            // file doesn't exist
            fail(FileError.NOT_FOUND_ERR);
        }
    },

    /**
     * Delete a directory and all of it's contents.
     *
     * @param successCallback {Function} called with no parameters
     * @param errorCallback {Function} called with a FileError
     */
    removeRecursively : function(successCallback, errorCallback) {
        // we're removing THIS directory
        var path = this.fullPath;

        var fail = function(error) {
            if (typeof errorCallback === 'function') {
                errorCallback(new FileError(error));
            }
        };

        // attempt to delete directory
        if (blackberry.io.dir.exists(path)) {
            // it is an error to attempt to remove the file system root
            if (exec(null, null, "File", "isFileSystemRoot", [ path ]) === true) {
                fail(FileError.NO_MODIFICATION_ALLOWED_ERR);
            }
            else {
                try {
                    // delete the directory, setting recursive flag to true
                    blackberry.io.dir.deleteDirectory(path, true);
                    if (typeof successCallback === "function") {
                        successCallback();
                    }
                } catch (e) {
                    // permissions don't allow deletion
                    console.log(e);
                    fail(FileError.NO_MODIFICATION_ALLOWED_ERR);
                }
            }
        }
        // it's a file, not a directory
        else if (blackberry.io.file.exists(path)) {
            fail(FileError.TYPE_MISMATCH_ERR);
        }
        // not found
        else {
            fail(FileError.NOT_FOUND_ERR);
        }
    }
};

});

// file: lib/blackberry/plugin/java/Entry.js
define("cordova/plugin/java/Entry", function(require, exports, module) {

var FileError = require('cordova/plugin/FileError'),
    LocalFileSystem = require('cordova/plugin/LocalFileSystem'),
    resolveLocalFileSystemURI = require('cordova/plugin/resolveLocalFileSystemURI'),
    requestFileSystem = require('cordova/plugin/requestFileSystem'),
    exec = require('cordova/exec');

module.exports = {
    remove : function(successCallback, errorCallback) {
        var path = this.fullPath,
            // directory contents
            contents = [];

        var fail = function(error) {
            if (typeof errorCallback === 'function') {
                errorCallback(new FileError(error));
            }
        };

        // file
        if (blackberry.io.file.exists(path)) {
            try {
                blackberry.io.file.deleteFile(path);
                if (typeof successCallback === "function") {
                    successCallback();
                }
            } catch (e) {
                // permissions don't allow
                fail(FileError.INVALID_MODIFICATION_ERR);
            }
        }
        // directory
        else if (blackberry.io.dir.exists(path)) {
            // it is an error to attempt to remove the file system root
            if (exec(null, null, "File", "isFileSystemRoot", [ path ]) === true) {
                fail(FileError.NO_MODIFICATION_ALLOWED_ERR);
            } else {
                // check to see if directory is empty
                contents = blackberry.io.dir.listFiles(path);
                if (contents.length !== 0) {
                    fail(FileError.INVALID_MODIFICATION_ERR);
                } else {
                    try {
                        // delete
                        blackberry.io.dir.deleteDirectory(path, false);
                        if (typeof successCallback === "function") {
                            successCallback();
                        }
                    } catch (eone) {
                        // permissions don't allow
                        fail(FileError.NO_MODIFICATION_ALLOWED_ERR);
                    }
                }
            }
        }
        // not found
        else {
            fail(FileError.NOT_FOUND_ERR);
        }
    },
    getParent : function(successCallback, errorCallback) {
        var that = this;

        try {
            // On BlackBerry, the TEMPORARY file system is actually a temporary
            // directory that is created on a per-application basis. This is
            // to help ensure that applications do not share the same temporary
            // space. So we check to see if this is the TEMPORARY file system
            // (directory). If it is, we must return this Entry, rather than
            // the Entry for its parent.
            requestFileSystem(LocalFileSystem.TEMPORARY, 0,
                    function(fileSystem) {
                        if (fileSystem.root.fullPath === that.fullPath) {
                            if (typeof successCallback === 'function') {
                                successCallback(fileSystem.root);
                            }
                        } else {
                            resolveLocalFileSystemURI(blackberry.io.dir
                                    .getParentDirectory(that.fullPath),
                                    successCallback, errorCallback);
                        }
                    }, errorCallback);
        } catch (e) {
            if (typeof errorCallback === 'function') {
                errorCallback(new FileError(FileError.NOT_FOUND_ERR));
            }
        }
    }
};

});

// file: lib/blackberry/plugin/java/MediaError.js
define("cordova/plugin/java/MediaError", function(require, exports, module) {


// The MediaError object exists on BB OS 6+ which prevents the Cordova version
// from being defined. This object is used to merge in differences between the BB
// MediaError object and the Cordova version.
module.exports = {
        MEDIA_ERR_NONE_ACTIVE : 0,
        MEDIA_ERR_NONE_SUPPORTED : 4
};

});

// file: lib/blackberry/plugin/java/app.js
define("cordova/plugin/java/app", function(require, exports, module) {

var exec = require('cordova/exec'),
    platform = require('cordova/platform'),
    manager = require('cordova/plugin/' + platform.runtime() + '/manager');

module.exports = {
  /**
   * Clear the resource cache.
   */
  clearCache:function() {
      if (typeof blackberry.widgetcache === "undefined" || blackberry.widgetcache === null) {
          console.log("blackberry.widgetcache permission not found. Cache clear request denied.");
          return;
      }
      blackberry.widgetcache.clearAll();
  },

  /**
   * Clear web history in this web view.
   * Instead of BACK button loading the previous web page, it will exit the app.
   */
  clearHistory:function() {
    exec(null, null, "App", "clearHistory", []);
  },

  /**
   * Go to previous page displayed.
   * This is the same as pressing the backbutton on Android device.
   */
  backHistory:function() {
    // window.history.back() behaves oddly on BlackBerry, so use
    // native implementation.
    exec(null, null, "App", "backHistory", []);
  },

  /**
   * Exit and terminate the application.
   */
  exitApp:function() {
      // Call onunload if it is defined since BlackBerry does not invoke
      // on application exit.
      if (typeof window.onunload === "function") {
          window.onunload();
      }

      // allow Cordova JavaScript Extension opportunity to cleanup
      manager.destroy();

      // exit the app
      blackberry.app.exit();
  }
};

});

// file: lib/blackberry/plugin/java/app/bbsymbols.js
define("cordova/plugin/java/app/bbsymbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/java/app', 'navigator.app');

});

// file: lib/blackberry/plugin/java/contacts.js
define("cordova/plugin/java/contacts", function(require, exports, module) {

var ContactError = require('cordova/plugin/ContactError'),
    utils = require('cordova/utils'),
    ContactUtils = require('cordova/plugin/java/ContactUtils');

module.exports = {
    /**
     * Returns an array of Contacts matching the search criteria.
     *
     * @return array of Contacts matching search criteria
     */
    find : function(fields, success, fail, options) {
        // Success callback is required. Throw exception if not specified.
        if (typeof success !== 'function') {
            throw new TypeError(
                    "You must specify a success callback for the find command.");
        }

        // Search qualifier is required and cannot be empty.
        if (!fields || !(utils.isArray(fields)) || fields.length === 0) {
            if (typeof fail == 'function') {
                fail(new ContactError(ContactError.INVALID_ARGUMENT_ERROR));
            }
            return;
        }

        // default is to return a single contact match
        var numContacts = 1;

        // search options
        var filter = null;
        if (options) {
            // return multiple objects?
            if (options.multiple === true) {
                // -1 on BlackBerry will return all contact matches.
                numContacts = -1;
            }
            filter = options.filter;
        }

        // build the filter expression to use in find operation
        var filterExpression = ContactUtils.buildFilterExpression(fields, filter);

        // find matching contacts
        // Note: the filter expression can be null here, in which case, the find
        // won't filter
        var bbContacts = blackberry.pim.Contact.find(filterExpression, null, numContacts);

        // convert to Contact from blackberry.pim.Contact
        var contacts = [];
        for (var i = 0; i < bbContacts.length; i++) {
            if (bbContacts[i]) {
                // W3C Contacts API specification states that only the fields
                // in the search filter should be returned, so we create
                // a new Contact object, copying only the fields specified
                contacts.push(ContactUtils.createContact(bbContacts[i], fields));
            }
        }

        // return results
        success(contacts);
    }

};

});

// file: lib/blackberry/plugin/java/contacts/bbsymbols.js
define("cordova/plugin/java/contacts/bbsymbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.merges('cordova/plugin/java/contacts', 'navigator.contacts');
modulemapper.merges('cordova/plugin/java/Contact', 'Contact');

});

// file: lib/blackberry/plugin/java/file/bbsymbols.js
define("cordova/plugin/java/file/bbsymbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/File', 'File');
modulemapper.merges('cordova/plugin/java/DirectoryEntry', 'DirectoryEntry');
modulemapper.merges('cordova/plugin/java/Entry', 'Entry');


});

// file: lib/blackberry/plugin/java/manager.js
define("cordova/plugin/java/manager", function(require, exports, module) {

var cordova = require('cordova');

function _exec(win, fail, clazz, action, args) {
    var callbackId = clazz + cordova.callbackId++,
        origResult,
        evalResult,
        execResult;

    try {
        if (win || fail) {
            cordova.callbacks[callbackId] = {success: win, fail: fail};
        }

        // Note: Device returns string, but for some reason emulator returns object - so convert to string.
        origResult = "" + org.apache.cordova.JavaPluginManager.exec(clazz, action, callbackId, JSON.stringify(args), true);

        // If a result was returned
        if (origResult.length > 0) {
            evalResult = JSON.parse(origResult);

            // If status is OK, then return evalResult value back to caller
            if (evalResult.status === cordova.callbackStatus.OK) {

                // If there is a success callback, then call it now with returned evalResult value
                if (win) {
                    // Clear callback if not expecting any more results
                    if (!evalResult.keepCallback) {
                        delete cordova.callbacks[callbackId];
                    }
                }
            } else if (evalResult.status === cordova.callbackStatus.NO_RESULT) {

                // Clear callback if not expecting any more results
                if (!evalResult.keepCallback) {
                    delete cordova.callbacks[callbackId];
                }
            } else {
                // If there is a fail callback, then call it now with returned evalResult value
                if (fail) {

                    // Clear callback if not expecting any more results
                    if (!evalResult.keepCallback) {
                        delete cordova.callbacks[callbackId];
                    }
                }
            }
            execResult = evalResult;
        } else {
            // Asynchronous calls return an empty string. Return a NO_RESULT
            // status for those executions.
            execResult = {"status" : cordova.callbackStatus.NO_RESULT,
                    "message" : ""};
        }
    } catch (e) {
        console.log("BlackBerryPluginManager Error: " + e);
        execResult = {"status" : cordova.callbackStatus.ERROR,
                      "message" : e.message};
    }

    return execResult;
}

module.exports = {
    exec: function (win, fail, clazz, action, args) {
        return _exec(win, fail, clazz, action, args);
    },
    resume: org.apache.cordova.JavaPluginManager.resume,
    pause: org.apache.cordova.JavaPluginManager.pause,
    destroy: org.apache.cordova.JavaPluginManager.destroy
};

});

// file: lib/blackberry/plugin/java/media/bbsymbols.js
define("cordova/plugin/java/media/bbsymbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.defaults('cordova/plugin/Media', 'Media');
modulemapper.defaults('cordova/plugin/MediaError', 'MediaError');
// Exists natively on BB OS 6+, merge in Cordova specifics
modulemapper.merges('cordova/plugin/java/MediaError', 'MediaError');

});

// file: lib/blackberry/plugin/java/notification.js
define("cordova/plugin/java/notification", function(require, exports, module) {

var exec = require('cordova/exec');

/**
 * Provides BlackBerry enhanced notification API.
 */
module.exports = {
    activityStart : function(title, message) {
        // If title and message not specified then mimic Android behavior of
        // using default strings.
        if (typeof title === "undefined" && typeof message == "undefined") {
            title = "Busy";
            message = 'Please wait...';
        }

        exec(null, null, 'Notification', 'activityStart', [ title, message ]);
    },

    /**
     * Close an activity dialog
     */
    activityStop : function() {
        exec(null, null, 'Notification', 'activityStop', []);
    },

    /**
     * Display a progress dialog with progress bar that goes from 0 to 100.
     *
     * @param {String}
     *            title Title of the progress dialog.
     * @param {String}
     *            message Message to display in the dialog.
     */
    progressStart : function(title, message) {
        exec(null, null, 'Notification', 'progressStart', [ title, message ]);
    },

    /**
     * Close the progress dialog.
     */
    progressStop : function() {
        exec(null, null, 'Notification', 'progressStop', []);
    },

    /**
     * Set the progress dialog value.
     *
     * @param {Number}
     *            value 0-100
     */
    progressValue : function(value) {
        exec(null, null, 'Notification', 'progressValue', [ value ]);
    }
};

});

// file: lib/blackberry/plugin/java/notification/bbsymbols.js
define("cordova/plugin/java/notification/bbsymbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.merges('cordova/plugin/java/notification', 'navigator.notification');

});

// file: lib/blackberry/plugin/java/platform.js
define("cordova/plugin/java/platform", function(require, exports, module) {

module.exports = {
    id: "blackberry",
    initialize:function() {
        var cordova = require('cordova'),
            exec = require('cordova/exec'),
            channel = require('cordova/channel'),
            platform = require('cordova/platform'),
            manager = require('cordova/plugin/' + platform.runtime() + '/manager'),
            app = require('cordova/plugin/java/app');

        // BB OS 5 does not define window.console.
        if (typeof window.console === 'undefined') {
            window.console = {};
        }

        // Override console.log with native logging ability.
        // BB OS 7 devices define console.log for use with web inspector
        // debugging. If console.log is already defined, invoke it in addition
        // to native logging.
        var origLog = window.console.log;
        window.console.log = function(msg) {
            if (typeof origLog === 'function') {
                origLog.call(window.console, msg);
            }
            org.apache.cordova.Logger.log(''+msg);
        };

        // Mapping of button events to BlackBerry key identifier.
        var buttonMapping = {
            'backbutton'         : blackberry.system.event.KEY_BACK,
            'conveniencebutton1' : blackberry.system.event.KEY_CONVENIENCE_1,
            'conveniencebutton2' : blackberry.system.event.KEY_CONVENIENCE_2,
            'endcallbutton'      : blackberry.system.event.KEY_ENDCALL,
            'menubutton'         : blackberry.system.event.KEY_MENU,
            'startcallbutton'    : blackberry.system.event.KEY_STARTCALL,
            'volumedownbutton'   : blackberry.system.event.KEY_VOLUMEDOWN,
            'volumeupbutton'     : blackberry.system.event.KEY_VOLUMEUP
        };

        // Generates a function which fires the specified event.
        var fireEvent = function(event) {
            return function() {
                cordova.fireDocumentEvent(event, null);
            };
        };

        var eventHandler = function(event) {
            return function() {
                // If we just attached the first handler, let native know we
                // need to override the hardware button.
                if (this.numHandlers) {
                    blackberry.system.event.onHardwareKey(
                            buttonMapping[event], fireEvent(event));
                }
                // If we just detached the last handler, let native know we
                // no longer override the hardware button.
                else {
                    blackberry.system.event.onHardwareKey(
                            buttonMapping[event], null);
                }
            };
        };

        // Inject listeners for buttons on the document.
        for (var button in buttonMapping) {
            if (buttonMapping.hasOwnProperty(button)) {
                var buttonChannel = cordova.addDocumentEventHandler(button);
                buttonChannel.onHasSubscribersChange = eventHandler(button);
            }
        }

        // Fires off necessary code to pause/resume app
        var resume = function() {
            cordova.fireDocumentEvent('resume');
            manager.resume();
        };
        var pause = function() {
            cordova.fireDocumentEvent('pause');
            manager.pause();
        };

        /************************************************
         * Patch up the generic pause/resume listeners. *
         ************************************************/

        // Unsubscribe handler - turns off native backlight change
        // listener
        var onHasSubscribersChange = function() {
            // If we just attached the first handler and there are
            // no pause handlers, start the backlight system
            // listener on the native side.
            if (this.numHandlers && (channel.onResume.numHandlers + channel.onPause.numHandlers === 1)) {
                exec(backlightWin, backlightFail, "App", "detectBacklight", []);
            } else if (channel.onResume.numHandlers === 0 && channel.onPause.numHandlers === 0) {
                exec(null, null, 'App', 'ignoreBacklight', []);
            }
        };

        // Native backlight detection win/fail callbacks
        var backlightWin = function(isOn) {
            if (isOn === true) {
                resume();
            } else {
                pause();
            }
        };
        var backlightFail = function(e) {
            console.log("Error detecting backlight on/off.");
        };

        // Override stock resume and pause listeners so we can trigger
        // some native methods during attach/remove
        channel.onResume = cordova.addDocumentEventHandler('resume');
        channel.onResume.onHasSubscribersChange = onHasSubscribersChange;
        channel.onPause = cordova.addDocumentEventHandler('pause');
        channel.onPause.onHasSubscribersChange = onHasSubscribersChange;

        // Fire resume event when application brought to foreground.
        blackberry.app.event.onForeground(resume);

        // Fire pause event when application sent to background.
        blackberry.app.event.onBackground(pause);

        // Trap BlackBerry WebWorks exit. Allow plugins to clean up before exiting.
        blackberry.app.event.onExit(app.exitApp);
    }
};

});

// file: lib/common/plugin/logger.js
define("cordova/plugin/logger", function(require, exports, module) {

//------------------------------------------------------------------------------
// The logger module exports the following properties/functions:
//
// LOG                          - constant for the level LOG
// ERROR                        - constant for the level ERROR
// WARN                         - constant for the level WARN
// INFO                         - constant for the level INFO
// DEBUG                        - constant for the level DEBUG
// logLevel()                   - returns current log level
// logLevel(value)              - sets and returns a new log level
// useConsole()                 - returns whether logger is using console
// useConsole(value)            - sets and returns whether logger is using console
// log(message,...)             - logs a message at level LOG
// error(message,...)           - logs a message at level ERROR
// warn(message,...)            - logs a message at level WARN
// info(message,...)            - logs a message at level INFO
// debug(message,...)           - logs a message at level DEBUG
// logLevel(level,message,...)  - logs a message specified level
//
//------------------------------------------------------------------------------

var logger = exports;

var exec    = require('cordova/exec');
var utils   = require('cordova/utils');

var UseConsole   = true;
var Queued       = [];
var DeviceReady  = false;
var CurrentLevel;

/**
 * Logging levels
 */

var Levels = [
    "LOG",
    "ERROR",
    "WARN",
    "INFO",
    "DEBUG"
];

/*
 * add the logging levels to the logger object and
 * to a separate levelsMap object for testing
 */

var LevelsMap = {};
for (var i=0; i<Levels.length; i++) {
    var level = Levels[i];
    LevelsMap[level] = i;
    logger[level]    = level;
}

CurrentLevel = LevelsMap.WARN;

/**
 * Getter/Setter for the logging level
 *
 * Returns the current logging level.
 *
 * When a value is passed, sets the logging level to that value.
 * The values should be one of the following constants:
 *    logger.LOG
 *    logger.ERROR
 *    logger.WARN
 *    logger.INFO
 *    logger.DEBUG
 *
 * The value used determines which messages get printed.  The logging
 * values above are in order, and only messages logged at the logging
 * level or above will actually be displayed to the user.  E.g., the
 * default level is WARN, so only messages logged with LOG, ERROR, or
 * WARN will be displayed; INFO and DEBUG messages will be ignored.
 */
logger.level = function (value) {
    if (arguments.length) {
        if (LevelsMap[value] === null) {
            throw new Error("invalid logging level: " + value);
        }
        CurrentLevel = LevelsMap[value];
    }

    return Levels[CurrentLevel];
};

/**
 * Getter/Setter for the useConsole functionality
 *
 * When useConsole is true, the logger will log via the
 * browser 'console' object.  Otherwise, it will use the
 * native Logger plugin.
 */
logger.useConsole = function (value) {
    if (arguments.length) UseConsole = !!value;

    if (UseConsole) {
        if (typeof console == "undefined") {
            throw new Error("global console object is not defined");
        }

        if (typeof console.log != "function") {
            throw new Error("global console object does not have a log function");
        }

        if (typeof console.useLogger == "function") {
            if (console.useLogger()) {
                throw new Error("console and logger are too intertwingly");
            }
        }
    }

    return UseConsole;
};

/**
 * Logs a message at the LOG level.
 *
 * Parameters passed after message are used applied to
 * the message with utils.format()
 */
logger.log   = function(message) { logWithArgs("LOG",   arguments); };

/**
 * Logs a message at the ERROR level.
 *
 * Parameters passed after message are used applied to
 * the message with utils.format()
 */
logger.error = function(message) { logWithArgs("ERROR", arguments); };

/**
 * Logs a message at the WARN level.
 *
 * Parameters passed after message are used applied to
 * the message with utils.format()
 */
logger.warn  = function(message) { logWithArgs("WARN",  arguments); };

/**
 * Logs a message at the INFO level.
 *
 * Parameters passed after message are used applied to
 * the message with utils.format()
 */
logger.info  = function(message) { logWithArgs("INFO",  arguments); };

/**
 * Logs a message at the DEBUG level.
 *
 * Parameters passed after message are used applied to
 * the message with utils.format()
 */
logger.debug = function(message) { logWithArgs("DEBUG", arguments); };

// log at the specified level with args
function logWithArgs(level, args) {
    args = [level].concat([].slice.call(args));
    logger.logLevel.apply(logger, args);
}

/**
 * Logs a message at the specified level.
 *
 * Parameters passed after message are used applied to
 * the message with utils.format()
 */
logger.logLevel = function(level /* , ... */) {
    // format the message with the parameters
    var formatArgs = [].slice.call(arguments, 1);
    var message    = logger.format.apply(logger.format, formatArgs);

    if (LevelsMap[level] === null) {
        throw new Error("invalid logging level: " + level);
    }

    if (LevelsMap[level] > CurrentLevel) return;

    // queue the message if not yet at deviceready
    if (!DeviceReady && !UseConsole) {
        Queued.push([level, message]);
        return;
    }

    // if not using the console, use the native logger
    if (!UseConsole) {
        exec(null, null, "Logger", "logLevel", [level, message]);
        return;
    }

    // make sure console is not using logger
    if (console.__usingCordovaLogger) {
        throw new Error("console and logger are too intertwingly");
    }

    // log to the console
    switch (level) {
        case logger.LOG:   console.log(message); break;
        case logger.ERROR: console.log("ERROR: " + message); break;
        case logger.WARN:  console.log("WARN: "  + message); break;
        case logger.INFO:  console.log("INFO: "  + message); break;
        case logger.DEBUG: console.log("DEBUG: " + message); break;
    }
};


/**
 * Formats a string and arguments following it ala console.log()
 *
 * Any remaining arguments will be appended to the formatted string.
 *
 * for rationale, see FireBug's Console API:
 *    http://getfirebug.com/wiki/index.php/Console_API
 */
logger.format = function(formatString, args) {
    return __format(arguments[0], [].slice.call(arguments,1)).join(' ');
};


//------------------------------------------------------------------------------
/**
 * Formats a string and arguments following it ala vsprintf()
 *
 * format chars:
 *   %j - format arg as JSON
 *   %o - format arg as JSON
 *   %c - format arg as ''
 *   %% - replace with '%'
 * any other char following % will format it's
 * arg via toString().
 *
 * Returns an array containing the formatted string and any remaining
 * arguments.
 */
function __format(formatString, args) {
    if (formatString === null || formatString === undefined) return [""];
    if (arguments.length == 1) return [formatString.toString()];

    if (typeof formatString != "string")
        formatString = formatString.toString();

    var pattern = /(.*?)%(.)(.*)/;
    var rest    = formatString;
    var result  = [];

    while (args.length) {
        var match = pattern.exec(rest);
        if (!match) break;

        var arg   = args.shift();
        rest = match[3];
        result.push(match[1]);

        if (match[2] == '%') {
            result.push('%');
            args.unshift(arg);
            continue;
        }

        result.push(__formatted(arg, match[2]));
    }

    result.push(rest);

    var remainingArgs = [].slice.call(args);
    remainingArgs.unshift(result.join(''));
    return remainingArgs;
}

function __formatted(object, formatChar) {

    try {
        switch(formatChar) {
            case 'j':
            case 'o': return JSON.stringify(object);
            case 'c': return '';
        }
    }
    catch (e) {
        return "error JSON.stringify()ing argument: " + e;
    }

    if ((object === null) || (object === undefined)) {
        return Object.prototype.toString.call(object);
    }

    return object.toString();
}


//------------------------------------------------------------------------------
// when deviceready fires, log queued messages
logger.__onDeviceReady = function() {
    if (DeviceReady) return;

    DeviceReady = true;

    for (var i=0; i<Queued.length; i++) {
        var messageArgs = Queued[i];
        logger.logLevel(messageArgs[0], messageArgs[1]);
    }

    Queued = null;
};

// add a deviceready event to log queued messages
document.addEventListener("deviceready", logger.__onDeviceReady, false);

});

// file: lib/common/plugin/logger/symbols.js
define("cordova/plugin/logger/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/logger', 'cordova.logger');

});

// file: lib/common/plugin/media/symbols.js
define("cordova/plugin/media/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.defaults('cordova/plugin/Media', 'Media');
modulemapper.defaults('cordova/plugin/MediaError', 'MediaError');

});

// file: lib/common/plugin/network.js
define("cordova/plugin/network", function(require, exports, module) {

var exec = require('cordova/exec'),
    cordova = require('cordova'),
    channel = require('cordova/channel'),
    utils = require('cordova/utils');

// Link the onLine property with the Cordova-supplied network info.
// This works because we clobber the naviagtor object with our own
// object in bootstrap.js.
if (typeof navigator != 'undefined') {
    utils.defineGetter(navigator, 'onLine', function() {
        return this.connection.type != 'none';
    });
}

function NetworkConnection() {
    this.type = 'unknown';
}

/**
 * Get connection info
 *
 * @param {Function} successCallback The function to call when the Connection data is available
 * @param {Function} errorCallback The function to call when there is an error getting the Connection data. (OPTIONAL)
 */
NetworkConnection.prototype.getInfo = function(successCallback, errorCallback) {
    exec(successCallback, errorCallback, "NetworkStatus", "getConnectionInfo", []);
};

var me = new NetworkConnection();
var timerId = null;
var timeout = 500;

channel.onCordovaReady.subscribe(function() {
    me.getInfo(function(info) {
        me.type = info;
        if (info === "none") {
            // set a timer if still offline at the end of timer send the offline event
            timerId = setTimeout(function(){
                cordova.fireDocumentEvent("offline");
                timerId = null;
            }, timeout);
        } else {
            // If there is a current offline event pending clear it
            if (timerId !== null) {
                clearTimeout(timerId);
                timerId = null;
            }
            cordova.fireDocumentEvent("online");
        }

        // should only fire this once
        if (channel.onCordovaConnectionReady.state !== 2) {
            channel.onCordovaConnectionReady.fire();
        }
    },
    function (e) {
        // If we can't get the network info we should still tell Cordova
        // to fire the deviceready event.
        if (channel.onCordovaConnectionReady.state !== 2) {
            channel.onCordovaConnectionReady.fire();
        }
        console.log("Error initializing Network Connection: " + e);
    });
});

module.exports = me;

});

// file: lib/common/plugin/networkstatus/symbols.js
define("cordova/plugin/networkstatus/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/network', 'navigator.network.connection', 'navigator.network.connection is deprecated. Use navigator.connection instead.');
modulemapper.clobbers('cordova/plugin/network', 'navigator.connection');
modulemapper.defaults('cordova/plugin/Connection', 'Connection');

});

// file: lib/common/plugin/notification.js
define("cordova/plugin/notification", function(require, exports, module) {

var exec = require('cordova/exec');
var platform = require('cordova/platform');

/**
 * Provides access to notifications on the device.
 */

module.exports = {

    /**
     * Open a native alert dialog, with a customizable title and button text.
     *
     * @param {String} message              Message to print in the body of the alert
     * @param {Function} completeCallback   The callback that is called when user clicks on a button.
     * @param {String} title                Title of the alert dialog (default: Alert)
     * @param {String} buttonLabel          Label of the close button (default: OK)
     */
    alert: function(message, completeCallback, title, buttonLabel) {
        var _title = (title || "Alert");
        var _buttonLabel = (buttonLabel || "OK");
        exec(completeCallback, null, "Notification", "alert", [message, _title, _buttonLabel]);
    },

    /**
     * Open a native confirm dialog, with a customizable title and button text.
     * The result that the user selects is returned to the result callback.
     *
     * @param {String} message              Message to print in the body of the alert
     * @param {Function} resultCallback     The callback that is called when user clicks on a button.
     * @param {String} title                Title of the alert dialog (default: Confirm)
     * @param {Array} buttonLabels          Array of the labels of the buttons (default: ['OK', 'Cancel'])
     */
    confirm: function(message, resultCallback, title, buttonLabels) {
        var _title = (title || "Confirm");
        var _buttonLabels = (buttonLabels || ["OK", "Cancel"]);

        // Strings are deprecated!
        if (typeof _buttonLabels === 'string') {
            console.log("Notification.confirm(string, function, string, string) is deprecated.  Use Notification.confirm(string, function, string, array).");
        }

        // Some platforms take an array of button label names.
        // Other platforms take a comma separated list.
        // For compatibility, we convert to the desired type based on the platform.
        if (platform.id == "android" || platform.id == "ios" || platform.id == "windowsphone") {
            if (typeof _buttonLabels === 'string') {
                var buttonLabelString = _buttonLabels;
                _buttonLabels = _buttonLabels.split(","); // not crazy about changing the var type here
            }
        } else {
            if (Array.isArray(_buttonLabels)) {
                var buttonLabelArray = _buttonLabels;
                _buttonLabels = buttonLabelArray.toString();
            }
        }
        exec(resultCallback, null, "Notification", "confirm", [message, _title, _buttonLabels]);
    },

    /**
     * Open a native prompt dialog, with a customizable title and button text.
     * The following results are returned to the result callback:
     *  buttonIndex     Index number of the button selected.
     *  input1          The text entered in the prompt dialog box.
     *
     * @param {String} message              Dialog message to display (default: "Prompt message")
     * @param {Function} resultCallback     The callback that is called when user clicks on a button.
     * @param {String} title                Title of the dialog (default: "Prompt")
     * @param {Array} buttonLabels          Array of strings for the button labels (default: ["OK","Cancel"])
     */
    prompt: function(message, resultCallback, title, buttonLabels) {
        var _message = (message || "Prompt message");
        var _title = (title || "Prompt");
        var _buttonLabels = (buttonLabels || ["OK","Cancel"]);
        exec(resultCallback, null, "Notification", "prompt", [_message, _title, _buttonLabels]);
    },

    /**
     * Causes the device to vibrate.
     *
     * @param {Integer} mills       The number of milliseconds to vibrate for.
     */
    vibrate: function(mills) {
        exec(null, null, "Notification", "vibrate", [mills]);
    },

    /**
     * Causes the device to beep.
     * On Android, the default notification ringtone is played "count" times.
     *
     * @param {Integer} count       The number of beeps.
     */
    beep: function(count) {
        exec(null, null, "Notification", "beep", [count]);
    }
};

});

// file: lib/common/plugin/notification/symbols.js
define("cordova/plugin/notification/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.defaults('cordova/plugin/notification', 'navigator.notification');

});

// file: lib/blackberry/plugin/qnx/InAppBrowser.js
define("cordova/plugin/qnx/InAppBrowser", function(require, exports, module) {

var cordova = require('cordova'),
    modulemapper = require('cordova/modulemapper'),
    origOpen = modulemapper.getOriginalSymbol(window, 'open'),
    browser = {
        close: function () { } //dummy so we don't have to check for undefined
    };

var navigate = {
    "_blank": function (url, whitelisted) {
        return origOpen(url, "_blank");
    },

    "_self": function (url, whitelisted) {
        if (whitelisted) {
            window.location.href = url;
            return window;
        }
        else {
            return origOpen(url, "_blank");
        }
    },

    "_system": function (url, whitelisted) {
        blackberry.invoke.invoke({
            target: "sys.browser",
            uri: url
        }, function () {}, function () {});

        return {
            close: function () { }
        };
    }
};

module.exports = {
    open: function (args, win, fail) {
        var url = args[0],
            target = args[1] || '_self',
            a = document.createElement('a');

        //Make all URLs absolute
        a.href = url;
        url = a.href;

        switch (target) {
            case '_self':
            case '_system':
            case '_blank':
                break;
            default:
                target = '_blank';
                break;
        }

        webworks.exec(function (whitelisted) {
            browser = navigate[target](url, whitelisted);
        }, fail, "org.apache.cordova", "isWhitelisted", [url], true);

        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "" };
    },
    close: function (args, win, fail) {
        browser.close();
        return { "status" : cordova.callbackStatus.OK, "message" : "" };
    }
};

});

// file: lib/blackberry/plugin/qnx/battery.js
define("cordova/plugin/qnx/battery", function(require, exports, module) {

var cordova = require('cordova'),
    interval;

module.exports = {
    start: function (args, win, fail) {
        interval = window.setInterval(function () {
            win({
                level: navigator.webkitBattery.level * 100,
                isPlugged: navigator.webkitBattery.charging
            });
        }, 500);
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "WebWorks Is On It" };
    },

    stop: function (args, win, fail) {
        window.clearInterval(interval);
        return { "status" : cordova.callbackStatus.OK, "message" : "stopped" };
    }
};

});

// file: lib/blackberry/plugin/qnx/camera.js
define("cordova/plugin/qnx/camera", function(require, exports, module) {

var cordova = require('cordova');

module.exports = {
    takePicture: function (args, win, fail) {
        var noop = function () {};
        blackberry.invoke.card.invokeCamera("photo", function (path) {
            win("file://" + path);
        }, noop, noop);
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "WebWorks Is On It" };
    }
};

});

// file: lib/blackberry/plugin/qnx/capture.js
define("cordova/plugin/qnx/capture", function(require, exports, module) {

var cordova = require('cordova');

function capture(action, win, fail) {
    var noop = function () {};

    blackberry.invoke.card.invokeCamera(action, function (path) {
        var sb = blackberry.io.sandbox;
        blackberry.io.sandbox = false;
        window.webkitRequestFileSystem(window.PERSISTENT, 1024, function (fs) {
            fs.root.getFile(path, {}, function (fe) {
                fe.file(function (file) {
                    file.fullPath = fe.fullPath;
                    win([file]);
                    blackberry.io.sandbox = sb;
                }, fail);
            }, fail);
        }, fail);
    }, noop, noop);
}

module.exports = {
    getSupportedAudioModes: function (args, win, fail) {
        return {"status": cordova.callbackStatus.OK, "message": []};
    },
    getSupportedImageModes: function (args, win, fail) {
        return {"status": cordova.callbackStatus.OK, "message": []};
    },
    getSupportedVideoModes: function (args, win, fail) {
        return {"status": cordova.callbackStatus.OK, "message": []};
    },
    captureImage: function (args, win, fail) {
        if (args[0].limit > 0) {
            capture("photo", win, fail);
        }
        else {
            win([]);
        }

        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "WebWorks Is On It" };
    },
    captureVideo: function (args, win, fail) {
        if (args[0].limit > 0) {
            capture("video", win, fail);
        }
        else {
            win([]);
        }

        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "WebWorks Is On It" };
    },
    captureAudio: function (args, win, fail) {
        fail("Capturing Audio not supported");
        return {"status": cordova.callbackStatus.NO_RESULT, "message": "WebWorks Is On It"};
    }
};

});

// file: lib/blackberry/plugin/qnx/compass.js
define("cordova/plugin/qnx/compass", function(require, exports, module) {

var exec = require('cordova/exec'),
    utils = require('cordova/utils'),
    CompassHeading = require('cordova/plugin/CompassHeading'),
    CompassError = require('cordova/plugin/CompassError'),
    timers = {},
    listeners = [],
    heading = null,
    running = false,
    start = function () {
        exec(function (result) {
            heading = new CompassHeading(result.magneticHeading, result.trueHeading, result.headingAccuracy, result.timestamp);
            listeners.forEach(function (l) {
                l.win(heading);
            });
        }, function (e) {
            listeners.forEach(function (l) {
                l.fail(e);
            });
        },
        "Compass", "start", []);
        running = true;
    },
    stop = function () {
        exec(null, null, "Compass", "stop", []);
        running = false;
    },
    createCallbackPair = function (win, fail) {
        return {win:win, fail:fail};
    },
    removeListeners = function (l) {
        var idx = listeners.indexOf(l);
        if (idx > -1) {
            listeners.splice(idx, 1);
            if (listeners.length === 0) {
                stop();
            }
        }
    },
    compass = {
        /**
         * Asynchronously acquires the current heading.
         * @param {Function} successCallback The function to call when the heading
         * data is available
         * @param {Function} errorCallback The function to call when there is an error
         * getting the heading data.
         * @param {CompassOptions} options The options for getting the heading data (not used).
         */
        getCurrentHeading:function(successCallback, errorCallback, options) {
            if (typeof successCallback !== "function") {
                throw "getCurrentHeading must be called with at least a success callback function as first parameter.";
            }

            var p;
            var win = function(a) {
                removeListeners(p);
                successCallback(a);
            };
            var fail = function(e) {
                removeListeners(p);
                errorCallback(e);
            };

            p = createCallbackPair(win, fail);
            listeners.push(p);

            if (!running) {
                start();
            }
        },

        /**
         * Asynchronously acquires the heading repeatedly at a given interval.
         * @param {Function} successCallback The function to call each time the heading
         * data is available
         * @param {Function} errorCallback The function to call when there is an error
         * getting the heading data.
         * @param {HeadingOptions} options The options for getting the heading data
         * such as timeout and the frequency of the watch. For iOS, filter parameter
         * specifies to watch via a distance filter rather than time.
         */
        watchHeading:function(successCallback, errorCallback, options) {
            var frequency = (options !== undefined && options.frequency !== undefined) ? options.frequency : 100;
            var filter = (options !== undefined && options.filter !== undefined) ? options.filter : 0;

            // successCallback required
            if (typeof successCallback !== "function") {
              console.log("Compass Error: successCallback is not a function");
              return;
            }

            // errorCallback optional
            if (errorCallback && (typeof errorCallback !== "function")) {
              console.log("Compass Error: errorCallback is not a function");
              return;
            }
            // Keep reference to watch id, and report heading readings as often as defined in frequency
            var id = utils.createUUID();

            var p = createCallbackPair(function(){}, function(e) {
                removeListeners(p);
                errorCallback(e);
            });
            listeners.push(p);

            timers[id] = {
                timer:window.setInterval(function() {
                    if (heading) {
                        successCallback(heading);
                    }
                }, frequency),
                listeners:p
            };

            if (running) {
                // If we're already running then immediately invoke the success callback
                // but only if we have retrieved a value, sample code does not check for null ...
                if(heading) {
                    successCallback(heading);
                }
            } else {
                start();
            }

            return id;
        },

        /**
         * Clears the specified heading watch.
         * @param {String} watchId The ID of the watch returned from #watchHeading.
         */
        clearWatch:function(id) {
            // Stop javascript timer & remove from timer list
            if (id && timers[id]) {
                window.clearInterval(timers[id].timer);
                removeListeners(timers[id].listeners);
                delete timers[id];
            }
        }
    };

module.exports = compass;

});

// file: lib/blackberry/plugin/qnx/compass/bbsymbols.js
define("cordova/plugin/qnx/compass/bbsymbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.merges('cordova/plugin/qnx/compass', 'navigator.compass');

});

// file: lib/blackberry/plugin/qnx/device.js
define("cordova/plugin/qnx/device", function(require, exports, module) {

var channel = require('cordova/channel'),
    cordova = require('cordova');

// Tell cordova channel to wait on the CordovaInfoReady event
channel.waitForInitialization('onCordovaInfoReady');

module.exports = {
    getDeviceInfo : function(args, win, fail){
        win({
            platform: "BlackBerry",
            version: blackberry.system.softwareVersion,
            model: "Dev Alpha",
            name: "Dev Alpha", // deprecated: please use device.model
            uuid: blackberry.identity.uuid,
            cordova: "2.7.0"
        });

        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "Device info returned" };
    }
};

});

// file: lib/blackberry/plugin/qnx/file.js
define("cordova/plugin/qnx/file", function(require, exports, module) {

/*global WebKitBlobBuilder:false */
/*global Blob:false */
var cordova = require('cordova'),
    FileError = require('cordova/plugin/FileError'),
    DirectoryEntry = require('cordova/plugin/DirectoryEntry'),
    FileEntry = require('cordova/plugin/FileEntry'),
    File = require('cordova/plugin/File'),
    FileSystem = require('cordova/plugin/FileSystem'),
    FileReader = require('cordova/plugin/FileReader'),
    nativeRequestFileSystem = window.webkitRequestFileSystem,
    nativeResolveLocalFileSystemURI = function(uri, success, fail) {
        if (uri.substring(0,11) !== "filesystem:") {
            uri = "filesystem:" + uri;
        }
        window.webkitResolveLocalFileSystemURL(uri, success, fail);
    },
    NativeFileReader = window.FileReader;

window.FileReader = FileReader;
window.File = File;

function getFileSystemName(nativeFs) {
    return (nativeFs.name.indexOf("Persistent") != -1) ? "persistent" : "temporary";
}

function makeEntry(entry) {
    if (entry.isDirectory) {
        return new DirectoryEntry(entry.name, decodeURI(entry.toURL()).substring(11));
    }
    else {
        return new FileEntry(entry.name, decodeURI(entry.toURL()).substring(11));
    }
}

module.exports = {
    /* requestFileSystem */
    requestFileSystem: function(args, successCallback, errorCallback) {
        var type = args[0],
            size = args[1];

        nativeRequestFileSystem(type, size, function(nativeFs) {
            successCallback(new FileSystem(getFileSystemName(nativeFs), makeEntry(nativeFs.root)));
        }, function(error) {
            errorCallback(error.code);
        });
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "async"};
    },

    /* resolveLocalFileSystemURI */
    resolveLocalFileSystemURI: function(args, successCallback, errorCallback) {
        var uri = args[0];

        nativeResolveLocalFileSystemURI(uri, function(entry) {
            successCallback(makeEntry(entry));
        }, function(error) {
            var code = error.code;
            switch (code) {
                case 5:
                    code = FileError.NOT_FOUND_ERR;
                    break;

                case 2:
                    code = FileError.ENCODING_ERR;
                    break;
            }
            errorCallback(code);
        });
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "async"};
    },

    /* DirectoryReader */
    readEntries: function(args, successCallback, errorCallback) {
        var uri = args[0];

        nativeResolveLocalFileSystemURI(uri, function(dirEntry) {
            var reader = dirEntry.createReader();
            reader.readEntries(function(entries) {
                var retVal = [];
                for (var i = 0; i < entries.length; i++) {
                    retVal.push(makeEntry(entries[i]));
                }
                successCallback(retVal);
            }, function(error) {
                errorCallback(error.code);
            });
        }, function(error) {
            errorCallback(error.code);
        });
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "async"};
    },

    /* Entry */
    getMetadata: function(args, successCallback, errorCallback) {
        var uri = args[0];

        nativeResolveLocalFileSystemURI(uri, function(entry) {
            entry.getMetadata(function(metaData) {
                successCallback(metaData.modificationTime);
            }, function(error) {
                errorCallback(error.code);
            });
        }, function(error) {
            errorCallback(error.code);
        });
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "async"};
    },

    moveTo: function(args, successCallback, errorCallback) {
        var srcUri = args[0],
            parentUri = args[1],
            name = args[2];

        nativeResolveLocalFileSystemURI(srcUri, function(source) {
            nativeResolveLocalFileSystemURI(parentUri, function(parent) {
                source.moveTo(parent, name, function(entry) {
                    successCallback(makeEntry(entry));
                }, function(error) {
                    errorCallback(error.code);
                });
            }, function(error) {
                errorCallback(error.code);
            });
        }, function(error) {
            errorCallback(error.code);
        });
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "async"};
    },

    copyTo: function(args, successCallback, errorCallback) {
        var srcUri = args[0],
            parentUri = args[1],
            name = args[2];

        nativeResolveLocalFileSystemURI(srcUri, function(source) {
            nativeResolveLocalFileSystemURI(parentUri, function(parent) {
                source.copyTo(parent, name, function(entry) {
                    successCallback(makeEntry(entry));
                }, function(error) {
                    errorCallback(error.code);
                });
            }, function(error) {
                errorCallback(error.code);
            });
        }, function(error) {
            errorCallback(error.code);
        });
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "async"};
    },

    remove: function(args, successCallback, errorCallback) {
        var uri = args[0];

        nativeResolveLocalFileSystemURI(uri, function(entry) {
            if (entry.fullPath === "/") {
                errorCallback(FileError.NO_MODIFICATION_ALLOWED_ERR);
            } else {
                entry.remove(
                    function (success) {
                        if (successCallback) {
                            successCallback(success);
                        }
                    },
                    function(error) {
                        if (errorCallback) {
                            errorCallback(error.code);
                        }
                    }
                );
            }
        }, function(error) {
            errorCallback(error.code);
        });
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "async"};
    },

    getParent: function(args, successCallback, errorCallback) {
        var uri = args[0];

        nativeResolveLocalFileSystemURI(uri, function(entry) {
            entry.getParent(function(entry) {
                successCallback(makeEntry(entry));
            }, function(error) {
                errorCallback(error.code);
            });
        }, function(error) {
            errorCallback(error.code);
        });
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "async"};
    },

    /* FileEntry */
    getFileMetadata: function(args, successCallback, errorCallback) {
        var uri = args[0];

        nativeResolveLocalFileSystemURI(uri, function(entry) {
            entry.file(function(file) {
                var retVal = new File(file.name, decodeURI(entry.toURL()), file.type, file.lastModifiedDate, file.size);
                successCallback(retVal);
            }, function(error) {
                errorCallback(error.code);
            });
        }, function(error) {
            errorCallback(error.code);
        });
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "async"};
    },

    /* DirectoryEntry */
    getDirectory: function(args, successCallback, errorCallback) {
        var uri = args[0],
            path = args[1],
            options = args[2];

        nativeResolveLocalFileSystemURI(uri, function(entry) {
            entry.getDirectory(path, options, function(entry) {
                successCallback(makeEntry(entry));
            }, function(error) {
                if (error.code === FileError.INVALID_MODIFICATION_ERR) {
                    if (options.create) {
                        errorCallback(FileError.PATH_EXISTS_ERR);
                    } else {
                        errorCallback(FileError.ENCODING_ERR);
                    }
                } else {
                    errorCallback(error.code);
                }
            });
        }, function(error) {
            errorCallback(error.code);
        });
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "async"};
    },

    removeRecursively: function(args, successCallback, errorCallback) {
        var uri = args[0];

        nativeResolveLocalFileSystemURI(uri, function(entry) {
            if (entry.fullPath === "/") {
                errorCallback(FileError.NO_MODIFICATION_ALLOWED_ERR);
            } else {
                entry.removeRecursively(
                    function (success) {
                        if (successCallback) {
                            successCallback(success);
                        }
                    },
                    function(error) {
                        errorCallback(error.code);
                    }
                );
            }
        }, function(error) {
            errorCallback(error.code);
        });
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "async"};
    },

    getFile: function(args, successCallback, errorCallback) {
        var uri = args[0],
            path = args[1],
            options = args[2];

        nativeResolveLocalFileSystemURI(uri, function(entry) {
            entry.getFile(path, options, function(entry) {
                successCallback(makeEntry(entry));
            }, function(error) {
                if (error.code === FileError.INVALID_MODIFICATION_ERR) {
                    if (options.create) {
                        errorCallback(FileError.PATH_EXISTS_ERR);
                    } else {
                        errorCallback(FileError.NOT_FOUND_ERR);
                    }
                } else {
                    errorCallback(error.code);
                }
            });
        }, function(error) {
            errorCallback(error.code);
        });
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "async"};
    },

    /* FileReader */
    readAsText: function(args, successCallback, errorCallback) {
        var uri = args[0],
            encoding = args[1];

        nativeResolveLocalFileSystemURI(uri, function(entry) {
            var onLoadEnd = function(evt) {
                    if (!evt.target.error) {
                        successCallback(evt.target.result);
                    }
            },
                onError = function(evt) {
                    errorCallback(evt.target.error.code);
            };

            var reader = new NativeFileReader();

            reader.onloadend = onLoadEnd;
            reader.onerror = onError;
            entry.file(function(file) {
                reader.readAsText(file, encoding);
            }, function(error) {
                errorCallback(error.code);
            });
        }, function(error) {
            errorCallback(error.code);
        });
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "async"};
    },

    readAsDataURL: function(args, successCallback, errorCallback) {
        var uri = args[0];

        nativeResolveLocalFileSystemURI(uri, function(entry) {
            var onLoadEnd = function(evt) {
                    if (!evt.target.error) {
                        successCallback(evt.target.result);
                    }
            },
                onError = function(evt) {
                    errorCallback(evt.target.error.code);
            };

            var reader = new NativeFileReader();

            reader.onloadend = onLoadEnd;
            reader.onerror = onError;
            entry.file(function(file) {
                reader.readAsDataURL(file);
            }, function(error) {
                errorCallback(error.code);
            });
        }, function(error) {
            errorCallback(error.code);
        });
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "async"};
    },

    /* FileWriter */
    write: function(args, successCallback, errorCallback) {
        var uri = args[0],
            text = args[1],
            position = args[2];

        nativeResolveLocalFileSystemURI(uri, function(entry) {
            var onWriteEnd = function(evt) {
                    if(!evt.target.error) {
                        successCallback(evt.target.position - position);
                    } else {
                        errorCallback(evt.target.error.code);
                    }
            },
                onError = function(evt) {
                    errorCallback(evt.target.error.code);
            };

            entry.createWriter(function(writer) {
                writer.onwriteend = onWriteEnd;
                writer.onerror = onError;

                writer.seek(position);
                writer.write(new Blob([text], {type: "text/plain"}));
            }, function(error) {
                errorCallback(error.code);
            });
        }, function(error) {
            errorCallback(error.code);
        });
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "async"};
    },

    truncate: function(args, successCallback, errorCallback) {
        var uri = args[0],
            size = args[1];

        nativeResolveLocalFileSystemURI(uri, function(entry) {
            var onWriteEnd = function(evt) {
                    if(!evt.target.error) {
                        successCallback(evt.target.length);
                    } else {
                        errorCallback(evt.target.error.code);
                    }
            },
                onError = function(evt) {
                    errorCallback(evt.target.error.code);
            };

            entry.createWriter(function(writer) {
                writer.onwriteend = onWriteEnd;
                writer.onerror = onError;

                writer.truncate(size);
            }, function(error) {
                errorCallback(error.code);
            });
        }, function(error) {
            errorCallback(error.code);
        });
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "async"};
    }
};

});

// file: lib/blackberry/plugin/qnx/fileTransfer.js
define("cordova/plugin/qnx/fileTransfer", function(require, exports, module) {

/*global Blob:false */
var cordova = require('cordova'),
    FileEntry = require('cordova/plugin/FileEntry'),
    FileTransferError = require('cordova/plugin/FileTransferError'),
    FileUploadResult = require('cordova/plugin/FileUploadResult'),
    ProgressEvent = require('cordova/plugin/ProgressEvent'),
    nativeResolveLocalFileSystemURI = function(uri, success, fail) {
        if (uri.substring(0,11) !== "filesystem:") {
            uri = "filesystem:" + uri;
        }
        window.webkitResolveLocalFileSystemURL(uri, success, fail);
    },
    xhr;

function getParentPath(filePath) {
    var pos = filePath.lastIndexOf('/');
    return filePath.substring(0, pos + 1);
}

function getFileName(filePath) {
    var pos = filePath.lastIndexOf('/');
    return filePath.substring(pos + 1);
}

function cleanUpPath(filePath) {
    var pos = filePath.lastIndexOf('/');
    return filePath.substring(0, pos) + filePath.substring(pos + 1, filePath.length);
}

function checkURL(url) {
    return url.indexOf(' ') === -1 ?  true : false;
}

module.exports = {
    abort: function () {
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "async"};
    },

    upload: function(args, win, fail) {
        var filePath = args[0],
            server = args[1],
            fileKey = args[2],
            fileName = args[3],
            mimeType = args[4],
            params = args[5],
            /*trustAllHosts = args[6],*/
            chunkedMode = args[7],
            headers = args[8];

        if (!checkURL(server)) {
            fail(new FileTransferError(FileTransferError.INVALID_URL_ERR));
        }

        nativeResolveLocalFileSystemURI(filePath, function(entry) {
            entry.file(function(file) {
                function uploadFile(blobFile) {
                    var fd = new FormData();

                    fd.append(fileKey, blobFile, fileName);
                    for (var prop in params) {
                        if(params.hasOwnProperty(prop)) {
                            fd.append(prop, params[prop]);
                        }
                    }

                    xhr = new XMLHttpRequest();
                    xhr.open("POST", server);
                    xhr.onload = function(evt) {
                        if (xhr.status == 200) {
                            var result = new FileUploadResult();
                            result.bytesSent = file.size;
                            result.responseCode = xhr.status;
                            result.response = xhr.response;
                            win(result);
                        } else if (xhr.status == 404) {
                            fail(new FileTransferError(FileTransferError.INVALID_URL_ERR, server, filePath, xhr.status));
                        } else {
                            fail(new FileTransferError(FileTransferError.CONNECTION_ERR, server, filePath, xhr.status));
                        }
                    };
                    xhr.ontimeout = function(evt) {
                        fail(new FileTransferError(FileTransferError.CONNECTION_ERR, server, filePath, xhr.status));
                    };
                    xhr.onerror = function () {
                        fail(new FileTransferError(FileTransferError.CONNECTION_ERR, server, filePath, this.status));
                    };
                    xhr.onprogress = function (evt) {
                        win(evt);
                    };

                    for (var header in headers) {
                        if (headers.hasOwnProperty(header)) {
                            xhr.setRequestHeader(header, headers[header]);
                        }
                    }

                    xhr.send(fd);
                }

                var bytesPerChunk;
                if (chunkedMode === true) {
                    bytesPerChunk = 1024 * 1024; // 1MB chunk sizes.
                } else {
                    bytesPerChunk = file.size;
                }
                var start = 0;
                var end = bytesPerChunk;
                while (start < file.size) {
                    var chunk = file.slice(start, end, mimeType);
                    uploadFile(chunk);
                    start = end;
                    end = start + bytesPerChunk;
                }
            }, function(error) {
                fail(new FileTransferError(FileTransferError.FILE_NOT_FOUND_ERR));
            });
        }, function(error) {
            fail(new FileTransferError(FileTransferError.FILE_NOT_FOUND_ERR));
        });

        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "async"};
    },

    download: function (args, win, fail) {
        var source = args[0],
            target = cleanUpPath(args[1]),
            fileWriter;

        if (!checkURL(source)) {
            fail(new FileTransferError(FileTransferError.INVALID_URL_ERR));
        }

        xhr = new XMLHttpRequest();

        function writeFile(entry) {
            entry.createWriter(function (writer) {
                fileWriter = writer;
                fileWriter.onwriteend = function (evt) {
                    if (!evt.target.error) {
                        win(new FileEntry(entry.name, entry.toURL()));
                    } else {
                        fail(evt.target.error);
                    }
                };
                fileWriter.onerror = function (evt) {
                    fail(evt.target.error);
                };
                fileWriter.write(new Blob([xhr.response]));
            }, function (error) {
                fail(error);
            });
        }

        xhr.onerror = function (e) {
            fail(new FileTransferError(FileTransferError.CONNECTION_ERR, source, target, xhr.status));
        };

        xhr.onload = function () {
            if (xhr.readyState === xhr.DONE) {
                if (xhr.status === 200 && xhr.response) {
                    nativeResolveLocalFileSystemURI(getParentPath(target), function (dir) {
                        dir.getFile(getFileName(target), {create: true}, writeFile, function (error) {
                            fail(new FileTransferError(FileTransferError.FILE_NOT_FOUND_ERR));
                        });
                    }, function (error) {
                        fail(new FileTransferError(FileTransferError.FILE_NOT_FOUND_ERR));
                    });
                } else if (xhr.status === 404) {
                    fail(new FileTransferError(FileTransferError.INVALID_URL_ERR, source, target, xhr.status));
                } else {
                    fail(new FileTransferError(FileTransferError.CONNECTION_ERR, source, target, xhr.status));
                }
            }
        };
        xhr.onprogress = function (evt) {
            win(evt);
        };

        xhr.responseType = "blob";
        xhr.open("GET", source, true);
        xhr.send();
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "async"};
    }
};

});

// file: lib/blackberry/plugin/qnx/inappbrowser/bbsymbols.js
define("cordova/plugin/qnx/inappbrowser/bbsymbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/InAppBrowser', 'open');

});

// file: lib/blackberry/plugin/qnx/magnetometer.js
define("cordova/plugin/qnx/magnetometer", function(require, exports, module) {

var cordova = require('cordova'),
    callback;

module.exports = {
    start: function (args, win, fail) {
        window.removeEventListener("deviceorientation", callback);
        callback = function (orientation) {
            var heading = 360 - orientation.alpha;
            win({
                magneticHeading: heading,
                trueHeading: heading,
                headingAccuracy: 0,
                timestamp: orientation.timeStamp
            });
        };

        window.addEventListener("deviceorientation", callback);
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "WebWorks Is On It" };
    },
    stop: function (args, win, fail) {
        window.removeEventListener("deviceorientation", callback);
        return { "status" : cordova.callbackStatus.OK, "message" : "removed" };
    }
};

});

// file: lib/blackberry/plugin/qnx/manager.js
define("cordova/plugin/qnx/manager", function(require, exports, module) {

var cordova = require('cordova'),
    plugins = {
        'NetworkStatus' : require('cordova/plugin/qnx/network'),
        'Accelerometer' : require('cordova/plugin/webworks/accelerometer'),
        'Device' : require('cordova/plugin/qnx/device'),
        'Battery' : require('cordova/plugin/qnx/battery'),
        'Compass' : require('cordova/plugin/qnx/magnetometer'),
        'Camera' : require('cordova/plugin/qnx/camera'),
        'Capture' : require('cordova/plugin/qnx/capture'),
        'Logger' : require('cordova/plugin/webworks/logger'),
        'Notification' : require('cordova/plugin/webworks/notification'),
        'Media': require('cordova/plugin/webworks/media'),
        'File' : require('cordova/plugin/qnx/file'),
        'InAppBrowser' : require('cordova/plugin/qnx/InAppBrowser'),
        'FileTransfer': require('cordova/plugin/qnx/fileTransfer')
    };

module.exports = {
    addPlugin: function (key, module) {
        plugins[key] = require(module);
    },
    exec: function (win, fail, clazz, action, args) {
        var result = {"status" : cordova.callbackStatus.CLASS_NOT_FOUND_EXCEPTION, "message" : "Class " + clazz + " cannot be found"};

        if (plugins[clazz]) {
            if (plugins[clazz][action]) {
                result = plugins[clazz][action](args, win, fail);
            }
            else {
                result = { "status" : cordova.callbackStatus.INVALID_ACTION, "message" : "Action not found: " + action };
            }
        }

        return result;
    },
    resume: function () {},
    pause: function () {},
    destroy: function () {}
};

});

// file: lib/blackberry/plugin/qnx/network.js
define("cordova/plugin/qnx/network", function(require, exports, module) {

var cordova = require('cordova');

module.exports = {
    getConnectionInfo: function (args, win, fail) {
        return { "status": cordova.callbackStatus.OK, "message": blackberry.connection.type};
    }
};

});

// file: lib/blackberry/plugin/qnx/platform.js
define("cordova/plugin/qnx/platform", function(require, exports, module) {

var cordova = require('cordova');

module.exports = {
    id: "qnx",
    initialize: function () {
        document.addEventListener("deviceready", function () {
            blackberry.event.addEventListener("pause", function () {
                cordova.fireDocumentEvent("pause");
            });
            blackberry.event.addEventListener("resume", function () {
                cordova.fireDocumentEvent("resume");
            });

            window.addEventListener("online", function () {
                cordova.fireDocumentEvent("online");
            });

            window.addEventListener("offline", function () {
                cordova.fireDocumentEvent("offline");
            });
        });
    }
};

});

// file: lib/common/plugin/requestFileSystem.js
define("cordova/plugin/requestFileSystem", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    FileError = require('cordova/plugin/FileError'),
    FileSystem = require('cordova/plugin/FileSystem'),
    exec = require('cordova/exec');

/**
 * Request a file system in which to store application data.
 * @param type  local file system type
 * @param size  indicates how much storage space, in bytes, the application expects to need
 * @param successCallback  invoked with a FileSystem object
 * @param errorCallback  invoked if error occurs retrieving file system
 */
var requestFileSystem = function(type, size, successCallback, errorCallback) {
    argscheck.checkArgs('nnFF', 'requestFileSystem', arguments);
    var fail = function(code) {
        errorCallback && errorCallback(new FileError(code));
    };

    if (type < 0 || type > 3) {
        fail(FileError.SYNTAX_ERR);
    } else {
        // if successful, return a FileSystem object
        var success = function(file_system) {
            if (file_system) {
                if (successCallback) {
                    // grab the name and root from the file system object
                    var result = new FileSystem(file_system.name, file_system.root);
                    successCallback(result);
                }
            }
            else {
                // no FileSystem object returned
                fail(FileError.NOT_FOUND_ERR);
            }
        };
        exec(success, fail, "File", "requestFileSystem", [type, size]);
    }
};

module.exports = requestFileSystem;

});

// file: lib/common/plugin/resolveLocalFileSystemURI.js
define("cordova/plugin/resolveLocalFileSystemURI", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    DirectoryEntry = require('cordova/plugin/DirectoryEntry'),
    FileEntry = require('cordova/plugin/FileEntry'),
    FileError = require('cordova/plugin/FileError'),
    exec = require('cordova/exec');

/**
 * Look up file system Entry referred to by local URI.
 * @param {DOMString} uri  URI referring to a local file or directory
 * @param successCallback  invoked with Entry object corresponding to URI
 * @param errorCallback    invoked if error occurs retrieving file system entry
 */
module.exports = function(uri, successCallback, errorCallback) {
    argscheck.checkArgs('sFF', 'resolveLocalFileSystemURI', arguments);
    // error callback
    var fail = function(error) {
        errorCallback && errorCallback(new FileError(error));
    };
    // sanity check for 'not:valid:filename'
    if(!uri || uri.split(":").length > 2) {
        setTimeout( function() {
            fail(FileError.ENCODING_ERR);
        },0);
        return;
    }
    // if successful, return either a file or directory entry
    var success = function(entry) {
        var result;
        if (entry) {
            if (successCallback) {
                // create appropriate Entry object
                result = (entry.isDirectory) ? new DirectoryEntry(entry.name, entry.fullPath) : new FileEntry(entry.name, entry.fullPath);
                successCallback(result);
            }
        }
        else {
            // no Entry object returned
            fail(FileError.NOT_FOUND_ERR);
        }
    };

    exec(success, fail, "File", "resolveLocalFileSystemURI", [uri]);
};

});

// file: lib/common/plugin/splashscreen.js
define("cordova/plugin/splashscreen", function(require, exports, module) {

var exec = require('cordova/exec');

var splashscreen = {
    show:function() {
        exec(null, null, "SplashScreen", "show", []);
    },
    hide:function() {
        exec(null, null, "SplashScreen", "hide", []);
    }
};

module.exports = splashscreen;

});

// file: lib/common/plugin/splashscreen/symbols.js
define("cordova/plugin/splashscreen/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/splashscreen', 'navigator.splashscreen');

});

// file: lib/tizen/plugin/tizen/Accelerometer.js
define("cordova/plugin/tizen/Accelerometer", function(require, exports, module) {

var callback = null;

module.exports = {
    start: function (successCallback, errorCallback) {
        window.removeEventListener("devicemotion", callback);
        callback = function (motion) {
            successCallback({
                x: motion.accelerationIncludingGravity.x,
                y: motion.accelerationIncludingGravity.y,
                z: motion.accelerationIncludingGravity.z,
                timestamp: motion.timeStamp
            });
        };
        window.addEventListener("devicemotion", callback);
    },
    stop: function (successCallback, errorCallback) {
        window.removeEventListener("devicemotion", callback);
    }
};

});

// file: lib/tizen/plugin/tizen/Battery.js
define("cordova/plugin/tizen/Battery", function(require, exports, module) {

/*global tizen:false */
var id = null;

module.exports = {
    start: function(successCallback, errorCallback) {
        var tizenSuccessCallback = function(power) {
            if (successCallback) {
                successCallback({level: Math.round(power.level * 100), isPlugged: power.isCharging});
            }
        };

        if (id === null) {
            id = tizen.systeminfo.addPropertyValueChangeListener("Power", tizenSuccessCallback);
        }
        tizen.systeminfo.getPropertyValue("Power", tizenSuccessCallback, errorCallback);
    },

    stop: function(successCallback, errorCallback) {
        tizen.systeminfo.removePropertyValueChangeListener(id);
        id = null;
    }
};

});

// file: lib/tizen/plugin/tizen/BufferLoader.js
define("cordova/plugin/tizen/BufferLoader", function(require, exports, module) {

/*
 * Buffer Loader Object
 * This class provides a sound buffer for one or more sounds
 * held in a local file located by an url
 *
 * uses W3C  Web Audio API
 *
 * @constructor
 *
 * @param {AudioContext} audio context object
 * @param {Array} urlList, array of url for sound to load
 * @param {function} callback , called after buffer was loaded
 *
 */

function BufferLoader(context, urlList, callback) {
    this.context = context;
    this.urlList = urlList;
    this.onload = callback;
    this.bufferList = [];
    this.loadCount = 0;
}

/*
 * This method loads a sound into a buffer
 * @param {Array} urlList, array of url for sound to load
 * @param {Number} index, buffer index in the array where to load the url sound
 *
 */

BufferLoader.prototype.loadBuffer = function(url, index) {
    // Load buffer asynchronously
    var request = null,
        loader = null;

    request = new XMLHttpRequest();

    if (request === null) {
        console.log ("BufferLoader.prototype.loadBuffer, cannot allocate XML http request");
        return;
    }

    request.open("GET", url, true);
    request.responseType = "arraybuffer";

    loader = this;

    request.onload = function() {
    // Asynchronously decode the audio file data in request.response
    loader.context.decodeAudioData(
        request.response,
        function(buffer) {
                if (!buffer) {
                    console.log ("BufferLoader.prototype.loadBuffer,error decoding file data: " + url);
                    return;
                }

                loader.bufferList[index] = buffer;

                if (++loader.loadCount == loader.urlList.length) {
                    loader.onload(loader.bufferList);
                }
            }
        );
    };

    request.onerror = function() {
        console.log ("BufferLoader.prototype.loadBuffer, XHR error");
    };

    request.send();
};

/*
 * This method loads all sounds identified by their url
 * and that where given to the object constructor
 *
 */

BufferLoader.prototype.load = function() {
    for (var i = 0; i < this.urlList.length; ++i) {
        this.loadBuffer(this.urlList[i], i);
    }
};

module.exports = BufferLoader;

});

// file: lib/tizen/plugin/tizen/Camera.js
define("cordova/plugin/tizen/Camera", function(require, exports, module) {

/*global tizen:false */
var Camera = require('cordova/plugin/CameraConstants');

function makeReplyCallback(successCallback, errorCallback) {
    return {
        onsuccess: function(reply) {
            if (reply.length > 0) {
                successCallback(reply[0].value);
            } else {
                errorCallback('Picture selection aborted');
            }
        },
        onfail: function() {
           console.log('The service launch failed');
        }
    };
}

module.exports = {
    takePicture: function(successCallback, errorCallback, args) {
        var destinationType = args[1],
            sourceType = args[2],
            encodingType = args[5],
            mediaType = args[6];
            // Not supported
            /*
            quality = args[0]
            targetWidth = args[3]
            targetHeight = args[4]
            allowEdit = args[7]
            correctOrientation = args[8]
            saveToPhotoAlbum = args[9]
            */

        if (destinationType !== Camera.DestinationType.FILE_URI) {
            errorCallback('DestinationType not supported');
            return;
        }
        if (mediaType !== Camera.MediaType.PICTURE) {
            errorCallback('MediaType not supported');
            return;
        }

        var mimeType;
        if (encodingType === Camera.EncodingType.JPEG) {
            mimeType = 'image/jpeg';
        } else if (encodingType === Camera.EncodingType.PNG) {
            mimeType = 'image/png';
        } else {
            mimeType = 'image/*';
        }

        var serviceId;
        if (sourceType === Camera.PictureSourceType.CAMERA) {
            serviceId = 'http://tizen.org/appsvc/operation/create_content';
        } else {
            serviceId = 'http://tizen.org/appsvc/operation/pick';
        }

        var service = new tizen.ApplicationService(serviceId, null, mimeType, null);
        tizen.application.launchService(service, null, null,
                function(error) { errorCallback(error.message); },
                makeReplyCallback(successCallback, errorCallback));
    }
};

});

// file: lib/tizen/plugin/tizen/Compass.js
define("cordova/plugin/tizen/Compass", function(require, exports, module) {

var CompassError = require('cordova/plugin/CompassError'),
    callback = null, ready = false;

module.exports = {
    getHeading: function(successCallback, errorCallback) {
        if (window.DeviceOrientationEvent !== undefined) {
            callback = function (orientation) {
                var heading = 360 - orientation.alpha;
                if (ready) {
                    successCallback({
                        magneticHeading: heading,
                        trueHeading: heading,
                        headingAccuracy: 0,
                        timestamp: orientation.timeStamp
                    });
                    window.removeEventListener("deviceorientation", callback);
                }
                ready = true;
            };
            ready = false; // workaround invalid first event value returned by WRT
            window.addEventListener("deviceorientation", callback);
        }
        else {
            errorCallback(CompassError.COMPASS_NOT_SUPPORTED);
        }
    }
};

});

// file: lib/tizen/plugin/tizen/Contact.js
define("cordova/plugin/tizen/Contact", function(require, exports, module) {

/*global tizen:false */
var ContactError = require('cordova/plugin/ContactError'),
    ContactUtils = require('cordova/plugin/tizen/ContactUtils'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec');

// ------------------
// Utility functions
// ------------------


/**
 * Retrieves a Tizen Contact object from the device by its unique id.
 *
 * @param uid
 *            Unique id of the contact on the device
 * @return {tizen.Contact} Tizen Contact object or null if contact with
 *         specified id is not found
 */
var findByUniqueId = function(id) {

    if (!id) {
        return null;
    }

    var tizenContact = null;

    tizen.contact.getDefaultAddressBook().find(
        function _successCallback(contacts){
            tizenContact = contacts[0];
        },
        function _errorCallback(error){
            console.log("tizen find error " + error);
        },
        new tizen.AttributeFilter('id', 'CONTAINS', id),
        new tizen.SortMode('id', 'ASC'));

    return tizenContact || null;
};


var traceTizenContact = function (tizenContact) {
    console.log("cordova/plugin/tizen/Contact/  tizenContact.id " + tizenContact.id);
    console.log("cordova/plugin/tizen/Contact/  tizenContact.lastUpdated " + tizenContact.lastUpdated);
    console.log("cordova/plugin/tizen/Contact/  tizenContact.name " + tizenContact.name);
    console.log("cordova/plugin/tizen/Contact/  tizenContact.account " + tizenContact.account);
    console.log("cordova/plugin/tizen/Contact/  tizenContact.addresses " + tizenContact.addresses);
    console.log("cordova/plugin/tizen/Contact/  tizenContact.photoURI " + tizenContact.photoURI);
    console.log("cordova/plugin/tizen/Contact/  tizenContact.phoneNumbers " + tizenContact.phoneNumbers);
    console.log("cordova/plugin/tizen/Contact/  tizenContact.emails " + tizenContact.emails);
    console.log("cordova/plugin/tizen/Contact/  tizenContact.birthday " + tizenContact.birthday);
    console.log("cordova/plugin/tizen/Contact/  tizenContact.organization " + tizenContact.organization);
    console.log("cordova/plugin/tizen/Contact/  tizenContact.notes " + tizenContact.notes);
    console.log("cordova/plugin/tizen/Contact/  tizenContact.urls " + tizenContact.isFavorite);
    console.log("cordova/plugin/tizen/Contact/  tizenContact.isFavorite " + tizenContact.isFavorite);
    console.log("cordova/plugin/tizen/Contact/  tizenContact.ringtonesURI " + tizenContact.ringtonesURI);
    console.log("cordova/plugin/tizen/Contact/  tizenContact.categories " + tizenContact.categories);
};


/**
 * Creates a Tizen contact object from the W3C Contact object and persists
 * it to device storage.
 *
 * @param {Contact}
 *            contact The contact to save
 * @return a new contact object with all properties set
 */
var saveToDevice = function(contact) {

    if (!contact) {
        return;
    }

    var tizenContact = null;
    var update = false;
    var i = 0;

    // if the underlying Tizen Contact object already exists, retrieve it for
    // update
    if (contact.id) {
        // we must attempt to retrieve the BlackBerry contact from the device
        // because this may be an update operation
        tizenContact = findByUniqueId(contact.id);
    }

    // contact not found on device, create a new one
    if (!tizenContact) {
        tizenContact = new tizen.Contact();
    }
    // update the existing contact
    else {
        update = true;
    }

    // NOTE: The user may be working with a partial Contact object, because only
    // user-specified Contact fields are returned from a find operation (blame
    // the W3C spec). If this is an update to an existing Contact, we don't
    // want to clear an attribute from the contact database simply because the
    // Contact object that the user passed in contains a null value for that
    // attribute. So we only copy the non-null Contact attributes to the
    // Tizen Contact object before saving.
    //
    // This means that a user must explicitly set a Contact attribute to a
    // non-null value in order to update it in the contact database.
    //
    traceTizenContact (tizenContact);

    // display name
    if (contact.displayName !== null) {
        if (tizenContact.name === null) {
            tizenContact.name = new tizen.ContactName();
        }
        if (tizenContact.name !== null) {
            tizenContact.name.displayName = contact.displayName;
        }
    }

    // name
    if (contact.name !== null) {
        if (contact.name.givenName) {
            if (tizenContact.name === null) {
                tizenContact.name = new tizen.ContactName();
            }
            if (tizenContact.name !== null) {
                tizenContact.name.firstName = contact.name.givenName;
            }
        }

        if  (contact.name.middleName) {
            if (tizenContact.name === null) {
                tizenContact.name = new tizen.ContactName();
            }
            if (tizenContact.name !== null) {
                tizenContact.name.middleName = contact.name.middleName;
            }
        }

        if (contact.name.familyName) {
            if (tizenContact.name === null) {
                tizenContact.name = new tizen.ContactName();
            }
            if (tizenContact.name !== null) {
                tizenContact.name.lastName = contact.name.familyName;
            }
        }

        if (contact.name.honorificPrefix) {
            if (tizenContact.name === null) {
                tizenContact.name = new tizen.ContactName();
            }
            if (tizenContact.name !== null) {
                tizenContact.name.prefix = contact.name.honorificPrefix;
            }
        }
    }

    // nickname
    if (contact.nickname !== null) {
        if (tizenContact.name === null) {
            tizenContact.name = new tizen.ContactName();
        }
        if (tizenContact.name !== null) {
            if (!utils.isArray(tizenContact.name.nicknames))
            {
                tizenContact.name.nicknames = [];
            }
            tizenContact.name.nicknames[0] = contact.nickname;
        }
    }
    else {
        tizenContact.name.nicknames = [];
    }

    // note
    if (contact.note !== null) {
        if (tizenContact.note === null) {
            tizenContact.note = [];
        }
        if (tizenContact.note !== null) {
            tizenContact.note[0] = contact.note;
        }
    }

    // photos
    if (contact.photos && utils.isArray(contact.emails) && contact.emails.length > 0) {
        tizenContact.photoURI = contact.photos[0];
    }

    if (utils.isDate(contact.birthday)) {
        if (!utils.isDate(tizenContact.birthday)) {
            tizenContact.birthday = new Date();
        }
        if (utils.isDate(tizenContact.birthday)) {
            tizenContact.birthday.setDate(contact.birthday.getDate());
        }
    }

    // Tizen supports many addresses
    if (utils.isArray(contact.emails)) {

        // if this is an update, re initialize email addresses
        if (update) {
            // doit on effacer sur un update??????
        }

        // copy the first three email addresses found
        var emails = [];
        for (i = 0; i < contact.emails.length; i += 1) {
            var emailTypes = [];

            emailTypes.push (contact.emails[i].type);

            if (contact.emails[i].pref) {
                emailTypes.push ("PREF");
            }

            emails.push(
                new tizen.ContactEmailAddress(
                    contact.emails[i].value,
                    emailTypes)
            );
        }
        tizenContact.emails = emails.length > 0 ? emails : [];
    }
    else {
        tizenContact.emails = [];
    }

    // Tizen supports many phone numbers
    // copy into appropriate fields based on type
    if (utils.isArray(contact.phoneNumbers)) {
        // if this is an update, re-initialize phone numbers
        if (update) {
        }

        var phoneNumbers = [];

        for (i = 0; i < contact.phoneNumbers.length; i += 1) {

            if (!contact.phoneNumbers[i] || !contact.phoneNumbers[i].value) {
                continue;
            }

             var phoneTypes = [];
             phoneTypes.push (contact.phoneNumbers[i].type);

             if (contact.phoneNumbers[i].pref) {
                 phoneTypes.push ("PREF");
             }

            phoneNumbers.push(
                new tizen.ContactPhoneNumber(
                    contact.phoneNumbers[i].value,
                    phoneTypes)
            );
        }

        tizenContact.phoneNumbers = phoneNumbers.length > 0 ? phoneNumbers : [];
    } else {
        tizenContact.phoneNumbers = [];
    }

    if (utils.isArray(contact.addresses)) {
        // if this is an update, re-initialize addresses
        if (update) {
        }

        var addresses = [],
            address = null;

        for ( i = 0; i < contact.addresses.length; i += 1) {
            address = contact.addresses[i];

            if (!address || address.id === undefined || address.pref === undefined || address.type === undefined || address.formatted === undefined) {
                continue;
            }

            var addressTypes = [];
            addressTypes.push (address.type);

            if (address.pref) {
                addressTypes.push ("PREF");
            }

            addresses.push(
                new tizen.ContactAddress({
                         country:                   address.country,
                         region :                   address.region,
                         city:                      address.locality,
                         streetAddress:             address.streetAddress,
                         additionalInformation:     "",
                         postalCode:                address.postalCode,
                         types :                    addressTypes
                }));

        }
        tizenContact.addresses = addresses.length > 0 ? addresses : [];

    } else{
        tizenContact.addresses = [];
    }

    // copy first url found to BlackBerry 'webpage' field
    if (utils.isArray(contact.urls)) {
        // if this is an update, re-initialize web page
        if (update) {
        }

        var url = null,
            urls = [];

        for ( i = 0; i< contact.urls.length; i+= 1) {
            url = contact.urls[i];

            if (!url || !url.value) {
                continue;
            }

            urls.push( new tizen.ContactWebSite(url.value, url.type));
        }
        tizenContact.urls = urls.length > 0 ? urls : [];
    } else{
        tizenContact.urls = [];
    }

    if (utils.isArray(contact.organizations && contact.organizations.length > 0) ) {
        // if this is an update, re-initialize org attributes
        var organization = contact.organizations[0];

         tizenContact.organization = new tizen.ContacOrganization({
             name:          organization.name,
             department:    organization.department,
             office:        "",
             title:         organization.title,
             role:          "",
             logoURI:       ""
         });
    }

    // categories
    if (utils.isArray(contact.categories)) {
        tizenContact.categories = [];

        var category = null;

        for (i = 0; i < contact.categories.length; i += 1) {
            category = contact.categories[i];

            if (typeof category === "string") {
                tizenContact.categories.push(category);
            }
        }
    }
    else {
        tizenContact.categories = [];
    }

    // save to device
    // in tizen contact mean update or add
    // later we might use addBatch and updateBatch
    if (update){
        tizen.contact.getDefaultAddressBook().update(tizenContact);
    }
    else {
        tizen.contact.getDefaultAddressBook().add(tizenContact);
    }

    // Use the fully populated Tizen contact object to create a
    // corresponding W3C contact object.
    return ContactUtils.createContact(tizenContact, [ "*" ]);
};


/**
 * Creates a Tizen ContactAddress object from a W3C ContactAddress.
 *
 * @return {tizen.ContactAddress} a Tizen ContactAddress object
 */
var createTizenAddress = function(address) {

    var type = null,
        pref = null,
        typesAr = [];

    if (address === null) {
        return null;
    }


    var tizenAddress = new tizen.ContactAddress();

    if (tizenAddress === null) {
        return null;
    }

    typesAr.push(address.type);

    if (address.pref) {
        typesAr.push("PREF");
    }

    tizenAddress.country = address.country || "";
    tizenAddress.region = address.region || "";
    tizenAddress.city = address.locality || "";
    tizenAddress.streetAddress = address.streetAddress || "";
    tizenAddress.postalCode = address.postalCode || "";
    tizenAddress.types = typesAr || "";

    return tizenAddress;
};

module.exports = {
    /**
     * Persists contact to device storage.
     */

    save : function(successCB, failCB) {

        try {
            // save the contact and store it's unique id
            var fullContact = saveToDevice(this);

            this.id = fullContact.id;

            // This contact object may only have a subset of properties
            // if the save was an update of an existing contact. This is
            // because the existing contact was likely retrieved using a
            // subset of properties, so only those properties were set in the
            // object. For this reason, invoke success with the contact object
            // returned by saveToDevice since it is fully populated.

            if (typeof successCB === 'function') {
                successCB(fullContact);
            }
        }
        catch (error) {
            console.log('Error saving contact: ' +  error);

            if (typeof failCB === 'function') {
                failCB (new ContactError(ContactError.UNKNOWN_ERROR));
            }
        }
    },

    /**
     * Removes contact from device storage.
     *
     * @param successCB
     *            successCB callback
     * @param failCB
     *            error callback
     */
    remove : function (successCB, failCB) {

        try {
            // retrieve contact from device by id
            var tizenContact = null;

            if (this.id) {
                tizenContact = findByUniqueId(this.id);
            }


            // if contact was found, remove it
            if (tizenContact) {

                tizen.contact.getDefaultAddressBook().remove(tizenContact.id);

                if (typeof success === 'function') {
                    successCB(this);
                }
            }
            // attempting to remove a contact that hasn't been saved
            else if (typeof failCB === 'function') {
                failCB(new ContactError(ContactError.UNKNOWN_ERROR));
            }
        }
        catch (error) {
            console.log('Error removing contact ' + this.id + ": " + error);
            if (typeof failCB === 'function') {
                failCB(new ContactError(ContactError.UNKNOWN_ERROR));
            }
        }
    }
};

});

// file: lib/tizen/plugin/tizen/ContactUtils.js
define("cordova/plugin/tizen/ContactUtils", function(require, exports, module) {

/*global tizen:false */
var ContactAddress = require('cordova/plugin/ContactAddress'),
    ContactName = require('cordova/plugin/ContactName'),
    ContactField = require('cordova/plugin/ContactField'),
    ContactOrganization = require('cordova/plugin/ContactOrganization'),
    utils = require('cordova/utils'),
    Contact = require('cordova/plugin/Contact');

/**
 * Mappings for each Contact field that may be used in a find operation. Maps
 * W3C Contact fields to one or more fields in a Tizen contact object.
 *
 * Example: user searches with a filter on the Contact 'name' field:
 *
 * <code>Contacts.find(['name'], onSuccess, onFail, {filter:'Bob'});</code>
 *
 * The 'name' field does not exist in a Tizen contact. Instead, a filter
 * expression will be built to search the Tizen contacts using the
 * Tizen 'title', 'firstName' and 'lastName' fields.
 */
var fieldMappings = {
    "id" : ["id"],
    "displayName" : ["name.displayName"],
    "nickname": ["name.nicknames"],
    "name" : [ "name.prefix", "name.firstName", "name.lastName" ],
    "phoneNumbers" : ["phoneNumbers.number","phoneNumbers.types"],
    "emails" : ["emails.types", "emails.email"],
    "addresses" : ["addresses.country","addresses.region","addresses.city","addresses.streetAddress","addresses.postalCode","addresses.country","addresses.types"],
    "organizations" : ["organization.name","organization.department","organization.office", "organization.title"],
    "birthday" : ["birthday"],
    "note" : ["notes"],
    "photos" : ["photoURI"],
    "categories" : ["categories"],
    "urls" : ["urls.url", "urls.type"]
};

/*
 * Build an array of all of the valid W3C Contact fields. This is used to
 * substitute all the fields when ["*"] is specified.
 */
var allFields = [];

(function() {
    for ( var key in fieldMappings) {
        allFields.push(key);
    }
})();

/**
 * Create a W3C ContactAddress object from a Tizen Address object
 *
 * @param {String}
 *            type the type of address (e.g. work, home)
 * @param {tizen.ContactAddress}
 *            tizenAddress a Tizen Address object
 * @return {ContactAddress} a contact address object or null if the specified
 *         address is null
 */
var createContactAddress = function(type, tizenAddress) {
    if (!tizenAddress) {
        return null;
    }

    var streetAddress = tizenAddress.streetAddress;
    var locality = tizenAddress.city || "";
    var region = tizenAddress.region || "";
    var postalCode = tizenAddress.postalCode || "";
    var country = tizenAddress.country || "";
    var formatted = streetAddress + ", " + locality + ", " + region + ", " + postalCode + ", " + country;

    var contact = new ContactAddress(null, type, formatted, streetAddress, locality, region, postalCode, country);

    return contact;
};

module.exports = {
    /**
     * Builds Tizen filter expressions for contact search using the
     * contact fields and search filter provided.
     *
     * @param {String[]}
     *            fields Array of Contact fields to search
     * @param {String}
     *            filter Filter, or search string
     * @param {Boolean}
     *                 multiple, one contacts or more wanted as result
     * @return filter expression or null if fields is empty or filter is null or
     *         empty
     */

    buildFilterExpression: function(fields, filter) {
        // ensure filter exists
        if (!filter || filter === "") {
            return null;
        }

        if ((fields.length === 1) && (fields[0] === "*")) {
            // Cordova enhancement to allow fields value of ["*"] to indicate
            // all supported fields.
            fields = allFields;
        }

        // build a filter expression using all Contact fields provided
        var compositeFilter = null,
            attributeFilter = null,
            filterExpression = null,
            matchFlag = "CONTAINS",
            matchValue = filter,
            attributesArray = [];

        if (fields && utils.isArray(fields)) {

            for ( var field in fields) {

                if (!fields[field]) {
                    continue;
                }

                // retrieve Tizen contact fields that map Cordova fields specified
                // (tizenFields is a string or an array of strings)
                var tizenFields = fieldMappings[fields[field]];

                if (!tizenFields) {
                    // does something maps
                    continue;
                }

                // construct the filter expression using the Tizen fields
                for ( var index in tizenFields) {
                    attributeFilter = new tizen.AttributeFilter(tizenFields[index], matchFlag, matchValue);
                    if (attributeFilter !== null) {
                        attributesArray.push(attributeFilter);
                    }
                }
            }
        }

        // fulfill Tizen find attribute as a single or a composite attribute
        if (attributesArray.length == 1 ) {
            filterExpression = attributeFilter[0];
        } else if (attributesArray.length > 1) {
            // combine the filters as a Union
            filterExpression = new tizen.CompositeFilter("UNION", attributesArray);
        } else {
            filterExpression = null;
        }

        return filterExpression;
    },



    /**
     * Creates a Contact object from a Tizen Contact object, copying only
     * the fields specified.
     *
     * This is intended as a privately used function but it is made globally
     * available so that a Contact.save can convert a BlackBerry contact object
     * into its W3C equivalent.
     *
     * @param {tizen.Contact}
     *            tizenContact Tizen Contact object
     * @param {String[]}
     *            fields array of contact fields that should be copied
     * @return {Contact} a contact object containing the specified fields or
     *         null if the specified contact is null
     */
    createContact: function(tizenContact, fields) {

        if (!tizenContact) {
            return null;
        }

        // construct a new contact object
        // always copy the contact id and displayName fields
        var contact = new Contact(tizenContact.id, tizenContact.name.displayName);


        // nothing to do
        if (!fields || !(utils.isArray(fields)) || fields.length === 0) {
            return contact;
        } else if (fields.length === 1 && fields[0] === "*") {
            // Cordova enhancement to allow fields value of ["*"] to indicate
            // all supported fields.
            fields = allFields;
        }

        // add the fields specified
        for ( var key in fields) {

            var field = fields[key],
                index = 0;

            if (!field) {
                continue;
            }

            // name
            if (field.indexOf('name') === 0) {

                var formattedName = (tizenContact.name.prefix || "");

                if (tizenContact.name.firstName) {
                    formattedName += ' ';
                    formattedName += (tizenContact.name.firstName || "");
                }

                if (tizenContact.name.middleName) {
                    formattedName += ' ';
                    formattedName += (tizenContact.name.middleName || "");
                }

                if (tizenContact.name.lastName) {
                    formattedName += ' ';
                    formattedName += (tizenContact.name.lastName || "");
                }

                contact.name = new ContactName(
                        formattedName,
                        tizenContact.name.lastName,
                        tizenContact.name.firstName,
                        tizenContact.name.middleName,
                        tizenContact.name.prefix,
                        null);
            }

            // phoneNumbers
            else if (field.indexOf('phoneNumbers') === 0) {

                var phoneNumbers = [];

                for (index = 0 ; index < tizenContact.phoneNumbers.length ; ++index) {

                    phoneNumbers.push(
                            new ContactField(
                                    'PHONE',
                                    tizenContact.phoneNumbers[index].number,
                                    ((tizenContact.phoneNumbers[index].types[1]) &&  (tizenContact.emails[index].types[1] === "PREF") ) ? true : false));
                }


                contact.phoneNumbers = phoneNumbers.length > 0 ? phoneNumbers : null;
            }

            // emails
            else if (field.indexOf('emails') === 0) {

                var emails = [];

                for (index = 0 ; index < tizenContact.emails.length ; ++index) {

                    emails.push(
                        new ContactField(
                            'EMAILS',
                            tizenContact.emails[index].email,
                            ((tizenContact.emails[index].types[1]) &&  (tizenContact.emails[index].types[1] === "PREF") ) ? true : false));
                }
                contact.emails = emails.length > 0 ? emails : null;
            }

            // addresses
            else if (field.indexOf('addresses') === 0) {

                var addresses = [];
                for (index = 0 ; index < tizenContact.addresses.length ; ++index) {

                    addresses.push(
                            new ContactAddress(
                                    ((tizenContact.addresses[index].types[1] &&  tizenContact.addresses[index].types[1] === "PREF") ? true : false),
                                    tizenContact.addresses[index].types[0] ? tizenContact.addresses[index].types[0] : "HOME",
                                    null,
                                    tizenContact.addresses[index].streetAddress,
                                    tizenContact.addresses[index].city,
                                    tizenContact.addresses[index].region,
                                    tizenContact.addresses[index].postalCode,
                                    tizenContact.addresses[index].country ));
                }

                contact.addresses = addresses.length > 0 ? addresses : null;
            }

            // birthday
            else if (field.indexOf('birthday') === 0) {
                if (utils.isDate(tizenContact.birthday)) {
                    contact.birthday = tizenContact.birthday;
                }
            }

            // note only one in Tizen Contact
            else if (field.indexOf('note') === 0) {
                if (tizenContact.note) {
                    contact.note = tizenContact.note[0];
                }
            }

            // organizations
            else if (field.indexOf('organizations') === 0) {

                var organizations = [];

                // there's only one organization in a Tizen Address

                if (tizenContact.organization) {
                    organizations.push(
                            new ContactOrganization(
                                    true,
                                    'WORK',
                                    tizenContact.organization.name,
                                    tizenContact.organization.department,
                                    tizenContact.organization.jobTitle));
                }

                contact.organizations = organizations.length > 0 ? organizations : null;
            }

            // categories
            else if (field.indexOf('categories') === 0) {

                var categories = [];

                if (tizenContact.categories) {

                    for (index = 0 ; index < tizenContact.categories.length ; ++index) {
                        categories.push(
                                new ContactField(
                                        'MAIN',
                                        tizenContact.categories,
                                        (index === 0) ));
                    }

                    contact.categories = categories.length > 0 ? categories : null;
                }
            }

            // urls
            else if (field.indexOf('urls') === 0) {
                var urls = [];

                if (tizenContact.urls) {
                    for (index = 0 ; index <tizenContact.urls.length ; ++index) {
                        urls.push(
                                new ContactField(
                                        tizenContact.urls[index].type,
                                        tizenContact.urls[index].url,
                                        (index === 0)));
                    }
                }

                contact.urls = urls.length > 0 ? urls : null;
            }

            // photos
            else if (field.indexOf('photos') === 0) {
                var photos = [];

                if (tizenContact.photoURI) {
                    photos.push(new ContactField('URI', tizenContact.photoURI, true));
                }

                contact.photos = photos.length > 0 ? photos : null;
            }
        }

        return contact;
    }
};

});

// file: lib/tizen/plugin/tizen/Device.js
define("cordova/plugin/tizen/Device", function(require, exports, module) {

/*global tizen:false */
var channel = require('cordova/channel');

// Tell cordova channel to wait on the CordovaInfoReady event
channel.waitForInitialization('onCordovaInfoReady');

function Device() {
    this.version = null;
    this.uuid = null;
    this.name = null;
    this.cordova = "2.7.0";
    this.platform = "Tizen";

    var me = this;

    function onSuccessCallback(sysInfoProp) {
        me.name = sysInfoProp.model;
        me.uuid = sysInfoProp.imei;
        me.version = sysInfoProp.version;
        channel.onCordovaInfoReady.fire();
    }

    function onErrorCallback(error) {
        console.log("error initializing cordova: " + error);
    }

    channel.onCordovaReady.subscribe(function() {
        me.getDeviceInfo(onSuccessCallback, onErrorCallback);
    });
}

Device.prototype.getDeviceInfo = function(success, fail, args) {
    tizen.systeminfo.getPropertyValue("Device", success, fail);
};

module.exports = new Device();

});

// file: lib/tizen/plugin/tizen/File.js
define("cordova/plugin/tizen/File", function(require, exports, module) {

/*global WebKitBlobBuilder:false */
var FileError = require('cordova/plugin/FileError'),
    DirectoryEntry = require('cordova/plugin/DirectoryEntry'),
    FileEntry = require('cordova/plugin/FileEntry'),
    File = require('cordova/plugin/File'),
    FileSystem = require('cordova/plugin/FileSystem');

var nativeRequestFileSystem = window.webkitRequestFileSystem,
    nativeResolveLocalFileSystemURI = window.webkitResolveLocalFileSystemURL,
    NativeFileReader = window.FileReader;

function getFileSystemName(nativeFs) {
    return (nativeFs.name.indexOf("Persistent") != -1) ? "persistent" : "temporary";
}

function makeEntry(entry) {
    if (entry.isDirectory) {
        return new DirectoryEntry(entry.name, decodeURI(entry.toURL()));
    }
    else {
        return new FileEntry(entry.name, decodeURI(entry.toURL()));
    }
}

module.exports = {
    /* requestFileSystem */
    requestFileSystem: function(successCallback, errorCallback, args) {
        var type = args[0],
            size = args[1];

        nativeRequestFileSystem(type, size, function(nativeFs) {
            successCallback(new FileSystem(getFileSystemName(nativeFs), makeEntry(nativeFs.root)));
        }, function(error) {
            errorCallback(error.code);
        });
    },

    /* resolveLocalFileSystemURI */
    resolveLocalFileSystemURI: function(successCallback, errorCallback, args) {
        var uri = args[0];

        nativeResolveLocalFileSystemURI(uri, function(entry) {
            successCallback(makeEntry(entry));
        }, function(error) {
            errorCallback(error.code);
        });
    },

    /* DirectoryReader */
    readEntries: function(successCallback, errorCallback, args) {
        var uri = args[0];

        nativeResolveLocalFileSystemURI(uri, function(dirEntry) {
            var reader = dirEntry.createReader();
            reader.readEntries(function(entries) {
                var retVal = [];
                for (var i = 0; i < entries.length; i++) {
                    retVal.push(makeEntry(entries[i]));
                }
                successCallback(retVal);
            }, function(error) {
                errorCallback(error.code);
            });
        }, function(error) {
            errorCallback(error.code);
        });
    },

    /* Entry */
    getMetadata: function(successCallback, errorCallback, args) {
        var uri = args[0];

        nativeResolveLocalFileSystemURI(uri, function(entry) {
            entry.getMetadata(function(metaData) {
                successCallback(metaData.modificationTime);
            }, function(error) {
                errorCallback(error.code);
            });
        }, function(error) {
            errorCallback(error.code);
        });
    },

    moveTo: function(successCallback, errorCallback, args) {
        var srcUri = args[0],
            parentUri = args[1],
            name = args[2];

        nativeResolveLocalFileSystemURI(srcUri, function(source) {
            nativeResolveLocalFileSystemURI(parentUri, function(parent) {
                source.moveTo(parent, name, function(entry) {
                    successCallback(makeEntry(entry));
                }, function(error) {
                    errorCallback(error.code);
                });
            }, function(error) {
                errorCallback(error.code);
            });
        }, function(error) {
            errorCallback(error.code);
        });
    },

    copyTo: function(successCallback, errorCallback, args) {
        var srcUri = args[0],
            parentUri = args[1],
            name = args[2];

        nativeResolveLocalFileSystemURI(srcUri, function(source) {
            nativeResolveLocalFileSystemURI(parentUri, function(parent) {
                source.copyTo(parent, name, function(entry) {
                    successCallback(makeEntry(entry));
                }, function(error) {
                    errorCallback(error.code);
                });
            }, function(error) {
                errorCallback(error.code);
            });
        }, function(error) {
            errorCallback(error.code);
        });
    },

    remove: function(successCallback, errorCallback, args) {
        var uri = args[0];

        nativeResolveLocalFileSystemURI(uri, function(entry) {
            if (entry.fullPath === "/") {
                errorCallback(FileError.NO_MODIFICATION_ALLOWED_ERR);
            } else {
                entry.remove(successCallback, function(error) {
                    errorCallback(error.code);
                });
            }
        }, function(error) {
            errorCallback(error.code);
        });
    },

    getParent: function(successCallback, errorCallback, args) {
        var uri = args[0];

        nativeResolveLocalFileSystemURI(uri, function(entry) {
            entry.getParent(function(entry) {
                successCallback(makeEntry(entry));
            }, function(error) {
                errorCallback(error.code);
            });
        }, function(error) {
            errorCallback(error.code);
        });
    },

    /* FileEntry */
    getFileMetadata: function(successCallback, errorCallback, args) {
        var uri = args[0];

        nativeResolveLocalFileSystemURI(uri, function(entry) {
            entry.file(function(file) {
                var retVal = new File(file.name, decodeURI(entry.toURL()), file.type, file.lastModifiedDate, file.size);
                successCallback(retVal);
            }, function(error) {
                errorCallback(error.code);
            });
        }, function(error) {
            errorCallback(error.code);
        });
    },

    /* DirectoryEntry */
    getDirectory: function(successCallback, errorCallback, args) {
        var uri = args[0],
            path = args[1],
            options = args[2];

        nativeResolveLocalFileSystemURI(uri, function(entry) {
            entry.getDirectory(path, options, function(entry) {
                successCallback(makeEntry(entry));
            }, function(error) {
                if (error.code === FileError.INVALID_MODIFICATION_ERR) {
                    if (options.create) {
                        errorCallback(FileError.PATH_EXISTS_ERR);
                    } else {
                        errorCallback(FileError.ENCODING_ERR);
                    }
                } else {
                    errorCallback(error.code);
                }
            });
        }, function(error) {
            errorCallback(error.code);
        });
    },

    removeRecursively: function(successCallback, errorCallback, args) {
        var uri = args[0];

        nativeResolveLocalFileSystemURI(uri, function(entry) {
            if (entry.fullPath === "/") {
                errorCallback(FileError.NO_MODIFICATION_ALLOWED_ERR);
            } else {
                entry.removeRecursively(successCallback, function(error) {
                    errorCallback(error.code);
                });
            }
        }, function(error) {
            errorCallback(error.code);
        });
    },

    getFile: function(successCallback, errorCallback, args) {
        var uri = args[0],
            path = args[1],
            options = args[2];

        nativeResolveLocalFileSystemURI(uri, function(entry) {
            entry.getFile(path, options, function(entry) {
                successCallback(makeEntry(entry));
            }, function(error) {
                if (error.code === FileError.INVALID_MODIFICATION_ERR) {
                    if (options.create) {
                        errorCallback(FileError.PATH_EXISTS_ERR);
                    } else {
                        errorCallback(FileError.ENCODING_ERR);
                    }
                } else {
                    errorCallback(error.code);
                }
            });
        }, function(error) {
            errorCallback(error.code);
        });
    },

    /* FileReader */
    readAsText: function(successCallback, errorCallback, args) {
        var uri = args[0],
            encoding = args[1];

        nativeResolveLocalFileSystemURI(uri, function(entry) {
            var onLoadEnd = function(evt) {
                    if (!evt.target.error) {
                        successCallback(evt.target.result);
                    }
            },
                onError = function(evt) {
                    errorCallback(evt.target.error.code);
            };

            var reader = new NativeFileReader();

            reader.onloadend = onLoadEnd;
            reader.onerror = onError;
            entry.file(function(file) {
                reader.readAsText(file, encoding);
            }, function(error) {
                errorCallback(error.code);
            });
        }, function(error) {
            errorCallback(error.code);
        });
    },

    readAsDataURL: function(successCallback, errorCallback, args) {
        var uri = args[0];

        nativeResolveLocalFileSystemURI(uri, function(entry) {
            var onLoadEnd = function(evt) {
                    if (!evt.target.error) {
                        successCallback(evt.target.result);
                    }
            },
                onError = function(evt) {
                    errorCallback(evt.target.error.code);
            };

            var reader = new NativeFileReader();

            reader.onloadend = onLoadEnd;
            reader.onerror = onError;
            entry.file(function(file) {
                reader.readAsDataURL(file);
            }, function(error) {
                errorCallback(error.code);
            });
        }, function(error) {
            errorCallback(error.code);
        });
    },

    /* FileWriter */
    write: function(successCallback, errorCallback, args) {
        var uri = args[0],
            text = args[1],
            position = args[2];

        nativeResolveLocalFileSystemURI(uri, function(entry) {
            var onWriteEnd = function(evt) {
                    if(!evt.target.error) {
                        successCallback(evt.target.position - position);
                    } else {
                        errorCallback(evt.target.error.code);
                    }
            },
                onError = function(evt) {
                    errorCallback(evt.target.error.code);
            };

            entry.createWriter(function(writer) {
                var blob = new WebKitBlobBuilder();
                blob.append(text);

                writer.onwriteend = onWriteEnd;
                writer.onerror = onError;

                writer.seek(position);
                writer.write(blob.getBlob('text/plain'));
            }, function(error) {
                errorCallback(error.code);
            });
        }, function(error) {
            errorCallback(error.code);
        });
    },

    truncate: function(successCallback, errorCallback, args) {
        var uri = args[0],
            size = args[1];

        nativeResolveLocalFileSystemURI(uri, function(entry) {
            var onWriteEnd = function(evt) {
                    if(!evt.target.error) {
                        successCallback(evt.target.length);
                    } else {
                        errorCallback(evt.target.error.code);
                    }
            },
                onError = function(evt) {
                    errorCallback(evt.target.error.code);
            };

            entry.createWriter(function(writer) {
                writer.onwriteend = onWriteEnd;
                writer.onerror = onError;

                writer.truncate(size);
            }, function(error) {
                errorCallback(error.code);
            });
        }, function(error) {
            errorCallback(error.code);
        });
    }
};

});

// file: lib/tizen/plugin/tizen/FileTransfer.js
define("cordova/plugin/tizen/FileTransfer", function(require, exports, module) {

/*global WebKitBlobBuilder:false */
var FileEntry = require('cordova/plugin/FileEntry'),
    FileTransferError = require('cordova/plugin/FileTransferError'),
    FileUploadResult = require('cordova/plugin/FileUploadResult');

var nativeResolveLocalFileSystemURI = window.webkitResolveLocalFileSystemURL;

function getParentPath(filePath) {
    var pos = filePath.lastIndexOf('/');
    return filePath.substring(0, pos + 1);
}

function getFileName(filePath) {
    var pos = filePath.lastIndexOf('/');
    return filePath.substring(pos + 1);
}

module.exports = {
    upload: function(successCallback, errorCallback, args) {
        var filePath = args[0],
            server = args[1],
            fileKey = args[2],
            fileName = args[3],
            mimeType = args[4],
            params = args[5],
            /*trustAllHosts = args[6],*/
            chunkedMode = args[7];

        nativeResolveLocalFileSystemURI(filePath, function(entry) {
            entry.file(function(file) {
                function uploadFile(blobFile) {
                    var fd = new FormData();

                    fd.append(fileKey, blobFile, fileName);
                    for (var prop in params) {
                        if(params.hasOwnProperty(prop)) {
                            fd.append(prop, params[prop]);
                        }
                    }

                    var xhr = new XMLHttpRequest();
                    xhr.open("POST", server);
                    xhr.onload = function(evt) {
                        if (xhr.status == 200) {
                            var result = new FileUploadResult();
                            result.bytesSent = file.size;
                            result.responseCode = xhr.status;
                            result.response = xhr.response;
                            successCallback(result);
                        } else if (xhr.status == 404) {
                            errorCallback(new FileTransferError(FileTransferError.INVALID_URL_ERR));
                        } else {
                            errorCallback(new FileTransferError(FileTransferError.CONNECTION_ERR));
                        }
                    };
                    xhr.ontimeout = function(evt) {
                        errorCallback(new FileTransferError(FileTransferError.CONNECTION_ERR));
                    };

                    xhr.send(fd);
                }

                var bytesPerChunk;
                if (chunkedMode === true) {
                    bytesPerChunk = 1024 * 1024; // 1MB chunk sizes.
                } else {
                    bytesPerChunk = file.size;
                }
                var start = 0;
                var end = bytesPerChunk;
                while (start < file.size) {
                    var chunk = file.webkitSlice(start, end, mimeType);
                    uploadFile(chunk);
                    start = end;
                    end = start + bytesPerChunk;
                }
            },
            function(error) {
                errorCallback(new FileTransferError(FileTransferError.FILE_NOT_FOUND_ERR));
            }
            );
        },
        function(error) {
            errorCallback(new FileTransferError(FileTransferError.FILE_NOT_FOUND_ERR));
        }
        );
    },

    download: function(successCallback, errorCallback, args) {
        var url = args[0],
            filePath = args[1];

        var xhr = new XMLHttpRequest();

        function writeFile(fileEntry) {
            fileEntry.createWriter(function(writer) {
                writer.onwriteend = function(evt) {
                    if (!evt.target.error) {
                        successCallback(new FileEntry(fileEntry.name, fileEntry.toURL()));
                    } else {
                        errorCallback(new FileTransferError(FileTransferError.FILE_NOT_FOUND_ERR));
                    }
                };

                writer.onerror = function(evt) {
                    errorCallback(new FileTransferError(FileTransferError.FILE_NOT_FOUND_ERR));
                };

                var builder = new WebKitBlobBuilder();
                builder.append(xhr.response);
                var blob = builder.getBlob();
                writer.write(blob);
            },
            function(error) {
                errorCallback(new FileTransferError(FileTransferError.FILE_NOT_FOUND_ERR));
            });
        }

        xhr.onreadystatechange = function () {
            if (xhr.readyState == xhr.DONE) {
                if (xhr.status == 200 && xhr.response) {
                    nativeResolveLocalFileSystemURI(getParentPath(filePath), function(dir) {
                        dir.getFile(getFileName(filePath), {create: true}, writeFile, function(error) {
                            errorCallback(new FileTransferError(FileTransferError.FILE_NOT_FOUND_ERR));
                        });
                    }, function(error) {
                        errorCallback(new FileTransferError(FileTransferError.FILE_NOT_FOUND_ERR));
                    });
                } else if (xhr.status == 404) {
                    errorCallback(new FileTransferError(FileTransferError.INVALID_URL_ERR));
                } else {
                    errorCallback(new FileTransferError(FileTransferError.CONNECTION_ERR));
                }
            }
        };

        xhr.open("GET", url, true);
        xhr.responseType = "arraybuffer";
        xhr.send();
    }
};

});

// file: lib/tizen/plugin/tizen/Media.js
define("cordova/plugin/tizen/Media", function(require, exports, module) {

/*global Media:false, webkitURL:false */
var MediaError = require('cordova/plugin/MediaError'),
    audioObjects = {};

module.exports = {
    create: function (successCallback, errorCallback, args) {
        var id = args[0], src = args[1];
        console.log("media::create() - id =" + id + ", src =" + src);
        audioObjects[id] = new Audio(src);
        audioObjects[id].onStalledCB = function () {
            console.log("media::onStalled()");
             audioObjects[id].timer = window.setTimeout(function () {
                    audioObjects[id].pause();
                    if (audioObjects[id].currentTime !== 0)
                        audioObjects[id].currentTime = 0;
                    console.log("media::onStalled() - MEDIA_ERROR -> " + MediaError.MEDIA_ERR_ABORTED);
                    var err = new MediaError(MediaError.MEDIA_ERR_ABORTED, "Stalled");
                    Media.onStatus(id, Media.MEDIA_ERROR, err);
                }, 2000);
        };
        audioObjects[id].onEndedCB = function () {
            console.log("media::onEndedCB() - MEDIA_STATE -> MEDIA_STOPPED");
            Media.onStatus(id, Media.MEDIA_STATE, Media.MEDIA_STOPPED);
        };
        audioObjects[id].onErrorCB = function () {
            console.log("media::onErrorCB() - MEDIA_ERROR -> " + event.srcElement.error);
            Media.onStatus(id, Media.MEDIA_ERROR, event.srcElement.error);
        };
        audioObjects[id].onPlayCB = function () {
            console.log("media::onPlayCB() - MEDIA_STATE -> MEDIA_STARTING");
            Media.onStatus(id, Media.MEDIA_STATE, Media.MEDIA_STARTING);
        };
        audioObjects[id].onPlayingCB = function () {
            console.log("media::onPlayingCB() - MEDIA_STATE -> MEDIA_RUNNING");
            Media.onStatus(id, Media.MEDIA_STATE, Media.MEDIA_RUNNING);
        };
        audioObjects[id].onDurationChangeCB = function () {
            console.log("media::onDurationChangeCB() - MEDIA_DURATION -> " +  audioObjects[id].duration);
            Media.onStatus(id, Media.MEDIA_DURATION, audioObjects[id].duration);
        };
        audioObjects[id].onTimeUpdateCB = function () {
            console.log("media::onTimeUpdateCB() - MEDIA_POSITION -> " +  audioObjects[id].currentTime);
            Media.onStatus(id, Media.MEDIA_POSITION, audioObjects[id].currentTime);
        };
        audioObjects[id].onCanPlayCB = function () {
            console.log("media::onCanPlayCB()");
            window.clearTimeout(audioObjects[id].timer);
            audioObjects[id].play();
        };
      },
    startPlayingAudio: function (successCallback, errorCallback, args) {
        var id = args[0], src = args[1], options = args[2];
        console.log("media::startPlayingAudio() - id =" + id + ", src =" + src + ", options =" + options);
        audioObjects[id].addEventListener('canplay', audioObjects[id].onCanPlayCB);
        audioObjects[id].addEventListener('ended', audioObjects[id].onEndedCB);
        audioObjects[id].addEventListener('timeupdate', audioObjects[id].onTimeUpdateCB);
        audioObjects[id].addEventListener('durationchange', audioObjects[id].onDurationChangeCB);
        audioObjects[id].addEventListener('playing', audioObjects[id].onPlayingCB);
        audioObjects[id].addEventListener('play', audioObjects[id].onPlayCB);
        audioObjects[id].addEventListener('error', audioObjects[id].onErrorCB);
        audioObjects[id].addEventListener('stalled', audioObjects[id].onStalledCB);
        audioObjects[id].play();
    },
    stopPlayingAudio: function (successCallback, errorCallback, args) {
        var id = args[0];
        window.clearTimeout(audioObjects[id].timer);
        audioObjects[id].pause();
        if (audioObjects[id].currentTime !== 0)
            audioObjects[id].currentTime = 0;
        console.log("media::stopPlayingAudio() - MEDIA_STATE -> MEDIA_STOPPED");
        Media.onStatus(id, Media.MEDIA_STATE, Media.MEDIA_STOPPED);
        audioObjects[id].removeEventListener('canplay', audioObjects[id].onCanPlayCB);
        audioObjects[id].removeEventListener('ended', audioObjects[id].onEndedCB);
        audioObjects[id].removeEventListener('timeupdate', audioObjects[id].onTimeUpdateCB);
        audioObjects[id].removeEventListener('durationchange', audioObjects[id].onDurationChangeCB);
        audioObjects[id].removeEventListener('playing', audioObjects[id].onPlayingCB);
        audioObjects[id].removeEventListener('play', audioObjects[id].onPlayCB);
        audioObjects[id].removeEventListener('error', audioObjects[id].onErrorCB);
        audioObjects[id].removeEventListener('error', audioObjects[id].onStalledCB);
    },
    seekToAudio: function (successCallback, errorCallback, args) {
        var id = args[0], milliseconds = args[1];
        console.log("media::seekToAudio()");
         audioObjects[id].currentTime = milliseconds;
        successCallback( audioObjects[id].currentTime);
    },
    pausePlayingAudio: function (successCallback, errorCallback, args) {
        var id = args[0];
        console.log("media::pausePlayingAudio() - MEDIA_STATE -> MEDIA_PAUSED");
        audioObjects[id].pause();
        Media.onStatus(id, Media.MEDIA_STATE, Media.MEDIA_PAUSED);
    },
    getCurrentPositionAudio: function (successCallback, errorCallback, args) {
        var id = args[0];
        console.log("media::getCurrentPositionAudio()");
        successCallback(audioObjects[id].currentTime);
    },
    release: function (successCallback, errorCallback, args) {
        var id = args[0];
        window.clearTimeout(audioObjects[id].timer);
        console.log("media::release()");
    },
    setVolume: function (successCallback, errorCallback, args) {
        var id = args[0], volume = args[1];
        console.log("media::setVolume()");
        audioObjects[id].volume = volume;
    },
    startRecordingAudio: function (successCallback, errorCallback, args) {
        var id = args[0], src = args[1];
        console.log("media::startRecordingAudio() - id =" + id + ", src =" + src);

        function gotStreamCB(stream) {
            audioObjects[id].src = webkitURL.createObjectURL(stream);
            console.log("media::startRecordingAudio() - stream CB");
        }

        function gotStreamFailedCB(error) {
            console.log("media::startRecordingAudio() - error CB:" + error.toString());
        }

        if (navigator.webkitGetUserMedia) {
            audioObjects[id] = new Audio();
            navigator.webkitGetUserMedia('audio', gotStreamCB, gotStreamFailedCB);
        } else {
            console.log("webkitGetUserMedia not supported");
        }
        successCallback();
    },
    stopRecordingAudio: function (successCallback, errorCallback, args) {
        var id = args[0];
        console.log("media::stopRecordingAudio() - id =" + id);
        audioObjects[id].pause();
        successCallback();
    }
};

});

// file: lib/tizen/plugin/tizen/MediaError.js
define("cordova/plugin/tizen/MediaError", function(require, exports, module) {


// The MediaError object already exists on Tizen. This prevents the Cordova
// version from being defined. This object is used to merge in differences
// between Tizen and Cordova MediaError objects.
module.exports = {
        MEDIA_ERR_NONE_ACTIVE : 0,
        MEDIA_ERR_NONE_SUPPORTED : 4
};

});

// file: lib/tizen/plugin/tizen/NetworkStatus.js
define("cordova/plugin/tizen/NetworkStatus", function(require, exports, module) {

/*global tizen:false */
var Connection = require('cordova/plugin/Connection');

module.exports = {
    getConnectionInfo: function (successCallback, errorCallback) {
        var cncType = Connection.NONE;
        var infoCount = 0;

        function infoCB() {
            infoCount++;
            if (infoCount > 1)
               successCallback(cncType);
        }

        function errorCB(error) {
           console.log("Error: " + error.code + "," + error.name + "," + error.message);
           infoCB();
        }

        function wifiSuccessCB(wifi) {
            if ((wifi.status === "ON")  && (wifi.ipAddress.length !== 0))
                cncType = Connection.WIFI;
            infoCB();
        }

        function cellularSuccessCB(cell) {
            if ((cncType === Connection.NONE) && (cell.status === "ON") && (cell.ipAddress.length !== 0))
                cncType = Connection.CELL_2G;
            infoCB();
        }

        if (tizen.systeminfo.isSupported('WifiNetwork')) {
            tizen.systeminfo.getPropertyValue('WifiNetwork', wifiSuccessCB, errorCB);
        }

        if (tizen.systeminfo.isSupported('CellularNetwork')) {
            tizen.systeminfo.getPropertyValue('CellularNetwork', cellularSuccessCB, errorCB);
        }
    }
};

});

// file: lib/tizen/plugin/tizen/Notification.js
define("cordova/plugin/tizen/Notification", function(require, exports, module) {

var SoundBeat = require('cordova/plugin/tizen/SoundBeat');

/* TODO: get resource path from app environment? */
var soundBeat = new SoundBeat(["./sounds/beep.wav"]);

module.exports = {

    alert: function(message, alertCallback, title, buttonName) {
        return this.confirm(message, alertCallback, title, buttonName);
    },

    confirm: function(message, confirmCallback, title, buttonLabels) {
        var index            =    null,
            overlayElement    =    null,
            popup            =    null,
            element         =    null,
            titleString        =     null,
            messageString    =    null,
            buttonString    =    null,
            buttonsArray    =    null;


        console.log ("message" , message);
        console.log ("confirmCallback" , confirmCallback);
        console.log ("title" , title);
        console.log ("buttonLabels" , buttonLabels);

        titleString = '<div class="popup-title"><p>' + title + '</p></div>';
        messageString = '<div class="popup-text"><p>' + message + '</p></div>';
        buttonString = '<div class="popup-button-bg"><ul>';

        switch(typeof(buttonLabels))
        {
        case "string":
            buttonsArray = buttonLabels.split(",");

            if (buttonsArray === null) {
                buttonsArray = buttonLabels;
            }

            for (index in buttonsArray) {
                buttonString += '<li><input id="popup-button-' + buttonsArray[index]+
                                '" type="button" value="' + buttonsArray[index] + '" /></li>';
                console.log ("index: ", index,"");
                console.log ("buttonsArray[index]: ", buttonsArray[index]);
                console.log ("buttonString: ", buttonString);
            }
            break;

        case "array":
            if (buttonsArray === null) {
                buttonsArray = buttonLabels;
            }

            for (index in buttonsArray) {
                buttonString += '<li><input id="popup-button-' + buttonsArray[index]+
                                '" type="button" value="' + buttonsArray[index] + '" /></li>';
                console.log ("index: ", index,"");
                console.log ("buttonsArray[index]: ", buttonsArray[index]);
                console.log ("buttonString: ", buttonString);
            }
            break;
        default:
            console.log ("cordova/plugin/tizen/Notification, default, buttonLabels: ", buttonLabels);
            break;
        }

        buttonString += '</ul></div>';

        overlayElement = document.createElement("div");
        overlayElement.className = 'ui-popupwindow-screen';

        overlayElement.style.zIndex = 1001;
        overlayElement.style.width = "100%";
        overlayElement.style.height = "100%";
        overlayElement.style.top = 0;
        overlayElement.style.left = 0;
        overlayElement.style.margin = 0;
        overlayElement.style.padding = 0;
        overlayElement.style.position = "absolute";

        popup = document.createElement("div");
        popup.className = "ui-popupwindow";
        popup.style.position = "fixed";
        popup.style.zIndex = 1002;
        popup.innerHTML = titleString + messageString + buttonString;

        document.body.appendChild(overlayElement);
        document.body.appendChild(popup);

        function createListener(button) {
            return function() {
                document.body.removeChild(overlayElement);
                document.body.removeChild(popup);
                confirmCallback(button.value);
            };
        }

       for (index in buttonsArray) {
           console.log ("index: ", index);

           element = document.getElementById("popup-button-" + buttonsArray[index]);
           element.addEventListener("click", createListener(element), false);
       }
    },

    vibrate: function(milliseconds) {
        console.log ("milliseconds" , milliseconds);

        if (navigator.vibrate) {
            navigator.vibrate(milliseconds);
        }
        else {
            console.log ("cordova/plugin/tizen/Notification, vibrate API does not exist");
        }
    },

    beep: function(count) {
        console.log ("count" , count);
        soundBeat.play(count);
    }
};



});

// file: lib/tizen/plugin/tizen/SoundBeat.js
define("cordova/plugin/tizen/SoundBeat", function(require, exports, module) {

/*global webkitAudioContext:false */
/*
 *  SoundBeat
 * used by Notification Manager beep method
 *
 * This class provides sounds play
 *
 * uses W3C  Web Audio API
 * uses BufferLoader object
 *
 * NOTE: the W3C Web Audio doc tells we do not need to recreate the audio
 *       context to play a sound but only the audiosourcenode (createBufferSource)
 *       in the WebKit implementation we have to.
 *
 */

var BufferLoader = require('cordova/plugin/tizen/BufferLoader');

function SoundBeat(urlList) {
    this.context = null;
    this.urlList = urlList || null;
    this.buffers = null;
}

/*
 * This method play a loaded sounds on the Device
 * @param {Number} times Number of times to play loaded sounds.
 *
 */
SoundBeat.prototype.play = function(times) {

    var i = 0, sources = [], that = this;

    function finishedLoading (bufferList) {
        that.buffers = bufferList;

        for (i = 0; i < that.buffers.length ; i +=1) {
            if (that.context) {
                sources[i] = that.context.createBufferSource();

                sources[i].buffer = that.buffers[i];
                sources[i].connect (that.context.destination);

                sources[i].loop = true;
                sources[i].noteOn (0);
                sources[i].noteOff(sources[i].buffer.duration * times);
            }
        }
    }

    if (webkitAudioContext !== null) {
        this.context = new webkitAudioContext();
    }
    else {
        console.log ("SoundBeat.prototype.play, w3c web audio api not supported");
        this.context = null;
    }

    if (this.context === null) {
        console.log ("SoundBeat.prototype.play, cannot create audio context object");
        return;
    }

    this.bufferLoader = new BufferLoader (this.context, this.urlList, finishedLoading);
    if (this.bufferLoader === null) {
        console.log ("SoundBeat.prototype.play, cannot create buffer loader object");
        return;
    }

    this.bufferLoader.load();
};

module.exports = SoundBeat;

});

// file: lib/tizen/plugin/tizen/contacts.js
define("cordova/plugin/tizen/contacts", function(require, exports, module) {

/*global tizen:false */
var ContactError = require('cordova/plugin/ContactError'),
    utils = require('cordova/utils'),
    ContactUtils = require('cordova/plugin/tizen/ContactUtils');

module.exports = {
    /**
     * Returns an array of Contacts matching the search criteria.
     *
     * @return array of Contacts matching search criteria
     */
    find : function(fields, successCB, failCB, options) {

        // Success callback is required. Throw exception if not specified.
        if (typeof successCB !== 'function') {
            throw new TypeError("You must specify a success callback for the find command.");
        }

        // Search qualifier is required and cannot be empty.
        if (!fields || !(utils.isArray(fields)) || fields.length === 0) {
            if (typeof failCB === 'function') {
                failCB(new ContactError(ContactError.INVALID_ARGUMENT_ERROR));
            }
            return;
        }

        // options are optional
        var filter ="",
            multiple = false,
            contacts = [],
            tizenFilter = null;

        if (options) {
            filter = options.filter || "";
            multiple =  options.multiple || false;
        }

        if (filter){
            tizenFilter = ContactUtils.buildFilterExpression(fields, filter);
        }

        tizen.contact.getDefaultAddressBook().find(
            function(tizenContacts) {
                if (multiple) {
                    for (var index in tizenContacts) {
                        contacts.push(ContactUtils.createContact(tizenContacts[index], fields));
                    }
                }
                else {
                    contacts.push(ContactUtils.createContact(tizenContacts[0], fields));
                }

                // return results
                successCB(contacts);
            },
            function(error) {
                if (typeof failCB === 'function') {
                    failCB(ContactError.UNKNOWN_ERROR);
                }
            },
            tizenFilter,
            null);
    }
};

});

// file: lib/tizen/plugin/tizen/contacts/symbols.js
define("cordova/plugin/tizen/contacts/symbols", function(require, exports, module) {

require('cordova/plugin/contacts/symbols');

var modulemapper = require('cordova/modulemapper');

modulemapper.merges('cordova/plugin/tizen/contacts', 'navigator.contacts');
modulemapper.merges('cordova/plugin/tizen/Contact', 'Contact');

});

// file: lib/tizen/plugin/tizen/manager.js
define("cordova/plugin/tizen/manager", function(require, exports, module) {

var cordova = require('cordova');

module.exports = {
    exec: function (successCallback, errorCallback, clazz, action, args) {
        var plugin = require('cordova/plugin/tizen/' + clazz);

        if (plugin && typeof plugin[action] === 'function') {
            var result = plugin[action](successCallback, errorCallback, args);
            return result || {status: cordova.callbackStatus.NO_RESULT};
        }

        return {"status" : cordova.callbackStatus.CLASS_NOT_FOUND_EXCEPTION, "message" : "Function " + clazz + "::" + action + " cannot be found"};
    },
    resume: function () {},
    pause: function () {},
    destroy: function () {}
};

});

// file: lib/blackberry/plugin/webworks/accelerometer.js
define("cordova/plugin/webworks/accelerometer", function(require, exports, module) {

var cordova = require('cordova'),
    callback;

module.exports = {
    start: function (args, win, fail) {
        window.removeEventListener("devicemotion", callback);
        callback = function (motion) {
            win({
                x: motion.accelerationIncludingGravity.x,
                y: motion.accelerationIncludingGravity.y,
                z: motion.accelerationIncludingGravity.z,
                timestamp: motion.timestamp
            });
        };
        window.addEventListener("devicemotion", callback);
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "WebWorks Is On It" };
    },
    stop: function (args, win, fail) {
        window.removeEventListener("devicemotion", callback);
        return { "status" : cordova.callbackStatus.OK, "message" : "removed" };
    }
};

});

// file: lib/blackberry/plugin/webworks/logger.js
define("cordova/plugin/webworks/logger", function(require, exports, module) {

var cordova = require('cordova');

module.exports = {
    log: function (args, win, fail) {
        console.log(args);
        return {"status" : cordova.callbackStatus.OK,
                "message" : 'Message logged to console: ' + args};
    }
};

});

// file: lib/blackberry/plugin/webworks/media.js
define("cordova/plugin/webworks/media", function(require, exports, module) {

var cordova = require('cordova'),
    audioObjects = {};

module.exports = {
    create: function (args, win, fail) {
        if (!args.length) {
            return {"status" : 9, "message" : "Media Object id was not sent in arguments"};
        }

        var id = args[0],
            src = args[1];

        if (typeof src == "undefined"){
            audioObjects[id] = new Audio();
        } else {
            audioObjects[id] = new Audio(src);
        }

        return {"status" : 1, "message" : "Audio object created" };
    },
    startPlayingAudio: function (args, win, fail) {
        if (!args.length) {
            return {"status" : 9, "message" : "Media Object id was not sent in arguments"};
        }

        var id = args[0],
            audio = audioObjects[id],
            result;

        if (args.length === 1 || typeof args[1] == "undefined" ) {
            return {"status" : 9, "message" : "Media source argument not found"};
        }

        if (audio) {
            audio.pause();
            audioObjects[id] = undefined;
        }

        audio = audioObjects[id] = new Audio(args[1]);
        audio.play();
        return {"status" : 1, "message" : "Audio play started" };
    },
    stopPlayingAudio: function (args, win, fail) {
        if (!args.length) {
            return {"status" : 9, "message" : "Media Object id was not sent in arguments"};
        }

        var id = args[0],
            audio = audioObjects[id],
            result;

        if (!audio) {
            return {"status" : 2, "message" : "Audio Object has not been initialized"};
        }

        audio.pause();
        audioObjects[id] = undefined;

        return {"status" : 1, "message" : "Audio play stopped" };
    },
    seekToAudio: function (args, win, fail) {
        if (!args.length) {
            return {"status" : 9, "message" : "Media Object id was not sent in arguments"};
        }

        var id = args[0],
            audio = audioObjects[id],
            result;

        if (!audio) {
            result = {"status" : 2, "message" : "Audio Object has not been initialized"};
        } else if (args.length === 1) {
            result = {"status" : 9, "message" : "Media seek time argument not found"};
        } else {
            try {
                audio.currentTime = args[1];
            } catch (e) {
                console.log('Error seeking audio: ' + e);
                return {"status" : 3, "message" : "Error seeking audio: " + e};
            }

            result = {"status" : 1, "message" : "Seek to audio succeeded" };
        }
        return result;
    },
    pausePlayingAudio: function (args, win, fail) {
        if (!args.length) {
            return {"status" : 9, "message" : "Media Object id was not sent in arguments"};
        }

        var id = args[0],
            audio = audioObjects[id],
            result;

        if (!audio) {
            return {"status" : 2, "message" : "Audio Object has not been initialized"};
        }

        audio.pause();

        return {"status" : 1, "message" : "Audio paused" };
    },
    getCurrentPositionAudio: function (args, win, fail) {
        if (!args.length) {
            return {"status" : 9, "message" : "Media Object id was not sent in arguments"};
        }

        var id = args[0],
            audio = audioObjects[id],
            result;

        if (!audio) {
            return {"status" : 2, "message" : "Audio Object has not been initialized"};
        }

        return {"status" : 1, "message" : audio.currentTime };
    },
    getDuration: function (args, win, fail) {
        if (!args.length) {
            return {"status" : 9, "message" : "Media Object id was not sent in arguments"};
        }

        var id = args[0],
            audio = audioObjects[id],
            result;

        if (!audio) {
            return {"status" : 2, "message" : "Audio Object has not been initialized"};
        }

        return {"status" : 1, "message" : audio.duration };
    },
    startRecordingAudio: function (args, win, fail) {
        if (!args.length) {
            return {"status" : 9, "message" : "Media Object id was not sent in arguments"};
        }

        if (args.length <= 1) {
            return {"status" : 9, "message" : "Media start recording, insufficient arguments"};
        }

        blackberry.media.microphone.record(args[1], win, fail);
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "WebWorks Is On It" };
    },
    stopRecordingAudio: function (args, win, fail) {
    },
    release: function (args, win, fail) {
        if (!args.length) {
            return {"status" : 9, "message" : "Media Object id was not sent in arguments"};
        }

        var id = args[0],
            audio = audioObjects[id],
            result;

        if (audio) {
            if(audio.src !== ""){
                audio.src = undefined;
            }
            audioObjects[id] = undefined;
            //delete audio;
        }

        result = {"status" : 1, "message" : "Media resources released"};

        return result;
    }
};

});

// file: lib/blackberry/plugin/webworks/notification.js
define("cordova/plugin/webworks/notification", function(require, exports, module) {

var cordova = require('cordova');

module.exports = {
    alert: function (args, win, fail) {
        if (args.length !== 3) {
            return {"status" : 9, "message" : "Notification action - alert arguments not found"};
        }

        //Unpack and map the args
        var msg = args[0],
            title = args[1],
            btnLabel = args[2];

        blackberry.ui.dialog.customAskAsync.apply(this, [ msg, [ btnLabel ], win, { "title" : title } ]);
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "WebWorks Is On It" };
    },
    confirm: function (args, win, fail) {
        if (args.length !== 3) {
            return {"status" : 9, "message" : "Notification action - confirm arguments not found"};
        }

        //Unpack and map the args
        var msg = args[0],
            title = args[1],
            btnLabel = args[2],
            btnLabels = btnLabel.split(",");

        blackberry.ui.dialog.customAskAsync.apply(this, [msg, btnLabels, win, {"title" : title} ]);
        return { "status" : cordova.callbackStatus.NO_RESULT, "message" : "WebWorks Is On It" };
    }
};

});

// file: lib/windows8/plugin/windows8/AccelerometerProxy.js
define("cordova/plugin/windows8/AccelerometerProxy", function(require, exports, module) {

/*global Windows:true */

var cordova = require('cordova'),
    Acceleration = require('cordova/plugin/Acceleration');

/* This is the actual implementation part that returns the result on Windows 8
*/

module.exports = {
    onDataChanged:null,
    start:function(win,lose){

        var accel = Windows.Devices.Sensors.Accelerometer.getDefault();
        if(!accel) {
            lose && lose("No accelerometer found");
        }
        else {
            var self = this;
            accel.reportInterval = Math.max(16,accel.minimumReportInterval);

            // store our bound function
            this.onDataChanged = function(e) {
                var a = e.reading;
                win(new Acceleration(a.accelerationX,a.accelerationY,a.accelerationZ));
            };
            accel.addEventListener("readingchanged",this.onDataChanged);

            setTimeout(function(){
                var a = accel.getCurrentReading();
                win(new Acceleration(a.accelerationX,a.accelerationY,a.accelerationZ));
            },0); // async do later
        }
    },
    stop:function(win,lose){
        win = win || function(){};
        var accel = Windows.Devices.Sensors.Accelerometer.getDefault();
        if(!accel) {
            lose && lose("No accelerometer found");
        }
        else {
            accel.removeEventListener("readingchanged",this.onDataChanged);
            this.onDataChanged = null;
            accel.reportInterval = 0; // back to the default
            win();
        }
    }
};

require("cordova/commandProxy").add("Accelerometer",module.exports);
});

// file: lib/windows8/plugin/windows8/CameraProxy.js
define("cordova/plugin/windows8/CameraProxy", function(require, exports, module) {

/*global Windows:true, URL:true */


var cordova = require('cordova'),
    Camera = require('cordova/plugin/CameraConstants'),
    FileEntry = require('cordova/plugin/FileEntry'),
    FileError = require('cordova/plugin/FileError'),
    FileReader = require('cordova/plugin/FileReader');

module.exports = {

    // args will contain :
    //  ...  it is an array, so be careful
    // 0 quality:50,
    // 1 destinationType:Camera.DestinationType.FILE_URI,
    // 2 sourceType:Camera.PictureSourceType.CAMERA,
    // 3 targetWidth:-1,
    // 4 targetHeight:-1,
    // 5 encodingType:Camera.EncodingType.JPEG,
    // 6 mediaType:Camera.MediaType.PICTURE,
    // 7 allowEdit:false,
    // 8 correctOrientation:false,
    // 9 saveToPhotoAlbum:false,
    // 10 popoverOptions:null

    takePicture: function (successCallback, errorCallback, args) {
        var encodingType = args[5];
        var targetWidth = args[3];
        var targetHeight = args[4];
        var sourceType = args[2];
        var destinationType = args[1];
        var mediaType = args[6];
        var saveToPhotoAlbum = args[9];

        var pkg = Windows.ApplicationModel.Package.current;
        var packageId = pkg.installedLocation;

        var fail = function (fileError) {
            errorCallback("FileError, code:" + fileError.code);
        };

        // resize method :)
        var resizeImage = function (file) {
            var tempPhotoFileName = "";
            if (encodingType == Camera.EncodingType.PNG) {
                tempPhotoFileName = "camera_cordova_temp_return.png";
            } else {
                tempPhotoFileName = "camera_cordova_temp_return.jpg";
            }
            var imgObj = new Image();
            var success = function (fileEntry) {
                var successCB = function (filePhoto) {
                    var fileType = file.contentType,
                        reader = new FileReader();
                    reader.onloadend = function () {
                        var image = new Image();
                        image.src = reader.result;
                        image.onload = function () {
                            var imageWidth = targetWidth,
                                imageHeight = targetHeight;
                            var canvas = document.createElement('canvas');

                            canvas.width = imageWidth;
                            canvas.height = imageHeight;

                            var ctx = canvas.getContext("2d");
                            ctx.drawImage(this, 0, 0, imageWidth, imageHeight);

                            // The resized file ready for upload
                            var _blob = canvas.msToBlob();
                            var _stream = _blob.msDetachStream();
                            Windows.Storage.StorageFolder.getFolderFromPathAsync(packageId.path).done(function (storageFolder) {
                                storageFolder.createFileAsync(tempPhotoFileName, Windows.Storage.CreationCollisionOption.generateUniqueName).done(function (file) {
                                    file.openAsync(Windows.Storage.FileAccessMode.readWrite).done(function (fileStream) {
                                        Windows.Storage.Streams.RandomAccessStream.copyAndCloseAsync(_stream, fileStream).done(function () {
                                            var _imageUrl = URL.createObjectURL(file);
                                            successCallback(_imageUrl);
                                        }, function () { errorCallback("Resize picture error."); });
                                    }, function () { errorCallback("Resize picture error."); });
                                }, function () { errorCallback("Resize picture error."); });
                            });
                        };
                    };

                    reader.readAsDataURL(filePhoto);
                };

                var failCB = function () {
                    errorCallback("File not found.");
                };
                fileEntry.file(successCB, failCB);
            };

            Windows.Storage.StorageFolder.getFolderFromPathAsync(packageId.path).done(function (storageFolder) {
                file.copyAsync(storageFolder, file.name, Windows.Storage.NameCollisionOption.replaceExisting).then(function (storageFile) {
                    success(new FileEntry(storageFile.name, storageFile.path));
                }, function () {
                    fail(FileError.INVALID_MODIFICATION_ERR);
                }, function () {
                    errorCallback("Folder not access.");
                });
            });

        };

        // because of asynchronous method, so let the successCallback be called in it.
        var resizeImageBase64 = function (file) {
            var imgObj = new Image();
            var success = function (fileEntry) {
                var successCB = function (filePhoto) {
                    var fileType = file.contentType,
                        reader = new FileReader();
                    reader.onloadend = function () {
                        var image = new Image();
                        image.src = reader.result;

                        image.onload = function () {
                            var imageWidth = targetWidth,
                                imageHeight = targetHeight;
                            var canvas = document.createElement('canvas');

                            canvas.width = imageWidth;
                            canvas.height = imageHeight;

                            var ctx = canvas.getContext("2d");
                            ctx.drawImage(this, 0, 0, imageWidth, imageHeight);

                            // The resized file ready for upload
                            var finalFile = canvas.toDataURL(fileType);

                            // Remove the prefix such as "data:" + contentType + ";base64," , in order to meet the Cordova API.
                            var arr = finalFile.split(",");
                            var newStr = finalFile.substr(arr[0].length + 1);
                            successCallback(newStr);
                        };
                    };

                    reader.readAsDataURL(filePhoto);

                };
                var failCB = function () {
                    errorCallback("File not found.");
                };
                fileEntry.file(successCB, failCB);
            };

            Windows.Storage.StorageFolder.getFolderFromPathAsync(packageId.path).done(function (storageFolder) {
                file.copyAsync(storageFolder, file.name, Windows.Storage.NameCollisionOption.replaceExisting).then(function (storageFile) {
                    success(new FileEntry(storageFile.name, storageFile.path));
                }, function () {
                    fail(FileError.INVALID_MODIFICATION_ERR);
                }, function () {
                    errorCallback("Folder not access.");
                });
            });

        };

        if (sourceType != Camera.PictureSourceType.CAMERA) {
            var fileOpenPicker = new Windows.Storage.Pickers.FileOpenPicker();
            fileOpenPicker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.picturesLibrary;
            if (mediaType == Camera.MediaType.PICTURE) {
                fileOpenPicker.fileTypeFilter.replaceAll([".png", ".jpg", ".jpeg"]);
            } else if (mediaType == Camera.MediaType.VIDEO) {
                fileOpenPicker.fileTypeFilter.replaceAll([".avi", ".flv", ".asx", ".asf", ".mov", ".mp4", ".mpg", ".rm", ".srt", ".swf", ".wmv", ".vob"]);
            } else {
                fileOpenPicker.fileTypeFilter.replaceAll(["*"]);
            }

            fileOpenPicker.pickSingleFileAsync().then(function (file) {
                if (file) {
                    if (destinationType == Camera.DestinationType.FILE_URI) {
                        if (targetHeight > 0 && targetWidth > 0) {
                            resizeImage(file);
                        } else {
                            Windows.Storage.StorageFolder.getFolderFromPathAsync(packageId.path).done(function (storageFolder) {
                                file.copyAsync(storageFolder, file.name, Windows.Storage.NameCollisionOption.replaceExisting).then(function (storageFile) {
                                    var _imageUrl = URL.createObjectURL(storageFile);
                                    successCallback(_imageUrl);
                                }, function () {
                                    fail(FileError.INVALID_MODIFICATION_ERR);
                                }, function () {
                                    errorCallback("Folder not access.");
                                });
                            });

                        }
                    }
                    else {
                        if (targetHeight > 0 && targetWidth > 0) {
                            resizeImageBase64(file);
                        } else {
                            Windows.Storage.FileIO.readBufferAsync(file).done(function (buffer) {
                                var strBase64 = Windows.Security.Cryptography.CryptographicBuffer.encodeToBase64String(buffer);
                                successCallback(strBase64);
                            });
                        }

                    }

                } else {
                    errorCallback("User didn't choose a file.");
                }
            }, function () {
                errorCallback("User didn't choose a file.");
            });
        }
        else {

            var cameraCaptureUI = new Windows.Media.Capture.CameraCaptureUI();
            cameraCaptureUI.photoSettings.allowCropping = true;
            var allowCrop = !!args[7];
            if (!allowCrop) {
                cameraCaptureUI.photoSettings.allowCropping = false;
            }

            if (encodingType == Camera.EncodingType.PNG) {
                cameraCaptureUI.photoSettings.format = Windows.Media.Capture.CameraCaptureUIPhotoFormat.png;
            } else {
                cameraCaptureUI.photoSettings.format = Windows.Media.Capture.CameraCaptureUIPhotoFormat.jpeg;
            }
            // decide which max pixels should be supported by targetWidth or targetHeight.
            if (targetWidth >= 1280 || targetHeight >= 960) {
                cameraCaptureUI.photoSettings.maxResolution = Windows.Media.Capture.CameraCaptureUIMaxPhotoResolution.large3M;
            } else if (targetWidth >= 1024 || targetHeight >= 768) {
                cameraCaptureUI.photoSettings.maxResolution = Windows.Media.Capture.CameraCaptureUIMaxPhotoResolution.mediumXga;
            } else if (targetWidth >= 800 || targetHeight >= 600) {
                cameraCaptureUI.photoSettings.maxResolution = Windows.Media.Capture.CameraCaptureUIMaxPhotoResolution.mediumXga;
            } else if (targetWidth >= 640 || targetHeight >= 480) {
                cameraCaptureUI.photoSettings.maxResolution = Windows.Media.Capture.CameraCaptureUIMaxPhotoResolution.smallVga;
            } else if (targetWidth >= 320 || targetHeight >= 240) {
                cameraCaptureUI.photoSettings.maxResolution = Windows.Media.Capture.CameraCaptureUIMaxPhotoResolution.verySmallQvga;
            } else {
                cameraCaptureUI.photoSettings.maxResolution = Windows.Media.Capture.CameraCaptureUIMaxPhotoResolution.highestAvailable;
            }

            cameraCaptureUI.captureFileAsync(Windows.Media.Capture.CameraCaptureUIMode.photo).then(function (picture) {
                if (picture) {
                    // save to photo album successCallback
                    var success = function (fileEntry) {
                        if (destinationType == Camera.DestinationType.FILE_URI) {
                            if (targetHeight > 0 && targetWidth > 0) {
                                resizeImage(picture);
                            } else {
                                Windows.Storage.StorageFolder.getFolderFromPathAsync(packageId.path).done(function (storageFolder) {
                                    picture.copyAsync(storageFolder, picture.name, Windows.Storage.NameCollisionOption.replaceExisting).then(function (storageFile) {
                                        var _imageUrl = URL.createObjectURL(storageFile);
                                        successCallback(_imageUrl);
                                    }, function () {
                                        fail(FileError.INVALID_MODIFICATION_ERR);
                                    }, function () {
                                        errorCallback("Folder not access.");
                                    });
                                });
                            }
                        } else {
                            if (targetHeight > 0 && targetWidth > 0) {
                                resizeImageBase64(picture);
                            } else {
                                Windows.Storage.FileIO.readBufferAsync(picture).done(function (buffer) {
                                    var strBase64 = Windows.Security.Cryptography.CryptographicBuffer.encodeToBase64String(buffer);
                                    successCallback(strBase64);
                                });
                            }
                        }
                    };
                    // save to photo album errorCallback
                    var fail = function () {
                        //errorCallback("FileError, code:" + fileError.code);
                        errorCallback("Save fail.");
                    };

                    if (saveToPhotoAlbum) {
                        Windows.Storage.StorageFile.getFileFromPathAsync(picture.path).then(function (storageFile) {
                            storageFile.copyAsync(Windows.Storage.KnownFolders.picturesLibrary, picture.name, Windows.Storage.NameCollisionOption.generateUniqueName).then(function (storageFile) {
                                success(storageFile);
                            }, function () {
                                fail();
                            });
                        });
                        //var directory = new DirectoryEntry("Pictures", parentPath);
                        //new FileEntry(picture.name, picture.path).copyTo(directory, null, success, fail);
                    } else {
                        if (destinationType == Camera.DestinationType.FILE_URI) {
                            if (targetHeight > 0 && targetWidth > 0) {
                                resizeImage(picture);
                            } else {
                                Windows.Storage.StorageFolder.getFolderFromPathAsync(packageId.path).done(function (storageFolder) {
                                    picture.copyAsync(storageFolder, picture.name, Windows.Storage.NameCollisionOption.replaceExisting).then(function (storageFile) {
                                        var _imageUrl = URL.createObjectURL(storageFile);
                                        successCallback(_imageUrl);
                                    }, function () {
                                        fail(FileError.INVALID_MODIFICATION_ERR);
                                    }, function () {
                                        errorCallback("Folder not access.");
                                    });
                                });
                            }
                        } else {
                            if (targetHeight > 0 && targetWidth > 0) {
                                resizeImageBase64(picture);
                            } else {
                                Windows.Storage.FileIO.readBufferAsync(picture).done(function (buffer) {
                                    var strBase64 = Windows.Security.Cryptography.CryptographicBuffer.encodeToBase64String(buffer);
                                    successCallback(strBase64);
                                });
                            }
                        }
                    }
                } else {
                    errorCallback("User didn't capture a photo.");
                }
            }, function () {
                errorCallback("Fail to capture a photo.");
            });
        }
    }
};

require("cordova/commandProxy").add("Camera",module.exports);

});

// file: lib/windows8/plugin/windows8/CaptureProxy.js
define("cordova/plugin/windows8/CaptureProxy", function(require, exports, module) {

/*global Windows:true */

var MediaFile = require('cordova/plugin/MediaFile');
var CaptureError = require('cordova/plugin/CaptureError');
var CaptureAudioOptions = require('cordova/plugin/CaptureAudioOptions');
var CaptureImageOptions = require('cordova/plugin/CaptureImageOptions');
var CaptureVideoOptions = require('cordova/plugin/CaptureVideoOptions');
var MediaFileData = require('cordova/plugin/MediaFileData');

module.exports = {

    captureAudio:function(successCallback, errorCallback, args) {
        var options = args[0];

        var audioOptions = new CaptureAudioOptions();
        if (typeof(options.duration) == 'undefined') {
            audioOptions.duration = 3600; // Arbitrary amount, need to change later
        } else if (options.duration > 0) {
            audioOptions.duration = options.duration;
        } else {
            errorCallback(new CaptureError(CaptureError.CAPTURE_INVALID_ARGUMENT));
            return;
        }

        var cameraCaptureAudioDuration = audioOptions.duration;
        var mediaCaptureSettings;
        var initCaptureSettings = function () {
            mediaCaptureSettings = null;
            mediaCaptureSettings = new Windows.Media.Capture.MediaCaptureInitializationSettings();
            mediaCaptureSettings.streamingCaptureMode = Windows.Media.Capture.StreamingCaptureMode.audio;
        };

        initCaptureSettings();
        var mediaCapture = new Windows.Media.Capture.MediaCapture();
        mediaCapture.initializeAsync(mediaCaptureSettings).done(function () {
            Windows.Storage.KnownFolders.musicLibrary.createFileAsync("captureAudio.mp3", Windows.Storage.NameCollisionOption.generateUniqueName).then(function (storageFile) {
                var mediaEncodingProfile = new Windows.Media.MediaProperties.MediaEncodingProfile.createMp3(Windows.Media.MediaProperties.AudioEncodingQuality.auto);
                var stopRecord = function () {
                    mediaCapture.stopRecordAsync().then(function (result) {
                        storageFile.getBasicPropertiesAsync().then(function (basicProperties) {
                            var results = [];
                            results.push(new MediaFile(storageFile.name, storageFile.path, storageFile.contentType, basicProperties.dateModified, basicProperties.size));
                            successCallback(results);
                        }, function () {
                            errorCallback(new CaptureError(CaptureError.CAPTURE_NO_MEDIA_FILES));
                        });
                    }, function () { errorCallback(new CaptureError(CaptureError.CAPTURE_NO_MEDIA_FILES)); });
                };
                mediaCapture.startRecordToStorageFileAsync(mediaEncodingProfile, storageFile).then(function () {
                    setTimeout(stopRecord, cameraCaptureAudioDuration * 1000);
                }, function () { errorCallback(new CaptureError(CaptureError.CAPTURE_NO_MEDIA_FILES)); });
            }, function () { errorCallback(new CaptureError(CaptureError.CAPTURE_NO_MEDIA_FILES)); });
        });
    },

    captureImage:function (successCallback, errorCallback, args) {
        var options = args[0];
        var imageOptions = new CaptureImageOptions();
        var cameraCaptureUI = new Windows.Media.Capture.CameraCaptureUI();
        cameraCaptureUI.photoSettings.allowCropping = true;
        cameraCaptureUI.photoSettings.maxResolution = Windows.Media.Capture.CameraCaptureUIMaxPhotoResolution.highestAvailable;
        cameraCaptureUI.photoSettings.format = Windows.Media.Capture.CameraCaptureUIPhotoFormat.jpeg;
        cameraCaptureUI.captureFileAsync(Windows.Media.Capture.CameraCaptureUIMode.photo).then(function (file) {
            file.moveAsync(Windows.Storage.KnownFolders.picturesLibrary, "cameraCaptureImage.jpg", Windows.Storage.NameCollisionOption.generateUniqueName).then(function () {
                file.getBasicPropertiesAsync().then(function (basicProperties) {
                    var results = [];
                    results.push(new MediaFile(file.name, file.path, file.contentType, basicProperties.dateModified, basicProperties.size));
                    successCallback(results);
                }, function () {
                    errorCallback(new CaptureError(CaptureError.CAPTURE_NO_MEDIA_FILES));
                });
            }, function () {
                errorCallback(new CaptureError(CaptureError.CAPTURE_NO_MEDIA_FILES));
            });
        }, function () { errorCallback(new CaptureError(CaptureError.CAPTURE_NO_MEDIA_FILES)); });
    },

    captureVideo:function (successCallback, errorCallback, args) {
        var options = args[0];
        var videoOptions = new CaptureVideoOptions();
        if (options.duration && options.duration > 0) {
            videoOptions.duration = options.duration;
        }
        if (options.limit > 1) {
            videoOptions.limit = options.limit;
        }
        var cameraCaptureUI = new Windows.Media.Capture.CameraCaptureUI();
        cameraCaptureUI.videoSettings.allowTrimming = true;
        cameraCaptureUI.videoSettings.format = Windows.Media.Capture.CameraCaptureUIVideoFormat.mp4;
        cameraCaptureUI.videoSettings.maxDurationInSeconds = videoOptions.duration;
        cameraCaptureUI.captureFileAsync(Windows.Media.Capture.CameraCaptureUIMode.video).then(function (file) {
            file.moveAsync(Windows.Storage.KnownFolders.videosLibrary, "cameraCaptureVedio.mp4", Windows.Storage.NameCollisionOption.generateUniqueName).then(function () {
                file.getBasicPropertiesAsync().then(function (basicProperties) {
                    var results = [];
                    results.push(new MediaFile(file.name, file.path, file.contentType, basicProperties.dateModified, basicProperties.size));
                    successCallback(results);
                }, function () {
                    errorCallback(new CaptureError(CaptureError.CAPTURE_NO_MEDIA_FILES));
                });
            }, function () {
                errorCallback(new CaptureError(CaptureError.CAPTURE_NO_MEDIA_FILES));
            });
        }, function () { errorCallback(new CaptureError(CaptureError.CAPTURE_NO_MEDIA_FILES)); });

    },

    getFormatData: function (successCallback, errorCallback, args) {
        Windows.Storage.StorageFile.getFileFromPathAsync(args[0]).then(
            function (storageFile) {
                var mediaTypeFlag = String(storageFile.contentType).split("/")[0].toLowerCase();
                if (mediaTypeFlag === "audio") {
                    storageFile.properties.getMusicPropertiesAsync().then(function (audioProperties) {
                        successCallback(new MediaFileData(null, audioProperties.bitrate, 0, 0, audioProperties.duration / 1000));
                    }, function () {
                        errorCallback(new CaptureError(CaptureError.CAPTURE_INVALID_ARGUMENT));
                    });
                }
                else if (mediaTypeFlag === "video") {
                    storageFile.properties.getVideoPropertiesAsync().then(function (videoProperties) {
                        successCallback(new MediaFileData(null, videoProperties.bitrate, videoProperties.height, videoProperties.width, videoProperties.duration / 1000));
                    }, function () {
                        errorCallback(new CaptureError(CaptureError.CAPTURE_INVALID_ARGUMENT));
                    });
                }
                else if (mediaTypeFlag === "image") {
                    storageFile.properties.getImagePropertiesAsync().then(function (imageProperties) {
                        successCallback(new MediaFileData(null, 0, imageProperties.height, imageProperties.width, 0));
                    }, function () {
                        errorCallback(new CaptureError(CaptureError.CAPTURE_INVALID_ARGUMENT));
                    });
                }
                else { errorCallback(new CaptureError(CaptureError.CAPTURE_INVALID_ARGUMENT)); }
            }, function () {
                errorCallback(new CaptureError(CaptureError.CAPTURE_INVALID_ARGUMENT));
            }
        );
    }
};

require("cordova/commandProxy").add("Capture",module.exports);
});

// file: lib/windows8/plugin/windows8/CompassProxy.js
define("cordova/plugin/windows8/CompassProxy", function(require, exports, module) {

/*global Windows:true */

var cordova = require('cordova'),
    CompassHeading = require('cordova/plugin/CompassHeading');


module.exports = {

    onReadingChanged:null,
    getHeading:function(win,lose) {
        var deviceCompass = Windows.Devices.Sensors.Compass.getDefault();
        if(!deviceCompass) {
            setTimeout(function(){lose("Compass not available");},0);
        }
        else {

            deviceCompass.reportInterval = Math.max(16,deviceCompass.minimumReportInterval);

            this.onReadingChanged = function(e) {
                var reading = e.reading;
                var heading = new CompassHeading(reading.headingMagneticNorth, reading.headingTrueNorth);
                win(heading);
            };
            deviceCompass.addEventListener("readingchanged",this.onReadingChanged);
        }

    },
    stopHeading:function(win,lose) {
        var deviceCompass = Windows.Devices.Sensors.Compass.getDefault();
        if(!deviceCompass) {
            setTimeout(function(){lose("Compass not available");},0);
        }
        else {

            deviceCompass.removeEventListener("readingchanged",this.onReadingChanged);
            this.onReadingChanged = null;
            deviceCompass.reportInterval = 0;
            win();
        }

    }
};

require("cordova/commandProxy").add("Compass",module.exports);
});

// file: lib/windows8/plugin/windows8/ContactsProxy.js
define("cordova/plugin/windows8/ContactsProxy", function(require, exports, module) {

var cordova = require('cordova');

module.exports = {
    search: function (win, fail, args) {
        var fields = args[0];
        var options = args[1];
        var picker = Windows.ApplicationModel.Contacts.ContactPicker();
        picker.commitButtonText = "Select";
        picker.selectionMode = Windows.ApplicationModel.Contacts.ContactSelectionMode.contacts;

        picker.desiredFields.push.apply(picker.desiredFields, fields);

        if (options.multiple) {
            picker.pickMultipleContactsAsync().then(function (contacts) {
                win(contacts);
            });
        }
        else {
            picker.pickSingleContactAsync().then(function (contact) {
                win([contact]);
            });
        }
    }

};

require("cordova/commandProxy").add("Contacts",module.exports);
});

// file: lib/windows8/plugin/windows8/DeviceProxy.js
define("cordova/plugin/windows8/DeviceProxy", function(require, exports, module) {

var cordova = require('cordova');
var utils = require('cordova/utils');
var FileError = require('cordova/plugin/FileError');


module.exports = {

    getDeviceInfo:function(win,fail,args) {
        //console.log("NativeProxy::getDeviceInfo");
        var hostNames = Windows.Networking.Connectivity.NetworkInformation.getHostNames();

        var name = "unknown";
        hostNames.some(function (nm) {
            if (nm.displayName.indexOf(".local") > -1) {
                name = nm.displayName.split(".local")[0];
                return true;
            }
        });

        // deviceId aka uuid, stored in Windows.Storage.ApplicationData.current.localSettings.values.deviceId
        var deviceId;
        var localSettings = Windows.Storage.ApplicationData.current.localSettings;

        if (localSettings.values.deviceId) {
            deviceId = localSettings.values.deviceId;
        }
        else {
            deviceId = localSettings.values.deviceId = utils.createUUID();
        }

        setTimeout(function () {
            win({ platform: "windows8", version: "8", name: name, uuid: deviceId, cordova: "2.7.0" });
        }, 0);
    }

};

require("cordova/commandProxy").add("Device",module.exports);

});

// file: lib/windows8/plugin/windows8/FileProxy.js
define("cordova/plugin/windows8/FileProxy", function(require, exports, module) {

var cordova = require('cordova');
var Entry = require('cordova/plugin/Entry'),
    File = require('cordova/plugin/File'),
    FileEntry = require('cordova/plugin/FileEntry'),
    FileError = require('cordova/plugin/FileError'),
    DirectoryEntry = require('cordova/plugin/DirectoryEntry'),
    Flags = require('cordova/plugin/Flags'),
    FileSystem = require('cordova/plugin/FileSystem'),
    LocalFileSystem = require('cordova/plugin/LocalFileSystem');

module.exports = {

    getFileMetadata:function(win,fail,args) {
        var fullPath = args[0];

        Windows.Storage.StorageFile.getFileFromPathAsync(fullPath).done(
            function (storageFile) {
                storageFile.getBasicPropertiesAsync().then(
                    function (basicProperties) {
                        win(new File(storageFile.name, storageFile.path, storageFile.fileType, basicProperties.dateModified, basicProperties.size));
                    }, function () {
                        fail && fail(FileError.NOT_READABLE_ERR);
                    }
                );
            }, function () {
                fail && fail(FileError.NOT_FOUND_ERR);
            }
        );
    },

    getMetadata:function(success,fail,args) {
        var fullPath = args[0];

        var dealFile = function (sFile) {
            Windows.Storage.StorageFile.getFileFromPathAsync(fullPath).then(
                function (storageFile) {
                    return storageFile.getBasicPropertiesAsync();
                },
                function () {
                    fail && fail(FileError.NOT_READABLE_ERR);
                }
            // get the basic properties of the file.
            ).then(
                function (basicProperties) {
                    success(basicProperties.dateModified);
                },
                function () {
                    fail && fail(FileError.NOT_READABLE_ERR);
                }
            );
        };

        var dealFolder = function (sFolder) {
            Windows.Storage.StorageFolder.getFolderFromPathAsync(fullPath).then(
                function (storageFolder) {
                    return storageFolder.getBasicPropertiesAsync();
                },
                function () {
                    fail && fail(FileError.NOT_READABLE_ERR);
                }
            // get the basic properties of the folder.
            ).then(
                function (basicProperties) {
                    success(basicProperties.dateModified);
                },
                function () {
                    fail && fail(FileError.NOT_FOUND_ERR);
                }
            );
        };

        Windows.Storage.StorageFile.getFileFromPathAsync(fullPath).then(
            // the path is file.
            function (sFile) {
                dealFile(sFile);
            },
            // the path is folder
            function () {
                Windows.Storage.StorageFolder.getFolderFromPathAsync(fullPath).then(
                    function (sFolder) {
                        dealFolder(sFolder);
                    }, function () {
                        fail && fail(FileError.NOT_FOUND_ERR);
                    }
                );
            }
        );
    },

    getParent:function(win,fail,args) { // ["fullPath"]
        var fullPath = args[0];

        var storageFolderPer = Windows.Storage.ApplicationData.current.localFolder;
        var storageFolderTem = Windows.Storage.ApplicationData.current.temporaryFolder;

        if (fullPath == storageFolderPer.path) {
            win(new DirectoryEntry(storageFolderPer.name, storageFolderPer.path));
            return;
        } else if (fullPath == storageFolderTem.path) {
            win(new DirectoryEntry(storageFolderTem.name, storageFolderTem.path));
            return;
        }
        var splitArr = fullPath.split(new RegExp(/\/|\\/g));

        var popItem = splitArr.pop();

        var result = new DirectoryEntry(popItem, fullPath.substr(0, fullPath.length - popItem.length - 1));
        Windows.Storage.StorageFolder.getFolderFromPathAsync(result.fullPath).done(
            function () { win(result); },
            function () { fail && fail(FileError.INVALID_STATE_ERR); }
        );
    },

    readAsText:function(win,fail,args) {
        var fileName = args[0];
        var enc = args[1];

        Windows.Storage.StorageFile.getFileFromPathAsync(fileName).done(
            function (storageFile) {
                var value = Windows.Storage.Streams.UnicodeEncoding.utf8;
                if (enc == 'Utf16LE' || enc == 'utf16LE') {
                    value = Windows.Storage.Streams.UnicodeEncoding.utf16LE;
                }else if (enc == 'Utf16BE' || enc == 'utf16BE') {
                    value = Windows.Storage.Streams.UnicodeEncoding.utf16BE;
                }
                Windows.Storage.FileIO.readTextAsync(storageFile, value).done(
                    function (fileContent) {
                        win(fileContent);
                    },
                    function () {
                        fail && fail(FileError.ENCODING_ERR);
                    }
                );
            }, function () {
                fail && fail(FileError.NOT_FOUND_ERR);
            }
        );
    },

    readAsDataURL:function(win,fail,args) {
        var fileName = args[0];


        Windows.Storage.StorageFile.getFileFromPathAsync(fileName).then(
            function (storageFile) {
                Windows.Storage.FileIO.readBufferAsync(storageFile).done(
                    function (buffer) {
                        var strBase64 = Windows.Security.Cryptography.CryptographicBuffer.encodeToBase64String(buffer);
                        //the method encodeToBase64String will add "77u/" as a prefix, so we should remove it
                        if(String(strBase64).substr(0,4) == "77u/") {
                            strBase64 = strBase64.substr(4);
                        }
                        var mediaType = storageFile.contentType;
                        var result = "data:" + mediaType + ";base64," + strBase64;
                        win(result);
                    }
                );
            }, function () {
                fail && fail(FileError.NOT_FOUND_ERR);
            }
        );
    },

    getDirectory:function(win,fail,args) {
        var fullPath = args[0];
        var path = args[1];
        var options = args[2];

        var flag = "";
        if (options !== null) {
            flag = new Flags(options.create, options.exclusive);
        } else {
            flag = new Flags(false, false);
        }

        Windows.Storage.StorageFolder.getFolderFromPathAsync(fullPath).then(
            function (storageFolder) {
                if (flag.create === true && flag.exclusive === true) {
                    storageFolder.createFolderAsync(path, Windows.Storage.CreationCollisionOption.failIfExists).done(
                        function (storageFolder) {
                            win(new DirectoryEntry(storageFolder.name, storageFolder.path));
                        }, function () {
                            fail && fail(FileError.PATH_EXISTS_ERR);
                        }
                    );
                } else if (flag.create === true && flag.exclusive === false) {
                    storageFolder.createFolderAsync(path, Windows.Storage.CreationCollisionOption.openIfExists).done(
                        function (storageFolder) {
                            win(new DirectoryEntry(storageFolder.name, storageFolder.path));
                        }, function () {
                            fail && fail(FileError.INVALID_MODIFICATION_ERR);
                        }
                    );
                } else if (flag.create === false) {
                    if (/\?|\\|\*|\||\"|<|>|\:|\//g.test(path)) {
                        fail && fail(FileError.ENCODING_ERR);
                        return;
                    }

                    storageFolder.getFolderAsync(path).done(
                        function (storageFolder) {
                            win(new DirectoryEntry(storageFolder.name, storageFolder.path));
                        }, function () {
                            fail && fail(FileError.NOT_FOUND_ERR);
                        }
                    );
                }
            }, function () {
                fail && fail(FileError.NOT_FOUND_ERR);
            }
        );
    },

    remove:function(win,fail,args) {
        var fullPath = args[0];

        Windows.Storage.StorageFile.getFileFromPathAsync(fullPath).then(
            function (sFile) {
                Windows.Storage.StorageFile.getFileFromPathAsync(fullPath).done(function (storageFile) {
                    storageFile.deleteAsync().done(win, function () {
                        fail && fail(FileError.INVALID_MODIFICATION_ERR);

                    });
                });
            },
            function () {
                Windows.Storage.StorageFolder.getFolderFromPathAsync(fullPath).then(
                    function (sFolder) {
                        var removeEntry = function () {
                            var storageFolderTop = null;

                            Windows.Storage.StorageFolder.getFolderFromPathAsync(fullPath).then(
                                function (storageFolder) {
                                    // FileSystem root can't be removed!
                                    var storageFolderPer = Windows.Storage.ApplicationData.current.localFolder;
                                    var storageFolderTem = Windows.Storage.ApplicationData.current.temporaryFolder;
                                    if (fullPath == storageFolderPer.path || fullPath == storageFolderTem.path) {
                                        fail && fail(FileError.NO_MODIFICATION_ALLOWED_ERR);
                                        return;
                                    }
                                    storageFolderTop = storageFolder;
                                    return storageFolder.createFileQuery().getFilesAsync();
                                }, function () {
                                    fail && fail(FileError.INVALID_MODIFICATION_ERR);

                                }
                            // check sub-files.
                            ).then(function (fileList) {
                                if (fileList) {
                                    if (fileList.length === 0) {
                                        return storageFolderTop.createFolderQuery().getFoldersAsync();
                                    } else {
                                        fail && fail(FileError.INVALID_MODIFICATION_ERR);
                                    }
                                }
                            // check sub-folders.
                            }).then(function (folderList) {
                                if (folderList) {
                                    if (folderList.length === 0) {
                                        storageFolderTop.deleteAsync().done(win, function () {
                                            fail && fail(FileError.INVALID_MODIFICATION_ERR);

                                        });
                                    } else {
                                        fail && fail(FileError.INVALID_MODIFICATION_ERR);
                                    }
                                }

                            });
                        };
                        removeEntry();
                    }, function () {
                        fail && fail(FileError.NOT_FOUND_ERR);
                    }
                );
            }
        );
    },

    removeRecursively:function(successCallback,fail,args) {
        var fullPath = args[0];

        Windows.Storage.StorageFolder.getFolderFromPathAsync(fullPath).done(function (storageFolder) {
        var storageFolderPer = Windows.Storage.ApplicationData.current.localFolder;
        var storageFolderTem = Windows.Storage.ApplicationData.current.temporaryFolder;

        if (storageFolder.path == storageFolderPer.path || storageFolder.path == storageFolderTem.path) {
            fail && fail(FileError.NO_MODIFICATION_ALLOWED_ERR);
            return;
        }

        var removeFolders = function (path) {
            return new WinJS.Promise(function (complete) {
                var filePromiseArr = [];
                var storageFolderTop = null;
                Windows.Storage.StorageFolder.getFolderFromPathAsync(path).then(
                    function (storageFolder) {
                        var fileListPromise = storageFolder.createFileQuery().getFilesAsync();

                        storageFolderTop = storageFolder;
                        return fileListPromise;
                    }
                // remove all the files directly under the folder.
                ).then(function (fileList) {
                    if (fileList !== null) {
                        for (var i = 0; i < fileList.length; i++) {
                            var filePromise = fileList[i].deleteAsync();
                            filePromiseArr.push(filePromise);
                        }
                    }
                    WinJS.Promise.join(filePromiseArr).then(function () {
                        var folderListPromise = storageFolderTop.createFolderQuery().getFoldersAsync();
                        return folderListPromise;
                    // remove empty folders.
                    }).then(function (folderList) {
                        var folderPromiseArr = [];
                        if (folderList.length !== 0) {
                            for (var j = 0; j < folderList.length; j++) {

                                folderPromiseArr.push(removeFolders(folderList[j].path));
                            }
                            WinJS.Promise.join(folderPromiseArr).then(function () {
                                storageFolderTop.deleteAsync().then(complete);
                            });
                        } else {
                            storageFolderTop.deleteAsync().then(complete);
                        }
                    }, function () { });
                }, function () { });
            });
        };
        removeFolders(storageFolder.path).then(function () {
            Windows.Storage.StorageFolder.getFolderFromPathAsync(storageFolder.path).then(
                function () {},
                function () {
                    if (typeof successCallback !== 'undefined' && successCallback !== null) { successCallback(); }
                });
            });
        });
    },

    getFile:function(win,fail,args) {
        var fullPath = args[0];
        var path = args[1];
        var options = args[2];

        var flag = "";
        if (options !== null) {
            flag = new Flags(options.create, options.exclusive);
        } else {
            flag = new Flags(false, false);
        }

        Windows.Storage.StorageFolder.getFolderFromPathAsync(fullPath).then(
            function (storageFolder) {
                if (flag.create === true && flag.exclusive === true) {
                    storageFolder.createFileAsync(path, Windows.Storage.CreationCollisionOption.failIfExists).done(
                        function (storageFile) {
                            win(new FileEntry(storageFile.name, storageFile.path));
                        }, function () {
                            fail && fail(FileError.PATH_EXISTS_ERR);
                        }
                    );
                } else if (flag.create === true && flag.exclusive === false) {
                    storageFolder.createFileAsync(path, Windows.Storage.CreationCollisionOption.openIfExists).done(
                        function (storageFile) {
                            win(new FileEntry(storageFile.name, storageFile.path));
                        }, function () {
                            fail && fail(FileError.INVALID_MODIFICATION_ERR);
                        }
                    );
                } else if (flag.create === false) {
                    if (/\?|\\|\*|\||\"|<|>|\:|\//g.test(path)) {
                        fail && fail(FileError.ENCODING_ERR);
                        return;
                    }
                    storageFolder.getFileAsync(path).done(
                        function (storageFile) {
                            win(new FileEntry(storageFile.name, storageFile.path));
                        }, function () {
                            fail && fail(FileError.NOT_FOUND_ERR);
                        }
                    );
                }
            }, function () {
                fail && fail(FileError.NOT_FOUND_ERR);
            }
        );
    },

    readEntries:function(win,fail,args) { // ["fullPath"]
        var path = args[0];

        var result = [];

        Windows.Storage.StorageFolder.getFolderFromPathAsync(path).then(function (storageFolder) {
            var promiseArr = [];
            var index = 0;
            promiseArr[index++] = storageFolder.createFileQuery().getFilesAsync().then(function (fileList) {
                if (fileList !== null) {
                    for (var i = 0; i < fileList.length; i++) {
                        result.push(new FileEntry(fileList[i].name, fileList[i].path));
                    }
                }
            });
            promiseArr[index++] = storageFolder.createFolderQuery().getFoldersAsync().then(function (folderList) {
                if (folderList !== null) {
                    for (var j = 0; j < folderList.length; j++) {
                        result.push(new FileEntry(folderList[j].name, folderList[j].path));
                    }
                }
            });
            WinJS.Promise.join(promiseArr).then(function () {
                win(result);
            });

        }, function () { fail && fail(FileError.NOT_FOUND_ERR); });
    },

    write:function(win,fail,args) {
        var fileName = args[0];
        var text = args[1];
        var position = args[2];

        Windows.Storage.StorageFile.getFileFromPathAsync(fileName).done(
            function (storageFile) {
                Windows.Storage.FileIO.writeTextAsync(storageFile,text,Windows.Storage.Streams.UnicodeEncoding.utf8).done(
                    function() {
                        win(String(text).length);
                    }, function () {
                        fail && fail(FileError.INVALID_MODIFICATION_ERR);
                    }
                );
            }, function() {
                fail && fail(FileError.NOT_FOUND_ERR);
            }
        );
    },

    truncate:function(win,fail,args) { // ["fileName","size"]
        var fileName = args[0];
        var size = args[1];

        Windows.Storage.StorageFile.getFileFromPathAsync(fileName).done(function(storageFile){
            //the current length of the file.
            var leng = 0;

            storageFile.getBasicPropertiesAsync().then(function (basicProperties) {
                leng = basicProperties.size;
                if (Number(size) >= leng) {
                    win(this.length);
                    return;
                }
                if (Number(size) >= 0) {
                    Windows.Storage.FileIO.readTextAsync(storageFile, Windows.Storage.Streams.UnicodeEncoding.utf8).then(function (fileContent) {
                        fileContent = fileContent.substr(0, size);
                        var fullPath = storageFile.path;
                        var name = storageFile.name;
                        var entry = new Entry(true, false, name, fullPath);
                        var parentPath = "";
                        var successCallBack = function (entry) {
                            parentPath = entry.fullPath;
                            storageFile.deleteAsync().then(function () {
                                return Windows.Storage.StorageFolder.getFolderFromPathAsync(parentPath);
                            }).then(function (storageFolder) {
                                storageFolder.createFileAsync(name).then(function (newStorageFile) {
                                    Windows.Storage.FileIO.writeTextAsync(newStorageFile, fileContent).done(function () {
                                        win(String(fileContent).length);
                                    }, function () {
                                        fail && fail(FileError.NO_MODIFICATION_ALLOWED_ERR);
                                    });
                                });
                            });
                        };
                        entry.getParent(successCallBack, null);
                    }, function () { fail && fail(FileError.NOT_FOUND_ERR); });
                }
            });
        }, function () { fail && fail(FileError.NOT_FOUND_ERR); });
    },

    copyTo:function(success,fail,args) { // ["fullPath","parent", "newName"]
        var srcPath = args[0];
        var parentFullPath = args[1];
        var name = args[2];

        //name can't be invalid
        if (/\?|\\|\*|\||\"|<|>|\:|\//g.test(name)) {
            fail && fail(FileError.ENCODING_ERR);
            return;
        }
        // copy
        var copyFiles = "";
        Windows.Storage.StorageFile.getFileFromPathAsync(srcPath).then(
            function (sFile) {
                copyFiles = function (srcPath, parentPath) {
                    var storageFileTop = null;
                    Windows.Storage.StorageFile.getFileFromPathAsync(srcPath).then(function (storageFile) {
                        storageFileTop = storageFile;
                        return Windows.Storage.StorageFolder.getFolderFromPathAsync(parentPath);
                    }, function () {

                        fail && fail(FileError.NOT_FOUND_ERR);
                    }).then(function (storageFolder) {
                        storageFileTop.copyAsync(storageFolder, name, Windows.Storage.NameCollisionOption.failIfExists).then(function (storageFile) {

                            success(new FileEntry(storageFile.name, storageFile.path));
                        }, function () {

                            fail && fail(FileError.INVALID_MODIFICATION_ERR);
                        });
                    }, function () {

                        fail && fail(FileError.NOT_FOUND_ERR);
                    });
                };
                var copyFinish = function (srcPath, parentPath) {
                    copyFiles(srcPath, parentPath);
                };
                copyFinish(srcPath, parentFullPath);
            },
            function () {
                Windows.Storage.StorageFolder.getFolderFromPathAsync(srcPath).then(
                    function (sFolder) {
                        copyFiles = function (srcPath, parentPath) {
                            var coreCopy = function (storageFolderTop, complete) {
                                storageFolderTop.createFolderQuery().getFoldersAsync().then(function (folderList) {
                                    var folderPromiseArr = [];
                                    if (folderList.length === 0) { complete(); }
                                    else {
                                        Windows.Storage.StorageFolder.getFolderFromPathAsync(parentPath).then(function (storageFolderTarget) {
                                            var tempPromiseArr = [];
                                            var index = 0;
                                            for (var j = 0; j < folderList.length; j++) {
                                                tempPromiseArr[index++] = storageFolderTarget.createFolderAsync(folderList[j].name).then(function (targetFolder) {
                                                    folderPromiseArr.push(copyFiles(folderList[j].path, targetFolder.path));
                                                });
                                            }
                                            WinJS.Promise.join(tempPromiseArr).then(function () {
                                                WinJS.Promise.join(folderPromiseArr).then(complete);
                                            });
                                        });
                                    }
                                });
                            };

                            return new WinJS.Promise(function (complete) {
                                var storageFolderTop = null;
                                var filePromiseArr = [];
                                var fileListTop = null;
                                Windows.Storage.StorageFolder.getFolderFromPathAsync(srcPath).then(function (storageFolder) {
                                    storageFolderTop = storageFolder;
                                    return storageFolder.createFileQuery().getFilesAsync();
                                }).then(function (fileList) {
                                    fileListTop = fileList;
                                    if (fileList) {
                                        return Windows.Storage.StorageFolder.getFolderFromPathAsync(parentPath);
                                    }
                                }).then(function (targetStorageFolder) {
                                    for (var i = 0; i < fileListTop.length; i++) {
                                        filePromiseArr.push(fileListTop[i].copyAsync(targetStorageFolder));
                                    }
                                    WinJS.Promise.join(filePromiseArr).then(function () {
                                        coreCopy(storageFolderTop, complete);
                                    });
                                });
                            });
                        };
                        var copyFinish = function (srcPath, parentPath) {
                            Windows.Storage.StorageFolder.getFolderFromPathAsync(parentPath).then(function (storageFolder) {
                                storageFolder.createFolderAsync(name, Windows.Storage.CreationCollisionOption.openIfExists).then(function (newStorageFolder) {
                                    //can't copy onto itself
                                    if (srcPath == newStorageFolder.path) {
                                        fail && fail(FileError.INVALID_MODIFICATION_ERR);
                                        return;
                                    }
                                    //can't copy into itself
                                    if (srcPath == parentPath) {
                                        fail && fail(FileError.INVALID_MODIFICATION_ERR);
                                        return;
                                    }
                                    copyFiles(srcPath, newStorageFolder.path).then(function () {
                                        Windows.Storage.StorageFolder.getFolderFromPathAsync(newStorageFolder.path).done(
                                            function (storageFolder) {
                                                success(new DirectoryEntry(storageFolder.name, storageFolder.path));
                                            },
                                            function () { fail && fail(FileError.NOT_FOUND_ERR); }
                                        );
                                    });
                                }, function () { fail && fail(FileError.INVALID_MODIFICATION_ERR); });
                            }, function () { fail && fail(FileError.INVALID_MODIFICATION_ERR); });
                        };
                        copyFinish(srcPath, parentFullPath);
                    }, function () {
                        fail && fail(FileError.NOT_FOUND_ERR);
                    }
                );
            }
        );
    },

    moveTo:function(success,fail,args) {
        var srcPath = args[0];
        var parentFullPath = args[1];
        var name = args[2];


        //name can't be invalid
        if (/\?|\\|\*|\||\"|<|>|\:|\//g.test(name)) {
            fail && fail(FileError.ENCODING_ERR);
            return;
        }

        var moveFiles = "";
        Windows.Storage.StorageFile.getFileFromPathAsync(srcPath).then(
            function (sFile) {
                moveFiles = function (srcPath, parentPath) {
                    var storageFileTop = null;
                    Windows.Storage.StorageFile.getFileFromPathAsync(srcPath).then(function (storageFile) {
                        storageFileTop = storageFile;
                        return Windows.Storage.StorageFolder.getFolderFromPathAsync(parentPath);
                    }, function () {
                        fail && fail(FileError.NOT_FOUND_ERR);
                    }).then(function (storageFolder) {
                        storageFileTop.moveAsync(storageFolder, name, Windows.Storage.NameCollisionOption.replaceExisting).then(function () {
                            success(new FileEntry(name, storageFileTop.path));
                        }, function () {
                            fail && fail(FileError.INVALID_MODIFICATION_ERR);
                        });
                    }, function () {
                        fail && fail(FileError.NOT_FOUND_ERR);
                    });
                };
                var moveFinish = function (srcPath, parentPath) {
                    //can't copy onto itself
                    if (srcPath == parentPath + "\\" + name) {
                        fail && fail(FileError.INVALID_MODIFICATION_ERR);
                        return;
                    }
                    moveFiles(srcPath, parentFullPath);
                };
                moveFinish(srcPath, parentFullPath);
            },
            function () {
                Windows.Storage.StorageFolder.getFolderFromPathAsync(srcPath).then(
                    function (sFolder) {
                        moveFiles = function (srcPath, parentPath) {
                            var coreMove = function (storageFolderTop, complete) {
                                storageFolderTop.createFolderQuery().getFoldersAsync().then(function (folderList) {
                                    var folderPromiseArr = [];
                                    if (folderList.length === 0) {
                                        // If failed, we must cancel the deletion of folders & files.So here wo can't delete the folder.
                                        complete();
                                    }
                                    else {
                                        Windows.Storage.StorageFolder.getFolderFromPathAsync(parentPath).then(function (storageFolderTarget) {
                                            var tempPromiseArr = [];
                                            var index = 0;
                                            for (var j = 0; j < folderList.length; j++) {
                                                tempPromiseArr[index++] = storageFolderTarget.createFolderAsync(folderList[j].name).then(function (targetFolder) {
                                                    folderPromiseArr.push(moveFiles(folderList[j].path, targetFolder.path));
                                                });
                                            }
                                            WinJS.Promise.join(tempPromiseArr).then(function () {
                                                WinJS.Promise.join(folderPromiseArr).then(complete);
                                            });
                                        });
                                    }
                                });
                            };
                            return new WinJS.Promise(function (complete) {
                                var storageFolderTop = null;
                                Windows.Storage.StorageFolder.getFolderFromPathAsync(srcPath).then(function (storageFolder) {
                                    storageFolderTop = storageFolder;
                                    return storageFolder.createFileQuery().getFilesAsync();
                                }).then(function (fileList) {
                                    var filePromiseArr = [];
                                    Windows.Storage.StorageFolder.getFolderFromPathAsync(parentPath).then(function (dstStorageFolder) {
                                        if (fileList) {
                                            for (var i = 0; i < fileList.length; i++) {
                                                filePromiseArr.push(fileList[i].moveAsync(dstStorageFolder));
                                            }
                                        }
                                        WinJS.Promise.join(filePromiseArr).then(function () {
                                            coreMove(storageFolderTop, complete);
                                        }, function () { });
                                    });
                                });
                            });
                        };
                        var moveFinish = function (srcPath, parentPath) {
                            var originFolderTop = null;
                            Windows.Storage.StorageFolder.getFolderFromPathAsync(srcPath).then(function (originFolder) {
                                originFolderTop = originFolder;
                                return Windows.Storage.StorageFolder.getFolderFromPathAsync(parentPath);
                            }, function () {
                                fail && fail(FileError.INVALID_MODIFICATION_ERR);
                            }).then(function (storageFolder) {
                                return storageFolder.createFolderAsync(name, Windows.Storage.CreationCollisionOption.openIfExists);
                            }, function () {
                                fail && fail(FileError.INVALID_MODIFICATION_ERR);
                            }).then(function (newStorageFolder) {
                                //can't move onto directory that is not empty
                                newStorageFolder.createFileQuery().getFilesAsync().then(function (fileList) {
                                    newStorageFolder.createFolderQuery().getFoldersAsync().then(function (folderList) {
                                        if (fileList.length !== 0 || folderList.length !== 0) {
                                            fail && fail(FileError.INVALID_MODIFICATION_ERR);
                                            return;
                                        }
                                        //can't copy onto itself
                                        if (srcPath == newStorageFolder.path) {
                                            fail && fail(FileError.INVALID_MODIFICATION_ERR);
                                            return;
                                        }
                                        //can't copy into itself
                                        if (srcPath == parentPath) {
                                            fail && fail(FileError.INVALID_MODIFICATION_ERR);
                                            return;
                                        }
                                        moveFiles(srcPath, newStorageFolder.path).then(function () {
                                            var successCallback = function () {
                                                success(new DirectoryEntry(name, newStorageFolder.path));
                                            };
                                            var temp = new DirectoryEntry(originFolderTop.name, originFolderTop.path).removeRecursively(successCallback, fail);

                                        }, function () { console.log("error!"); });
                                    });
                                });
                            }, function () { fail && fail(FileError.INVALID_MODIFICATION_ERR); });

                        };
                        moveFinish(srcPath, parentFullPath);
                    }, function () {
                        fail && fail(FileError.NOT_FOUND_ERR);
                    }
                );
            }
        );
    },
    tempFileSystem:null,

    persistentFileSystem:null,

    requestFileSystem:function(win,fail,args) {
        var type = args[0];
        var size = args[1];

        var filePath = "";
        var result = null;
        var fsTypeName = "";

        switch (type) {
            case LocalFileSystem.TEMPORARY:
                filePath = Windows.Storage.ApplicationData.current.temporaryFolder.path;
                fsTypeName = "temporary";
                break;
            case LocalFileSystem.PERSISTENT:
                filePath = Windows.Storage.ApplicationData.current.localFolder.path;
                fsTypeName = "persistent";
                break;
        }

        var MAX_SIZE = 10000000000;
        if (size > MAX_SIZE) {
            fail && fail(FileError.QUOTA_EXCEEDED_ERR);
            return;
        }

        var fileSystem = new FileSystem(fsTypeName, new DirectoryEntry(fsTypeName, filePath));
        result = fileSystem;
        win(result);
    },

    resolveLocalFileSystemURI:function(success,fail,args) {
        var uri = args[0];

        var path = uri;

        // support for file name with parameters
        if (/\?/g.test(path)) {
            path = String(path).split("?")[0];
        }

        // support for encodeURI
        if (/\%5/g.test(path)) {
            path = decodeURI(path);
        }

        // support for special path start with file:///
        if (path.substr(0, 8) == "file:///") {
            path = Windows.Storage.ApplicationData.current.localFolder.path + "\\" + String(path).substr(8).split("/").join("\\");
            Windows.Storage.StorageFile.getFileFromPathAsync(path).then(
                function (storageFile) {
                    success(new FileEntry(storageFile.name, storageFile.path));
                }, function () {
                    Windows.Storage.StorageFolder.getFolderFromPathAsync(path).then(
                        function (storageFolder) {
                            success(new DirectoryEntry(storageFolder.name, storageFolder.path));
                        }, function () {
                            fail && fail(FileError.NOT_FOUND_ERR);
                        }
                    );
                }
            );
        } else {
            Windows.Storage.StorageFile.getFileFromPathAsync(path).then(
                function (storageFile) {
                    success(new FileEntry(storageFile.name, storageFile.path));
                }, function () {
                    Windows.Storage.StorageFolder.getFolderFromPathAsync(path).then(
                        function (storageFolder) {
                            success(new DirectoryEntry(storageFolder.name, storageFolder.path));
                        }, function () {
                            fail && fail(FileError.ENCODING_ERR);
                        }
                    );
                }
            );
        }
    }

};

require("cordova/commandProxy").add("File",module.exports);

});

// file: lib/windows8/plugin/windows8/FileTransferProxy.js
define("cordova/plugin/windows8/FileTransferProxy", function(require, exports, module) {


var FileTransferError = require('cordova/plugin/FileTransferError'),
    FileUploadResult = require('cordova/plugin/FileUploadResult'),
    FileEntry = require('cordova/plugin/FileEntry');

module.exports = {

    upload:function(successCallback, error, options) {
        var filePath = options[0];
        var server = options[1];


        var win = function (fileUploadResult) {
            successCallback(fileUploadResult);
        };

        if (filePath === null || typeof filePath === 'undefined') {
            error(FileTransferError.FILE_NOT_FOUND_ERR);
            return;
        }

        if (String(filePath).substr(0, 8) == "file:///") {
            filePath = Windows.Storage.ApplicationData.current.localFolder.path + String(filePath).substr(8).split("/").join("\\");
        }

        Windows.Storage.StorageFile.getFileFromPathAsync(filePath).then(function (storageFile) {
            storageFile.openAsync(Windows.Storage.FileAccessMode.read).then(function (stream) {
                var blob = MSApp.createBlobFromRandomAccessStream(storageFile.contentType, stream);
                var formData = new FormData();
                formData.append("source\";filename=\"" + storageFile.name + "\"", blob);
                WinJS.xhr({ type: "POST", url: server, data: formData }).then(function (response) {
                    var code = response.status;
                    storageFile.getBasicPropertiesAsync().done(function (basicProperties) {

                        Windows.Storage.FileIO.readBufferAsync(storageFile).done(function (buffer) {
                            var dataReader = Windows.Storage.Streams.DataReader.fromBuffer(buffer);
                            var fileContent = dataReader.readString(buffer.length);
                            dataReader.close();
                            win(new FileUploadResult(basicProperties.size, code, fileContent));

                        });

                    });
                }, function () {
                    error(FileTransferError.INVALID_URL_ERR);
                });
            });

        },function(){error(FileTransferError.FILE_NOT_FOUND_ERR);});
    },

    download:function(win, error, options) {
        var source = options[0];
        var target = options[1];


        if (target === null || typeof target === undefined) {
            error(FileTransferError.FILE_NOT_FOUND_ERR);
            return;
        }
        if (String(target).substr(0, 8) == "file:///") {
            target = Windows.Storage.ApplicationData.current.localFolder.path + String(target).substr(8).split("/").join("\\");
        }
        var path = target.substr(0, String(target).lastIndexOf("\\"));
        var fileName = target.substr(String(target).lastIndexOf("\\") + 1);
        if (path === null || fileName === null) {
            error(FileTransferError.FILE_NOT_FOUND_ERR);
            return;
        }

        var download = null;


        Windows.Storage.StorageFolder.getFolderFromPathAsync(path).then(function (storageFolder) {
            storageFolder.createFileAsync(fileName, Windows.Storage.CreationCollisionOption.generateUniqueName).then(function (storageFile) {
                var uri = Windows.Foundation.Uri(source);
                var downloader = new Windows.Networking.BackgroundTransfer.BackgroundDownloader();
                download = downloader.createDownload(uri, storageFile);
                download.startAsync().then(function () {
                    win(new FileEntry(storageFile.name, storageFile.path));
                }, function () {
                    error(FileTransferError.INVALID_URL_ERR);
                });
            });
        });
    }
};

require("cordova/commandProxy").add("FileTransfer",module.exports);
});

// file: lib/windows8/plugin/windows8/MediaFile.js
define("cordova/plugin/windows8/MediaFile", function(require, exports, module) {

/*global Windows:true */

var MediaFileData = require('cordova/plugin/MediaFileData');
var CaptureError = require('cordova/plugin/CaptureError');

module.exports = {

    getFormatData: function (successCallback, errorCallback, args) {
        Windows.Storage.StorageFile.getFileFromPathAsync(this.fullPath).then(
            function (storageFile) {
                var mediaTypeFlag = String(storageFile.contentType).split("/")[0].toLowerCase();
                if (mediaTypeFlag === "audio") {
                    storageFile.properties.getMusicPropertiesAsync().then(
                        function (audioProperties) {
                            successCallback(new MediaFileData(null, audioProperties.bitrate, 0, 0, audioProperties.duration / 1000));
                        }, function () {
                            errorCallback(new CaptureError(CaptureError.CAPTURE_INVALID_ARGUMENT));
                        }
                    );
                } else if (mediaTypeFlag === "video") {
                    storageFile.properties.getVideoPropertiesAsync().then(
                        function (videoProperties) {
                            successCallback(new MediaFileData(null, videoProperties.bitrate, videoProperties.height, videoProperties.width, videoProperties.duration / 1000));
                        }, function () {
                            errorCallback(new CaptureError(CaptureError.CAPTURE_INVALID_ARGUMENT));
                        }
                    );
                } else if (mediaTypeFlag === "image") {
                    storageFile.properties.getImagePropertiesAsync().then(
                        function (imageProperties) {
                            successCallback(new MediaFileData(null, 0, imageProperties.height, imageProperties.width, 0));
                        }, function () {
                            errorCallback(new CaptureError(CaptureError.CAPTURE_INVALID_ARGUMENT));
                        }
                    );
                } else {
                    errorCallback(new CaptureError(CaptureError.CAPTURE_INVALID_ARGUMENT));
                }
            }, function () {
                errorCallback(new CaptureError(CaptureError.CAPTURE_INVALID_ARGUMENT));
            }
        );
    }
};

});

// file: lib/windows8/plugin/windows8/MediaProxy.js
define("cordova/plugin/windows8/MediaProxy", function(require, exports, module) {

/*global Windows:true */

var cordova = require('cordova'),
    Media = require('cordova/plugin/Media');

var MediaError = require('cordova/plugin/MediaError');

module.exports = {
    mediaCaptureMrg:null,

    // Initiates the audio file
    create:function(win, lose, args) {
        var id = args[0];
        var src = args[1];
        var thisM = Media.get(id);
        Media.onStatus(id, Media.MEDIA_STATE, Media.MEDIA_STARTING);

        Media.prototype.node = null;

        var fn = src.split('.').pop(); // gets the file extension
        if (thisM.node === null) {
            if (fn === 'mp3' || fn === 'wma' || fn === 'wma' ||
                fn === 'cda' || fn === 'adx' || fn === 'wm' ||
                fn === 'm3u' || fn === 'wmx') {
                thisM.node = new Audio(src);
                thisM.node.load();
                var dur = thisM.node.duration;
                if (isNaN(dur)) {
                    dur = -1;
                }
                Media.onStatus(id, Media.MEDIA_DURATION, dur);
            }
            else {
                lose && lose({code:MediaError.MEDIA_ERR_ABORTED});
            }
        }
    },

    // Start playing the audio
    startPlayingAudio:function(win, lose, args) {
        var id = args[0];
        //var src = args[1];
        //var options = args[2];
        Media.onStatus(id, Media.MEDIA_STATE, Media.MEDIA_RUNNING);

        (Media.get(id)).node.play();
    },

    // Stops the playing audio
    stopPlayingAudio:function(win, lose, args) {
        var id = args[0];
        try {
            (Media.get(id)).node.pause();
            (Media.get(id)).node.currentTime = 0;
            Media.onStatus(id, Media.MEDIA_STATE, Media.MEDIA_STOPPED);
            win();
        } catch (err) {
            lose("Failed to stop: "+err);
        }
    },

    // Seeks to the position in the audio
    seekToAudio:function(win, lose, args) {
        var id = args[0];
        var milliseconds = args[1];
        try {
            (Media.get(id)).node.currentTime = milliseconds / 1000;
            win();
        } catch (err) {
            lose("Failed to seek: "+err);
        }
    },

    // Pauses the playing audio
    pausePlayingAudio:function(win, lose, args) {
        var id = args[0];
        var thisM = Media.get(id);
        try {
            thisM.node.pause();
            Media.onStatus(id, Media.MEDIA_STATE, Media.MEDIA_PAUSED);
        } catch (err) {
            lose("Failed to pause: "+err);
        }
    },

    // Gets current position in the audio
    getCurrentPositionAudio:function(win, lose, args) {
        var id = args[0];
        try {
            var p = (Media.get(id)).node.currentTime;
            Media.onStatus(id, Media.MEDIA_POSITION, p);
            win(p);
        } catch (err) {
            lose(err);
        }
    },

    // Start recording audio
    startRecordingAudio:function(win, lose, args) {
        var id = args[0];
        var src = args[1];
        // Initialize device
        Media.prototype.mediaCaptureMgr = null;
        var thisM = (Media.get(id));
        var captureInitSettings = new Windows.Media.Capture.MediaCaptureInitializationSettings();
        captureInitSettings.streamingCaptureMode = Windows.Media.Capture.StreamingCaptureMode.audio;
        thisM.mediaCaptureMgr = new Windows.Media.Capture.MediaCapture();
        thisM.mediaCaptureMgr.addEventListener("failed", lose);

        thisM.mediaCaptureMgr.initializeAsync(captureInitSettings).done(function (result) {
            thisM.mediaCaptureMgr.addEventListener("recordlimitationexceeded", lose);
            thisM.mediaCaptureMgr.addEventListener("failed", lose);
        }, lose);
        // Start recording
        Windows.Storage.KnownFolders.musicLibrary.createFileAsync(src, Windows.Storage.CreationCollisionOption.replaceExisting).done(function (newFile) {
            var storageFile = newFile;
            var fileType = this.src.split('.').pop();
            var encodingProfile = null;
            switch (fileType) {
                case 'm4a':
                    encodingProfile = Windows.Media.MediaProperties.MediaEncodingProfile.createM4a(Windows.Media.MediaProperties.AudioEncodingQuality.auto);
                    break;
                case 'mp3':
                    encodingProfile = Windows.Media.MediaProperties.MediaEncodingProfile.createMp3(Windows.Media.MediaProperties.AudioEncodingQuality.auto);
                    break;
                case 'wma':
                    encodingProfile = Windows.Media.MediaProperties.MediaEncodingProfile.createWma(Windows.Media.MediaProperties.AudioEncodingQuality.auto);
                    break;
                default:
                    lose("Invalid file type for record");
                    break;
            }
            thisM.mediaCaptureMgr.startRecordToStorageFileAsync(encodingProfile, storageFile).done(win, lose);
        }, lose);
    },

    // Stop recording audio
    stopRecordingAudio:function(win, lose, args) {
        var id = args[0];
        var thisM = Media.get(id);
        thisM.mediaCaptureMgr.stopRecordAsync().done(win, lose);
    },

    // Release the media object
    release:function(win, lose, args) {
        var id = args[0];
        var thisM = Media.get(id);
        try {
            delete thisM.node;
        } catch (err) {
            lose("Failed to release: "+err);
        }
    },
    setVolume:function(win, lose, args) {
        var id = args[0];
        var volume = args[1];
        var thisM = Media.get(id);
        thisM.volume = volume;
    }
};

require("cordova/commandProxy").add("Media",module.exports);
});

// file: lib/windows8/plugin/windows8/NetworkStatusProxy.js
define("cordova/plugin/windows8/NetworkStatusProxy", function(require, exports, module) {

/*global Windows:true */

var cordova = require('cordova');
var Connection = require('cordova/plugin/Connection');

module.exports = {

    getConnectionInfo:function(win,fail,args)
    {
        console.log("NetworkStatusProxy::getConnectionInfo");
        var winNetConn = Windows.Networking.Connectivity;
        var networkInfo = winNetConn.NetworkInformation;
        var networkCostInfo = winNetConn.NetworkCostType;
        var networkConnectivityInfo = winNetConn.NetworkConnectivityLevel;
        var networkAuthenticationInfo = winNetConn.NetworkAuthenticationType;
        var networkEncryptionInfo = winNetConn.NetworkEncryptionType;

        var connectionType;

        var profile = Windows.Networking.Connectivity.NetworkInformation.getInternetConnectionProfile();
        if(profile) {
            var conLevel = profile.getNetworkConnectivityLevel();
            var interfaceType = profile.networkAdapter.ianaInterfaceType;

            if (conLevel == Windows.Networking.Connectivity.NetworkConnectivityLevel.none) {
                connectionType = Connection.NONE;
            }
            else {
                switch (interfaceType) {
                    case 71:
                        connectionType = Connection.WIFI;
                        break;
                    case 6:
                        connectionType = Connection.ETHERNET;
                        break;
                    case 243: // (3GPP WWAN) // Fallthrough is intentional
                    case 244: // (3GPP2 WWAN)
                         connectionType = Connection.CELL_3G;
                         break;
                    default:
                        connectionType = Connection.UNKNOWN;
                        break;
                }
            }
        }
        // FYI
        //Connection.UNKNOWN  'Unknown connection';
        //Connection.ETHERNET 'Ethernet connection';
        //Connection.WIFI     'WiFi connection';
        //Connection.CELL_2G  'Cell 2G connection';
        //Connection.CELL_3G  'Cell 3G connection';
        //Connection.CELL_4G  'Cell 4G connection';
        //Connection.NONE     'No network connection';

        setTimeout(function () {
            if (connectionType) {
                win(connectionType);
            } else {
                win(Connection.NONE);
            }
        },0);
    }

};

require("cordova/commandProxy").add("NetworkStatus",module.exports);
});

// file: lib/windows8/plugin/windows8/NotificationProxy.js
define("cordova/plugin/windows8/NotificationProxy", function(require, exports, module) {

/*global Windows:true */

var cordova = require('cordova');

var isAlertShowing = false;
var alertStack = [];

module.exports = {
    alert:function(win, loseX, args) {

        if (isAlertShowing) {
            var later = function () {
                module.exports.alert(win, loseX, args);
            };
            alertStack.push(later);
            return;
        }
        isAlertShowing = true;

        var message = args[0];
        var _title = args[1];
        var _buttonLabel = args[2];

        var md = new Windows.UI.Popups.MessageDialog(message, _title);
        md.commands.append(new Windows.UI.Popups.UICommand(_buttonLabel));
        md.showAsync().then(function() {
            isAlertShowing = false;
            win && win();

            if (alertStack.length) {
                setTimeout(alertStack.shift(), 0);
            }

        });
    },

    confirm:function(win, loseX, args) {

        if (isAlertShowing) {
            var later = function () {
                module.exports.confirm(win, loseX, args);
            };
            alertStack.push(later);
            return;
        }

        isAlertShowing = true;

        var message = args[0];
        var _title = args[1];
        var _buttonLabels = args[2];

        var btnList = [];
        function commandHandler (command) {
            win && win(btnList[command.label]);
        }

        var md = new Windows.UI.Popups.MessageDialog(message, _title);
        var button = _buttonLabels.split(',');

        for (var i = 0; i<button.length; i++) {
            btnList[button[i]] = i+1;
            md.commands.append(new Windows.UI.Popups.UICommand(button[i],commandHandler));
        }
        md.showAsync().then(function() {
            isAlertShowing = false;
            if (alertStack.length) {
                setTimeout(alertStack.shift(), 0);
            }

        });
    },

    vibrate:function(winX, loseX, args) {
        var mills = args[0];

        //...
    },

    beep:function(winX, loseX, args) {
        var count = args[0];
        /*
        var src = //filepath//
        var playTime = 500; // ms
        var quietTime = 1000; // ms
        var media = new Media(src, function(){});
        var hit = 1;
        var intervalId = window.setInterval( function () {
            media.play();
            sleep(playTime);
            media.stop();
            media.seekTo(0);
            if (hit < count) {
                hit++;
            } else {
                window.clearInterval(intervalId);
            }
        }, playTime + quietTime); */
    }
};

require("cordova/commandProxy").add("Notification",module.exports);
});

// file: lib/windows8/plugin/windows8/console.js
define("cordova/plugin/windows8/console", function(require, exports, module) {


if(!console || !console.log)
{
    var exec = require('cordova/exec');

    var debugConsole = {
        log:function(msg){
            exec(null,null,"DebugConsole","log",msg);
        },
        warn:function(msg){
            exec(null,null,"DebugConsole","warn",msg);
        },
        error:function(msg){
            exec(null,null,"DebugConsole","error",msg);
        }
    };

    module.exports = debugConsole;
}
else if(console && console.log) {

  console.log("console.log exists already!");
  console.warn = console.warn || function(msg){console.log("warn:"+msg);};
  console.error = console.error || function(msg){console.log("error:"+msg);};
}

});

// file: lib/windows8/plugin/windows8/console/symbols.js
define("cordova/plugin/windows8/console/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/windows8/console', 'navigator.console');

});

// file: lib/windows8/plugin/windows8/notification/plugininit.js
define("cordova/plugin/windows8/notification/plugininit", function(require, exports, module) {

window.alert = window.alert || require("cordova/plugin/notification").alert;
window.confirm = window.confirm || require("cordova/plugin/notification").confirm;


});

// file: lib/windowsphone/plugin/windowsphone/DOMStorage/plugininit.js
define("cordova/plugin/windowsphone/DOMStorage/plugininit", function(require, exports, module) {

(function(win,doc) {

var docDomain = null;
try {
    docDomain = doc.domain;
} catch (err) {
    //console.log("caught exception trying to access document.domain");
}

// conditionally patch the window.localStorage and window.sessionStorage objects
if (!docDomain || docDomain.length === 0) {

    var DOMStorage = function(type) {
        // default type is local
        if(type == "sessionStorage") {
            this._type = type;
        }
        Object.defineProperty( this, "length", {
            configurable: true,
            get: function(){ return this.getLength(); }
        });
    };

    DOMStorage.prototype = {
        _type:"localStorage",
        _result:null,
        keys:null,

        onResult:function(key,valueStr) {
            if(!this.keys) {
                this.keys = [];
            }
            this._result = valueStr;
        },

        onKeysChanged:function(jsonKeys) {
            this.keys = JSON.parse(jsonKeys);

            var key;
            for(var n = 0,len = this.keys.length; n < len; n++) {
                key = this.keys[n];
                if(!this.hasOwnProperty(key)) {
                    Object.defineProperty( this, key, {
                        configurable: true,
                        get: function(){ return this.getItem(key); },
                        set: function(val){ return this.setItem(key,val); }
                    });
                }
            }

        },

        initialize:function() {
            window.external.Notify("DOMStorage/" + this._type + "/load/keys");
        },

    /*
        The length attribute must return the number of key/value pairs currently present
        in the list associated with the object.
    */
        getLength:function() {
            if(!this.keys) {
                this.initialize();
            }
            return this.keys.length;
        },

    /*
        The key(n) method must return the name of the nth key in the list.
        The order of keys is user-agent defined, but must be consistent within an object so long as the number of keys doesn't change.
        (Thus, adding or removing a key may change the order of the keys, but merely changing the value of an existing key must not.)
        If n is greater than or equal to the number of key/value pairs in the object, then this method must return null.
    */
        key:function(n) {
            if(!this.keys) {
                this.initialize();
            }

            if(n >= this.keys.length) {
                return null;
            } else {
                return this.keys[n];
            }
        },

    /*
        The getItem(key) method must return the current value associated with the given key.
        If the given key does not exist in the list associated with the object then this method must return null.
    */
        getItem:function(key) {
            if(!this.keys) {
                this.initialize();
            }

            var retVal = null;
            if(this.keys.indexOf(key) > -1) {
                window.external.Notify("DOMStorage/" + this._type + "/get/" + key);
                retVal = window.unescape(decodeURIComponent(this._result));
                this._result = null;
            }
            return retVal;
        },
    /*
        The setItem(key, value) method must first check if a key/value pair with the given key already exists
        in the list associated with the object.
        If it does not, then a new key/value pair must be added to the list, with the given key and with its value set to value.
        If the given key does exist in the list, then it must have its value updated to value.
        If it couldn't set the new value, the method must raise an QUOTA_EXCEEDED_ERR exception.
        (Setting could fail if, e.g., the user has disabled storage for the site, or if the quota has been exceeded.)
    */
        setItem:function(key,value) {
            if(!this.keys) {
                this.initialize();
            }
            window.external.Notify("DOMStorage/" + this._type + "/set/" + key + "/" + encodeURIComponent(window.escape(value)));
        },

    /*
        The removeItem(key) method must cause the key/value pair with the given key to be removed from the list
        associated with the object, if it exists.
        If no item with that key exists, the method must do nothing.
    */
        removeItem:function(key) {
            if(!this.keys) {
                this.initialize();
            }
            var index = this.keys.indexOf(key);
            if(index > -1) {
                this.keys.splice(index,1);
                // TODO: need sanity check for keys ? like 'clear','setItem', ...
                window.external.Notify("DOMStorage/" + this._type + "/remove/" + key);
                delete this[key];
            }
        },

    /*
        The clear() method must atomically cause the list associated with the object to be emptied of all
        key/value pairs, if there are any.
        If there are none, then the method must do nothing.
    */
        clear:function() {
            if(!this.keys) {
                this.initialize();
            }

            for(var n=0,len=this.keys.length; n < len;n++) {
                // TODO: do we need a sanity check for keys ? like 'clear','setItem', ...
                delete this[this.keys[n]];
            }
            this.keys = [];
            window.external.Notify("DOMStorage/" + this._type + "/clear/");
        }
    };

    // initialize DOMStorage

    if (typeof window.localStorage === "undefined") {

        Object.defineProperty(window, "localStorage", {
            writable: false,
            configurable: false,
            value: new DOMStorage("localStorage")
        });
        window.localStorage.initialize();
    }

    if (typeof window.sessionStorage === "undefined") {
        Object.defineProperty(window, "sessionStorage", {
            writable: false,
            configurable: false,
            value: new DOMStorage("sessionStorage")
        });
        window.sessionStorage.initialize();
    }
}

})(window, document);

module.exports = null;

});

// file: lib/windowsphone/plugin/windowsphone/FileTransfer.js
define("cordova/plugin/windowsphone/FileTransfer", function(require, exports, module) {

var exec = require('cordova/exec'),
    FileTransferError = require('cordova/plugin/FileTransferError');

// Note that the only difference between this and the default implementation is the
// object literal passed to exec() in upload - jm

/**
 * FileTransfer uploads a file to a remote server.
 * @constructor
 */
var FileTransfer = function() {};

/**
* Given an absolute file path, uploads a file on the device to a remote server
* using a multipart HTTP request.
* @param filePath {String}           Full path of the file on the device
* @param server {String}             URL of the server to receive the file
* @param successCallback (Function}  Callback to be invoked when upload has completed
* @param errorCallback {Function}    Callback to be invoked upon error
* @param options {FileUploadOptions} Optional parameters such as file name and mimetype
* @param trustAllHosts {Boolean} Optional trust all hosts (e.g. for self-signed certs), defaults to false
*/

FileTransfer.prototype.upload = function(filePath, server, successCallback, errorCallback, options, trustAllHosts) {

    // sanity parameter checking
    if (!filePath || !server) throw new Error("FileTransfer.upload requires filePath and server URL parameters at the minimum.");
    // check for options
    var fileKey = null;
    var fileName = null;
    var mimeType = null;
    var params = null;
    var chunkedMode = true;

    if (options) {
        fileKey = options.fileKey;
        fileName = options.fileName;
        mimeType = options.mimeType;
        if (options.chunkedMode !== null || typeof options.chunkedMode != "undefined") {
            chunkedMode = options.chunkedMode;
        }

        // if options are specified, and NOT a string already, we will stringify it.
        if(options.params && typeof options.params != typeof "") {
            var arrParams = [];
            for(var v in options.params) {
                arrParams.push(v + "=" + options.params[v]);
            }
            params = encodeURI(arrParams.join("&"));
        }
    }

    var fail = function(e) {
        var error = new FileTransferError(e.code, e.source, e.target, e.http_status);
        errorCallback(error);
    };
    exec(successCallback, fail, 'FileTransfer', 'upload', [{"filePath":filePath,
                                                              "server":server,
                                                              "fileKey":fileKey,
                                                              "fileName":fileName,
                                                              "mimeType":mimeType,
                                                              "params":params,
                                                              "trustAllHosts":trustAllHosts,
                                                              "chunkedMode":chunkedMode}]);
};

/**
 * Downloads a file form a given URL and saves it to the specified directory.
 * @param source {String}          URL of the server to receive the file
 * @param target {String}         Full path of the file on the device
 * @param successCallback (Function}  Callback to be invoked when upload has completed
 * @param errorCallback {Function}    Callback to be invoked upon error
 */

FileTransfer.prototype.download = function(source, target, successCallback, errorCallback) {
    // sanity parameter checking
    if (!source || !target) throw new Error("FileTransfer.download requires source URI and target URI parameters at the minimum.");
    var win = function(result) {
        var entry = null;
        if (result.isDirectory) {
            entry = new (require('cordova/plugin/DirectoryEntry'))();
        }
        else if (result.isFile) {
            entry = new (require('cordova/plugin/FileEntry'))();
        }
        entry.isDirectory = result.isDirectory;
        entry.isFile = result.isFile;
        entry.name = result.name;
        entry.fullPath = result.fullPath;
        successCallback(entry);
    };

    var fail = function(e) {
        var error = new FileTransferError(e.code, e.source, e.target, e.http_status);
        errorCallback(error);
    };

    exec(win, errorCallback, 'FileTransfer', 'download', [source, target]);
};


module.exports = FileTransfer;

});

// file: lib/windowsphone/plugin/windowsphone/FileUploadOptions.js
define("cordova/plugin/windowsphone/FileUploadOptions", function(require, exports, module) {

/**
 * Options to customize the HTTP request used to upload files.
 * @constructor
 * @param fileKey {String}   Name of file request parameter.
 * @param fileName {String}  Filename to be used by the server. Defaults to image.jpg.
 * @param mimeType {String}  Mimetype of the uploaded file. Defaults to image/jpeg.
 * @param params {Object}    Object with key: value params to send to the server.
 */
var FileUploadOptions = function(fileKey, fileName, mimeType, params) {
    this.fileKey = fileKey || null;
    this.fileName = fileName || null;
    this.mimeType = mimeType || null;

    if(params && typeof params != typeof "") {
        var arrParams = [];
        for(var v in params) {
            arrParams.push(v + "=" + params[v]);
        }
        this.params = encodeURIComponent(arrParams.join("&"));
    }
    else {
        this.params = params || null;
    }
};

module.exports = FileUploadOptions;

});

// file: lib/windowsphone/plugin/windowsphone/XHRPatch/plugininit.js
define("cordova/plugin/windowsphone/XHRPatch/plugininit", function(require, exports, module) {

// TODO: the build process will implicitly wrap this in a define() call
// with a closure of its own; do you need this extra closure?

var LocalFileSystem = require('cordova/plugin/LocalFileSystem');

(function (win, doc) {

var docDomain = null;
try {
    docDomain = doc.domain;
} catch (err) {
    //console.log("caught exception trying to access document.domain");
}

if (!docDomain || docDomain.length === 0) {

    var aliasXHR = win.XMLHttpRequest;

    win.XMLHttpRequest = function () { };
    win.XMLHttpRequest.noConflict = aliasXHR;
    win.XMLHttpRequest.UNSENT = 0;
    win.XMLHttpRequest.OPENED = 1;
    win.XMLHttpRequest.HEADERS_RECEIVED = 2;
    win.XMLHttpRequest.LOADING = 3;
    win.XMLHttpRequest.DONE = 4;

    win.XMLHttpRequest.prototype = {
        UNSENT: 0,
        OPENED: 1,
        HEADERS_RECEIVED: 2,
        LOADING: 3,
        DONE: 4,

        isAsync: false,
        onreadystatechange: null,
        readyState: 0,
        _url: "",
        timeout: 0,
        withCredentials: false,
        _requestHeaders: null,
        open: function (reqType, uri, isAsync, user, password) {

            if (uri && uri.indexOf("http") === 0) {
                if (!this.wrappedXHR) {
                    this.wrappedXHR = new aliasXHR();
                    var self = this;

                    // timeout
                    if (this.timeout > 0) {
                        this.wrappedXHR.timeout = this.timeout;
                    }
                    Object.defineProperty(this, "timeout", {
                        set: function (val) {
                            this.wrappedXHR.timeout = val;
                        },
                        get: function () {
                            return this.wrappedXHR.timeout;
                        }
                    });



                    if (this.withCredentials) {
                        this.wrappedXHR.withCredentials = this.withCredentials;
                    }
                    Object.defineProperty(this, "withCredentials", {
                        set: function (val) {
                            this.wrappedXHR.withCredentials = val;
                        },
                        get: function () {
                            return this.wrappedXHR.withCredentials;
                        }
                    });


                    Object.defineProperty(this, "status", { get: function () {
                        return this.wrappedXHR.status;
                    }
                    });
                    Object.defineProperty(this, "responseText", { get: function () {
                        return this.wrappedXHR.responseText;
                    }
                    });
                    Object.defineProperty(this, "statusText", { get: function () {
                        return this.wrappedXHR.statusText;
                    }
                    });

                    Object.defineProperty(this, "responseXML", { get: function () {
                        return this.wrappedXHR.responseXML;
                    }
                    });

                    this.getResponseHeader = function (header) {
                        return this.wrappedXHR.getResponseHeader(header);
                    };
                    this.getAllResponseHeaders = function () {
                        return this.wrappedXHR.getAllResponseHeaders();
                    };

                    this.wrappedXHR.onreadystatechange = function () {
                        self.changeReadyState(self.wrappedXHR.readyState);
                    };
                }
                return this.wrappedXHR.open(reqType, uri, isAsync, user, password);
            }
            else {
                // x-wmapp1://app/www/page2.html
                // need to work some magic on the actual url/filepath
                var newUrl = uri;
                if (newUrl.indexOf(":/") > -1) {
                    newUrl = newUrl.split(":/")[1];
                }
                // prefix relative urls to our physical root
                if(newUrl.indexOf("app/www/") < 0 && this.getContentLocation() == this.contentLocation.ISOLATED_STORAGE)
                {
                    newUrl = "app/www/" + newUrl;
                }

                if (newUrl.lastIndexOf("/") === newUrl.length - 1) {
                    newUrl += "index.html"; // default page is index.html, when call is to a dir/ ( why not ...? )
                }
                this._url = newUrl;
            }
        },
        statusText: "",
        changeReadyState: function (newState) {
            this.readyState = newState;
            if (this.onreadystatechange) {
                this.onreadystatechange();
            }
        },
        setRequestHeader: function (header, value) {
            if (this.wrappedXHR) {
                this.wrappedXHR.setRequestHeader(header, value);
            }
        },
        getResponseHeader: function (header) {
            return this.wrappedXHR ? this.wrappedXHR.getResponseHeader(header) : "";
        },
        getAllResponseHeaders: function () {
            return this.wrappedXHR ? this.wrappedXHR.getAllResponseHeaders() : "";
        },
        responseText: "",
        responseXML: "",
        onResult: function (res) {
            this.status = 200;
            if(typeof res == "object")
            {   // callback result handler may have already parsed this from a string-> a JSON object,
                // if so, we need to restore its stringyness, as handlers are expecting string data.
                // especially if used with jQ -> $.getJSON
                res = JSON.stringify(res);
            }
            this.responseText = res;
            this.responseXML = res;
            this.changeReadyState(this.DONE);
        },
        onError: function (err) {
            this.status = 404;
            this.changeReadyState(this.DONE);
        },

        abort: function () {
            if (this.wrappedXHR) {
                return this.wrappedXHR.abort();
            }
        },

        send: function (data) {
            if (this.wrappedXHR) {
                return this.wrappedXHR.send(data);
            }
            else {
                this.changeReadyState(this.OPENED);

                var alias = this;

                var fail = function fail(evt) {
                    alias.onError(evt.code);
                };

                if (alias.getContentLocation() == this.contentLocation.RESOURCES) {
                    var exec = require('cordova/exec');
                    exec(function(result) {
                            alias.onResult.apply(alias, [result]);
                        },
                        fail,
                        "File", "readResourceAsText", [alias._url]
                    );
                }
                else {
                    var gotFile = function gotFile(file) {
                        var reader = new FileReader();
                        reader.onloadend = function (evt) {
                            alias.onResult.apply(alias,[evt.target.result]);
                        };
                        reader.readAsText(file);
                    };

                    var gotEntry = function gotEntry(entry) {
                        entry.file(gotFile, fail);
                    };

                    var gotFS = function gotFS(fs) {
                        fs.root.getFile(alias._url, null, gotEntry, fail);
                    };

                    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, gotFS, fail);
                }
            }
        },

        getContentLocation: function () {
            if (window.contentLocation === undefined) {
                window.contentLocation = (navigator.userAgent.toUpperCase().indexOf('MSIE 10') > -1) ?
                    this.contentLocation.RESOURCES : this.contentLocation.ISOLATED_STORAGE;
            }

            return window.contentLocation;
        },

        contentLocation:{
            ISOLATED_STORAGE: 0,
            RESOURCES: 1
        },

        status: 404
    };
} // if doc domain

// end closure wrap
})(window, document);

module.exports = null;

});

// file: lib/windowsphone/plugin/windowsphone/console.js
define("cordova/plugin/windowsphone/console", function(require, exports, module) {


var exec = require('cordova/exec'),
    channel = require('cordova/channel');
var cordova = require("cordova");

var debugConsole = {
    log:function(msg){
        exec(null,null,"DebugConsole","log",msg);
    },
    warn:function(msg){
        exec(null,null,"DebugConsole","warn",msg);
    },
    error:function(msg){
        exec(null,null,"DebugConsole","error",msg);
    }
};

var oldOnError = window.onerror;
window.onerror = function(msg,fileName,line) {
    oldOnError && oldOnError(msg,fileName,line);
    debugConsole.error(msg + " file:" + fileName + " Line:" + line);
};

module.exports = debugConsole;

});

// file: lib/windowsphone/plugin/windowsphone/console/symbols.js
define("cordova/plugin/windowsphone/console/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/windowsphone/console', 'navigator.console');
modulemapper.clobbers('cordova/plugin/windowsphone/console', 'console');

});

// file: lib/windowsphone/plugin/windowsphone/notification/plugininit.js
define("cordova/plugin/windowsphone/notification/plugininit", function(require, exports, module) {

window.alert = window.alert || require("cordova/plugin/notification").alert;
window.confirm = window.confirm || require("cordova/plugin/notification").confirm;


});

// file: lib/test/propertyreplacer.js
define("cordova/propertyreplacer", function(require, exports, module) {


// Use this helper module to stub out properties within Jasmine tests.
// Original values will be restored after each test.

var curStubs = null;

function removeAllStubs() {
    for (var i = curStubs.length - 1, stub; stub = curStubs[i]; --i) {
        stub.obj[stub.key] = stub.value;
    }
    curStubs = null;
}

exports.stub = function(obj, key, value) {
    if (!curStubs) {
        curStubs = [];
        jasmine.getEnv().currentSpec.after(removeAllStubs);
    }

    curStubs.push({
        obj: obj,
        key: key,
        value: obj[key]
    });
    obj[key] = value;
};


});

// file: lib/common/symbols.js
define("cordova/symbols", function(require, exports, module) {

var modulemapper = require('cordova/modulemapper');

// Use merges here in case others symbols files depend on this running first,
// but fail to declare the dependency with a require().
modulemapper.merges('cordova', 'cordova');
modulemapper.clobbers('cordova/exec', 'cordova.exec');
modulemapper.clobbers('cordova/exec', 'Cordova.exec');

});

// file: lib/test/testmodule.js
define("cordova/testmodule", function(require, exports, module) {

module.exports = {
    func: function() {},
    num: 2,
    obj: { str: 'hello' },
    subObj: { str: 'testSubObj' }
};

});

// file: lib/common/utils.js
define("cordova/utils", function(require, exports, module) {

var utils = exports;

/**
 * Defines a property getter / setter for obj[key].
 */
utils.defineGetterSetter = function(obj, key, getFunc, opt_setFunc) {
    if (Object.defineProperty) {
        var desc = {
            get: getFunc,
            configurable: true
        };
        if (opt_setFunc) {
            desc.set = opt_setFunc;
        }
        Object.defineProperty(obj, key, desc);
    } else {
        obj.__defineGetter__(key, getFunc);
        if (opt_setFunc) {
            obj.__defineSetter__(key, opt_setFunc);
        }
    }
};

/**
 * Defines a property getter for obj[key].
 */
utils.defineGetter = utils.defineGetterSetter;

utils.arrayIndexOf = function(a, item) {
    if (a.indexOf) {
        return a.indexOf(item);
    }
    var len = a.length;
    for (var i = 0; i < len; ++i) {
        if (a[i] == item) {
            return i;
        }
    }
    return -1;
};

/**
 * Returns whether the item was found in the array.
 */
utils.arrayRemove = function(a, item) {
    var index = utils.arrayIndexOf(a, item);
    if (index != -1) {
        a.splice(index, 1);
    }
    return index != -1;
};

utils.typeName = function(val) {
    return Object.prototype.toString.call(val).slice(8, -1);
};

/**
 * Returns an indication of whether the argument is an array or not
 */
utils.isArray = function(a) {
    return utils.typeName(a) == 'Array';
};

/**
 * Returns an indication of whether the argument is a Date or not
 */
utils.isDate = function(d) {
    return utils.typeName(d) == 'Date';
};

/**
 * Does a deep clone of the object.
 */
utils.clone = function(obj) {
    if(!obj || typeof obj == 'function' || utils.isDate(obj) || typeof obj != 'object') {
        return obj;
    }

    var retVal, i;

    if(utils.isArray(obj)){
        retVal = [];
        for(i = 0; i < obj.length; ++i){
            retVal.push(utils.clone(obj[i]));
        }
        return retVal;
    }

    retVal = {};
    for(i in obj){
        if(!(i in retVal) || retVal[i] != obj[i]) {
            retVal[i] = utils.clone(obj[i]);
        }
    }
    return retVal;
};

/**
 * Returns a wrapped version of the function
 */
utils.close = function(context, func, params) {
    if (typeof params == 'undefined') {
        return function() {
            return func.apply(context, arguments);
        };
    } else {
        return function() {
            return func.apply(context, params);
        };
    }
};

/**
 * Create a UUID
 */
utils.createUUID = function() {
    return UUIDcreatePart(4) + '-' +
        UUIDcreatePart(2) + '-' +
        UUIDcreatePart(2) + '-' +
        UUIDcreatePart(2) + '-' +
        UUIDcreatePart(6);
};

/**
 * Extends a child object from a parent object using classical inheritance
 * pattern.
 */
utils.extend = (function() {
    // proxy used to establish prototype chain
    var F = function() {};
    // extend Child from Parent
    return function(Child, Parent) {
        F.prototype = Parent.prototype;
        Child.prototype = new F();
        Child.__super__ = Parent.prototype;
        Child.prototype.constructor = Child;
    };
}());

/**
 * Alerts a message in any available way: alert or console.log.
 */
utils.alert = function(msg) {
    if (window.alert) {
        window.alert(msg);
    } else if (console && console.log) {
        console.log(msg);
    }
};


//------------------------------------------------------------------------------
function UUIDcreatePart(length) {
    var uuidpart = "";
    for (var i=0; i<length; i++) {
        var uuidchar = parseInt((Math.random() * 256), 10).toString(16);
        if (uuidchar.length == 1) {
            uuidchar = "0" + uuidchar;
        }
        uuidpart += uuidchar;
    }
    return uuidpart;
}


});


window.cordova = require('cordova');

// file: lib/scripts/bootstrap.js

(function (context) {
    var channel = require('cordova/channel');
    var platformInitChannelsArray = [channel.onNativeReady, channel.onPluginsReady];

    function logUnfiredChannels(arr) {
        for (var i = 0; i < arr.length; ++i) {
            if (arr[i].state != 2) {
                console.log('Channel not fired: ' + arr[i].type);
            }
        }
    }

    window.setTimeout(function() {
        if (channel.onDeviceReady.state != 2) {
            console.log('deviceready has not fired after 5 seconds.');
            logUnfiredChannels(platformInitChannelsArray);
            logUnfiredChannels(channel.deviceReadyChannelsArray);
        }
    }, 5000);

    // Replace navigator before any modules are required(), to ensure it happens as soon as possible.
    // We replace it so that properties that can't be clobbered can instead be overridden.
    function replaceNavigator(origNavigator) {
        var CordovaNavigator = function() {};
        CordovaNavigator.prototype = origNavigator;
        var newNavigator = new CordovaNavigator();
        // This work-around really only applies to new APIs that are newer than Function.bind.
        // Without it, APIs such as getGamepads() break.
        if (CordovaNavigator.bind) {
            for (var key in origNavigator) {
                if (typeof origNavigator[key] == 'function') {
                    newNavigator[key] = origNavigator[key].bind(origNavigator);
                }
            }
        }
        return newNavigator;
    }
    if (context.navigator) {
        context.navigator = replaceNavigator(context.navigator);
    }

    // _nativeReady is global variable that the native side can set
    // to signify that the native code is ready. It is a global since
    // it may be called before any cordova JS is ready.
    if (window._nativeReady) {
        channel.onNativeReady.fire();
    }

    /**
     * Create all cordova objects once native side is ready.
     */
    channel.join(function() {
        // Call the platform-specific initialization
        require('cordova/platform').initialize();

        // Fire event to notify that all objects are created
        channel.onCordovaReady.fire();

        // Fire onDeviceReady event once page has fully loaded, all
        // constructors have run and cordova info has been received from native
        // side.
        // This join call is deliberately made after platform.initialize() in
        // order that plugins may manipulate channel.deviceReadyChannelsArray
        // if necessary.
        channel.join(function() {
            require('cordova').fireDocumentEvent('deviceready');
        }, channel.deviceReadyChannelsArray);

    }, platformInitChannelsArray);

}(window));

// file: lib/scripts/bootstrap-test.js

var propertyreplacer = require('cordova/propertyreplacer');

require('cordova/builder').replaceHookForTesting = function(obj, key) {
    // This doesn't clean up non-clobbering assignments, nor does it work for
    // getters. It does work to un-clobber clobbered / merged symbols, which
    // is generally good enough for tests.
    if (obj[key]) {
        propertyreplacer.stub(obj, key);
    }
};



})();