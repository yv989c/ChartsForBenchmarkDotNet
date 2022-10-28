"use strict";
/**
 * @license almond 0.3.3 Copyright jQuery Foundation and other contributors.
 * Released under MIT license, http://github.com/requirejs/almond/LICENSE
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*global setTimeout: false */
var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers, defined = {}, waiting = {}, config = {}, defining = {}, hasOwn = Object.prototype.hasOwnProperty, aps = [].slice, jsSuffixRegExp = /\.js$/;
    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }
    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex, foundI, foundStarMap, starI, i, j, part, normalizedBaseParts, baseParts = baseName && baseName.split("/"), map = config.map, starMap = (map && map['*']) || {};
        //Adjust any relative paths.
        if (name) {
            name = name.split('/');
            lastIndex = name.length - 1;
            // If wanting node ID compatibility, strip .js from end
            // of IDs. Have to do this here, and not in nameToUrl
            // because node allows either .js or non .js to map
            // to same file.
            if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
            }
            // Starts with a '.' so need the baseName
            if (name[0].charAt(0) === '.' && baseParts) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that 'directory' and not name of the baseName's
                //module. For instance, baseName of 'one/two/three', maps to
                //'one/two/three.js', but we want the directory, 'one/two' for
                //this normalization.
                normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                name = normalizedBaseParts.concat(name);
            }
            //start trimDots
            for (i = 0; i < name.length; i++) {
                part = name[i];
                if (part === '.') {
                    name.splice(i, 1);
                    i -= 1;
                }
                else if (part === '..') {
                    // If at the start, or previous value is still ..,
                    // keep them so that when converted to a path it may
                    // still work when converted to a path, even though
                    // as an ID it is less than ideal. In larger point
                    // releases, may be better to just kick out an error.
                    if (i === 0 || (i === 1 && name[2] === '..') || name[i - 1] === '..') {
                        continue;
                    }
                    else if (i > 0) {
                        name.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
            //end trimDots
            name = name.join('/');
        }
        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');
            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");
                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];
                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }
                if (foundMap) {
                    break;
                }
                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }
            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }
            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }
        return name;
    }
    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);
            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }
    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }
    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }
    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }
        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }
    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix, index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }
    //Creates a parts array for a relName where first part is plugin ID,
    //second part is resource ID. Assumes relName has already been normalized.
    function makeRelParts(relName) {
        return relName ? splitPrefix(relName) : [];
    }
    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relParts) {
        var plugin, parts = splitPrefix(name), prefix = parts[0], relResourceName = relParts[1];
        name = parts[1];
        if (prefix) {
            prefix = normalize(prefix, relResourceName);
            plugin = callDep(prefix);
        }
        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relResourceName));
            }
            else {
                name = normalize(name, relResourceName);
            }
        }
        else {
            name = normalize(name, relResourceName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }
        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name,
            n: name,
            pr: prefix,
            p: plugin
        };
    };
    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }
    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            }
            else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };
    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i, relParts, args = [], callbackType = typeof callback, usingExports;
        //Use name if no relName
        relName = relName || name;
        relParts = makeRelParts(relName);
        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relParts);
                depName = map.f;
                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                }
                else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                }
                else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                }
                else if (hasProp(defined, depName) ||
                    hasProp(waiting, depName) ||
                    hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                }
                else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                }
                else {
                    throw new Error(name + ' missing ' + depName);
                }
            }
            ret = callback ? callback.apply(defined[name], args) : undefined;
            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                    cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                }
                else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        }
        else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };
    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, makeRelParts(callback)).f);
        }
        else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            }
            else {
                deps = undef;
            }
        }
        //Support require(['a'])
        callback = callback || function () { };
        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }
        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        }
        else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }
        return req;
    };
    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };
    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;
    define = function (name, deps, callback) {
        if (typeof name !== 'string') {
            throw new Error('See almond README: incorrect module build, no module name');
        }
        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }
        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };
    define.amd = {
        jQuery: true
    };
}());
define("log-2-axis", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Log2Axis = void 0;
    var Scale = Chart.Scale, LinearScale = Chart.LinearScale;
    /**
     * https://www.chartjs.org/docs/master/samples/advanced/derived-axis-type.html#log2-axis-implementation
     */
    class Log2Axis extends Scale {
        constructor(cfg) {
            super(cfg);
            this._startValue = undefined;
            this._valueRange = 0;
        }
        parse(raw, index) {
            const value = LinearScale.prototype.parse.apply(this, [raw, index]);
            return isFinite(value) && value > 0 ? value : null;
        }
        determineDataLimits() {
            const { min, max } = this.getMinMax(true);
            this.min = isFinite(min) ? Math.max(0, min) : null;
            this.max = isFinite(max) ? Math.max(0, max) : null;
        }
        buildTicks() {
            const ticks = [];
            let power = Math.floor(Math.log2(this.min || 1));
            let maxPower = Math.ceil(Math.log2(this.max || 2));
            while (power <= maxPower) {
                ticks.push({ value: Math.pow(2, power) });
                power += 1;
            }
            this.min = ticks[0].value;
            this.max = ticks[ticks.length - 1].value;
            return ticks;
        }
        configure() {
            const start = this.min;
            super.configure();
            this._startValue = Math.log2(start);
            this._valueRange = Math.log2(this.max) - Math.log2(start);
        }
        getPixelForValue(value) {
            if (value === undefined || value === 0) {
                value = this.min;
            }
            return this.getPixelForDecimal(value === this.min ? 0
                : (Math.log2(value) - this._startValue) / this._valueRange);
        }
        getValueForPixel(pixel) {
            const decimal = this.getDecimalForPixel(pixel);
            return Math.pow(2, this._startValue + decimal * this._valueRange);
        }
    }
    exports.Log2Axis = Log2Axis;
    Log2Axis.id = 'log2';
    Log2Axis.defaults = {};
});
define("chart-builder", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ScaleType = exports.Theme = exports.ChartBuilder = void 0;
    class ChartBuilder {
        constructor(canvas) {
            /*
            https://coolors.co/palette/f94144-f3722c-f8961e-f9c74f-90be6d-43aa8b-4d908e-577590
            https://coolors.co/palette/ff595e-ff924c-ffca3a-c5ca30-8ac926-36949d-1982c4-4267ac-565aa0-6a4c93
            https://coolors.co/palette/264653-287271-2a9d8f-8ab17d-babb74-e9c46a-efb366-f4a261-ee8959-e76f51
            https://coolors.co/palette/264653-287271-2a9d8f-8ab17d-e9c46a-f4a261-ee8959-e76f51
            */
            this._colors = ['#F94144', '#F3722C', '#F8961E', '#F9C74F', '#90BE6D', '#43AA8B', '#4D908E', '#577590'];
            this._benchmarkResultRows = [];
            this._theme = Theme.Dark;
            this._yAxeTextColor = '#606060';
            this._xAxeTextColor = '#606060';
            this._gridLineColor = '';
            this._creditTextColor = '';
            this._scaleType = ScaleType.Linear;
            this._chart = getChart();
            this.theme = this.theme;
            function getChart() {
                const config = {
                    type: 'bar',
                    options: {
                        maintainAspectRatio: false,
                        plugins: {
                            subtitle: {
                                display: true,
                                text: 'Made with chartbenchmark.net',
                                position: 'right',
                                align: 'center',
                                fullSize: false,
                                font: {
                                    size: 10,
                                    family: 'SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace'
                                }
                            }
                        },
                        scales: {
                            y: {
                                title: {
                                    display: true
                                }
                            },
                            x: {
                                title: {
                                    display: true
                                }
                            }
                        }
                    }
                };
                return new Chart(canvas.getContext('2d'), config);
            }
        }
        get theme() {
            return this._theme;
        }
        set theme(value) {
            switch (value) {
                case Theme.Dark:
                    this._creditTextColor = '#66666675';
                    this._gridLineColor = '#66666638';
                    break;
                case Theme.Light:
                    this._creditTextColor = '#00000040';
                    this._gridLineColor = '#0000001a';
                    break;
                default:
                    break;
            }
            this._theme = value;
            this.render();
        }
        get scaleType() {
            return this._scaleType;
        }
        set scaleType(value) {
            this._scaleType = value;
            this.render();
        }
        get chartPlugins() {
            return this._chart.config.options.plugins;
        }
        get chartScales() {
            return this._chart.config.options.scales;
        }
        loadBenchmarkResult(text) {
            this._benchmarkResultRows = text
                .split('\n')
                .map(i => i.trim())
                .filter(i => i.length > 2 && i.startsWith('|') && i.endsWith('|'))
                .filter((i, index) => index !== 1)
                .map(i => ({
                text: i,
                columns: i
                    .split('|')
                    .slice(1, -1)
                    .map(i => i.replace(/\*/g, '').trim())
            }))
                .filter(i => i.columns.some(c => c.length > 0));
            this.render();
        }
        getBenchmarkResult() {
            const rows = this._benchmarkResultRows;
            if (rows.length === 0) {
                return null;
            }
            const headerRow = rows[0];
            const methodIndex = headerRow.columns.indexOf('Method');
            const runtimeIndex = headerRow.columns.indexOf('Runtime');
            const meanIndex = headerRow.columns.lastIndexOf('Mean');
            const categoryIndexStart = Math.max(methodIndex, runtimeIndex) + 1;
            const categoryIndexEnd = meanIndex - 1;
            const methods = new Map();
            const orderByMethod = new Map();
            for (const row of rows) {
                if (row === headerRow) {
                    continue;
                }
                let category = '';
                for (let i = categoryIndexStart; i <= categoryIndexEnd; i++) {
                    const separator = category.length > 0 ? ', ' : '';
                    category += `${separator}${row.columns[i]}`;
                }
                const runtimeName = runtimeIndex >= 0 ? row.columns[runtimeIndex] : null;
                const methodNamePrefix = row.columns[methodIndex];
                const methodName = methodNamePrefix + (runtimeName !== null ? ` (${runtimeName})` : '');
                let methodInfo = methods.get(methodName);
                if (typeof (methodInfo) === 'undefined') {
                    let methodOrder = orderByMethod.get(methodNamePrefix);
                    if (typeof (methodOrder) === 'undefined') {
                        methodOrder = orderByMethod.size;
                        orderByMethod.set(methodNamePrefix, methodOrder);
                    }
                    methodInfo = {
                        name: methodName,
                        order: methodOrder,
                        values: []
                    };
                    methods.set(methodName, methodInfo);
                }
                const valueAndScale = getValueAndScale(row.columns[meanIndex]);
                methodInfo.values.push({
                    category: category,
                    value: valueAndScale.value,
                    scale: valueAndScale.scale
                });
            }
            return {
                categories: getCategories(),
                categoriesTitle: getCategoriesTitle(),
                methods: getMethods(),
                scale: inferScale()
            };
            function getCategories() {
                const categories = new Set();
                for (const method of methods) {
                    for (const value of method[1].values) {
                        categories.add(value.category);
                    }
                }
                return [...categories];
            }
            function getCategoriesTitle() {
                let title = '';
                for (let i = categoryIndexStart; i <= categoryIndexEnd; i++) {
                    const separator = title.length > 0 ? ', ' : '';
                    title += `${separator}${headerRow.columns[i]}`;
                }
                return title;
            }
            function getMethods() {
                return [...methods]
                    .map(i => i[1])
                    .sort((a, b) => a.order - b.order);
            }
            function inferScale() {
                for (const method of methods) {
                    for (const value of method[1].values) {
                        switch (value.scale) {
                            case 'us':
                            case 'μs':
                                return 'Microseconds';
                            case 'ms':
                                return 'Milliseconds';
                            case 's':
                                return 'Seconds';
                            default:
                                return value.scale;
                        }
                    }
                }
            }
            function getValueAndScale(formattedNumber) {
                const scaleSeparatorIndex = formattedNumber.indexOf(' ');
                const scale = scaleSeparatorIndex >= 0 ? formattedNumber.substring(scaleSeparatorIndex).trim() : '';
                const value = parseFloat(formattedNumber.replace(/[^0-9.]/g, ''));
                return {
                    value,
                    scale
                };
            }
        }
        render() {
            const yAxe = this.chartScales.y;
            const xAxe = this.chartScales.x;
            const chartData = this._chart.data;
            const benchmarkResult = this.getBenchmarkResult();
            if (benchmarkResult === null) {
                yAxe.title.text = '';
                xAxe.title.text = '';
                chartData.labels = [];
                chartData.datasets = [];
                this._chart.update();
                return;
            }
            this.chartPlugins.subtitle.color = this._creditTextColor;
            yAxe.title.text = benchmarkResult.scale;
            yAxe.title.color = this._yAxeTextColor;
            yAxe.grid.color = this._gridLineColor;
            switch (this.scaleType) {
                case ScaleType.Log10:
                    yAxe.type = 'logarithmic';
                    break;
                case ScaleType.Log2:
                    yAxe.type = 'log2';
                    break;
                default:
                    yAxe.type = 'linear';
                    break;
            }
            xAxe.title.text = benchmarkResult.categoriesTitle;
            xAxe.title.color = this._xAxeTextColor;
            xAxe.grid.color = this._gridLineColor;
            chartData.labels = benchmarkResult.categories;
            const indexByCategory = new Map();
            for (let index = 0; index < benchmarkResult.categories.length; index++) {
                indexByCategory.set(benchmarkResult.categories[index], index);
            }
            const colors = this._colors;
            let colorIndex = 0;
            chartData.datasets = benchmarkResult.methods
                .map(m => ({
                label: m.name,
                data: getData(m.values),
                backgroundColor: getNextColor()
            }));
            function getData(values) {
                const data = new Array(indexByCategory.size);
                for (const value of values) {
                    const index = indexByCategory.get(value.category);
                    if (index !== undefined) {
                        data[index] = value.value;
                    }
                }
                return data;
            }
            function getNextColor() {
                if ((colorIndex ^ colors.length) === 0) {
                    colorIndex = 0;
                }
                return colors[colorIndex++];
            }
            this._chart.update();
        }
    }
    exports.ChartBuilder = ChartBuilder;
    var Theme;
    (function (Theme) {
        Theme["Dark"] = "dark";
        Theme["Light"] = "light";
    })(Theme = exports.Theme || (exports.Theme = {}));
    var ScaleType;
    (function (ScaleType) {
        ScaleType["Linear"] = "linear";
        ScaleType["Log10"] = "log10";
        ScaleType["Log2"] = "log2";
    })(ScaleType = exports.ScaleType || (exports.ScaleType = {}));
});
define("app", ["require", "exports", "log-2-axis", "chart-builder"], function (require, exports, log_2_axis_1, chart_builder_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class App {
        constructor() {
            Chart.register(log_2_axis_1.Log2Axis);
            Chart.defaults.font.family = 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue","Noto Sans","Liberation Sans",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"';
            const chartWrapper = document.getElementById('chartWrapper');
            const chartCanvas = document.getElementById('chartCanvas');
            const builder = new chart_builder_1.ChartBuilder(chartCanvas);
            this.bindResultsInput(builder);
            this.bindSizeControls(chartWrapper);
            document.getElementById('themeRadioContainer').addEventListener('input', e => {
                builder.theme = e.target.value;
                switch (builder.theme) {
                    case chart_builder_1.Theme.Dark:
                        chartWrapper.classList.remove('bg-light');
                        break;
                    case chart_builder_1.Theme.Light:
                        chartWrapper.classList.add('bg-light');
                        break;
                }
            });
            document.getElementById('scaleRadioContainer').addEventListener('input', e => {
                builder.scaleType = e.target.value;
            });
            document.getElementById('copyToClipboardButton').addEventListener('click', e => {
                chartCanvas.toBlob(blob => {
                    const item = new ClipboardItem({ 'image/png': blob });
                    navigator.clipboard.write([item]);
                });
            });
            document.getElementById('downloadButton').addEventListener('click', e => {
                var link = document.createElement('a');
                link.download = 'chart.png';
                link.href = chartCanvas.toDataURL();
                link.click();
            });
            document.addEventListener('readystatechange', () => {
                if (document.readyState === 'complete') {
                    // Fixes MBC Widget Google Pay bug.
                    const widgetIFrame = document.querySelector('iframe[title*="Buy Me a Coffee"]');
                    if (widgetIFrame !== null) {
                        widgetIFrame.setAttribute('allow', 'payment');
                    }
                }
            });
        }
        bindResultsInput(builder) {
            const resultsInput = document.getElementById('resultsInput');
            resultsInput.addEventListener('input', () => {
                loadBenchmarkResult();
            });
            resultsInput.addEventListener('click', () => {
                resultsInput.value = '';
                loadBenchmarkResult();
            }, { once: true });
            loadBenchmarkResult();
            function loadBenchmarkResult() {
                builder.loadBenchmarkResult(resultsInput.value);
            }
        }
        bindSizeControls(chartWrapper) {
            const widthRangeInput = document.getElementById('widthRangeInput');
            const heightRangeInput = document.getElementById('heightRangeInput');
            if (document.body.clientWidth < 992) {
                widthRangeInput.value = '1';
            }
            updateWidth();
            updateHeight();
            widthRangeInput.addEventListener('input', updateWidth);
            heightRangeInput.addEventListener('input', updateHeight);
            function updateWidth() {
                const value = `${parseFloat(widthRangeInput.value) * 100}%`;
                widthRangeInput.title = value;
                chartWrapper.style.width = value;
            }
            function updateHeight() {
                const value = parseFloat(heightRangeInput.value);
                heightRangeInput.title = `${value * 100}%`;
                chartWrapper.style.height = `${value * 1600}px`;
            }
        }
    }
    new App();
});
