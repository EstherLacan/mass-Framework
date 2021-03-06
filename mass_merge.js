!
function(global, DOC) {
    var $$ = global.$ //保存已有同名变量
    var rmakeid = /(#.+|\W)/g; //用于处理掉href中的hash与所有特殊符号，生成长命名空间
    var NsKey = DOC.URL.replace(rmakeid, ""); //长命名空间（字符串）
    var NsVal = global[NsKey]; //长命名空间（mass对象）
    var W3C = DOC.dispatchEvent //IE9开始支持W3C的事件模型与getComputedStyle取样式值
    var html = DOC.documentElement; //HTML元素
    var head = DOC.head || DOC.getElementsByTagName("head")[0]; //HEAD元素
    var loadings = []; //正在加载中的模块列表
    var parsings = []; //储存需要绑定ID与factory对应关系的模块（标准浏览器下，先parse的script节点会先onload）
    var mass = 1; //当前框架的版本号
    var postfix = ""; //用于强制别名
    var cbi = 1e5; //用于生成回调函数的名字
    var all = "lang_fix,lang,class,interact,data,support,query,support,node_fix,node,attr_fix,attr,css_fix,css,event_fix,event,ajax,fx"
    var moduleClass = "mass" + (new Date - 0);
    var class2type = {
        "[object HTMLDocument]": "Document",
        "[object HTMLCollection]": "NodeList",
        "[object StaticNodeList]": "NodeList",
        "[object IXMLDOMNodeList]": "NodeList",
        "[object DOMWindow]": "Window",
        "[object global]": "Window",
        "null": "Null",
        "NaN": "NaN",
        "undefined": "Undefined"
    }
    var toString = class2type.toString,
    basepath
    

    function $(expr, context) { //新版本的基石
        if($.type(expr, "Function")) { //注意在safari下,typeof nodeList的类型为function,因此必须使用$.type
            return $.require(all + ",ready", expr);
        } else {
            if(!$.fn) $.error("必须加载node模块");
            return new $.fn.init(expr, context);
        }
    }
    //多版本共存
    if(typeof NsVal !== "function") {
        NsVal = $; //公用命名空间对象
        NsVal.uuid = 1;
    }
    if(NsVal.mass !== mass) {
        NsVal[mass] = $; //保存当前版本的命名空间对象到公用命名空间对象上
        if(NsVal.mass || ($$ && $$.mass == null)) {
            postfix = (mass + "").replace(/\D/g, ""); //是否强制使用多库共存
        }
    } else {
        return;
    }
    
    var has = Object.prototype.hasOwnProperty

    function mix(receiver, supplier) {
        var args = Array.apply([], arguments),
        i = 1,
        key, //如果最后参数是布尔，判定是否覆写同名属性
        ride = typeof args[args.length - 1] == "boolean" ? args.pop() : true;
        if(args.length === 1) { //处理$.mix(hash)的情形
            receiver = !this.window ? this : {};
            i = 0;
        }
        while((supplier = args[i++])) {
            for(key in supplier) { //允许对象糅杂，用户保证都是对象
                if(has.call(supplier, key) && (ride || !(key in receiver))) {
                    receiver[key] = supplier[key];
                }
            }
        }
        return receiver;
    }
    //为此版本的命名空间对象添加成员
    mix($, {
        html: html,
        head: head,
        mix: mix,
        rword: /[^, ]+/g,
        rmapper: /(\w+)_(\w+)/g,
        mass: mass,
        //大家都爱用类库的名字储存版本号，我也跟风了
        "@bind": W3C ? "addEventListener" : "attachEvent",
        
        slice: W3C ?
        function(nodes, start, end) {
            return parsings.slice.call(nodes, start, end);
        } : function(nodes, start, end) {
            var ret = [],
            n = nodes.length;
            if(end === void 0 || typeof end == "number" && isFinite(end)) {
                start = parseInt(start, 10) || 0;
                end = end == void 0 ? n : parseInt(end, 10);
                if(start < 0) {
                    start += n;
                }
                if(end > n) {
                    end = n;
                }
                if(end < 0) {
                    end += n;
                }
                for(var i = start; i < end; ++i) {
                    ret[i - start] = nodes[i];
                }
            }
            return ret;
        },
        
        getUid: W3C ?
        function(obj) { //IE9+,标准浏览器
            return obj.uniqueNumber || (obj.uniqueNumber = NsVal.uuid++);
        } : function(obj) {
            if(obj.nodeType !== 1) { //如果是普通对象，文档对象，window对象
                return obj.uniqueNumber || (obj.uniqueNumber = NsVal.uuid++);
            } //注：旧式IE的XML元素不能通过el.xxx = yyy 设置自定义属性
            var uid = obj.getAttribute("uniqueNumber");
            if(!uid) {
                uid = NsVal.uuid++;
                obj.setAttribute("uniqueNumber", uid);
            }
            return +uid; //确保返回数字
        },
        
        bind: W3C ?
        function(el, type, fn, phase) {
            el.addEventListener(type, fn, !! phase);
            return fn;
        } : function(el, type, fn) {
            el.attachEvent && el.attachEvent("on" + type, fn);
            return fn;
        },
        
        unbind: W3C ?
        function(el, type, fn, phase) {
            el.removeEventListener(type, fn || $.noop, !! phase);
        } : function(el, type, fn) {
            if(el.detachEvent) {
                el.detachEvent("on" + type, fn || $.noop);
            }
        },
        
        type: function(obj, str) {
            var result = class2type[(obj == null || obj !== obj) ? obj : toString.call(obj)] || obj.nodeName || "#";
            if(result.charAt(0) === "#") { //兼容旧式浏览器与处理个别情况,如window.opera
                //利用IE678 window == document为true,document == window竟然为false的神奇特性
                if(obj == obj.document && obj.document != obj) {
                    result = "Window"; //返回构造器名字
                } else if(obj.nodeType === 9) {
                    result = "Document"; //返回构造器名字
                } else if(obj.callee) {
                    result = "Arguments"; //返回构造器名字
                } else if(isFinite(obj.length) && obj.item) {
                    result = "NodeList"; //处理节点集合
                } else {
                    result = toString.call(obj).slice(8, -1);
                }
            }
            if(str) {
                return str === result;
            }
            return result;
        },
        
        log: function(str, page, level) {
            for(var i = 1, show = true; i < arguments.length; i++) {
                level = arguments[i]
                if(typeof level == "number") {
                    show = level <= $.config.level;
                } else if(level === true) {
                    page = true;
                }
            }
            if(show) {
                if(page === true) {
                    $.require("ready", function() {
                        var div = DOC.createElement("pre");
                        div.className = "mass_sys_log";
                        div.innerHTML = str + ""; //确保为字符串
                        DOC.body.appendChild(div);
                    });
                } else if(global.console) {
                    console.log(str);
                }else if(global.opera){
                    opera.postError(str);
                }
            }
            return str;
        },

        
        oneObject: function(array, val) {
            if(typeof array == "string") {
                array = array.match($.rword) || [];
            }
            var result = {},
            value = val !== void 0 ? val : 1;
            for(var i = 0, n = array.length; i < n; i++) {
                result[array[i]] = value;
            }
            return result;
        },
        
        config: function(settings) {
            var kernel = $.config;
            for(var p in settings) {
                if(!settings.hasOwnProperty(p)) continue;
                var prev = kernel[p];
                var curr = settings[p];
                if(prev && p === "alias") {
                    for(var c in curr) {
                        if(curr.hasOwnProperty(c)) {
                            var prevValue = prev[c];
                            var currValue = curr[c];
                            if(prevValue && prev !== curr) {
                                $.error(c + "不能重命名");
                            }
                            prev[c] = currValue;
                        }
                    }
                } else {
                    kernel[p] = curr;
                }
            }
            return this
        },
        
        exports: function(name) {
            $$ && (global.$ = $$); //多库共存
            name = name || $.config.nick; //取得当前简短的命名空间
            $.config.nick = name;
            global[NsKey] = NsVal;
            return global[name] = this;
        },
        //一个空函数
        noop: function() {},
        
        error: function(str, e) {
            throw new(e || Error)(str);
        }
    });

    (function(scripts) {
        var cur = scripts[scripts.length - 1],
        url = (cur.hasAttribute ? cur.src : cur.getAttribute("src", 4)).replace(/[?#].*/, ""),
        kernel = $.config;
        basepath = kernel.base = url.slice(0, url.lastIndexOf("/") + 1) ;
        kernel.nick = cur.getAttribute("nick") || "$";
        kernel.alias = {};
        kernel.level = 9;
    })(DOC.getElementsByTagName("script"));



    "Boolean,Number,String,Function,Array,Date,RegExp,Window,Document,Arguments,NodeList,Error".replace($.rword, function(name) {
        class2type["[object " + name + "]"] = name;
    });


    //============================加载系统===========================
    var modules = $.modules = {
        ready: {
            exports: $
        },
        mass: {
            state: 2,
            exports: $
        }
    };
    

    function parseURL(url, parent, ret) {
        //[]里面，不是开头的-要转义，因此要用/^[-a-z0-9_$]{2,}$/i而不是/^[a-z0-9_-$]{2,}
        //别名至少两个字符；不用汉字是避开字符集的问题
        if(/^(mass|ready)$/.test(url)) { //特别处理ready标识符
            return [url, "js"];
        }
        if(/^[-a-z0-9_$]{2,}$/i.test(url) && $.config.alias[url]) {
            ret = $.config.alias[url];
        } else {
            parent = parent.substr(0, parent.lastIndexOf('/'))
            if(/^(\w+)(\d)?:.*/.test(url)) { //如果用户路径包含协议
                ret = url
            } else {
                var tmp = url.charAt(0);
                if(tmp !== "." && tmp != "/") { //相对于根路径
                    ret = basepath + url;
                } else if(url.slice(0, 2) == "./") { //相对于兄弟路径
                    ret = parent + url.slice(1);
                } else if(url.slice(0, 2) == "..") { //相对于父路径
                    var arr = parent.replace(/\/$/, "").split("/");
                    tmp = url.replace(/\.\.\//g, function() {
                        arr.pop();
                        return "";
                    });
                    ret = arr.join("/") + "/" + tmp;
                } else if(tmp == "/") {
                    ret = parent + url
                } else {
                    $.error("不符合模块标识规则: " + url);
                }
            }
        }
        var ext = "js";
        tmp = ret.replace(/[?#].*/, "");
        if(/\.(css|js)$/.test(tmp)) { // 处理"http://113.93.55.202/mass.draggable"的情况
            ext = RegExp.$1;
        }
        if(ext != "css" && tmp == ret && !/\.js$/.test(ret)) { //如果没有后缀名会补上.js
            ret += ".js";
        }
        return [ret, ext];
    }


    function getCurrentScript() {
        //取得正在解析的script节点
        if(DOC.currentScript) { //firefox 4+
            return DOC.currentScript.src;
        }
        // 参考 https://github.com/samyk/jiagra/blob/master/jiagra.js
        var stack;
        try {
            a.b.c(); //强制报错,以便捕获e.stack
        } catch(e) {//safari的错误对象只有line,sourceId,sourceURL
            stack = e.stack;
            if(!stack && window.opera){
                //opera 9没有e.stack,但有e.Backtrace,但不能直接取得,需要对e对象转字符串进行抽取
                stack = (String(e).match(/of linked script \S+/g) || []).join(" ");
            }
        }
        if(stack) {
            
            stack = stack.split( /[@ ]/g).pop();//取得最后一行,最后一个空格或@之后的部分
            stack = stack[0] == "(" ? stack.slice(1,-1) : stack;
            return stack.replace(/(:\d+)?:\d+$/i, "");//去掉行号与或许存在的出错字符起始位置
        }
        var nodes = head.getElementsByTagName("script"); //只在head标签中寻找
        for(var i = 0, node; node = nodes[i++];) {
            if(node.className == moduleClass && node.readyState === "interactive") {
                return node.className = node.src;
            }
        }
    }

    function checkCycle(deps, nick) {
        //检测是否存在循环依赖
        for(var id in deps) {
            if(deps[id] == "司徒正美" && modules[id].state != 2 && (id == nick || checkCycle(modules[id].deps, nick))) {
                return true;
            }
        }
    }


    function checkDeps() {
        //检测此JS模块的依赖是否都已安装完毕,是则安装自身
        loop: for(var i = loadings.length, id; id = loadings[--i];) {
            var obj = modules[id],
            deps = obj.deps;
            for(var key in deps) {
                if(deps.hasOwnProperty(key) && modules[key].state != 2) {
                    continue loop;
                }
            }
            //如果deps是空对象或者其依赖的模块的状态都是2
            if(obj.state != 2) {
                loadings.splice(i, 1); //必须先移除再安装，防止在IE下DOM树建完后手动刷新页面，会多次执行它
                fireFactory(obj.id, obj.args, obj.factory);
                checkDeps();
            }
        }
    }

    function checkFail(node, error) {
        //检测是否死链
        var id = node.src;
        node.onload = node.onreadystatechange = node.onerror = null;
        if(error || !modules[id].state) {
            setTimeout(function() {
                head.removeChild(node);
            });
            $.log("加载 " + id + " 失败" + error + " " + (!modules[id].state), 7);
        } else {
            return true;
        }
    }

    function loadJS(url) {
        //通过script节点加载目标模块
        var node = DOC.createElement("script");
        node.className = moduleClass; //让getCurrentScript只处理类名为moduleClass的script节点
        node[W3C ? "onload" : "onreadystatechange"] = function() {
            if(W3C || /loaded|complete/i.test(node.readyState)) {
                //mass Framework会在_checkFail把它上面的回调清掉，尽可能释放回存，尽管DOM0事件写法在IE6下GC无望
                var factory = parsings.pop();
                factory && factory.delay(node.src)
                if(checkFail(node)) {
                    $.log("已成功加载 " + node.src, 7);
                }
            }
        }
        node.onerror = function() {
            checkFail(node, true)
        }

        node.src = url; //插入到head的第一个节点前，防止IE6下head标签没闭合前使用appendChild抛错
        //  if(window.netscape) { //这也避开了IE6下的自闭合base标签引起的BUG
        //       html.insertBefore(node, head); //在最新的firefox Nightly下,如果父节点还没有完成不能插入新节点
        //   } else {
        head.insertBefore(node, head.firstChild); //chrome下第二个参数不能为null
        //   }
        $.log("正准备加载 " + node.src, 7) //更重要的是IE6下可以收窄getCurrentScript的寻找范围
    }


    function loadCSS(url) {
        //通过link节点加载模块需要的CSS文件
        var id = url.replace(rmakeid, "");
        if(!DOC.getElementById(id)) {
            var node = DOC.createElement("link");
            node.rel = "stylesheet";
            node.href = url;
            node.id = id;
            head.insertBefore(node, head.firstChild);
        }
    }
    
    window.require = $.require = function(list, factory, parent) {
        // 用于检测它的依赖是否都为2
        var deps = {},
        // 用于依赖列表中的模块的返回值
        args = [],
        // 需要安装的模块数
        dn = 0,
        // 已安装完的模块数
        cn = 0,
        id = parent || "cb" + (cbi++).toString(32);
        parent = parent || basepath
        String(list).replace($.rword, function(el) {
            var array = parseURL(el, parent),
            url = array[0];
            if(array[1] == "js") {
                dn++;
                if(!modules[url]) {
                    modules[url] = {
                        id: url,
                        parent: parent,
                        exports: {}
                    };
                    loadJS(url);
                } else if(modules[url].state === 2) {
                    cn++;
                }
                if(!deps[url]) {
                    args.push(url);
                    deps[url] = "司徒正美"; //去重
                }
            } else if(array[1] === "css") {
                loadCSS(url);
            }
        });
        //创建或更新模块的状态
        modules[id] = {
            id: id,
            factory: factory,
            deps: deps,
            args: args,
            state: 1
        }
        if(dn === cn) { //如果需要安装的等于已安装好的
            fireFactory(id, args, factory); //装配到框架中
            return checkDeps();
        }
        //在正常情况下模块只能通过_checkDeps执行
        loadings.unshift(id);
    }
    
    window.define = $.define = function(id, deps, factory) { //模块名,依赖列表,模块本身
        var args = $.slice(arguments);
        if(typeof id == "string") {
            var _id = args.shift();
        }
        if(typeof args[0] === "boolean") { //用于文件合并, 在标准浏览器中跳过补丁模块
            if(args[0]) {
                return;
            }
            args.shift();
        }
        if(typeof args[0] == "function") {
            args.unshift([]);
        } //上线合并后能直接得到模块ID,否则寻找当前正在解析中的script节点的src作为模块ID
        //但getCurrentScript方法只对IE6-10,FF4+有效,其他使用onload+delay闭包组合
        id = modules[id] && modules[id].state == 2 ? _id : getCurrentScript();
        factory = args[1];
        factory.id = _id; //用于调试
        factory.delay = function(id) {
            args.push(id);
            if(checkCycle(modules[id].deps, id)) {
                $.error(id + "模块与之前的某些模块存在循环依赖");
            }
            delete factory.delay; //释放内存
            require.apply(null, args); //0,1,2 --> 1,2,0
        }
        if(id) {
            factory.delay(id, args);
        } else { //先进先出
            parsings.push(factory);
        }
    }
    $.require.amd = modules;
    

    function fireFactory(id, deps, factory) {
        for(var i = 0, array = [], d; d = deps[i++];) {
            array.push(modules[d].exports);
        }
        var module = Object(modules[id]),
        ret = factory.apply(global, array);
        module.state = 2;
        if(ret !== void 0) {
            modules[id].exports = ret;
        }
        return ret;
    }
    all.replace($.rword, function(a) {
        $.config.alias["$" + a] = basepath + a + ".js";
    });
    //============================domReady机制===========================
    var readyFn, ready = W3C ? "DOMContentLoaded" : "readystatechange";

    function fireReady() {
        modules.ready.state = 2;
        checkDeps();
        if(readyFn) {
            $.unbind(DOC, ready, readyFn);
        }
        fireReady = $.noop; //隋性函数，防止IE9二次调用_checkDeps
    }

    function doScrollCheck() {
        try { //IE下通过doScrollCheck检测DOM树是否建完
            html.doScroll("left");
            fireReady();
        } catch(e) {
            setTimeout(doScrollCheck);
        }
    };
    //在firefox3.6之前，不存在readyState属性
    //http://www.cnblogs.com/rubylouvre/archive/2012/12/18/2822912.html
    if(DOC.readyState == null) {
        var readyState = DOC.readyState = "loading";
    }
    if(DOC.readyState === "complete") {
        fireReady(); //如果在domReady之外加载
    } else {
        $.bind(DOC, ready, readyFn = function() {
            if(W3C || DOC.readyState === "complete") {
                fireReady();
                if(readyState) { //IE下不能改写DOC.readyState
                    DOC.readyState = "complete";
                }
            }
        });
        if(html.doScroll && self.eval === parent.eval) doScrollCheck();
    }
    //============================HTML5新标签支持===========================
    //IE6789必须以硬编码形式把mass.js写在页面才生效
    global.VBArray && ("abbr,article,aside,audio,bdi,canvas,data,datalist,details,figcaption,figure,footer," + "header,hgroup,m,mark,meter,nav,output,progress,section,summary,time,video").replace($.rword, function(tag) {
        DOC.createElement(tag);
    });
    //============================HTML5无缝刷新页面支持======================
    //https://developer.mozilla.org/en/DOM/window.onpopstate
    $.bind(global, "popstate", function() {
        NsKey = DOC.URL.replace(rmakeid, "");
        $.exports();
    });
    $.exports($.config.nick + postfix); //防止不同版本的命名空间冲突
//============================合并核心模块支持===========================
var define = function(a){
            if(typeof a == "string" && a.indexOf(basepath) == -1 ){
                arguments[0] = basepath + a +".js"
            }
            return $.define.apply($, arguments);
        }
        all.replace($.rword,function(a){
            modules[basepath + a + ".js"] = {
                state: 2
            }
        })//=========================================
//  语言补丁模块
//==========================================
define( "lang_fix", !!Array.isArray,["mass"], function($){
    //fix ie for..in bug
    var DONT_ENUM = $.DONT_ENUM = "propertyIsEnumerable,isPrototypeOf,hasOwnProperty,toLocaleString,toString,valueOf,constructor".split(","),
    P = "prototype",
    hasOwn = ({}).hasOwnProperty;
    for (var i in {
        toString: 1
    }){
        DONT_ENUM = false;
    }
    //第二个参数仅在浏览器支持Object.defineProperties时可用
    $.mix(Object,{
        create: function(o){
            if (arguments.length > 1) {
                $.log(" Object.create implementation only accepts the first parameter.")
            }
            function F() {}
            F.prototype = o;
            return new F();
        },
        //取得其所有键名以数组形式返回
        keys: function(obj){//ecma262v5 15.2.3.14
            var result = [];
            for(var key in obj ) if(hasOwn.call(obj,key)){
                result.push(key)
            }
            if(DONT_ENUM && obj){
                for(var i = 0 ;key =DONT_ENUM[i++]; ){
                    if(hasOwn.call(obj,key)){
                        result.push(key);
                    }
                }
            }
            return result;
        },
        getPrototypeOf  :  typeof P.__proto__ === "object" ?  function(obj){
            return obj.__proto__;
        }:function(obj){
            return obj.constructor[P];
        }

    },false);

    //用于创建javascript1.6 Array的迭代器
    function iterator(vars, body, ret) {
        var fun = 'for(var '+vars+'i=0,n = this.length;i < n;i++){'+
        body.replace('_', '((i in this) && fn.call(scope,this[i],i,this))')
        +'}'+ret
        return Function("fn,scope",fun);
    }
    $.mix(Array[P],{
        //定位操作，返回数组中第一个等于给定参数的元素的索引值。
        indexOf: function (item, index) {
            var n = this.length, i = ~~index;
            if (i < 0) i += n;
            for (; i < n; i++)
                if ( this[i] === item) return i;
            return -1;
        },
        //定位引操作，同上，不过是从后遍历。
        lastIndexOf: function (item, index) {
            var n = this.length,
            i = index == null ? n - 1 : index;
            if (i < 0) i = Math.max(0, n + i);
            for (; i >= 0; i--)
                if (this[i] === item) return i;
            return -1;
        },
        //迭代操作，将数组的元素挨个儿传入一个函数中执行。Ptototype.js的对应名字为each。
        forEach : iterator('', '_', ''),
        //迭代类 在数组中的每个项上运行一个函数，如果此函数的值为真，则此元素作为新数组的元素收集起来，并返回新数组
        filter : iterator('r=[],j=0,', 'if(_)r[j++]=this[i]', 'return r'),
        //收集操作，将数组的元素挨个儿传入一个函数中执行，然后把它们的返回值组成一个新数组返回。Ptototype.js的对应名字为collect。
        map :  iterator('r=[],', 'r[i]=_', 'return r'),
        //只要数组中有一个元素满足条件（放进给定函数返回true），那么它就返回true。Ptototype.js的对应名字为any。
        some : iterator('', 'if(_)return true', 'return false'),
        //只有数组中的元素都满足条件（放进给定函数返回true），它才返回true。Ptototype.js的对应名字为all。
        every : iterator('', 'if(!_)return false', 'return true'),
        //归化类 javascript1.8  将该数组的每个元素和前一次调用的结果运行一个函数，返回最后的结果。
        reduce: function (fn, lastResult, scope) {
            if (this.length == 0) return lastResult;
            var i = lastResult !== undefined ? 0 : 1;
            var result = lastResult !== undefined ? lastResult : this[0];
            for (var n = this.length; i < n; i++)
                result = fn.call(scope, result, this[i], i, this);
            return result;
        },
        //归化类 javascript1.8 同上，但从右向左执行。
        reduceRight: function (fn, lastResult, scope) {
            var array = this.concat().reverse();
            return array.reduce(fn, lastResult, scope);
        }
    },false);
   
    //修正IE67下unshift不返回数组长度的问题
    //http://www.cnblogs.com/rubylouvre/archive/2010/01/14/1647751.html
    if([].unshift(1) !== 1){
        var _unshift = Array[P].unshift;
        Array[P].unshift = function(){
            _unshift.apply(this, arguments);
            return this.length; //返回新数组的长度
        }
    }
    if([1,2,3].splice(1).length === 0){
        var _splice = Array[P].splice;
        Array[P].splice = function(a){
            if(arguments.length === 1){
                return _splice.call(this, a, this.length)
            }else{
                return _splice.apply(this, arguments);
            }
        }
    }
    if(!Array.isArray){
        Array.isArray = function(obj){
            return Object.prototype.toString.call(obj) =="[object Array]";
        };
    }
    //String扩展
    $.mix(String[P],{
        //ecma262v5 15.5.4.20
        //http://www.cnblogs.com/rubylouvre/archive/2009/09/18/1568794.html
        //'      dfsd '.trim() === 'dfsd''
        trim: function(){
            return  this.replace(/^[\s\xA0]+/,"").replace(/[\s\xA0]+$/,'')
        }
    },false);

    $.mix(Function[P],{
        //ecma262v5 15.3.4.5
        bind:function(scope) {
            if (arguments.length < 2 && scope===void 0) return this;
            var fn = this, argv = arguments;
            return function() {
                var args = [], i;
                for(i = 1; i < argv.length; i++)
                    args.push(argv[i]);
                for(i = 0; i < arguments.length; i++)
                    args.push(arguments[i]);
                return fn.apply(scope, args);
            };
        }
    },false);
    // Fix Date.get/setYear() (IE5-7)
    if ((new Date).getYear() > 1900) {
        Date.now = function(){
            return +new Date;
        }
        //http://stackoverflow.com/questions/5763107/javascript-date-getyear-returns-different-result-between-ie-and-firefox-how-to
        Date[P].getYear = function() {
            return this.getFullYear() - 1900;
        };
        Date[P].setYear = function(year) {
            return this.setFullYear(year );//+ 1900
        };
    }
    //http://stackoverflow.com/questions/10470810/javascript-tofixed-bug-in-ie6
    if (0.9.toFixed(0) !== '1') {
        Number.prototype.toFixed = function(n) {
            var power = Math.pow(10, n);
            var fixed = (Math.round(this * power) / power).toString();
            if(n == 0) return fixed;
            if(fixed.indexOf('.') < 0) fixed += '.';
            var padding = n + 1 - (fixed.length - fixed.indexOf('.'));
            for(var i = 0; i < padding; i++) fixed += '0';
            return fixed;
        };    
    }
    //  string.substr(start, length)参考 start
    //  要抽取的子串的起始下标。如果是一个负数，那么该参数声明从字符串的尾部开始算起的位置。也就是说，-1指定字符串中的最后一个字符，-2指倒数第二个字符，以此类推。
    var substr = String.prototype.substr;
    if('ab'.substr(-1) != 'b'){
        String.prototype.substr = function(start, length){
            start =  start < 0 ? Math.max(this.length + start, 0) : start;
            return substr.call( this, start,length);
        }
    }
    //    var testString = "0123456789";
    //    alert(testString.substr(2));
    //    // Output: 23456789
    //    alert(testString.substr(2, 5));
    //    // Output: 23456
    //    alert(testString.substr(-3));
    //    // Output: 789 IE:0123456789
    //    alert(testString.substr(-5, 2));
    //// Output: 56  IE:01
    return $
});


//=========================================
// 语言扩展模块v6 by 司徒正美
//=========================================
define("lang", Array.isArray ? ["mass"] : ["$lang_fix"], function($) {
    var global = this,
        // JSON RegExp
        rvalidchars = /^[\],:{}\s]*$/,
        rvalidescape = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,
        rvalidtokens = /"[^"\\\r\n]*"|true|false|null|-?(?:\d+\.|)\d+(?:[eE][+-]?\d+|)/g,
        rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g,
        runicode = /[\x00-\x1f"\\\u007f-\uffff]/g,
        seval = global.execScript ? "execScript" : "eval",
        rformat = /\\?\#{([^{}]+)\}/gm,
        sopen = (global.open + '').replace(/open/g, ""),
        defineProperty = Object.defineProperty

    function method(obj, name, method) {
        if(!obj[name]) {
            defineProperty(obj, name, {
                configurable: true,
                enumerable: false,
                writable: true,
                value: method
            });
        }
    }
    //IE8的Object.defineProperty只对DOM有效
    try {
        defineProperty({}, 'a', {
            get: function() {}
        });
    } catch(e) {
        method = function(obj, name, method) {
            if(!obj[name]) {
                obj[name] = method;
            }
        }
    }

    function methods(obj, map) {
        for(var name in map) {
            method(obj, name, map[name]);
        }
    }
    var tools = {
        
        isPlainObject: function(obj) {
            if(!$.type(obj, "Object") || $.isNative(obj, "reload")) {
                return false;
            }
            try { //不存在hasOwnProperty方法的对象肯定是IE的BOM对象或DOM对象
                for(var key in obj) //只有一个方法是来自其原型立即返回flase
                if(!Object.prototype.hasOwnProperty.call(obj, key)) { //不能用obj.hasOwnProperty自己查自己
                    return false
                }
            } catch(e) {
                return false;
            }
            return true;
        },
        
        isNative: function(obj, method) {
            var m = obj ? obj[method] : false,
                r = new RegExp(method, "g");
            return !!(m && typeof m != "string" && sopen === (m + "").replace(r, ""));
        },
        
        isEmptyObject: function(obj) {
            for(var i in obj) {
                return false;
            }
            return true;
        },
        
        isArrayLike: function(obj, includeString) { //是否包含字符串
            var type = $.type(obj);
            if(type === "Array" || type === "Arguments" || type === "NodeList" || includeString && type === "String") {
                return true;
            }
            if(type === "Object") {
                var i = obj.length;
                return i >= 0 && parseInt(i) === i; //非负整数
            }
            return false;
        },
        
        each: function(obj, fn, scope, map) {
            var value, i = 0,
                isArray = $.isArrayLike(obj),
                ret = [];
            if(isArray) {
                for(var n = obj.length; i < n; i++) {
                    value = fn.call(scope || obj[i], obj[i], i);
                    ret.push(value)
                    if(!map && value === false) {
                        break;
                    }
                }
            } else {
                for(i in obj) {
                    value = fn.call(scope || obj[i], obj[i], i);
                    ret.push(value)
                    if(!map && value === false) {
                        break;
                    }
                }
            }
            return map ? ret : obj;
        },
        
        map: function(obj, fn, scope) {
            return $.each(obj, fn, scope, true)
        },
        
        filter: function(obj, fn, scope) {
            for(var i = 0, n = obj.length, ret = []; i < n; i++) {
                var val = fn.call(scope || obj[i], obj[i], i);
                if(!!val) {
                    ret[ret.length] = obj[i];
                }
            }
            return ret;
        },
        
        format: function(str, object) {
            var array = $.slice(arguments, 1);
            return str.replace(rformat, function(match, name) {
                if(match.charAt(0) == "\\") return match.slice(1);
                var index = Number(name)
                if(index >= 0) return array[index];
                if(object && object[name] !== void 0) return object[name];
                return '';
            });
        },
        
        range: function(start, end, step) {
            step || (step = 1);
            if(end == null) {
                end = start || 0;
                start = 0;
            }
            var index = -1,
                length = Math.max(0, Math.ceil((end - start) / step)),
                result = Array(length);

            while(++index < length) {
                result[index] = start;
                start += step;
            }
            return result;
        },
        
        quote: String.quote ||
        function(str) {
            return '"' + str.replace(runicode, function(a) {
                switch(a) {
                case '"':
                    return '\\"';
                case '\\':
                    return '\\\\';
                case '\b':
                    return '\\b';
                case '\f':
                    return '\\f';
                case '\n':
                    return '\\n';
                case '\r':
                    return '\\r';
                case '\t':
                    return '\\t';
                }
                a = a.charCodeAt(0).toString(16);
                while(a.length < 4) a = "0" + a;
                return "\\u" + a;
            }) + '"';
        },
        
        dump: function(obj, indent) {
            indent = indent || "";
            if(obj == null) //处理null,undefined
            return indent + "obj";
            if(obj.nodeType === 9) return indent + "[object Document]";
            if(obj.nodeType) return indent + "[object " + (obj.tagName || "Node") + "]";
            var arr = [],
                type = $.type(obj),
                self = $.dump,
                next = indent + "\t";
            switch(type) {
            case "Boolean":
            case "Number":
            case "NaN":
            case "RegExp":
                return indent + obj;
            case "String":
                return indent + $.quote(obj);
            case "Function":
                return(indent + obj).replace(/\n/g, "\n" + indent);
            case "Date":
                return indent + '(new Date(' + obj.valueOf() + '))';
            case "Window":
                return indent + "[object " + type + "]";
            default:
                if($.isArrayLike(obj)) {
                    for(var i = 0, n = obj.length; i < n; ++i)
                    arr.push(self(obj[i], next).replace(/^\s* /g, next));
                    return indent + "[\n" + arr.join(",\n") + "\n" + indent + "]";
                }
                if($.isPlainObject(obj)) {
                    for(i in obj) {
                        arr.push(next + self(i) + ": " + self(obj[i], next).replace(/^\s+/g, ""));
                    }
                    return indent + "{\n" + arr.join(",\n") + "\n" + indent + "}";
                }
                return indent + "[object " + type + "]";
            }
        },
        
        parseJS: function(code) {
            //IE中，global.eval()和eval()一样只在当前作用域生效。
            //Firefox，Safari，Opera中，直接调用eval()为当前作用域，global.eval()调用为全局作用域。
            if(code && /\S/.test(code)) {
                try {
                    global[seval](code);
                } catch(e) {}
            }
        },
        
        parseJSON: function(data) {
            if(typeof data === "string") {
                data = data.trim(); //IE不会去掉字符串两边的空白
                if(global.JSON && global.JSON.parse) {
                    //使用原生的JSON.parse转换字符串为对象
                    return global.JSON.parse(data);
                }
                if(rvalidchars.test(data.replace(rvalidescape, "@").replace(rvalidtokens, "]").replace(rvalidbraces, ""))) {
                    //使用new Function生成一个JSON对象
                    return(new Function("return " + data))();
                }
            }
            $.error("Invalid JSON: " + data, TypeError);
        },
        
        parseXML: function(data, xml, tmp) {
            try {
                var mode = document.documentMode
                if(global.DOMParser && (!mode || mode > 8)) { // Standard
                    tmp = new DOMParser();
                    xml = tmp.parseFromString(data, "text/xml");
                } else { // IE
                    xml = new ActiveXObject("Microsoft.XMLDOM"); //"Microsoft.XMLDOM"
                    xml.async = "false";
                    xml.loadXML(data);
                }
            } catch(e) {
                xml = undefined;
            }
            if(!xml || !xml.documentElement || xml.getElementsByTagName("parsererror").length) {
                $.error("Invalid XML: " + data, TypeError);
            }
            return xml;
        }

    }
    $.mix(tools, false);


    "Array,Function".replace($.rword, function(method) {
        $["is" + method] = function(obj) {
            return obj && ({}).toString.call(obj) === "[object " + method + "]";
        }
    });


    if(Array.isArray) {
        $.isArray = Array.isArray;
    }
    methods(String.prototype, {

        repeat: function(n) {
            //将字符串重复n遍
            var result = "",
                target = this;
            while(n > 0) {
                if(n & 1) result += target;
                target += target;
                n >>= 1;
            }
            return result;
        },

        startsWith: function(str) {
            //判定是否以给定字符串开头
            return this.indexOf(str) === 0;
        },

        endsWith: function(str) {
            //判定是否以给定字符串结尾
            return this.lastIndexOf(str) === this.length - str.length;
        },

        contains: function(s, position) {
            //判断一个字符串是否包含另一个字符
            return ''.indexOf.call(this, s, position >> 0) !== -1;
        }
    });
    //构建四个工具方法:$.String, $.Array, $.Number, $.Object
    "String,Array,Number,Object".replace($.rword, function(Type) {
        $[Type] = function(pack) {
            var isNative = typeof pack == "string",
                //取得方法名
                methods = isNative ? pack.match($.rword) : Object.keys(pack);
            methods.forEach(function(method) {
                $[Type][method] = isNative ?
                function(obj) {
                    return obj[method].apply(obj, $.slice(arguments, 1));
                } : pack[method];
            });
        }
    });
    $.String({
        byteLen: function(target) {
            
            return target.replace(/[^\x00-\xff]/g, 'ci').length;
        },

        truncate: function(target, length, truncation) {
            //length，新字符串长度，truncation，新字符串的结尾的字段,返回新字符串
            length = length || 30;
            truncation = truncation === void(0) ? "..." : truncation;
            return target.length > length ? target.slice(0, length - truncation.length) + truncation : String(target);
        },

        camelize: function(target) {
            //转换为驼峰风格
            if(target.indexOf("-") < 0 && target.indexOf("_") < 0) {
                return target; //提前判断，提高getStyle等的效率
            }
            return target.replace(/[-_][^-_]/g, function(match) {
                return match.charAt(1).toUpperCase();
            });
        },

        underscored: function(target) {
            //转换为下划线风格
            return target.replace(/([a-z\d])([A-Z]+)/g, "$1_$2").replace(/\-/g, "_").toLowerCase();
        },

        capitalize: function(target) {
            //首字母大写
            return target.charAt(0).toUpperCase() + target.substring(1).toLowerCase();
        },

        stripTags: function(target) {
            //移除字符串中的html标签，但这方法有缺陷，如里面有script标签，会把这些不该显示出来的脚本也显示出来了
            return target.replace(/<[^>]+>/g, "");
        },

        stripScripts: function(target) {
            //移除字符串中所有的 script 标签。弥补stripTags方法的缺陷。此方法应在stripTags之前调用。
            return target.replace(/<script[^>]*>([\S\s]*?)<\/script>/img, '');
        },

        escapeHTML: function(target) {
            //将字符串经过 html 转义得到适合在页面中显示的内容, 例如替换 < 为 &lt;
            return target.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
        },

        unescapeHTML: function(target) {
            //还原为可被文档解析的HTML标签
            return target.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&") //处理转义的中文和实体字符
            .replace(/&#([\d]+);/g, function($0, $1) {
                return String.fromCharCode(parseInt($1, 10));
            });
        },


        escapeRegExp: function(target) {
            //http://stevenlevithan.com/regex/xregexp/
            //将字符串安全格式化为正则表达式的源码
            return(target + "").replace(/([-.*+?^${}()|[\]\/\\])/g, "\\$1");
        },

        pad: function(target, n, filling, right, radix) {
            //http://www.cnblogs.com/rubylouvre/archive/2010/02/09/1666165.html
            //在左边补上一些字符,默认为0
            var num = target.toString(radix || 10);
            filling = filling || "0";
            while(num.length < n) {
                if(!right) {
                    num = filling + num;
                } else {
                    num += filling;
                }
            }
            return num;
        },

        wbr: function(target) {
            
            return String(target).replace(/(?:<[^>]+>)|(?:&#?[0-9a-z]{2,6};)|(.{1})/gi, "/*combine modules*/<wbr>").replace(/><wbr>/g, ">");
        }
    });
    //字符串的原生原型方法
    $.String("charAt,charCodeAt,concat,indexOf,lastIndexOf,localeCompare,match," + "contains,endsWith,startsWith,repeat,", //es6
    "replace,search,slice,split,substring,toLowerCase,toLocaleLowerCase,toUpperCase,trim,toJSON")
    $.Array({

        contains: function(target, item) {
            //判定数组是否包含指定目标。
            return !!~target.indexOf(item);
        },

        removeAt: function(target, index) {
            //移除数组中指定位置的元素，返回布尔表示成功与否。
            return !!target.splice(index, 1).length
        },

        remove: function(target, item) {
            //移除数组中第一个匹配传参的那个元素，返回布尔表示成功与否。
            var index = target.indexOf(item);
            if(~index) return $.Array.removeAt(target, index);
            return false;
        },


        shuffle: function(target) {
            //对数组进行洗牌。若不想影响原数组，可以先拷贝一份出来操作。
            var ret = [],
                i = target.length,
                n;
            target = target.slice(0);
            while(--i >= 0) {
                n = Math.floor(Math.random() * i);
                ret[ret.length] = target[n];
                target[n] = target[i];
            }
            return ret;
        },

        random: function(target) {
            //从数组中随机抽选一个元素出来。
            return $.Array.shuffle(target.concat())[0];
        },

        flatten: function(target) {
            //对数组进行平坦化处理，返回一个一维的新数组。
            var result = [],
                self = $.Array.flatten;
            target.forEach(function(item) {
                if(Array.isArray(item)) {
                    result = result.concat(self(item));
                } else {
                    result.push(item);
                }
            });
            return result;
        },


        compact: function(target) {
            // 过滤数组中的null与undefined，但不影响原数组。
            return target.filter(function(el) {
                return el != null;
            });
        },

        sortBy: function(target, fn, scope) {
            //根据指定条件进行排序，通常用于对象数组。
            var array = target.map(function(item, index) {
                return {
                    el: item,
                    re: fn.call(scope, item, index)
                };
            }).sort(function(left, right) {
                var a = left.re,
                    b = right.re;
                return a < b ? -1 : a > b ? 1 : 0;
            });
            return $.Array.pluck(array, 'el');
        },

        groupBy: function(target, val) {
            //根据指定条件（如回调或对象的某个属性）进行分组，构成对象返回。
            var result = {};
            var iterator = $.isFunction(val) ? val : function(obj) {
                    return obj[val];
                };
            target.forEach(function(value, index) {
                var key = iterator(value, index);
                (result[key] || (result[key] = [])).push(value);
            });
            return result;
        },

        pluck: function(target, name) {
            //取得对象数组的每个元素的指定属性，组成数组返回。
            var result = [],
                prop;
            target.forEach(function(item) {
                prop = item[name];
                if(prop != null) result.push(prop);
            });
            return result;
        },

        unique: function(target) {
            // 对数组进行去重操作，返回一个没有重复元素的新数组。
            var ret = [],
                n = target.length,
                i, j; //by abcd
            for(i = 0; i < n; i++) {
                for(j = i + 1; j < n; j++)
                if(target[i] === target[j]) j = ++i;
                ret.push(target[i]);
            }
            return ret;
        },

        merge: function(first, second) {
            //合并参数二到参数一
            var i = ~~first.length,
                j = 0;
            for(var n = second.length; j < n; j++) {
                first[i++] = second[j];
            }
            first.length = i;
            return first;
        },

        union: function(target, array) {
            //对两个数组取并集。
            return $.Array.unique($.Array.merge(target, array));
        },

        intersect: function(target, array) {
            //对两个数组取交集
            return target.filter(function(n) {
                return ~array.indexOf(n);
            });
        },

        diff: function(target, array) {
            //对两个数组取差集(补集)
            var result = target.slice();
            for(var i = 0; i < result.length; i++) {
                for(var j = 0; j < array.length; j++) {
                    if(result[i] === array[j]) {
                        result.splice(i, 1);
                        i--;
                        break;
                    }
                }
            }
            return result;
        },

        min: function(target) {
            //返回数组中的最小值，用于数字数组。
            return Math.min.apply(0, target);
        },

        max: function(target) {
            //返回数组中的最大值，用于数字数组。
            return Math.max.apply(0, target);
        },

        clone: function(target) {
            //深拷贝当前数组
            var i = target.length,
                result = [];
            while(i--) result[i] = cloneOf(target[i]);
            return result;
        },

        ensure: function(target, el) {
            //只有当前数组不存在此元素时只添加它
            if(!~target.indexOf(el)) {
                target.push(el);
            }
            return target;
        },

        inGroupsOf: function(target, number, fillWith) {
            //将数组划分成N个分组，其中小组有number个数，最后一组可能小于number个数,
            //但如果第三个参数不为undefine时,我们可以拿它来填空最后一组
            var t = target.length,
                n = Math.ceil(t / number),
                fill = fillWith !== void 0,
                groups = [],
                i, j, cur
            for(i = 0; i < n; i++) {
                groups[i] = [];
                for(j = 0; j < number; j++) {
                    cur = i * number + j;
                    if(cur === t) {
                        if(fill) {
                            groups[i][j] = fillWith;
                        }
                    } else {
                        groups[i][j] = target[cur];
                    }
                }
            }
            return groups;
        },
        //可中断的forEach迭代器
        forEach: $.each,
        map: $.map
    });
    $.Array("concat,join,pop,push,shift,slice,sort,reverse,splice,unshift," + "indexOf,lastIndexOf,every,some,filter,reduce,reduceRight")
    var NumberPack = {

        limit: function(target, n1, n2) {
            //确保数值在[n1,n2]闭区间之内,如果超出限界,则置换为离它最近的最大值或最小值
            var a = [n1, n2].sort();
            if(target < a[0]) target = a[0];
            if(target > a[1]) target = a[1];
            return target;
        },

        nearer: function(target, n1, n2) {
            //求出距离指定数值最近的那个数
            var diff1 = Math.abs(target - n1),
                diff2 = Math.abs(target - n2);
            return diff1 < diff2 ? n1 : n2
        },

        round: function(target, base) {
            //http://www.cnblogs.com/xiao-yao/archive/2012/09/11/2680424.html
            if(base) {
                base = Math.pow(10, base);
                return Math.round(target * base) / base;
            } else {
                return Math.round(target);
            }
        }
    }
    "abs,acos,asin,atan,atan2,ceil,cos,exp,floor,log,pow,sin,sqrt,tan".replace($.rword, function(name) {
        NumberPack[name] = Math[name];
    });
    $.Number(NumberPack);
    $.Number("toFixed,toExponential,toPrecision,toJSON")

    function cloneOf(item) {
        var name = $.type(item);
        switch(name) {
        case "Array":
        case "Object":
            return $[name].clone(item);
        default:
            return item;
        }
    }


    function mergeOne(source, key, current) {
        //使用深拷贝方法将多个对象或数组合并成一个
        if($.isPlainObject(source[key])) { //只处理纯JS对象，不处理window与节点
            $.Object.merge(source[key], current);
        } else {
            source[key] = cloneOf(current)
        }
        return source;
    };

    $.Object({

        subset: function(target, props) {
            //根据传入数组取当前对象相关的键值对组成一个新对象返回
            var result = {};
            props.forEach(function(prop) {
                result[prop] = target[prop];
            });
            return result;
        },
        //将参数一的键值都放入回调中执行，如果回调返回false中止遍历
        forEach: $.each,
        //将参数一的键值都放入回调中执行，收集其结果返回
        map: $.map,

        clone: function(target) {
            //进行深拷贝，返回一个新对象，如果是浅拷贝请使用$.mix
            var clone = {};
            for(var key in target) {
                clone[key] = cloneOf(target[key]);
            }
            return clone;
        },
        merge: function(target, k, v) {
            //将多个对象合并到第一个参数中或将后两个参数当作键与值加入到第一个参数
            var obj, key;
            //为目标对象添加一个键值对
            if(typeof k === "string") return mergeOne(target, k, v);
            //合并多个对象
            for(var i = 1, n = arguments.length; i < n; i++) {
                obj = arguments[i];
                for(key in obj) {
                    if(obj[key] !== void 0) {
                        mergeOne(target, key, obj[key]);
                    }
                }
            }
            return target;
        },

        without: function(target, array) {
            //去掉与传入参数相同的元素
            var result = {},
                key;
            for(key in target) { //相当于构建一个新对象，把不位于传入数组中的元素赋给它
                if(!~array.indexOf(key)) {
                    result[key] = target[key];
                }
            }
            return result;
        }
    });
    $.Object("hasOwnerProperty,isPrototypeOf,propertyIsEnumerable");
    return $
});

//=========================================
// 类工厂模块 v11 by 司徒正美
//==========================================
define("class", ["$lang"], function($) {
    var
    unextend = $.oneObject(["_super", "prototype", 'extend', 'implement']),
        //不能重写的类成员列表
        rconst = /constructor|_init|_super/,
        //不能重写的原型成员列表
        classOne = $.oneObject('Object,Array,Function');

    function expand(klass, props) {
        'extend,implement'.replace($.rword, function(name) {
            var modules = props[name];
            if(classOne[$.type(modules)]) {
                klass[name].apply(klass, [].concat(modules));
                delete props[name];
            }
        });
        return klass;
    }

    var hash = {
        //继承一个父类，并将它放进_init列表中，并添加setOptions原型方法
        inherit: function(parent, init) {
            var bridge = function() {}
            if(typeof parent == "function") {
                for(var i in parent) { //继承类成员
                    this[i] = parent[i];
                }
                bridge.prototype = parent.prototype;
                this.prototype = new bridge; //继承原型成员
                this._super = parent; //指定父类
                if(!this._init) {
                    this._init = [parent]
                }
            }
            this._init = (this._init || []).concat();
            if(init) {
                this._init.push(init);
            }
            this.toString = function() {
                return(init || bridge) + ""
            }
            var proto = this.prototype;
            proto.setOptions = function() {
                var first = arguments[0];
                if(typeof first === "string") {
                    first = this[first] || (this[first] = {});
                    [].splice.call(arguments, 0, 1, first);
                } else {
                    [].unshift.call(arguments, this);
                }
                $.Object.merge.apply(null, arguments);
                return this;
            }
            return proto.constructor = this;
        },
        //添加一组原型方法
        implement: function() {
            var target = this.prototype,
                reg = rconst;
            for(var i = 0, module; module = arguments[i++];) {
                module = typeof module === "function" ? new module : module;
                Object.keys(module).forEach(function(name) {
                    if(!reg.test(name)) {
                        target[name] = module[name];
                    }
                }, this);
            }
            return this;
        },
        //添加一组类成员
        extend: function() {
            var bridge = {};
            for(var i = 0, module; module = arguments[i++];) {
                $.mix(bridge, module);
            }
            for(var key in bridge) {
                if(!unextend[key]) {
                    this[key] = bridge[key]
                }
            }
            return this;
        }
    };
    $.factory = function(obj) {
        obj = obj || {}; //父类
        var parent = obj.inherit,
            init = obj.init; //构造器
        delete obj.inherit;
        delete obj.init;
        var klass = function() {
                for(var i = 0, init; init = klass._init[i++];) {
                    init.apply(this, arguments);
                }
            };
        $.mix(klass, hash).inherit(parent, init); //添加更多类方法
        return expand(klass, obj).implement(obj);
    }
    $.mix($.factory, hash)
    return $
});

//=========================================
// 组件交互模块v1 by 司徒正美
//=========================================
define("interact", ["$class"], function($) {
    //观察者模式
    $.Observer = $.factory({
        init: function(target) {
            this._events = {};
            this._target = target || this;
        },
        bind: function(type, callback) {
            var listeners = this._events[type]
            if(listeners) {
                listeners.push(callback)
            } else {
                this._events[type] = [callback]
            }
            return this;
        },
        once: function(type, callback) {
            var self = this;
            var wrapper = function() {
                    callback.apply(self, arguments);
                    self.unbind(type, wrapper);
                };
            this.bind(type, wrapper);
            return this;
        },
        unbind: function(type, callback) {
            var n = arguments.length;
            if(n == 0) {
                this._events = {};
            } else if(n == 1) {
                this._events[type] = [];
            } else {
                var listeners = this._events[type] || [];
                var i = listeners.length;
                while(--i > -1) {
                    if(listeners[i] === callback) {
                        return listeners.splice(i, 1);
                    }
                }
            }
            return this;
        },
        fire: function(type) {
            var listeners = (this._events[type] || []).concat(); //防止影响原数组
            if(listeners.length) {
                var target = this._target,
                    args = $.slice(arguments);
                args[0] = {
                    type: type,
                    target: target
                }
                for(var i = 0, callback; callback = listeners[i++];) {
                    callback.apply(target, args);
                }
            }
        }
    });
    //用于处理需要通过N个子步骤才能完成的一些操作
    //多路监听，收集每个子步骤的执行结果，触发最终回调,解耦回调的深层嵌套
    $.Flow = $.factory({
        inherit: $.Observer,
        init: function(timeout) {
            this._fired = {}; //用于收集fire或order的参数(去掉第一个事件参数)
            if(typeof timeout == "number") {
                this.timeout = timeout; //用于order,时间限制
            }
        },
        fire: function(type, args) {
            var calls = this._events,
                normal = 2,
                listeners, ev
            while(normal--) {
                ev = normal ? type : last;
                listeners = calls[ev];
                if(listeners && listeners.length) {
                    args = $.slice(arguments, 1)
                    if(normal) { //在正常的情况下,我们需要传入一个事件对象,当然与原生事件对象差很远,只有两个属性
                        if(this._events[ev]) {
                            this._fired[ev] = args.concat();
                        }
                        args.unshift({
                            type: type,
                            target: this._target
                        })
                    }
                    for(var i = 0, callback; callback = listeners[i++];) {
                        //第一次执行目标事件,第二次执行最后的回调
                        callback.apply(this, args);
                    }
                } else {
                    break;
                }
            }
            return this;
        },
        
        refresh: function() {
            Array.prototype.push.call(arguments, false);
            _assign.apply(this, arguments);
            return this;
        },
        
        reload: function() {
            Array.prototype.push.call(arguments, true);
            _assign.apply(this, arguments);
            return this;
        },
        
        order: function(type) { //
            if(this._events[type]) {
                var cur = this._queue.shift();
                if(!this.timestamp) {
                    this.timestamp = new Date - 0
                }
                var limit = true;
                if(this.timeout && (new Date - this.timestamp > this.timeout)) {
                    limit = false;
                }
                if(type == cur && limit) {
                    this.fire.apply(this, arguments)
                } else {
                    this._queue = this._order.concat();
                    this._fired = {}
                    delete this.timestamp
                }
            }
        },
        
        repeat: function(type, times, callback) {
            var target = this._target,
                that = this,
                ret = []

            function wrapper() {
                ret.push.apply(ret, $.slice(arguments, 1));
                if(--times == 0) {
                    that.unbind(last, wrapper);
                    callback.apply(target, ret);
                }
            }
            that.bind(type, wrapper);
            return this;
        },
        done: function(callback) {
            var that = this;
            return function(err, data) {
                if(err) {
                    return that.fire('error', err);
                }
                if(typeof handler === 'string') {
                    return that.fire(callback, data);
                }
                if(arguments.length <= 2) {
                    return callback(data);
                }
                var args = $.slice(arguments, 1);
                callback.apply(null, args);
            }
        },
        fail: function(callback) {
            var that = this;
            that.once('error', function(err) {
                that.unbind();
                callback(err);
            });
            return this;
        }
    })

    $.Flow.create = function(names, callback, errorback) {
        var that = new $.Flow;
        var args = names.match($.rword) || [];
        if(typeof errorback === "function") {
            that.fail(errorback);
        }
        args.push(callback)
        that.refresh.apply(that, args);
        return that;
    };
    var last = "$" + Date.now();
    var _assign = function(name, callback, reload) {
            var flow = this,
                times = 0,
                uniq = {},
                events = name.match($.rword),
                length = events.length;
            if(!events.length) {
                return this;
            }
            this._queue = events.concat();
            this._order = events;

            function bind(key) {
                flow.bind(key, function() {
                    if(!uniq[key]) {
                        uniq[key] = true;
                        times++;
                    }
                });
            }
            //绑定所有子事件
            for(var index = 0; index < length; index++) {
                bind(events[index]);
            }

            function lastFn() {
                //如果没有达到目标次数, 或事件类型之前没有指定过
                if(times < length) {
                    return;
                }
                var result = [];
                for(index = 0; index < length; index++) {
                    result.push.apply(result, flow._fired[events[index]]);
                }
                if(reload) {
                    uniq = {};
                    times = 0;
                }
                callback.apply(flow, result);
            }
            flow.bind(last, lastFn);
        };
    //类似twitter的观察者模式，可以看作是事件强化版，感觉比广播好，也更灵活
    //单点发布 自愿收听 单向联接 分散传播
    $.Twitter = $.factory({
        init: function() {
            this.followers = [];
        },
        tweet: function(msg) {
            for(var i = 0; i < this.followers.length; i++) {
                var follower = this.followers[i];
                if(follower.handler) {
                    follower.handler.call(follower.target, msg); //deal
                }
            }
        },
        follow: function(master, handler) {
            master.followers.push({
                target: this,
                handler: handler
            });
        }
    })
    return $;
})

//==================================================
// 数据缓存模块
//==================================================
define("data", ["$lang"], function($) {
    var owners = [],
        caches = [];
    

    function add(owner) {
        var index = owners.push(owner);
        return caches[index - 1] = {
            data: {}
        };
    }
    

    function innerData(owner, name, data, pvt) { //IE678不能为文本节点注释节点添加数据
        var index = owners.indexOf(owner);
        var table = index === -1 ? add(owner) : caches[index];
        var getOne = typeof name === "string" //取得单个属性
        var cache = table;
        //私有数据都是直接放到table中，普通数据放到table.data中
        if(!pvt) {
            table = table.data;
        }
        if(name && typeof name == "object") {
            $.mix(table, name); //写入一组属性
        } else if(getOne && data !== void 0) {
            table[name] = data; //写入单个属性
        }
        if(getOne) {
            if(name in table) {
                return table[name];
            } else if(!pvt && owner && owner.nodeType == 1) {
                //对于用HTML5 data-*属性保存的数据， 如<input id="test" data-full-name="Planet Earth"/>
                //我们可以通过$("#test").data("full-name")或$("#test").data("fullName")访问到
                return $.parseData(owner, name, cache);
            }
        } else {
            return table;
        }
    }
    

    function innerRemoveData(owner, name, pvt) {
        var index = owners.indexOf(owner);
        if(index > -1) {
            var delOne = typeof name == "string",
                table = caches[index],
                cache = table,
                clear = 1
            if(delOne) {
                if(!pvt) {
                    table = table.data;
                }
                if(table) {
                    delOne = table[name];
                    delete table[name];
                }
                for(var key in cache) {
                    if(key == "data") {
                        for(var i in cache.data) {
                            clear = 0;
                            break;
                        }
                    } else {
                        clear = 0;
                        break;
                    }
                }
                if(clear) {
                    owners.splice(index, 1);
                    caches.splice(index, 1);
                }
            }
            return delOne; //返回被移除的数据
        }
    }
    var rparse = /^(?:null|false|true|NaN|\{.*\}|\[.*\])$/
    $.mix({

        hasData: function(owner) {
            //判定是否关联了数据 
            return owners.indexOf(owner) > -1;
        },

        data: function(target, name, data) {
            //读写用户数据
            return innerData(target, name, data);
        },

        _data: function(target, name, data) {
            //读写内部数据
            return innerData(target, name, data, true);
        },

        removeData: function(target, name) {
            //删除用户数据
            return innerRemoveData(target, name);
        },

        _removeData: function(target, name) {
            //移除内部数据
            return innerRemoveData(target, name, true);
        },

        parseData: function(target, name, cache, value) {
            //将HTML5 data-*的属性转换为更丰富有用的数据类型，并保存起来
            var data, _eval, key = $.String.camelize(name);
            if(cache && (key in cache)) return cache[key];
            if(arguments.length != 4) {
                var attr = "data-" + name.replace(/([A-Z])/g, "-$1").toLowerCase();
                value = target.getAttribute(attr);
            }
            if(typeof value === "string") { //转换 /^(?:\{.*\}|null|false|true|NaN)$/
                if(rparse.test(value) || +value + "" === value) {
                    _eval = true;
                }
                try {
                    data = _eval ? eval("0," + value) : value;
                } catch(e) {
                    data = value;
                }
                if(cache) {
                    cache[key] = data;
                }
            }
            return data;

        },

        mergeData: function(cur, src) {
            //合并数据
            if($.hasData(cur)) {
                var oldData = $._data(src),
                    curData = $._data(cur),
                    events = oldData.events;
                $.Object.merge(curData, oldData);
                if(events) {
                    curData.events = [];
                    for(var i = 0, item; item = events[i++];) {
                        $.event.bind(cur, item);
                    }
                }
            }
        }
    });
    return $
});


//==========================================
// 特征嗅探模块 by 司徒正美
//==========================================
define("support", ["mass"], function($) {
    var DOC = document,
        div = DOC.createElement('div'),
        TAGS = "getElementsByTagName";
    div.setAttribute("className", "t");
    div.innerHTML = ' <link/><a href="/nasami"  style="float:left;opacity:.25;">d</a>' + '<object><param/></object><table></table><input type="checkbox" checked/>';
    var a = div[TAGS]("a")[0],
        style = a.style,
        select = DOC.createElement("select"),
        input = div[TAGS]("input")[0],
        opt = select.appendChild(DOC.createElement("option"));
    //true为正常，false为不正常
    var support = $.support = {
        //标准浏览器只有在table与tr之间不存在tbody的情况下添加tbody，而IE678则笨多了,即在里面为空也乱加tbody
        insertTbody: !div[TAGS]("tbody").length,
        // 在大多数游览器中checkbox的value默认为on，唯有chrome返回空字符串
        checkOn: input.value === "on",
        //当为select添加一个新option元素时，此option会被选中，但IE与早期的safari却没有这样做,需要访问一下其父元素后才能让它处于选中状态（bug）
        optSelected: !! opt.selected,
        //IE67，无法取得用户设定的原始href值
        attrInnateHref: a.getAttribute("href") === "/nasami",
        //IE67，无法取得用户设定的原始style值，只能返回el.style（CSSStyleDeclaration）对象(bug)
        attrInnateStyle: a.getAttribute("style") !== style,
        //IE67, 对于某些固有属性需要进行映射才可以用，如class, for, char，IE8及其他标准浏览器不需要
        attrInnateName: div.className !== "t",
        //IE6-8,对于某些固有属性不会返回用户最初设置的值
        attrInnateValue: input.getAttribute("checked") == "",
        //http://www.cnblogs.com/rubylouvre/archive/2010/05/16/1736535.html
        //是否能正确返回opacity的样式值，IE8返回".25" ，IE9pp2返回0.25，chrome等返回"0.25"
        cssOpacity: style.opacity == "0.25",
        //某些浏览器不支持w3c的cssFloat属性来获取浮动样式，而是使用独家的styleFloat属性
        cssFloat: !! style.cssFloat,
        //IE678的getElementByTagName("*")无法遍历出Object元素下的param元素（bug）
        traverseAll: !! div[TAGS]("param").length,
        //https://prototype.lighthouseapp.com/projects/8886/tickets/264-ie-can-t-create-link-elements-from-html-literals
        //IE678不能通过innerHTML生成link,style,script节点（bug）
        createAll: !! div[TAGS]("link").length,
        //IE6789由于无法识别HTML5的新标签，因此复制这些新元素时也不正确（bug）
        cloneHTML5: DOC.createElement("nav").cloneNode(true).outerHTML !== "<:nav></:nav>",
        //在标准浏览器下，cloneNode(true)是不复制事件的，以防止循环引用无法释放内存，而IE却没有考虑到这一点，把事件复制了（inconformity）
        //        noCloneEvent: true,
        //现在只有firefox不支持focusin,focus事件,并且它也不支持DOMFocusIn,DOMFocusOut,并且此事件无法通过eventSupport来检测
        focusin: $["@bind"] === "attachEvent",
        //IE肯定支持
        //IE6789的innerHTML对于table,thead,tfoot,tbody,tr,col,colgroup,html,title,style,frameset是只读的（inconformity）
        innerHTML: false,
        //IE的insertAdjacentHTML与innerHTML一样，对于许多元素是只读的，另外FF8之前是不支持此API的
        insertAdjacentHTML: false,
        //是否支持createContextualFragment API，此方法发端于FF3，因此许多浏览器不支持或实现存在BUG，但它是将字符串转换为文档碎片的最高效手段
        fastFragment: false,
        //IE67不支持display:inline-block，需要通过hasLayout方法去模拟（bug）
        inlineBlock: true,
        //http://w3help.org/zh-cn/causes/RD1002
        //在IE678中，非替换元素在设置了大小与hasLayout的情况下，会将其父级元素撑大（inconformity）
        //        keepSize: true,
        //getComputedStyle API是否能支持将left, top的百分比原始值自动转换为像素值
        pixelPosition: true,
        transition: false,
        calc: false
    };
    //IE6789的checkbox、radio控件在cloneNode(true)后，新元素没有继承原来的checked属性（bug）
    input.checked = true;
    support.cloneChecked = (input.cloneNode(true).checked === true);
    support.appendChecked = input.checked;
    //添加对optDisabled,cloneAll,insertAdjacentHTML,innerHTML,fastFragment的特征嗅探
    //判定disabled的select元素内部的option元素是否也有diabled属性，没有才是标准
    //这个特性用来获取select元素的value值，特别是当select渲染为多选框时，需要注意从中去除disabled的option元素，
    //但在Safari中，获取被设置为disabled的select的值时，由于所有option元素都被设置为disabled，会导致无法获取值。
    select.disabled = true;
    support.optDisabled = !opt.disabled;
    
    //IE下对div的复制节点设置与背景有关的样式会影响到原样式,说明它在复制节点对此样式并没有深拷贝,还是共享一份内存
    div.style.backgroundClip = "content-box";
    div.cloneNode(true).style.backgroundClip = "";
    support.cloneBackgroundStyle = div.style.backgroundClip === "content-box";
    var table = div[TAGS]("table")[0]
    try { //检测innerHTML与insertAdjacentHTML在某些元素中是否存在只读（这时会抛错）
        table.innerHTML = "<tr><td>1</td></tr>";
        support.innerHTML = true;
        table.insertAdjacentHTML("afterBegin", "<tr><td>2</td></tr>");
        support.insertAdjacentHTML = true;
    } catch(e) {};

    a = select = table = opt = style = null;
    $.require("ready", function() {
        var body = DOC.body;
        if(!body) //frameset不存在body标签
        return;
        try {
            var range = DOC.createRange();
            range.selectNodeContents(body); //fix opera(9.2~11.51) bug,必须对文档进行选取
            support.fastFragment = !! range.createContextualFragment("<a>");
            $.commonRange = range;
        } catch(e) {};
        div.style.cssText = "position:absolute;top:-1000px;left:-1000px;"
        body.insertBefore(div, body.firstChild);
        var a = '<div style="height:20px;display:inline-block"></div>';
        div.innerHTML = a + a; //div默认是block,因此两个DIV会上下排列0,但inline-block会让它们左右排列
        support.inlineBlock = div.offsetHeight < 40; //检测是否支持inlineBlock
        if(window.getComputedStyle) {
            div.style.top = "1%";
            var computed = window.getComputedStyle(div, null) || {}
            support.pixelPosition = computed.top !== "1%";
            for(var arr = ["calc", "-webkit-calc", "-moz-calc"], i = 0; ib = arr[i++];) {
                div.style.width = a + "(7px + 8px)"; //注意+两边有空白
                if(computed.width == "15px") {
                    support.calc = a;
                    break;
                }
            }
        }
        //http://stackoverflow.com/questions/7337670/how-to-detect-focusin-support
        div.innerHTML = "<a href='#'></a>"
        if(!support.focusin) {
            a = div.firstChild;
            a.addEventListener('focusin', function() {
                support.focusin = true;
            }, false);
            a.focus();
        }
        div.style.width = div.style.paddingLeft = "10px"; //检测是否支持盒子模型
        support.boxModel = div.offsetWidth === 20;
        body.removeChild(div);
        div = null;
    });
    return $;
});

//=========================================
// 选择器模块 v5 开发代号Icarus
//==========================================
define("query", ["mass"], function($) {
    var global = this,
        DOC = global.document;
    $.mix({
        isXML: function(el) {
            //http://www.cnblogs.com/rubylouvre/archive/2010/03/14/1685360.
            var doc = el.ownerDocument || el
            return doc.createElement("p").nodeName !== doc.createElement("P").nodeName;
        },

        contains: function(a, b, itself) {
            // 第一个节点是否包含第二个节点
            //contains 方法支持情况：chrome+ firefox9+ ie5+, opera9.64+(估计从9.0+),safari5.1.7+
            if(a == b) {
                return !!itself;
            }
            if(a.nodeType === 9) return true;
            if(a.contains) {
                return a.contains(b);
            } else if(a.compareDocumentPosition) {
                return !!(a.compareDocumentPosition(b) & 16);
            }
            while((b = b.parentNode))
            if(a === b) return true;
            return false;
        },

        getText: function() {
            //获取某个节点的文本，如果此节点为元素节点，则取其childNodes的所有文本，
            //为了让结果在所有浏览器下一致，忽略所有空白节点，因此它非元素的innerText或textContent
            return function getText(nodes) {
                for(var i = 0, ret = "", node; node = nodes[i++];) {
                    // 对得文本节点与CDATA的内容
                    if(node.nodeType === 3 || node.nodeType === 4) {
                        ret += node.nodeValue;
                        //取得元素节点的内容
                    } else if(node.nodeType !== 8) {
                        ret += getText(node.childNodes);
                    }
                }
                return ret;
            }
        }(),
        unique: function(nodes) {
            if(nodes.length < 2) {
                return nodes;
            }
            var result = [],
                array = [],
                uniqResult = {},
                node = nodes[0],
                index, ri = 0
                //如果支持sourceIndex我们将使用更为高效的节点排序
                //http://www.cnblogs.com/jkisjk/archive/2011/01/28/array_quickly_sortby.html
            if(node.sourceIndex) { //IE opera
                for(var i = 0, n = nodes.length; i < n; i++) {
                    node = nodes[i];
                    index = node.sourceIndex + 1e8;
                    if(!uniqResult[index]) {
                        (array[ri++] = new String(index))._ = node;
                        uniqResult[index] = 1
                    }
                }
                array.sort();
                while(ri)
                result[--ri] = array[ri]._;
                return result;
            } else {
                var sortOrder = node.compareDocumentPosition ? sortOrder1 : sortOrder2;
                nodes.sort(sortOrder);
                if(sortOrder.hasDuplicate) {
                    for(i = 1; i < nodes.length; i++) {
                        if(nodes[i] === nodes[i - 1]) {
                            nodes.splice(i--, 1);
                        }
                    }
                }
                sortOrder.hasDuplicate = false;
                return nodes;
            }
        }
    });
    var reg_combinator = /^\s*([>+~,\s])\s*(\*|(?:[-\w*]|[^\x00-\xa0]|\\.)*)/
    var trimLeft = /^\s+/;
    var trimRight = /\s+$/;
    var reg_quick = /^(^|[#.])((?:[-\w]|[^\x00-\xa0]|\\.)+)$/;
    var reg_comma = /^\s*,\s*/;
    var reg_sequence = /^([#\.:]|\[\s*)((?:[-\w]|[^\x00-\xa0]|\\.)+)/;
    var reg_pseudo = /^\(\s*("([^"]*)"|'([^']*)'|[^\(\)]*(\([^\(\)]*\))?)\s*\)/;
    var reg_attrib = /^\s*(?:(\S?=)\s*(?:(['"])(.*?)\2|(#?(?:[\w\u00c0-\uFFFF\-]|\\.)*)|)|)\s*\]/
    var reg_attrval = /\\([0-9a-fA-F]{2,2})/g;
    var reg_sensitive = /^(title|id|name|class|for|href|src)$/;
    var reg_backslash = /\\/g;
    var reg_tag = /^((?:[-\w\*]|[^\x00-\xa0]|\\.)+)/; //能使用getElementsByTagName处理的CSS表达式
    if(trimLeft.test("\xA0")) {
        trimLeft = /^[\s\xA0]+/;
        trimRight = /[\s\xA0]+$/;
    }

    var hash_operator = {
        "=": 1,
        "!=": 2,
        "|=": 3,
        "~=": 4,
        "^=": 5,
        "$=": 6,
        "*=": 7
    }

    function sortOrder1(a, b) {
        if(a === b) {
            sortOrder1.hasDuplicate = true;
            return 0;
        }
        if(!a.compareDocumentPosition || !b.compareDocumentPosition) {
            return a.compareDocumentPosition ? -1 : 1;
        }
        return a.compareDocumentPosition(b) & 4 ? -1 : 1;
    };

    function sortOrder2(a, b) { //处理旧式的标准浏览器与XML
        if(a === b) {
            sortOrder2.hasDuplicate = true;
            return 0;
        }
        var al, bl, ap = [],
            bp = [],
            aup = a.parentNode,
            bup = b.parentNode,
            cur = aup;
        //如果是属于同一个父节点，那么就比较它们在childNodes中的位置
        if(aup === bup) {
            return siblingCheck(a, b);
            // If no parents were found then the nodes are disconnected
        } else if(!aup) {
            return -1;

        } else if(!bup) {
            return 1;
        }
        // Otherwise they're somewhere else in the tree so we need
        // to build up a full list of the parentNodes for comparison
        while(cur) {
            ap.unshift(cur);
            cur = cur.parentNode;
        }

        cur = bup;

        while(cur) {
            bp.unshift(cur);
            cur = cur.parentNode;
        }

        al = ap.length;
        bl = bp.length;

        for(var i = 0; i < al && i < bl; i++) {
            if(ap[i] !== bp[i]) {
                return siblingCheck(ap[i], bp[i]);
            }
        }
        return i === al ? siblingCheck(a, bp[i], -1) : siblingCheck(ap[i], b, 1);
    };

    function siblingCheck(a, b, ret) {
        if(a === b) {
            return ret;
        }
        var cur = a.nextSibling;

        while(cur) {
            if(cur === b) {
                return -1;
            }
            cur = cur.nextSibling;
        }
        return 1;
    }
    var slice = Array.prototype.slice,
        makeArray = function(nodes, result, flag_multi) {
            nodes = slice.call(nodes, 0);
            if(result) {
                result.push.apply(result, nodes);
            } else {
                result = nodes;
            }
            return flag_multi ? $.unique(result) : result;
        };
    //IE56789无法使用数组方法转换节点集合
    try {
        slice.call($.html.childNodes, 0)[0].nodeType;
    } catch(e) {
        makeArray = function(nodes, result, flag_multi) {
            var ret = result || [],
                ri = ret.length;
            for(var i = 0, el; el = nodes[i++];) {
                ret[ri++] = el
            }
            return flag_multi ? $.unique(ret) : ret;
        }
    }

    function _toHex(x, y) {
        return String.fromCharCode(parseInt(y, 16));
    }

    function parse_nth(expr) {
        var orig = expr
        expr = expr.replace(/^\+|\s*/g, ''); //清除无用的空白
        var match = (expr === "even" && "2n" || expr === "odd" && "2n+1" || !/\D/.test(expr) && "0n+" + expr || expr).match(/(-?)(\d*)n([-+]?\d*)/);
        return parse_nth[orig] = {
            a: (match[1] + (match[2] || 1)) - 0,
            b: match[3] - 0
        };
    }

    function getElementsByTagName(tagName, els, flag_xml) {
        var method = "getElementsByTagName",
            elems = [],
            uniqResult = {},
            prefix
        if(flag_xml && tagName.indexOf(":") > 0 && els.length && els[0].lookupNamespaceURI) {
            var arr = tagName.split(":");
            prefix = arr[0];
            tagName = arr[1];
            method = "getElementsByTagNameNS";
            prefix = els[0].lookupNamespaceURI(prefix);
        }
        switch(els.length) {
        case 0:
            return elems;
        case 1:
            //在IE67下，如果存在一个name为length的input元素，下面的all.length返回此元素，而不是长度值
            var all = prefix ? els[0][method](prefix, tagName) : els[0][method](tagName);
            for(var i = 0, ri = 0, el; el = all[i++];) {
                if(el.nodeType === 1) { //防止混入注释节点
                    elems[ri++] = el
                }
            }
            return elems;
        default:
            for(i = 0, ri = 0; el = els[i++];) {
                var nodes = prefix ? el[method](prefix, tagName) : el[method](tagName)
                for(var j = 0, node; node = nodes[j++];) {
                    var uid = $.getUid(node);

                    if(!uniqResult[uid]) {
                        uniqResult[uid] = elems[ri++] = node;
                    }
                }
            }
            return elems;
        }
    }
    //IE9 以下的XML文档不能直接设置自定义属性
    var attrURL = $.oneObject('action,cite,codebase,data,href,longdesc,lowsrc,src,usemap', 2);
    var bools = $["@bools"] = "autofocus,autoplay,async,checked,controls,declare,disabled,defer,defaultChecked," + "contentEditable,ismap,loop,multiple,noshade,open,noresize,readOnly,selected"
    var boolOne = $.oneObject(bools.toLowerCase());

    //检测各种BUG（fixGetAttribute，fixHasAttribute，fixById，fixByTag）
    var fixGetAttribute, fixHasAttribute, fixById, fixByTag;
    var getHTMLText = new Function("els", "return els[0]." + ($.html.textContent ? "textContent" : "innerText"));

    new function() {
        var select = DOC.createElement("select");
        var option = select.appendChild(DOC.createElement("option"));
        option.setAttribute("selected", "selected")
        option.className = "x"
        fixGetAttribute = option.getAttribute("class") != "x";
        select.appendChild(DOC.createComment(""));
        fixByTag = select.getElementsByTagName("*").length == 2
        var all = DOC.getElementsByTagName("*"),
            node, nodeType, comments = [],
            i = 0,
            j = 0;
        while((node = all[i++])) {
            nodeType = node.nodeType;
            nodeType === 1 ? $.getUid(node) : nodeType === 8 ? comments.push(node) : 0;
        }
        while((node = comments[j++])) {
            node.parentNode.removeChild(node);
        }
        fixHasAttribute = select.hasAttribute ? !option.hasAttribute('selected') : true;

        var form = DOC.createElement("div"),
            id = "fixId" + (new Date()).getTime(),
            root = $.html;
        form.innerHTML = "<a name='" + id + "'/>";
        root.insertBefore(form, root.firstChild);
        fixById = !! DOC.getElementById(id);
        root.removeChild(form)
    };

    //http://www.atmarkit.co.jp/fxml/tanpatsu/24bohem/01.html
    //http://msdn.microsoft.com/zh-CN/library/ms256086.aspx
    //https://developer.mozilla.org/cn/DOM/document.evaluate
    //http://d.hatena.ne.jp/javascripter/20080425/1209094795


    function getElementsByXPath(xpath, context, doc) {
        var result = [];
        try {
            if(global.DOMParser) { //IE9支持DOMParser，但我们不能使用doc.evaluate!global.DOMParser
                var nodes = doc.evaluate(xpath, context, null, 7, null);
                for(var i = 0, n = nodes.snapshotLength; i < n; i++) {
                    result[i] = nodes.snapshotItem(i)
                }
            } else {
                nodes = context.selectNodes(xpath);
                for(i = 0, n = nodes.length; i < n; i++) {
                    result[i] = nodes[i]
                }
            }
        } catch(e) {
            return false;
        }
        return result;
    };
    
    //http://webbugtrack.blogspot.com/
    var Icarus = $.query = function(expr, contexts, result, lastResult, flag_xml, flag_multi, flag_dirty) {
            result = result || [];
            contexts = contexts || DOC;
            var pushResult = makeArray;
            if(!contexts.nodeType) { //实现对多上下文的支持
                contexts = pushResult(contexts);
                if(!contexts.length) return result
            } else {
                contexts = [contexts];
            }
            var rrelative = reg_combinator,
                //保存到本地作用域
                rquick = reg_quick,
                rBackslash = reg_backslash,
                rcomma = reg_comma,
                //用于切割并联选择器
                context = contexts[0],
                doc = context.ownerDocument || context,
                rtag = reg_tag,
                flag_all, uniqResult, elems, nodes, tagName, last, ri, uid;
            //将这次得到的结果集放到最终结果集中
            //如果要从多个上下文中过滤孩子
            expr = expr.replace(trimLeft, "").replace(trimRight, "");
            flag_xml = flag_xml !== void 0 ? flag_xml : $.isXML(doc);
            if(flag_xml && expr === "body" && context.body) return pushResult([context.body], result, flag_multi);
            if(!flag_xml && doc.querySelectorAll) {
                var query = expr;
                if(contexts.length > 2 || doc.documentMode == 8 && context.nodeType == 1) {
                    if(contexts.length > 2) context = doc;
                    query = ".fix_icarus_sqa " + query; //IE8也要使用类名确保查找范围
                    for(var i = 0, node; node = contexts[i++];) {
                        if(node.nodeType === 1) {
                            node.className = "fix_icarus_sqa " + node.className;
                        }
                    }
                }
                if(doc.documentMode !== 8 || context.nodeName.toLowerCase() !== "object") {
                    try {
                        return pushResult(context.querySelectorAll(query), result, flag_multi);
                    } catch(e) {} finally {
                        if(query.indexOf(".fix_icarus_sqa") === 0) { //如果为上下文添加了类名，就要去掉类名
                            for(i = 0; node = contexts[i++];) {
                                if(node.nodeType === 1) {
                                    node.className = node.className.replace("fix_icarus_sqa ", "");
                                }
                            }
                        }
                    }
                }
            }
            var match = expr.match(rquick);
            if(match) { //对只有单个标签，类名或ID的选择器进行提速
                var value = match[2].replace(rBackslash, ""),
                    key = match[1];
                if(key == "") { //tagName;
                    nodes = getElementsByTagName(value, contexts, flag_xml);
                } else if(key === "." && contexts.length === 1) { //className，并且上下文只有1个
                    if(flag_xml) { //如果XPATH查找失败，就会返回字符，那些我们就使用普通方式去查找
                        nodes = getElementsByXPath("//*[@class='" + value + "']", context, doc);
                    } else if(context.getElementsByClassName) {
                        nodes = context.getElementsByClassName(value);
                    }
                } else if(key === "#" && contexts.length === 1) { //ID，并且上下文只有1个
                    if(flag_xml) {
                        nodes = getElementsByXPath("//*[@id='" + value + "']", context, doc);
                        //基于document的查找是不安全的，因为生成的节点可能还没有加入DOM树，比如$("<div id=\"A'B~C.D[E]\"><p>foo</p></div>").find("p")
                    } else if(context.nodeType == 9) {
                        node = doc.getElementById(value);
                        //IE67 opera混淆表单元素，object以及链接的ID与NAME
                        //http://webbugtrack.blogspot.com/2007/08/bug-152-getelementbyid-returns.html
                        nodes = !node ? [] : !fixById ? [node] : node.getAttributeNode("id").nodeValue === value ? [node] : false;
                    }
                }
                if(nodes) {
                    return pushResult(nodes, result, flag_multi);
                }
            }
            //执行效率应该是内大外小更高一写
            lastResult = contexts;
            if(lastResult.length) {
                loop: while(expr && last !== expr) {
                    flag_dirty = false;
                    elems = null;
                    uniqResult = {};
                    //处理夹在中间的关系选择器（取得连接符及其后的标签选择器或通配符选择器）
                    if(match = expr.match(rrelative)) {
                        expr = RegExp.rightContext;
                        elems = [];
                        tagName = (flag_xml ? match[2] : match[2].toUpperCase()).replace(rBackslash, "") || "*";
                        i = 0;
                        ri = 0;
                        flag_all = tagName === "*"; // 表示无需判定tagName
                        switch(match[1]) { //根据连接符取得种子集的亲戚，组成新的种子集
                        case " ":
                            //后代选择器
                            if(expr.length || match[2]) { //如果后面还跟着东西或最后的字符是通配符
                                elems = getElementsByTagName(tagName, lastResult, flag_xml);
                            } else {
                                elems = lastResult;
                                break loop
                            }
                            break;
                        case ">":
                            //亲子选择器
                            while((node = lastResult[i++])) {
                                for(node = node.firstChild; node; node = node.nextSibling) {
                                    if(node.nodeType === 1 && (flag_all || tagName === node.nodeName)) {
                                        elems[ri++] = node;
                                    }
                                }
                            }
                            break;
                        case "+":
                            //相邻选择器
                            while((node = lastResult[i++])) {
                                while((node = node.nextSibling)) {
                                    if(node.nodeType === 1) {
                                        if(flag_all || tagName === node.nodeName) elems[ri++] = node;
                                        break;
                                    }
                                }
                            }
                            break;
                        case "~":
                            //兄长选择器
                            while((node = lastResult[i++])) {
                                while((node = node.nextSibling)) {
                                    if(node.nodeType === 1 && (flag_all || tagName === node.nodeName)) {
                                        uid = $.getUid(node);
                                        if(uniqResult[uid]) {
                                            break;
                                        } else {
                                            uniqResult[uid] = elems[ri++] = node;
                                        }
                                    }
                                }
                            }
                            elems = $.unique(elems);
                            break;
                        }
                    } else if(match = expr.match(rtag)) { //处理位于最开始的或并联选择器之后的标签选择器或通配符
                        expr = RegExp.rightContext;
                        elems = getElementsByTagName(match[1].replace(rBackslash, ""), lastResult, flag_xml);
                    }

                    if(expr) {
                        var arr = Icarus.filter(expr, elems, lastResult, doc, flag_xml);
                        expr = arr[0];
                        elems = arr[1];
                        if(!elems) {
                            flag_dirty = true;
                            elems = getElementsByTagName("*", lastResult, flag_xml);
                        }
                        if(match = expr.match(rcomma)) {
                            expr = RegExp.rightContext;
                            pushResult(elems, result);
                            return Icarus(expr, contexts, result, [], flag_xml, true, flag_dirty);
                        } else {
                            lastResult = elems;
                        }
                    }

                }
            }
            if(flag_multi) {
                if(elems.length) {
                    return pushResult(elems, result, flag_multi);
                }
            } else if(DOC !== doc || fixByTag && flag_dirty) {
                for(result = [], ri = 0, i = 0; node = elems[i++];)
                if(node.nodeType === 1) result[ri++] = node;
                return result
            }
            return elems;
        }
    var onePosition = $.oneObject("eq,gt,lt,first,last,even,odd");

    $.mix(Icarus, {
        //getAttribute总会返回字符串
        //http://reference.sitepoint.com/javascript/Element/getAttribute
        getAttribute: !fixGetAttribute ?
        function(elem, name) {
            return elem.getAttribute(name) || '';
        } : function(elem, name, flag_xml) {
            if(flag_xml) return elem.getAttribute(name) || '';
            name = name.toLowerCase();
            //http://jsfox.cn/blog/javascript/get-right-href-attribute.html
            if(attrURL[name]) { //得到href属性里原始链接，不自动转绝对地址、汉字和符号都不编码
                return elem.getAttribute(name, 2) || ''
            }
            if(name === "style") {
                return elem.style.cssText.toLowerCase();
            }
            if(elem.tagName === "INPUT" && name == "type") {
                return elem.getAttribute("type") || elem.type; //IE67无法辩识HTML5添加添加的input类型，如input[type=search]，不能使用el.type与el.getAttributeNode去取。
            }
            //布尔属性，如果为true时则返回其属性名，否则返回空字符串，其他一律使用getAttributeNode
            var attr = boolOne[name] ? (elem.getAttribute(name) ? name : '') : (elem = elem.getAttributeNode(name)) && elem.value || '';
            return reg_sensitive.test(name) ? attr : attr.toLowerCase();
        },
        hasAttribute: !fixHasAttribute ?
        function(elem, name, flag_xml) {
            return flag_xml ? !! elem.getAttribute(name) : elem.hasAttribute(name);
        } : function(elem, name) {
            //http://help.dottoro.com/ljnqsrfe.php
            name = name.toLowerCase();
            //如果这个显式设置的属性是""，即使是outerHTML也寻不见其踪影
            elem = elem.getAttributeNode(name);
            return !!(elem && (elem.specified || elem.nodeValue));
        },
        filter: function(expr, elems, lastResult, doc, flag_xml, flag_get) {
            var rsequence = reg_sequence,
                rattrib = reg_attrib,
                rpseudo = reg_pseudo,
                rBackslash = reg_backslash,
                rattrval = reg_attrval,
                pushResult = makeArray,
                toHex = _toHex,
                _hash_op = hash_operator,
                parseNth = parse_nth,
                match, key, tmp;
            while(match = expr.match(rsequence)) { //主循环
                expr = RegExp.rightContext;
                key = (match[2] || "").replace(rBackslash, "");
                if(!elems) { //取得用于过滤的元素
                    if(lastResult.length === 1 && lastResult[0] === doc) {
                        switch(match[1]) {
                        case "#":
                            if(!flag_xml) { //FF chrome opera等XML文档中也存在getElementById，但不能用
                                tmp = doc.getElementById(key);
                                if(!tmp) {
                                    elems = [];
                                    continue;
                                }
                                //处理拥有name值为"id"的控件的form元素
                                if(fixById ? tmp.id === key : tmp.getAttributeNode("id").nodeValue === key) {
                                    elems = [tmp];
                                    continue;
                                }
                            }
                            break;
                        case ":":
                            switch(key) {
                            case "root":
                                elems = [doc.documentElement];
                                continue;
                            case "link":
                                elems = pushResult(doc.links || []);
                                continue;
                            }
                            break;
                        }
                    }
                    elems = getElementsByTagName("*", lastResult, flag_xml); //取得过滤元
                }
                //取得用于过滤的函数，函数参数或数组
                var filter = 0,
                    flag_not = false,
                    args;
                switch(match[1]) {
                case "#":
                    //ID选择器
                    filter = ["id", "=", key];
                    break;
                case ".":
                    //类选择器
                    filter = ["class", "~=", key];
                    break;
                case ":":
                    //伪类选择器
                    tmp = Icarus.pseudoHooks[key];
                    if(match = expr.match(rpseudo)) {
                        expr = RegExp.rightContext;
                        if( !! ~key.indexOf("nth")) {
                            args = parseNth[match[1]] || parseNth(match[1]);
                        } else {
                            args = match[3] || match[2] || match[1]
                        }
                    }
                    if(tmp) {
                        filter = tmp;
                    } else if(key === "not") {
                        flag_not = true;
                        if(args === "*") { //处理反选伪类中的通配符选择器
                            elems = [];
                        } else if(reg_tag.test(args)) { //处理反选伪类中的标签选择器
                            tmp = [];
                            match = flag_xml ? args : args.toUpperCase();
                            for(var i = 0, ri = 0, elem; elem = elems[i++];)
                            if(match !== elem.nodeName) tmp[ri++] = elem;
                            elems = tmp;
                        } else {
                            var obj = Icarus.filter(args, elems, lastResult, doc, flag_xml, true);
                            filter = obj.filter;
                            args = obj.args;
                        }
                    } else {
                        $.error('An invalid or illegal string was specified : "' + key + '"!');
                    }
                    break
                default:
                    filter = [key.toLowerCase()];
                    if((match = expr.match(rattrib))) {
                        expr = RegExp.rightContext;
                        if(match[1]) {
                            filter[1] = match[1]; //op
                            filter[2] = match[3] || match[4]; //对值进行转义
                            filter[2] = filter[2] ? filter[2].replace(rattrval, toHex).replace(rBackslash, "") : "";
                        }
                    }
                    break;
                }
                if(flag_get) {
                    return {
                        filter: filter,
                        args: args
                    }
                }
                //如果条件都俱备，就开始进行筛选 
                if(elems.length && filter) {
                    tmp = [];
                    i = 0;
                    ri = 0;
                    if(typeof filter === "function") { //如果是一些简单的伪类
                        if(onePosition[key]) {
                            //如果args为void则将集合的最大索引值传进去，否则将exp转换为数字
                            args = args === void 0 ? elems.length - 1 : ~~args;
                            for(; elem = elems[i];) {
                                if(filter(i++, args) ^ flag_not) tmp[ri++] = elem;
                            }
                        } else {
                            while((elem = elems[i++])) {
                                if(( !! filter(elem, args)) ^ flag_not) tmp[ri++] = elem;
                            }
                        }
                    } else if(typeof filter.exec === "function") { //如果是子元素过滤伪类
                        tmp = filter.exec({
                            not: flag_not,
                            xml: flag_xml
                        }, elems, args, doc);
                    } else {
                        var name = filter[0],
                            op = _hash_op[filter[1]],
                            val = filter[2] || "",
                            flag, attr;
                        if(!flag_xml && name === "class" && op === 4) { //如果是类名
                            val = " " + val + " ";
                            while((elem = elems[i++])) {
                                var className = elem.className;
                                if( !! (className && (" " + className + " ").indexOf(val) > -1) ^ flag_not) {
                                    tmp[ri++] = elem;
                                }
                            }
                        } else {
                            if(!flag_xml && op && val && !reg_sensitive.test(name)) {
                                val = val.toLowerCase();
                            }
                            if(op === 4) {
                                val = " " + val + " ";
                            }
                            while((elem = elems[i++])) {
                                if(!op) {
                                    flag = Icarus.hasAttribute(elem, name, flag_xml); //[title]
                                } else if(val === "" && op > 3) {
                                    flag = false
                                } else {
                                    attr = Icarus.getAttribute(elem, name, flag_xml);
                                    switch(op) {
                                    case 1:
                                        // = 属性值全等于给出值
                                        flag = attr === val;
                                        break;
                                    case 2:
                                        //!= 非标准，属性值不等于给出值
                                        flag = attr !== val;
                                        break;
                                    case 3:
                                        //|= 属性值以“-”分割成两部分，给出值等于其中一部分，或全等于属性值
                                        flag = attr === val || attr.substr(0, val.length + 1) === val + "-";
                                        break;
                                    case 4:
                                        //~= 属性值为多个单词，给出值为其中一个。
                                        flag = attr && (" " + attr + " ").indexOf(val) >= 0;
                                        break;
                                    case 5:
                                        //^= 属性值以给出值开头
                                        flag = attr && attr.indexOf(val) === 0;
                                        break;
                                    case 6:
                                        //$= 属性值以给出值结尾
                                        flag = attr && attr.substr(attr.length - val.length) === val;
                                        break;
                                    case 7:
                                        //*= 属性值包含给出值
                                        flag = attr && attr.indexOf(val) >= 0;
                                        break;
                                    }
                                }
                                if(flag ^ flag_not) tmp[ri++] = elem;
                            }
                        }
                    }
                    elems = tmp;
                }
            }
            return [expr, elems];
        }
    });

    //===================构建处理伪类的适配器=====================
    var filterPseudoHasExp = function(strchild, strsibling, type) {
            return {
                exec: function(flags, lastResult, args) {
                    var result = [],
                        flag_not = flags.not,
                        child = strchild,
                        sibling = strsibling,
                        ofType = type,
                        cache = {},
                        lock = {},
                        a = args.a,
                        b = args.b,
                        i = 0,
                        ri = 0,
                        el, found, diff, count;
                    if(!ofType && a === 1 && b === 0) {
                        return flag_not ? [] : lastResult;
                    }
                    var checkName = ofType ? "nodeName" : "nodeType";
                    for(; el = lastResult[i++];) {
                        var parent = el.parentNode;
                        var pid = $.getUid(parent);
                        if(!lock[pid]) {
                            count = lock[pid] = 1;
                            var checkValue = ofType ? el.nodeName : 1;
                            for(var node = parent[child]; node; node = node[sibling]) {
                                if(node[checkName] === checkValue) {
                                    pid = $.getUid(node);
                                    cache[pid] = count++;
                                }
                            }
                        }
                        diff = cache[$.getUid(el)] - b;
                        found = a === 0 ? diff === 0 : (diff % a === 0 && diff / a >= 0);
                        (found ^ flag_not) && (result[ri++] = el);
                    }
                    return result;
                }
            };
        };

    function filterPseudoNoExp(name, isLast, isOnly) {
        var A = "var result = [], flag_not = flags.not, node, el, tagName, i = 0, ri = 0, found = 0; for (; node = el = lastResult[i++];found = 0) {"
        var B = "{0} while (!found && (node=node.{1})) { (node.{2} === {3})  && ++found;  }";
        var C = " node = el;while (!found && (node = node.previousSibling)) {  node.{2} === {3} && ++found;  }";
        var D = "!found ^ flag_not && (result[ri++] = el);  }   return result";

        var start = isLast ? "nextSibling" : "previousSibling";
        var fills = {
            type: [" tagName = el.nodeName;", start, "nodeName", "tagName"],
            child: ["", start, "nodeType", "1"]
        }
        [name];
        var body = A + B + (isOnly ? C : "") + D;
        var fn = new Function("flags", "lastResult", body.replace(/{(\d)}/g, function($, $1) {
            return fills[$1];
        }));
        return {
            exec: fn
        }
    }

    function filterProp(str_prop, flag) {
        return {
            exec: function(flags, elems) {
                var result = [],
                    prop = str_prop,
                    flag_not = flag ? flags.not : !flags.not;
                for(var i = 0, ri = 0, elem; elem = elems[i++];)
                if(elem[prop] ^ flag_not) result[ri++] = elem; //&& ( !flag || elem.type !== "hidden" )
                return result;
            }
        };
    };
    Icarus.pseudoHooks = {
        root: function(el) { //标准
            return el === (el.ownerDocument || el.document).documentElement;
        },
        target: { //标准
            exec: function(flags, elems, _, doc) {
                var result = [],
                    flag_not = flags.not;
                var win = doc.defaultView || doc.parentWindow;
                var hash = win.location.hash.slice(1);
                for(var i = 0, ri = 0, elem; elem = elems[i++];)
                if(((elem.id || elem.name) === hash) ^ flag_not) result[ri++] = elem;
                return result;
            }
        },
        "first-child": filterPseudoNoExp("child", false, false),
        "last-child": filterPseudoNoExp("child", true, false),
        "only-child": filterPseudoNoExp("child", true, true),
        "first-of-type": filterPseudoNoExp("type", false, false),
        "last-of-type": filterPseudoNoExp("type", true, false),
        "only-of-type": filterPseudoNoExp("type", true, true),
        //name, isLast, isOnly
        "nth-child": filterPseudoHasExp("firstChild", "nextSibling", false),
        //标准
        "nth-last-child": filterPseudoHasExp("lastChild", "previousSibling", false),
        //标准
        "nth-of-type": filterPseudoHasExp("firstChild", "nextSibling", true),
        //标准
        "nth-last-of-type": filterPseudoHasExp("lastChild", "previousSibling", true),
        //标准
        empty: { //标准
            exec: function(flags, elems) {
                var result = [],
                    flag_not = flags.not;
                for(var i = 0, ri = 0, elem; elem = elems[i++];) {
                    if(elem.nodeType == 1) {
                        if(!elem.firstChild ^ flag_not) result[ri++] = elem;
                    }
                }
                return result;
            }
        },
        link: { //标准
            exec: function(flags, elems) {
                var links = (elems[0].ownerDocument || elems[0].document).links;
                if(!links) return [];
                var result = [],
                    checked = {},
                    flag_not = flags.not;
                for(var i = 0, ri = 0, elem; elem = links[i++];)
                checked[$.getUid(elem)] = 1;
                for(i = 0; elem = elems[i++];)
                if(checked[$.getUid(elem)] ^ flag_not) result[ri++] = elem;
                return result;
            }
        },
        lang: { //标准 CSS2链接伪类
            exec: function(flags, elems, arg) {
                var result = [],
                    reg = new RegExp("^" + arg, "i"),
                    flag_not = flags.not;
                for(var i = 0, ri = 0, elem; elem = elems[i++];) {
                    var tmp = elem;
                    while(tmp && !tmp.getAttribute("lang"))
                    tmp = tmp.parentNode;
                    tmp = !! (tmp && reg.test(tmp.getAttribute("lang")));
                    if(tmp ^ flag_not) result[ri++] = elem;
                }
                return result;
            }
        },
        active: function(el) {
            return el === el.ownerDocument.activeElement;
        },
        focus: function(el) {
            return(el.type || el.href) && el === el.ownerDocument.activeElement;
        },
        indeterminate: function(node) { //标准
            return node.indeterminate === true && node.type === "checkbox"
        },
        //http://www.w3.org/TR/css3-selectors/#UIstates
        enabled: filterProp("disabled", false),
        //标准
        disabled: filterProp("disabled", true),
        //标准
        checked: filterProp("checked", true),
        //标准
        contains: {
            exec: function(flags, elems, arg) {
                var res = [],
                    fn = flags.xml ? $.getText : getHTMLText,
                    flag_not = flags.not;
                for(var i = 0, ri = 0, elem; elem = elems[i++];) {
                    if(( !! ~fn([elem]).indexOf(arg)) ^ flag_not) res[ri++] = elem;
                }
                return res;
            }
        },
        //自定义伪类
        selected: function(el) {
            el.parentNode && el.parentNode.selectedIndex; //处理safari的bug
            return el.selected === true;
        },
        header: function(el) {
            return /h\d/i.test(el.nodeName);
        },
        button: function(el) {
            return "button" === el.type || el.nodeName === "BUTTON";
        },
        input: function(el) {
            return /input|select|textarea|button/i.test(el.nodeName);
        },
        parent: function(el) {
            return !!el.firstChild;
        },
        has: function(el, expr) { //孩子中是否拥有匹配expr的节点
            return !!$.query(expr, [el]).length;
        },
        //与位置相关的过滤器
        first: function(index) {
            return index === 0;
        },
        last: function(index, num) {
            return index === num;
        },
        even: function(index) {
            return index % 2 === 0;
        },
        odd: function(index) {
            return index % 2 === 1;
        },
        lt: function(index, num) {
            return index < num;
        },
        gt: function(index, num) {
            return index > num;
        },
        eq: function(index, num) {
            return index === num;
        },
        hidden: function(el) { // Opera <= 12.12 reports offsetWidths and offsetHeights less than zero on some elements
            return el.offsetWidth <= 0 || el.offsetHeight <= 0 || (el.currentStyle || {}).display == "none";
        }
    }
    Icarus.pseudoHooks.visible = function(el) {
        return !Icarus.pseudoHooks.hidden(el);
    }

    "text,radio,checkbox,file,password,submit,image,reset".replace($.rword, function(name) {
        Icarus.pseudoHooks[name] = function(el) {
            return(el.getAttribute("type") || el.type) === name; //避开HTML5新增类型导致的BUG，不直接使用el.type === name;
        }
    });
    return Icarus;
});

//==========================================
// 特征嗅探模块 by 司徒正美
//==========================================
define("support", ["mass"], function($) {
    var DOC = document,
        div = DOC.createElement('div'),
        TAGS = "getElementsByTagName";
    div.setAttribute("className", "t");
    div.innerHTML = ' <link/><a href="/nasami"  style="float:left;opacity:.25;">d</a>' + '<object><param/></object><table></table><input type="checkbox" checked/>';
    var a = div[TAGS]("a")[0],
        style = a.style,
        select = DOC.createElement("select"),
        input = div[TAGS]("input")[0],
        opt = select.appendChild(DOC.createElement("option"));
    //true为正常，false为不正常
    var support = $.support = {
        //标准浏览器只有在table与tr之间不存在tbody的情况下添加tbody，而IE678则笨多了,即在里面为空也乱加tbody
        insertTbody: !div[TAGS]("tbody").length,
        // 在大多数游览器中checkbox的value默认为on，唯有chrome返回空字符串
        checkOn: input.value === "on",
        //当为select添加一个新option元素时，此option会被选中，但IE与早期的safari却没有这样做,需要访问一下其父元素后才能让它处于选中状态（bug）
        optSelected: !! opt.selected,
        //IE67，无法取得用户设定的原始href值
        attrInnateHref: a.getAttribute("href") === "/nasami",
        //IE67，无法取得用户设定的原始style值，只能返回el.style（CSSStyleDeclaration）对象(bug)
        attrInnateStyle: a.getAttribute("style") !== style,
        //IE67, 对于某些固有属性需要进行映射才可以用，如class, for, char，IE8及其他标准浏览器不需要
        attrInnateName: div.className !== "t",
        //IE6-8,对于某些固有属性不会返回用户最初设置的值
        attrInnateValue: input.getAttribute("checked") == "",
        //http://www.cnblogs.com/rubylouvre/archive/2010/05/16/1736535.html
        //是否能正确返回opacity的样式值，IE8返回".25" ，IE9pp2返回0.25，chrome等返回"0.25"
        cssOpacity: style.opacity == "0.25",
        //某些浏览器不支持w3c的cssFloat属性来获取浮动样式，而是使用独家的styleFloat属性
        cssFloat: !! style.cssFloat,
        //IE678的getElementByTagName("*")无法遍历出Object元素下的param元素（bug）
        traverseAll: !! div[TAGS]("param").length,
        //https://prototype.lighthouseapp.com/projects/8886/tickets/264-ie-can-t-create-link-elements-from-html-literals
        //IE678不能通过innerHTML生成link,style,script节点（bug）
        createAll: !! div[TAGS]("link").length,
        //IE6789由于无法识别HTML5的新标签，因此复制这些新元素时也不正确（bug）
        cloneHTML5: DOC.createElement("nav").cloneNode(true).outerHTML !== "<:nav></:nav>",
        //在标准浏览器下，cloneNode(true)是不复制事件的，以防止循环引用无法释放内存，而IE却没有考虑到这一点，把事件复制了（inconformity）
        //        noCloneEvent: true,
        //现在只有firefox不支持focusin,focus事件,并且它也不支持DOMFocusIn,DOMFocusOut,并且此事件无法通过eventSupport来检测
        focusin: $["@bind"] === "attachEvent",
        //IE肯定支持
        //IE6789的innerHTML对于table,thead,tfoot,tbody,tr,col,colgroup,html,title,style,frameset是只读的（inconformity）
        innerHTML: false,
        //IE的insertAdjacentHTML与innerHTML一样，对于许多元素是只读的，另外FF8之前是不支持此API的
        insertAdjacentHTML: false,
        //是否支持createContextualFragment API，此方法发端于FF3，因此许多浏览器不支持或实现存在BUG，但它是将字符串转换为文档碎片的最高效手段
        fastFragment: false,
        //IE67不支持display:inline-block，需要通过hasLayout方法去模拟（bug）
        inlineBlock: true,
        //http://w3help.org/zh-cn/causes/RD1002
        //在IE678中，非替换元素在设置了大小与hasLayout的情况下，会将其父级元素撑大（inconformity）
        //        keepSize: true,
        //getComputedStyle API是否能支持将left, top的百分比原始值自动转换为像素值
        pixelPosition: true,
        transition: false,
        calc: false
    };
    //IE6789的checkbox、radio控件在cloneNode(true)后，新元素没有继承原来的checked属性（bug）
    input.checked = true;
    support.cloneChecked = (input.cloneNode(true).checked === true);
    support.appendChecked = input.checked;
    //添加对optDisabled,cloneAll,insertAdjacentHTML,innerHTML,fastFragment的特征嗅探
    //判定disabled的select元素内部的option元素是否也有diabled属性，没有才是标准
    //这个特性用来获取select元素的value值，特别是当select渲染为多选框时，需要注意从中去除disabled的option元素，
    //但在Safari中，获取被设置为disabled的select的值时，由于所有option元素都被设置为disabled，会导致无法获取值。
    select.disabled = true;
    support.optDisabled = !opt.disabled;
    
    //IE下对div的复制节点设置与背景有关的样式会影响到原样式,说明它在复制节点对此样式并没有深拷贝,还是共享一份内存
    div.style.backgroundClip = "content-box";
    div.cloneNode(true).style.backgroundClip = "";
    support.cloneBackgroundStyle = div.style.backgroundClip === "content-box";
    var table = div[TAGS]("table")[0]
    try { //检测innerHTML与insertAdjacentHTML在某些元素中是否存在只读（这时会抛错）
        table.innerHTML = "<tr><td>1</td></tr>";
        support.innerHTML = true;
        table.insertAdjacentHTML("afterBegin", "<tr><td>2</td></tr>");
        support.insertAdjacentHTML = true;
    } catch(e) {};

    a = select = table = opt = style = null;
    $.require("ready", function() {
        var body = DOC.body;
        if(!body) //frameset不存在body标签
        return;
        try {
            var range = DOC.createRange();
            range.selectNodeContents(body); //fix opera(9.2~11.51) bug,必须对文档进行选取
            support.fastFragment = !! range.createContextualFragment("<a>");
            $.commonRange = range;
        } catch(e) {};
        div.style.cssText = "position:absolute;top:-1000px;left:-1000px;"
        body.insertBefore(div, body.firstChild);
        var a = '<div style="height:20px;display:inline-block"></div>';
        div.innerHTML = a + a; //div默认是block,因此两个DIV会上下排列0,但inline-block会让它们左右排列
        support.inlineBlock = div.offsetHeight < 40; //检测是否支持inlineBlock
        if(window.getComputedStyle) {
            div.style.top = "1%";
            var computed = window.getComputedStyle(div, null) || {}
            support.pixelPosition = computed.top !== "1%";
            for(var arr = ["calc", "-webkit-calc", "-moz-calc"], i = 0; ib = arr[i++];) {
                div.style.width = a + "(7px + 8px)"; //注意+两边有空白
                if(computed.width == "15px") {
                    support.calc = a;
                    break;
                }
            }
        }
        //http://stackoverflow.com/questions/7337670/how-to-detect-focusin-support
        div.innerHTML = "<a href='#'></a>"
        if(!support.focusin) {
            a = div.firstChild;
            a.addEventListener('focusin', function() {
                support.focusin = true;
            }, false);
            a.focus();
        }
        div.style.width = div.style.paddingLeft = "10px"; //检测是否支持盒子模型
        support.boxModel = div.offsetWidth === 20;
        body.removeChild(div);
        div = null;
    });
    return $;
});

//==================================================
// 节点补丁模块 v1 主要是用于在创建或复制节点时处理IE的一些BUG
//==================================================
define("node_fix",!!top.dispatchEvent, ["mass"], function($){
    //修正IE下对数据克隆时出现的一系列问题
    function fixNode(clone, src) {
        if(src.nodeType == 1) {
            //只处理元素节点
            var nodeName = clone.nodeName.toLowerCase();
            //clearAttributes方法可以清除元素的所有属性值，如style样式，或者class属性，与attachEvent绑定上去的事件
            clone.clearAttributes();
            //复制原对象的属性到克隆体中,但不包含原来的事件, ID,  NAME, uniqueNumber
            clone.mergeAttributes(src, false);
            //IE6-8无法复制其内部的元素
            if(nodeName === "object") {
                clone.outerHTML = src.outerHTML;
            } else if(nodeName === "input" && (src.type === "checkbox" || src.type == "radio")) {
                //IE6-8无法复制chechbox的值，在IE6-7中也defaultChecked属性也遗漏了
                if(src.checked) {
                    clone.defaultChecked = clone.checked = src.checked;
                }
                // 除Chrome外，所有浏览器都会给没有value的checkbox一个默认的value值”on”。
                if(clone.value !== src.value) {
                    clone.value = src.value;
                }
            } else if(nodeName === "option") {
                clone.selected = src.defaultSelected; // IE6-8 无法保持选中状态
            } else if(nodeName === "input" || nodeName === "textarea") {
                clone.defaultValue = src.defaultValue; // IE6-8 无法保持默认值
            } else if(nodeName === "script" && clone.text !== src.text) {
                clone.text = src.text; //IE6-8不能复制script的text属性
            }

        }
    }
    var shim = document.createElement("div"); //缓存parser，防止反复创建

    function shimCloneNode(outerHTML, tree) {
        tree.appendChild(shim);
        shim.innerHTML = outerHTML;
        tree.removeChild(shim);
        return shim.firstChild;
    }
    var unknownTag = "<?XML:NAMESPACE"
    $.fixCloneNode = function(node){
        //这个判定必须这么长：判定是否能克隆新标签，判定是否为元素节点, 判定是否为新标签
        if(!$.support.cloneHTML5 && node.outerHTML) { //延迟创建检测元素
            var outerHTML = document.createElement(node.nodeName).outerHTML;
            bool = outerHTML.indexOf(unknownTag) // !0 === true;
        }
        //各浏览器cloneNode方法的部分实现差异 http://www.cnblogs.com/snandy/archive/2012/05/06/2473936.html
        var neo = !bool ? shimCloneNode(node.outerHTML, document.documentElement) : node.cloneNode(true)

        fixNode(neo, node);
        var src = node[TAGS]("*"), neos = neo[TAGS]("*"),bool
        for(var i = 0; src[i]; i++) {
            fixNode(neos[i], src[i]);
        }
    }

    var rtbody = /<tbody[^>]*>/i
    $.fixParseHTML = function(wrapper, html){
        //在IE6中,当我们在处理colgroup, thead, tfoot, table时会发生成一个tbody标签
        if(!$.support.insertTbody) {
            var noTbody = !rtbody.test(html), //矛:html本身就不存在<tbody字样
            els = wrapper["getElementsByTagName"]("tbody");
            if(els.length > 0 && noTbody) { //盾：实际上生成的NodeList中存在tbody节点
                for(var i = 0, el; el = els[i++];) {
                    if(!el.childNodes.length) //如果是自动插入的里面肯定没有内容
                        el.parentNode.removeChild(el);
                }
            }
        }
        if(!$.support.createAll) { //移除所有br补丁
            for(els = wrapper["getElementsByTagName"]("br"), i = 0; el = els[i++];) {
                if(el.className && el.className === "fix_create_all") {
                    el.parentNode.removeChild(el);
                }
            }
        }
        if(!$.support.appendChecked) { //IE67没有为它们添加defaultChecked
            for(els = wrapper["getElementsByTagName"]("input"), i = 0; el = els[i++];) {
                if(el.type === "checkbox" || el.type === "radio") {
                    el.defaultChecked = el.checked;
                }
            }
        }
    }
})
//2013.1.11


//==================================================
// 节点操作模块
//==================================================
define("node", ["$support", "$class", "$query", "$data"].concat(top.dispatchEvent ? [] : ["$node_fix"]), function($) {
    var rtag = /^[a-zA-Z]+$/,
    rtagName = /<([\w:]+)/,
    //取得其tagName
    rxhtml = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,
    rcreate = $.support.createAll ? /<(?:script)/ig : /(<(?:script|link|style))/ig,
    types = $.oneObject("text/javascript", "text/ecmascript", "application/ecmascript", "application/javascript", "text/vbscript"),
    //需要处理套嵌关系的标签
    rnest = /<(?:tb|td|tf|th|tr|col|opt|leg|cap|area)/,
    adjacent = "insertAdjacentHTML",
    TAGS = "getElementsByTagName"

    function getDoc() { //获取文档对象
        for(var i = 0, el; i < arguments.length; i++) {
            if(el = arguments[i]) {
                if(el.nodeType) {
                    return el.nodeType === 9 ? el : el.ownerDocument;
                } else if(el.setTimeout) {
                    return el.document;
                }
            }
        }
        return document;
    }
    $.fixCloneNode = $.fixCloneNode ||
    function(node) {
        return node.cloneNode(true)
    }
    $.fixParseHTML = $.fixParseHTML || $.noop;
    $.mix($.factory).implement({
        init: function(expr, context) {
            // 分支1: 处理空白字符串,null,undefined参数
            if(!expr) {
                return this;
            }
            //分支2:  让$实例与元素节点一样拥有ownerDocument属性
            var doc, nodes; //用作节点搜索的起点
            if($.isArrayLike(context)) { //typeof context === "string"
                return $(context).find(expr);
            }

            if(expr.nodeType) { //分支3:  处理节点参数
                this.ownerDocument = expr.nodeType === 9 ? expr : expr.ownerDocument;
                return $.Array.merge(this, [expr]);
            }
            this.selector = expr + "";
            if(typeof expr === "string") {
                doc = this.ownerDocument = !context ? document : getDoc(context, context[0]);
                var scope = context || doc;
                expr = expr.trim();
                if(expr.charAt(0) === "<" && expr.charAt(expr.length - 1) === ">" && expr.length >= 3) {
                    nodes = $.parseHTML(expr, doc); //分支5: 动态生成新节点
                    nodes = nodes.childNodes
                } else if(rtag.test(expr)) { //分支6: getElementsByTagName
                    nodes = scope[TAGS](expr);
                } else { //分支7：进入选择器模块
                    nodes = $.query(expr, scope);
                }
                return $.Array.merge(this, nodes);
            } else { //分支8：处理数组，节点集合或者mass对象或window对象
                this.ownerDocument = getDoc(expr[0]);
                $.Array.merge(this, $.isArrayLike(expr) ? expr : [expr]);
                delete this.selector;
            }
        },
        mass: $.mass,
        length: 0,
        valueOf: function() { //转换为纯数组对象
            return Array.prototype.slice.call(this);
        },
        size: function(){
            return this.length;
        },
        toString: function() { //对得它们的tagName，组成纯数组返回
            var i = this.length,
            ret = [],
            getType = $.type;
            while(i--) {
                ret[i] = getType(this[i]);
            }
            return ret.join(", ");
        },
        labor: function(nodes) { //用于构建一个与对象具有相同属性，但里面的节点集不同的mass对象
            var neo = new $;
            neo.context = this.context;
            neo.selector = this.selector;
            neo.ownerDocument = this.ownerDocument;
            return $.Array.merge(neo, nodes || []);
        },
        slice: function(a, b) { //传入起止值，截取原某一部分再组成mass对象返回
            return this.labor($.slice(this, a, b));
        },
        get: function(num) { //取得与索引值相对应的节点，若为负数从后面取起，如果不传，则返回节点集的纯数组
            return num == null ? this.valueOf() : this[num < 0 ? this.length + num : num];
        },
        eq: function(i) { //取得与索引值相对应的节点，并构成mass对象返回
            return i === -1 ? this.slice(i) : this.slice(i, +i + 1);
        },
        gt: function(i) { //取得原对象中索引值大于传参的节点们，并构成mass对象返回
            return this.slice(i + 1, this.length);
        },
        lt: function(i) { //取得原对象中索引值小于传参的节点们，并构成mass对象返回
            return this.slice(0, i);
        },
        first: function() { //取得原对象中第一个的节点，并构成mass对象返回
            return this.slice(0, 1);
        },
        last: function() { //取得原对象中最后一个的节点，并构成mass对象返回
            return this.slice(-1);
        },
        even: function() { //取得原对象中索引值为偶数的节点，并构成mass对象返回
            return this.labor($.filter(this, function(_, i) {
                return i % 2 === 0;
            }));
        },
        odd: function() { //取得原对象中索引值为奇数的节点，并构成mass对象返回
            return this.labor($.filter(this, function(_, i) {
                return i % 2 === 1;
            }));
        },

        each: function(fn) {
            return $.each(this, fn);
        },
        map: function(fn) {
            return this.labor($.map(this, fn));
        },
        clone: function(dataAndEvents, deepDataAndEvents) { //复制原mass对象，它里面的节点也一一复制，
            dataAndEvents = dataAndEvents == null ? false : dataAndEvents; //传参用于决定是否复制事件与数据
            deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;
            return this.map(function() {
                return cloneNode(this, dataAndEvents, deepDataAndEvents);
            });
        },
        html: function(item) { //取得或设置节点的innerHTML属性
            item = item === void 0 ? item : item == null ? '' : item + ""
            return $.access(this, 0, item, function(el) { //getter
                //如果当前元素不是null, undefined,并确保是元素节点或者nodeName为XML,则进入分支
                //为什么要刻意指出XML标签呢?因为在IE中,这标签并不是一个元素节点,而是内嵌文档
                //的nodeType为9,IE称之为XML数据岛
                if(el && (el.nodeType === 1 || /xml/i.test(el.nodeName))) {
                    return "innerHTML" in el ? el.innerHTML : innerHTML(el)
                }
                return null;
            }, function(el, _, value) { //setter
                //接着判断innerHTML属性是否符合标准,不再区分可读与只读
                //用户传参是否包含了script style meta等不能用innerHTML直接进行创建的标签
                //及像col td map legend等需要满足套嵌关系才能创建的标签, 否则会在IE与safari下报错
                if($.support.innerHTML && (!rcreate.test(value) && !rnest.test(value))) {
                    try {
                        for(var i = 0; el = this[i++];) {
                            if(el.nodeType === 1) {
                                $.each(el[TAGS]("*"), cleanNode);
                                el.innerHTML = value;
                            }
                        }
                        return;
                    } catch(e) {};
                }
                this.empty().append(value);
            }, this);
        },
        text: function(item) { // 取得或设置节点的text或innerText或textContent属性
            return $.access(this, 0, item, function(el) {
                if(!el) { //getter
                    return "";
                } else if(el.tagName == "OPTION" || el.tagName === "SCRIPT") {
                    return el.text;
                }
                return el.textContent || el.innerText || $.getText([el]);
            }, function() { //setter
                this.empty().append(this.ownerDocument.createTextNode(item));
            }, this);
        },

        outerHTML: function(item) { // 取得或设置节点的outerHTML
            return $.access(this, 0, item, function(el) {
                if(el && el.nodeType === 1) {
                    return "outerHTML" in el ? el.outerHTML : outerHTML(el);
                }
                return null;
            }, function() {
                this.empty().replace(item);
            }, this);
        }
    });
    $.fn = $.prototype;
    $.fn.init.prototype = $.fn;
    "push,unshift,pop,shift,splice,sort,reverse".replace($.rword, function(method) {
        $.fn[method] = function() {
            Array.prototype[method].apply(this, arguments);
            return this;
        }
    });
    "remove,empty,detach".replace($.rword, function(method) {
        $.fn[method] = function() {
            var isRemove = method !== "empty";
            for(var i = 0, node; node = this[i++];) {
                if(node.nodeType === 1) {
                    //移除匹配元素
                    var array = $.slice(node[TAGS]("*")).concat(isRemove ? node : [])
                    if(method != "detach") {
                        array.forEach(cleanNode);
                    }
                }
                if(isRemove) {
                    if(node.parentNode) {
                        node.parentNode.removeChild(node);
                    }
                } else {
                    while(node.firstChild) {
                        node.removeChild(node.firstChild);
                    }
                }
            }
            return this;
        }
    });
    //前导 前置 追加 后放 替换
    "append,prepend,before,after,replace".replace($.rword, function(method) {
        $.fn[method] = function(item) {
            return manipulate(this, method, item, this.ownerDocument);
        }
        $.fn[method + "To"] = function(item) {
            $(item, this.ownerDocument)[method](this);
            return this;
        }
    });
    //添加对jQuery insertAfter/insertBefore的兼容支持
    $.fn.insertAfter = function(item) {
        $.log("insertAfter is deprecated, instead of afterTo")
        return this.afterTo(item);
    }
    $.fn.insertBefore = function(item) {
        $.log("insertBefore is deprecated, instead of beforeTo")
        return this.beforeTo(item);
    }
    //http://dev.opera.com/articles/view/opera-mobile-emulator-experimental-webkit-prefix-support/
    var prefixes = ['', '-webkit-', '-o-', '-moz-', '-ms-', 'WebKit-', 'moz-', "webkit-", 'ms-', '-khtml-']
    var cssMap = { //支持检测 WebKitMutationObserver WebKitCSSMatrix mozMatchesSelector ,webkitRequestAnimationFrame 
        c: "color",
        h: "height",
        o: "opacity",
        w: "width",
        x: "left",
        y: "top",
        fs: "fontSize",
        st: "scrollTop",
        sl: "scrollLeft",
        bgc: "backgroundColor",
        "float": $.support.cssFloat ? 'cssFloat' : 'styleFloat'
    };

    function cssName(name, host, camelCase) {
        if(cssMap[name]) {
            return cssMap[name];
        }
        host = host || $.html.style; //$.html为document.documentElement
        for(var i = 0, n = prefixes.length; i < n; i++) {
            camelCase = $.String.camelize(prefixes[i] + name);
            if(camelCase in host) {
                return(cssMap[name] = camelCase);
            }
        }
        return null;
    }
    var matchesAPI = cssName("matchesSelector", $.html);
    $.mix({
        //判定元素是否支持此样式   http://www.cnblogs.com/rubylouvre/archive/2011/03/28/1998223.html
        cssName: cssName,
   
        match: function(node, expr) {
            //判定元素节点是否匹配CSS表达式
            try {
                return node[matchesAPI](expr);
            } catch(e) {
                var parent = node.parentNode;
                if(parent) {
                    var array = $.query(expr, node.ownerDocument);
                    return array.indexOf(node) != -1
                }
                return false;
            }
        },

        access: function(elems, key, value, getter, setter, bind) {
            //用于统一配置多态方法的读写访问，涉及方法有text, html,outerHTML,data, attr, prop, val
            var length = elems.length;
            setter = typeof setter === "function" ? setter : getter;
            bind = arguments[arguments.length - 1];
            if(typeof key === "object") {
                for(var k in key) { //为所有元素设置N个属性
                    for(var i = 0; i < length; i++) {
                        setter.call(bind, elems[i], k, key[k]);
                    }
                }
                return elems;
            }
            if(value !== void 0) {
                for(i = 0; i < length; i++) {
                    setter.call(bind, elems[i], key, value);
                }
                return elems;
            } //取得第一个元素的属性, getter的参数总是少于setter
            return length ? getter.call(bind, elems[0], key) : void 0;
        },
        
        parseHTML: function(html, doc) {
            doc = doc || this.nodeType === 9 && this || document;
            html = html.replace(rxhtml, "<$1></$2>").trim();
            //尝试使用createContextualFragment获取更高的效率
            //http://www.cnblogs.com/rubylouvre/archive/2011/04/15/2016800.html
            if($.commonRange && doc === document && !rcreate.test(html) && !rnest.test(html)) {
                return $.commonRange.createContextualFragment(html);
            }
            if(!$.support.createAll) { //fix IE
                html = html.replace(rcreate, "<br class='fix_create_all'/>$1"); //在link style script等标签之前添加一个补丁
            }
            var tag = (rtagName.exec(html) || ["", ""])[1].toLowerCase(),
            //取得其标签名
            wrap = tagHooks[tag] || tagHooks._default,
            fragment = doc.createDocumentFragment(),
            wrapper = doc.createElement("div"),
            firstChild;
            wrapper.innerHTML = wrap[1] + html + (wrap[2] || "");
            var els = wrapper[TAGS]("script");
            if(els.length) { //使用innerHTML生成的script节点不会发出请求与执行text属性
                var script = doc.createElement("script"),
                neo;
                for(var i = 0, el; el = els[i++];) {
                    if(!el.type || types[el.type]) { //如果script节点的MIME能让其执行脚本
                        neo = script.cloneNode(false); //FF不能省略参数
                        for(var j = 0, attr; attr = el.attributes[j++];) {
                            if(attr.specified) { //复制其属性
                                neo[attr.name] = [attr.value];
                            }
                        }
                        neo.text = el.text; //必须指定,因为无法在attributes中遍历出来
                        el.parentNode.replaceChild(neo, el); //替换节点
                    }
                }
            }
            //移除我们为了符合套嵌关系而添加的标签
            for(i = wrap[0]; i--; wrapper = wrapper.lastChild) {};
            $.fixParseHTML(wrapper, html);
            while(firstChild = wrapper.firstChild) { // 将wrapper上的节点转移到文档碎片上！
                fragment.appendChild(firstChild);
            }
            return fragment;
        }
    });
    //parseHTML的辅助变量
    var tagHooks = {
        area: [1, "<map>"],
        param: [1, "<object>"],
        col: [2, "<table><tbody></tbody><colgroup>", "</table>"],
        legend: [1, "<fieldset>"],
        option: [1, "<select multiple='multiple'>"],
        thead: [1, "<table>", "</table>"],
        tr: [2, "<table><tbody>"],
        td: [3, "<table><tbody><tr>"],
        //IE678在用innerHTML生成节点时存在BUG，不能直接创建script,link,meta,style与HTML5的新标签
        _default: $.support.createAll ? [0, ""] : [1, "X<div>"] //div可以不用闭合
    },
    insertHooks = {
        prepend: function(el, node) {
            el.insertBefore(node, el.firstChild);
        },
        append: function(el, node) {
            el.appendChild(node);
        },
        before: function(el, node) {
            el.parentNode.insertBefore(node, el);
        },
        after: function(el, node) {
            el.parentNode.insertBefore(node, el.nextSibling);
        },
        replace: function(el, node) {
            el.parentNode.replaceChild(node, el);
        },
        prepend2: function(el, html) {
            el[adjacent]("afterBegin", html);
        },
        append2: function(el, html) {
            el[adjacent]("beforeEnd", html);
        },
        before2: function(el, html) {
            el[adjacent]("beforeBegin", html);
        },
        after2: function(el, html) {
            el[adjacent]("afterEnd", html);
        }
    };
    tagHooks.optgroup = tagHooks.option;
    tagHooks.tbody = tagHooks.tfoot = tagHooks.colgroup = tagHooks.caption = tagHooks.thead;
    tagHooks.th = tagHooks.td;

    function insertAdjacentNode(elems, item, handler) { //使用appendChild,insertBefore实现，item为普通节点
        for(var i = 0, el; el = elems[i]; i++) { //第一个不用复制，其他要
            handler(el, i ? cloneNode(item, true, true) : item);
        }
    }

    function insertAdjacentHTML(elems, item, fastHandler, handler) {
        for(var i = 0, el; el = elems[i++];) { //尝试使用insertAdjacentHTML
            if(item.nodeType) { //如果是文档碎片
                handler(el, item.cloneNode(true));
            } else {
                fastHandler(el, item);
            }
        }
    }

    function insertAdjacentFragment(elems, item, doc, handler) {
        var fragment = doc.createDocumentFragment();
        for(var i = 0, el; el = elems[i++];) {
            handler(el, makeFragment(item, fragment, i > 1));
        }
    }

    function makeFragment(nodes, fragment, bool) {
        //只有非NodeList的情况下我们才为i递增;
        var ret = fragment.cloneNode(false),
        go = !nodes.item;
        for(var i = 0, node; node = nodes[i]; go && i++) {
            ret.appendChild(bool && cloneNode(node, true, true) || node);
        }
        return ret;
    }
    

    function manipulate(nodes, type, item, doc) {
        var elems = $.filter(nodes, function(el) {
            return el.nodeType === 1; //转换为纯净的元素节点数组
        }),
        handler = insertHooks[type];
        if(item.nodeType) {
            //如果是传入元素节点或文本节点或文档碎片
            insertAdjacentNode(elems, item, handler);
        } else if(typeof item === "string") {
            //如果传入的是字符串片断
            //如果方法名不是replace并且完美支持insertAdjacentHTML并且不存在套嵌关系的标签
            var fast = (type !== "replace") && $.support[adjacent] && !rnest.test(item);
            if(!fast) {
                item = $.parseHTML(item, doc)
            }
            insertAdjacentHTML(elems, item, insertHooks[type + "2"], handler);
        } else if(item.length) {
            //如果传入的是HTMLCollection nodeList mass实例，将转换为文档碎片
            insertAdjacentFragment(elems, item, doc, handler);
        }
        return nodes;
    }
    $.implement({
        data: function(key, item) {
            if(key === void 0) { //如果什么都不传，则把用户数据与用户写在标签内以data-*形式储存的数据一并返回
                if(this.length) {
                    var target = this[0],
                    data = $.data(target);
                    if(target.nodeType === 1 && !$._data(target, "parsedAttrs")) {
                        for(var i = 0, attrs = target.attributes, attr; attr = attrs[i++];) {
                            var name = attr.name;
                            if(!name.indexOf("data-")) {
                                $.parseData(target, name.slice(5), data, attr.value)
                            }
                        }
                        $._data(target, "parsedAttrs", true);
                    }
                }
                return data;
            }
            return $.access(this, key, item, function(el) {
                return $.data(el, key, item);
            })
        },
        removeData: function(key) { //移除用户数据
            return this.each(function() {
                $.removeData(this, key);
            });
        }
    });

    function cleanNode(node) {
        //移除节点对数据的清除
        $._removeData(node);
        node.clearAttributes && node.clearAttributes();
    }

    function cloneNode(node, dataAndEvents, deepDataAndEvents) {
        //复制节点时对数据与事件的复制处理
        if(node.nodeType === 1) {
            var neo = $.fixCloneNode(node),
            src, neos, i
            // 复制自定义属性，事件也被当作一种特殊的能活动的数据
            if(dataAndEvents) {
                $.mergeData(neo, node);
                if(deepDataAndEvents) {
                    src = node[TAGS]("*");
                    neos = neo[TAGS]("*");
                    for(i = 0; src[i]; i++) {
                        $.mergeData(neos[i], src[i]);
                    }
                }
            }
            src = neos = null;
            return neo;
        } else {
            return node.cloneNode(true);
        }
    }

    function outerHTML(el) {
        switch(el.nodeType + "") {
            case "1":
            case "9":
                return "xml" in el ? el.xml : new XMLSerializer().serializeToString(el);
            case "3":
            case "4":
                return el.nodeValue;
            default:
                return "";
        }
    }

    function innerHTML(el) {
        for(var i = 0, c, ret = []; c = el.childNodes[i++];) {
            ret.push(outerHTML(c));
        }
        return ret.join("");
    }

    $.implement({
        find: function(expr) {
            //取得当前匹配节点的所有匹配expr的后代，组成新mass实例返回。
            return this.labor($.query(expr, this));
        },
        filter: function(expr) {
            //取得当前匹配节点的所有匹配expr的节点，组成新mass实例返回。
            return this.labor(filterhElement(this, expr, this.ownerDocument, false));
        },
        not: function(expr) {
            //取得当前匹配节点的所有不匹配expr的节点，组成新mass实例返回。
            return this.labor(filterhElement(this, expr, this.ownerDocument, true));
        },
        has: function(expr) {
            //在当前的节点中，往下遍历他们的后代，收集匹配给定的CSS表达式的节点，封装成新mass实例返回
            var nodes = $(expr, this.ownerDocument);
            var array = $.filter(this, function(el){
                for(var i = 0, node; node = nodes[i++];) {
                    return $.contains(el, node) //a包含b
                }
            })
            return this.labor(array)
        },

        closest: function(expr, context) {
            // 在当前的节点中，往上遍历他们的祖先，收集最先匹配给定的CSS表达式的节点，封装成新mass实例返回
            var nodes = $(expr, context || this.ownerDocument).valueOf();
            //遍历原mass对象的节点
            for(var i = 0, ret = [], cur; cur = this[i++];) {
                while(cur) {
                    if(~nodes.indexOf(cur)) {
                        ret.push(cur);
                        break;
                    } else { // 否则把当前节点变为其父节点
                        cur = cur.parentNode;
                        if(!cur || !cur.ownerDocument || cur === context || cur.nodeType === 11) {
                            break;
                        }
                    }
                }
            }
            //如果大于1,进行唯一化操作
            ret = ret.length > 1 ? $.unique(ret) : ret;
            //将节点集合重新包装成一个新jQuery对象返回
            return this.labor(ret);
        },

        is: function(expr) {
            //判定当前匹配节点是否匹配给定选择器，DOM元素，或者mass对象
            var nodes = $.query(expr, this.ownerDocument),
            obj = {},
            uid;
            for(var i = 0, node; node = nodes[i++];) {
                uid = $.getUid(node);
                obj[uid] = 1;
            }
            return this.valueOf().some(function(el) {
                return obj[$.getUid(el)];
            });
        },

        index: function(expr) {
            var first = this[0]; //返回指定节点在其所有兄弟中的位置
            if(!expr) { //如果没有参数，返回第一元素位于其兄弟的位置
                return(first && first.parentNode) ? this.first().prevAll().length : -1;
            }
            // 返回第一个元素在新实例中的位置
            if(typeof expr === "string") {
                return $(expr).index(first);
            }
            // 返回传入元素（如果是mass实例则取其第一个元素）位于原实例的位置
            return this.valueOf().indexOf(expr.mass ? expr[0] : expr);
        }
    });

    function filterhElement(nodes, expr, doc, not) {
        var ret = [];
        not = !! not;
        if(typeof expr === "string") {
            var fit = $.query(expr, doc);
            ret = $.filter(nodes, function(node) {
                if(node.nodeType === 1) {
                    return (fit.indexOf(node) !== -1) ^ not
                }
            });
        } else if($.type(expr, "Function")) {
            return $.filter(nodes, function(node, i) {
                return !!expr.call(node, node, i) ^ not;
            });
        } else if(expr.nodeType) {
            return $.filter(nodes, function(node) {
                return(node === expr) ^ not;
            });
        }
        return ret;
    }
    var uniqOne = $.oneObject("children", "contents", "next", "prev");

    function travel(el, prop, expr) {
        var result = [],
        ri = 0;
        while((el = el[prop])) {
            if(el && el.nodeType === 1) {
                result[ri++] = el;
                if(expr === true) {
                    break;
                } else if(typeof expr === "string" && $.match(el, expr)) {
                    result.pop();
                    break;
                }
            }
        }
        return result;
    };

    $.each({
        parent: function(el) {//取得父节点
            var parent = el.parentNode;
            return parent && parent.nodeType !== 11 ? parent : [];
        },
        parents: function(el) {//取得祖先节点
            return travel(el, "parentNode").reverse();
        },
        parentsUntil: function(el, expr) {//往上取节点,直到某一条件不符合为止
            return travel(el, "parentNode", expr).reverse();
        },
        next: function(el) { //取右边的兄弟节点 nextSiblingElement支持情况 chrome4+ FF3.5+ IE9+ opera9.8+ safari4+
            return travel(el, "nextSibling", true);
        },
        nextAll: function(el) {//取右边所有的兄弟节点
            return travel(el, "nextSibling");
        },
        nextUntil: function(el, expr) {//往右取节点,直到某一条件不符合为止
            return travel(el, "nextSibling", expr);
        },
        prev: function(el) {//取左边的兄弟节点
            return travel(el, "previousSibling", true);
        },
        prevAll: function(el) {//取左边所有的兄弟节点
            return travel(el, "previousSibling").reverse();
        },
        prevUntil: function(el, expr) {//往左取节点,直到某一条件不符合为止
            return travel(el, "previousSibling", expr).reverse();
        },
        children: function(el) { //支持情况chrome1+ FF3.5+,IE5+,opera10+,safari4+
            return el.children ? $.slice(el.children) : $.filter(el.childNodes, function(node) {
                return node.nodeType === 1;
            });
        },
        siblings: function(el) {//取所有兄弟节点
            return travel(el, "previousSibling").reverse().concat(travel(el, "nextSibling"));
        },
        contents: function(el) {//取所有子孙
            return el.tagName === "IFRAME" ? el.contentDocument || el.contentWindow.document : $.slice(el.childNodes);
        }
    }, function(method, name) {
        $.fn[name] = function(expr) {
            var nodes = [];
            for(var i = 0, el; el = this[i++];) { //expr只用于Until
                nodes = nodes.concat(method(el, expr));
            }
            if(/Until/.test(name)) {
                expr = null
            }
            nodes = this.length > 1 && !uniqOne[name] ? $.unique(nodes) : nodes;
            var neo = this.labor(nodes);
            return expr ? neo.filter(expr) : neo;
        };
    });
    return $;
});


define("attr_fix", !! top.getComputedStyle, ["$node"], function($) {
    $.fixIEAttr = function(valHooks, attrHooks) {
        var rattrs = /\s+([\w-]+)(?:=("[^"]*"|'[^']*'|[^\s>]+))?/g,
            rquote = /^['"]/,
            support = $.support,
            defaults = {
                checked: "defaultChecked",
                selected: "defaultSelected"
            }
        $.fixDefault = function(node, name, value) {
            var _default = defaults[name];
            if(_default) {
                node[_default] = value;
            }
        }

        attrHooks["@ie:get"] = function(node, name) {
            var str = node.outerHTML.replace(node.innerHTML, ""),
                obj = {},
                k, v;
            while(k = rattrs.exec(str)) { //属性值只有双引号与无引号的情况
                v = k[2]
                obj[k[1].toLowerCase()] = v ? rquote.test(v) ? v.slice(1, -1) : v : ""
            }
            return obj[name];
        }
        attrHooks["@ie:set"] = function(node, name, value) {
            var attr = node.getAttributeNode(name);
            if(!attr) { //不存在就创建一个同名的特性节点
                attr = node.ownerDocument.createAttribute(name);
                node.setAttributeNode(attr);
            }
            attr.value = value + "";
        }


        if(!support.attrInnateValue) {
            // http://gabriel.nagmay.com/2008/11/javascript-href-bug-in-ie/
            //在IE6-8如果一个A标签，它里面包含@字符，并且没任何元素节点，那么它里面的文本会变成链接值
            $.propHooks["href:set"] = attrHooks["href:set"] = function(node, name, value) {
                var b
                if(node.tagName == "A" && node.innerText.indexOf("@") > 0 && !node.children.length) {
                    b = node.ownerDocument.createElement('b');
                    b.style.display = 'none';
                    node.appendChild(b);
                }
                node.setAttribute(name, value + "");
                if(b) {
                    node.removeChild(b);
                }
            }
        }
        //========================attrHooks 的相关修正==========================
        if(!support.attrInnateHref) {
            //http://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
            //IE的getAttribute支持第二个参数，可以为 0,1,2,4
            //0 是默认；1 区分属性的大小写；2取出源代码中的原字符串值(注，IE67对动态创建的节点没效),4用于取得完整路径
            //IE 在取 href 的时候默认拿出来的是绝对路径，加参数2得到我们所需要的相对路径。
            "href,src,width,height,colSpan,rowSpan".replace($.rword, function(method) {
                attrHooks[method.toLowerCase() + ":get"] = function(node, name) {
                    var ret = node.getAttribute(name, 2);
                    return ret == null ? void 0 : ret;
                }
            });
            "width,height".replace($.rword, function(attr) {
                attrHooks[attr + ":set"] = function(node, name, value) {
                    node.setAttribute(attr, value === "" ? "auto" : value + "");
                }
            });
            $.propHooks["href:get"] = function(node, name) {
                return node.getAttribute(name, 4);
            };
        }
        if(!document.createElement("form").enctype) { //如果不支持enctype， 我们需要用encoding来映射
            $.propMap.enctype = "encoding";
        }
        if(!support.attrInnateStyle) {
            //IE67是没有style特性（特性的值的类型为文本），只有el.style（CSSStyleDeclaration）(bug)
            attrHooks["style:get"] = function(node) {
                return node.style.cssText || undefined;
            }
            attrHooks["style:set"] = function(node, name, value) {
                node.style.cssText = value + "";
            }
        }
        //========================valHooks 的相关修正==========================
        if(!support.attrInnateName) { //IE6-7 button.value错误指向innerText
            valHooks["button:get"] = attrHooks["@ie:get"]
            valHooks["button:set"] = attrHooks["@ie:set"]
        }
        delete $.fixIEAttr;
    }
    return $;
})
//==================================================
// 属性操作模块 v3
//==================================================
define("attr", !! top.getComputedStyle ? ["$node"] : ["$attr_fix"], function($) {
    var rreturn = /\r/g,
    rtabindex = /^(a|area|button|input|object|select|textarea)$/i,
    rnospaces = /\S+/g,
    support = $.support,
    cacheProp = {};

    function defaultProp(node, prop) {
        var name = node.tagName + ":" + prop;
        if(name in cacheProp) {
            return cacheProp[name]
        }
        return cacheProp[name] = document.createElement(node.tagName)[prop]
    }

    function getValType(el) {
        var ret = el.tagName.toLowerCase();
        return ret == "input" && /checkbox|radio/.test(el.type) ? el.type : ret;
    }

    $.implement({
        
        addClass: function(item) {
            if(typeof item == "string") {
                for(var i = 0, el; el = this[i++];) {
                    if(el.nodeType === 1) {
                        if(!el.className) {
                            el.className = item;
                        } else {
                            var a = (el.className + " " + item).match(rnospaces);
                            a.sort();
                            for(var j = a.length - 1; j > 0; --j)
                                if(a[j] == a[j - 1]) a.splice(j, 1);
                            el.className = a.join(" ");
                        }
                    }
                }
            }
            return this;
        },
        //如果不传入类名,则清空所有类名,允许同时删除多个类名
        removeClass: function(item) {
            if((item && typeof item === "string") || item === void 0) {
                var classNames = (item || "").match(rnospaces),
                cl = classNames.length;
                for(var i = 0, node; node = this[i++];) {
                    if(node.nodeType === 1 && node.className) {
                        if(item) { //rnospaces = /\S+/
                            var set = " " + node.className.match(rnospaces).join(" ") + " ";
                            for(var c = 0; c < cl; c++) {
                                set = set.replace(" " + classNames[c] + " ", " ");
                            }
                            node.className = set.slice(1, set.length - 1);
                        } else {
                            node.className = "";
                        }
                    }
                }
            }
            return this;
        },

        //如果第二个参数为true，要求所有匹配元素都拥有此类名才返回true
        hasClass: function(item, every) {
            var method = every === true ? "every" : "some",
            rclass = new RegExp('(\\s|^)' + item + '(\\s|$)'); //判定多个元素，正则比indexOf快点
            return $.slice(this)[method](function(el) { //先转换为数组
                return(el.className || "").match(rclass);
            });
        },
        //如果存在（不存在）就删除（添加）指定的类名。对所有匹配元素进行操作。
        toggleClass: function(value, stateVal) {
            var type = typeof value,
            classNames = type === "string" && value.match(rnospaces) || [],
            className, i, isBool = typeof stateVal === "boolean";
            return this.each(function(el) {
                i = 0;
                if(el.nodeType === 1) {
                    var self = $(el),
                    state = stateVal;
                    if(type == "string") {
                        while((className = classNames[i++])) {
                            state = isBool ? state : !self.hasClass(className);
                            self[state ? "addClass" : "removeClass"](className);
                        }
                    } else if(type === "undefined" || type === "boolean") {
                        if(el.className) {
                            $._data(el, "__className__", el.className);
                        }
                        el.className = el.className || value === false ? "" : $._data(el, "__className__") || "";
                    }
                }
            });
        },
        //如果匹配元素存在类名old则将其置换为类名neo
        replaceClass: function(old, neo) {
            for(var i = 0, node; node = this[i++];) {
                if(node.nodeType === 1 && node.className) {
                    var arr = node.className.match(rnospaces),
                    cls = [];
                    for(var j = 0; j < arr.length; j++) {
                        cls.push(arr[j] == old ? neo : arr[j]);
                    }
                    node.className = cls.join(" ");
                }
            }
            return this;
        },
        //用于取得表单元素的value值
        val: function(item) {
            var el = this[0],
            getter = valHooks["option:get"];
            if(!arguments.length) { //读操作
                if(el && el.nodeType == 1) {
                    var ret = (valHooks[getValType(el) + ":get"] || $.propHooks["@default:get"])(el, "value", getter);
                    return typeof ret === "string" ? ret.replace(rreturn, "") : ret == null ? "" : ret;
                }
                return void 0;
            }
            //我们确保传参为字符串数组或字符串，null/undefined强制转换为"", number变为字符串
            if(Array.isArray(item)) {
                item = item.map(function(item) {
                    return item == null ? "" : item + "";
                });
            } else if(isFinite(item)) {
                item += "";
            } else {
                item = item || "";
            }
            return this.each(function(el) { //写操作
                if(el.nodeType == 1) {
                    (valHooks[getValType(el) + ":set"] || $.propHooks["@default:set"])(el, "value", item, getter);
                }
            });
        }
    });

    $.mix({
        fixDefault: $.noop,
        propMap: { //属性名映射
            "accept-charset": "acceptCharset",
            "char": "ch",
            "charoff": "chOff",
            "class": "className",
            "for": "htmlFor",
            "http-equiv": "httpEquiv"
        },
        prop: function(node, name, value) {
            if($["@bind"] in node) {
                if(node.nodeType === 1 && !$.isXML(node)) {
                    name = $.propMap[name.toLowerCase()] || name;
                }
                var access = value === void 0 ? "get" : "set"
                return($.propHooks[name + ":" + access] || $.propHooks["@default:" + access])(node, name, value)
            }
        },
        attr: function(node, name, value) {
            if($["@bind"] in node) {
                if(typeof node.getAttribute === "undefined") {
                    return $.prop(node, name, value);
                }
                //这里只剩下元素节点
                var noxml = !$.isXML(node),
                type = "@w3c";
                if(noxml) {
                    name = name.toLowerCase();
                    var prop = $.propMap[name] || name
                    if(!support.attrInnateName) {
                        type = "@ie"
                    }
                    var isBool = typeof node[prop] == "boolean" && typeof defaultProp(node, prop) == "boolean" //判定是否为布尔属性
                }
                //移除操作
                if(noxml) {
                    if(value === null || value === false && isBool) {
                        return $.removeAttr(node, name)
                    }
                } else if(value === null) {
                    return node.removeAttribute(name)
                }
                //读写操作
                var access = value === void 0 ? "get" : "set"
                if(isBool) {
                    type = "@bool";
                    name = prop;
                }
                return(noxml && $.attrHooks[name + ":" + access] || $.attrHooks[type + ":" + access])(node, name, value)
            }
        },
        //只能用于HTML,元素节点的内建不能删除（chrome真的能删除，会引发灾难性后果），使用默认值覆盖
        removeProp: function(node, name) {
            if(node.nodeType === 1) {
                if(!support.attrInnateName) {
                    name = $.propMap[name.toLowerCase()] || name;
                }
                node[name] = defaultProp(node, name)
            } else {
                node[name] = void 0;
            }
        },
        //只能用于HTML
        removeAttr: function(node, name) {
            if(name && node.nodeType === 1) {
                name = name.toLowerCase();
                if(!support.attrInnateName) {
                    name = $.propMap[name] || name;
                }
                //小心contentEditable,会把用户编辑的内容清空
                if(typeof node[name] != "boolean") {
                    node.setAttribute(name, "")
                }
                node.removeAttribute(name);
                // 确保bool属性的值为bool
                if(node[name] === true) {
                    node[name] = false;
                    $.fixDefault(node, name, false);
                }
            }
        },
        propHooks: {
            "@default:get": function(node, name) {
                return node[name];
            },
            "@default:set": function(node, name, value) {
                node[name] = value;
            },
            "tabIndex:get": function(node) {
                //http://www.cnblogs.com/rubylouvre/archive/2009/12/07/1618182.html
                var ret = node.tabIndex;
                if(ret === 0) { //在标准浏览器下，不显式设置时，表单元素与链接默认为0，普通元素为-1
                    ret = rtabindex.test(node.nodeName) ? 0 : -1;
                }
                return ret;
            }
        },
        attrHooks: {
            "@w3c:get": function(node, name) {
                var ret = node.getAttribute(name);
                return ret == null ? void 0 : ret;
            },
            "@w3c:set": function(node, name, value) {
                node.setAttribute(name, "" + value)
            },
            "@bool:get": function(node, name) {
                //布尔属性在IE6-8的标签大部字母大写，没有赋值，并且无法通过其他手段获得用户的原始设值
                return node[name] ? name.toLowerCase() : void 0
            },
            "@bool:set": function(node, name) {
                //布尔属性在IE6-8的标签大部字母大写，没有赋值，并且无法通过其他手段获得用户的原始设值
                node.setAttribute(name, name.toLowerCase())
                node[name] = true;
                $.fixDefault(node, name, true);
            }

        }
    });
    "Attr,Prop".replace($.rword, function(method) {
        $.fn[method.toLowerCase()] = function(name, value) {
            return $.access(this, name, value, $[method.toLowerCase()]);
        }
        $.fn["remove" + method] = function(name) {
            return this.each(function() {
                $["remove" + method](this, name);
            });
        }
    });
    //========================propHooks 的相关修正==========================
    var prop = "accessKey,allowTransparency,bgColor,cellPadding,cellSpacing,codeBase,codeType,colSpan,contentEditable," + "dateTime,defaultChecked,defaultSelected,defaultValue,frameBorder,isMap,longDesc,maxLength,marginWidth,marginHeight," + "noHref,noResize,noShade,readOnly,rowSpan,tabIndex,useMap,vSpace,valueType,vAlign";
    prop.replace($.rword, function(name) {
        $.propMap[name.toLowerCase()] = name;
    });

    //safari IE9 IE8 我们必须访问上一级元素时,才能获取这个值
    if(!support.optSelected) {
        $.propHooks["selected:get"] = function(node) {
            for(var p = node; typeof p.selectedIndex != "number"; p = p.parentNode) {}
            return node.selected;
        }
    }
    //========================valHooks 的相关修正==========================
    var valHooks = {
        "option:get": function(node) {
            var val = node.attributes.value;
            //黑莓手机4.7下val会返回undefined,但我们依然可用node.value取值
            return !val || val.specified ? node.value : node.text;
        },
        "select:get": function(node, value, getter) {
            var option, options = node.options,
            index = node.selectedIndex,
            one = node.type === "select-one" || index < 0,
            values = one ? null : [],
            max = one ? index + 1 : options.length,
            i = index < 0 ? max : one ? index : 0;
            for(; i < max; i++) {
                option = options[i];
                //旧式IE在reset后不会改变selected，需要改用i === index判定
                //我们过滤所有disabled的option元素，但在safari5下，如果设置select为disable，那么其所有孩子都disable
                //因此当一个元素为disable，需要检测其是否显式设置了disable及其父节点的disable情况
                if((option.selected || i === index) && (support.optDisabled ? !option.disabled : option.getAttribute("disabled") === null) && (!option.parentNode.disabled || !$.type(option.parentNode, "OPTGROUP"))) {
                    value = getter(option);
                    if(one) {
                        return value;
                    }
                    //收集所有selected值组成数组返回
                    values.push(value);
                }
            }
            return values;
        },
        "select:set": function(node, name, values, getter) {
            $.slice(node.options).forEach(function(el) {
                el.selected = !! ~values.indexOf(getter(el));
            });
            if(!values.length) {
                node.selectedIndex = -1;
            }
        }
    }
    //checkbox的value默认为on，唯有chrome 返回空字符串
    if(!support.checkOn) {
        "radio,checkbox".replace($.rword, function(name) {
            valHooks[name + ":get"] = function(node) {
                return node.getAttribute("value") === null ? "on" : node.value;
            }
        });
    }
    //处理单选框，复选框在设值后checked的值
    "radio,checkbox".replace($.rword, function(name) {
        valHooks[name + ":set"] = function(node, name, value) {
            if(Array.isArray(value)) {
                return node.checked = !! ~value.indexOf(node.value);
            }
        }
    });
    if(typeof $.fixIEAttr == "function") {
        $.fixIEAttr(valHooks, $.attrHooks);
    }
    return $;
});


//=========================================
//  样式补丁模块
//==========================================
define("css_fix", !! top.getComputedStyle, ["$node"], function($) {
    var adapter = $.cssHooks = {},
        ie8 = !! top.XDomainRequest,
        rfilters = /[\w\:\.]+\([^)]+\)/g,
        rnumnonpx = /^-?(?:\d*\.)?\d+(?!px)[^\d\s]+$/i,
        rposition = /^(top|right|bottom|left)$/,
        salpha = "DXImageTransform.Microsoft.Alpha",
        border = {
            thin: ie8 ? '1px' : '2px',
            medium: ie8 ? '3px' : '4px',
            thick: ie8 ? '5px' : '6px'
        };
    $.getStyles = function(node) {
        return node.currentStyle;
    }
    adapter["_default:get"] = function(node, name, styles) {
        //取得精确值，不过它有可能是带em,pc,mm,pt,%等单位
        var currentStyle = styles || node.currentStyle;
        var ret = currentStyle[name];
        if((rnumnonpx.test(ret) && !rposition.test(ret))) {
            //①，保存原有的style.left, runtimeStyle.left,
            var style = node.style,
                left = style.left,
                rsLeft = node.runtimeStyle.left;
            //②由于③处的style.left = xxx会影响到currentStyle.left，
            //因此把它currentStyle.left放到runtimeStyle.left，
            //runtimeStyle.left拥有最高优先级，不会style.left影响
            node.runtimeStyle.left = currentStyle.left;
            //③将精确值赋给到style.left，然后通过IE的另一个私有属性 style.pixelLeft
            //得到单位为px的结果；fontSize的分支见http://bugs.jquery.com/ticket/760
            style.left = name === 'fontSize' ? '1em' : (ret || 0);
            ret = style.pixelLeft + "px";
            //④还原 style.left，runtimeStyle.left
            style.left = left;
            node.runtimeStyle.left = rsLeft;
        }
        if(ret == "medium") {
            name = name.replace("Width", "Style");
            //border width 默认值为medium，即使其为0"
            if(currentStyle[name] == "none") {
                ret = "0px";
            }
        }
        return ret === "" ? "auto" : border[ret] || ret;
    }
    //=========================　处理　opacity　=========================
    adapter["opacity:get"] = function(node) {
        //这是最快的获取IE透明值的方式，不需要动用正则了！
        var alpha = node.filters.alpha || node.filters[salpha],
            op = alpha ? alpha.opacity : 100;
        return(op / 100) + ""; //确保返回的是字符串
    }
    //http://www.freemathhelp.com/matrix-multiplication.html
    //金丝楠木是皇家专用木材，一般只有皇帝可以使用做梓宫。
    adapter["opacity:set"] = function(node, name, value, currentStyle) {
        var style = node.style;
        if(!isFinite(value)) { //"xxx" * 100 = NaN
            return;
        }
        value = (value > 0.999) ? 100 : (value < 0.001) ? 0 : value * 100;
        if(!currentStyle.hasLayout) style.zoom = 1; //让元素获得hasLayout
        var filter = currentStyle.filter || style.filter || "";
        //http://snook.ca/archives/html_and_css/ie-position-fixed-opacity-filter
        //IE78的透明滤镜当其值为100时会让文本模糊不清
        if(value == 100) { //IE78的透明滤镜当其值为100时会让文本模糊不清
            // var str =  "filter: progid:DXImageTransform.Microsoft.Alpha(opacity=100) Chroma(Color='#FFFFFF')"+
            //   "progid:DXImageTransform.Microsoft.Matrix(sizingMethod='auto expand',"+
            //   "M11=1.5320888862379554, M12=-1.2855752193730787,  M21=1.2855752193730796, M22=1.5320888862379558)";
            value = style.filter = filter.replace(rfilters, function(a) {
                return /alpha/i.test(a) ? "" : a; //可能存在多个滤镜，只清掉透明部分
            });
            //如果只有一个透明滤镜 就直接去掉
            if(value.trim() == "" && style.removeAttribute) {
                style.removeAttribute("filter");
            }
            return;
        }
        //如果已经设置过透明滤镜可以使用以下便捷方式
        var alpha = node.filters.alpha || node.filters[salpha];
        if(alpha) {
            alpha.opacity = value;
        } else {
            style.filter = ((filter ? filter + "," : "") + "alpha(opacity=" + value + ")");
        }
    }
    
    adapter["userSelect:set"] = function(node, name, value) {
        var allow = /none/.test(value) ? "on" : "",
            e, i = 0,
            els = node.getElementsByTagName('*');
        node.setAttribute('unselectable', allow);
        while((e = els[i++])) {
            switch(e.tagName) {
            case 'IFRAME':
            case 'TEXTAREA':
            case 'INPUT':
            case 'SELECT':
                break;
            default:
                e.setAttribute('unselectable', allow);
            }
        }
    };
    //=========================　处理　background-position　=========================
    adapter["backgroundPosition:get"] = function(node, _,style ) {
        return style.backgroundPositionX + " " + style.backgroundPositionX;
    };
    //=========================　处理　rotate　=========================
    var stransform = "DXImageTransform.Microsoft.Matrix";
    adapter.centerOrigin = "margin";
    adapter["rotate:set"] = function(node, name, value) {
        $._data(node, 'rotate', value);
        var matrix = node.filters[stransform];
        if(!matrix) {
            node.style.filter += "progid:" + stransform + "(M11=1,M12=1,M21=1,M22=1,sizingMethod='auto expand')";
            matrix = node.filters[stransform];
        }
        var _rad = value * Math.PI / 180,
            costheta = Math.cos(_rad),
            sintheta = Math.sin(_rad);
        matrix.M11 = costheta;
        matrix.M12 = -sintheta;
        matrix.M21 = sintheta;
        matrix.M22 = costheta;
        name = adapter.centerOrigin;
        node.style[name == 'margin' ? 'marginLeft' : 'left'] = -(node.offsetWidth / 2) + (node.clientWidth / 2) + "px";
        node.style[name == 'margin' ? 'marginTop' : 'top'] = -(node.offsetHeight / 2) + (node.clientHeight / 2) + "px";
    }
    return $;
});

//=========================================
// 样式操作模块 v5 by 司徒正美
//=========================================
define("css", top.getComputedStyle ? ["$node"] : ["$css_fix"], function($) {
    var adapter = $.cssHooks || ($.cssHooks = {}),
        rrelNum = /^([\-+])=([\-+.\de]+)/,
        rnumnonpx = /^-?(?:\d*\.)?\d+(?!px)[^\d\s]+$/i,
        cssTransform = $.cssName("transform");
    //这里的属性不需要自行添加px
    $.cssNumber = $.oneObject("columnCount,fillOpacity,fontSizeAdjust,fontWeight,lineHeight,opacity,orphans,widows,zIndex,zoom,rotate");
    //有关单位转换的 http://heygrady.com/blog/2011/12/21/length-and-angle-unit-conversion-in-javascript/
    if(window.getComputedStyle) {
        $.getStyles = function(node) {
            return window.getComputedStyle(node, null);
        }
        adapter["_default:get"] = function(node, name, styles) {
            var ret, width, minWidth, maxWidth
            styles = styles || getStyles(node);
            if(styles) {
                ret = name == "filter" ? styles.getPropertyValue(name) : styles[name]
                var style = node.style; //这里只有firefox与IE10会智能处理未插入DOM树的节点的样式,它会自动找内联样式
                if(ret === "" && !$.contains(node.ownerDocument, node)) {
                    ret = style[name]; //其他浏览器需要我们手动取内联样式
                }
                //  Dean Edwards大神的hack，用于转换margin的百分比值为更有用的像素值
                // webkit不能转换top, bottom, left, right, margin, text-indent的百分比值
                if(/^margin/.test(name) && rnumnonpx.test(ret)) {
                    width = style.width;
                    minWidth = style.minWidth;
                    maxWidth = style.maxWidth;

                    style.minWidth = style.maxWidth = style.width = ret;
                    ret = styles.width;

                    style.width = width;
                    style.minWidth = minWidth;
                    style.maxWidth = maxWidth;
                }
            }
            return ret;
        }
    }
    var getStyles = $.getStyles;
    delete $.getStyles;
    //用于性能优化,内部不用转换单位,属性名风格及进行相对赋值,远比调用$.css高效
    var getter = adapter["_default:get"];

    function parseNumber(styles, name) {
        return parseFloat(styles[name]) || 0;
    }

    adapter["zIndex:get"] = function(node) {
        while(node.nodeType !== 9) {
            //即使元素定位了，但如果zindex设置为"aaa"这样的无效值，浏览器都会返回auto;
            //如果没有指定zindex值，IE会返回数字0，其他返回auto
            var position = getter(node, "position") || "static";
            if(position !== "static") {
                // <div style="z-index: -10;"><div style="z-index: 0;"></div></div>
                var value = parseInt(getter(node, "zIndex"), 10);
                if(!isNaN(value) && value !== 0) {
                    return value;
                }
            }
            node = node.parentNode;
        }
        return 0;
    }
    adapter["_default:set"] = function(node, name, value) {
        node.style[name] = value;
    }
    // 获取CSS3变形中的角度
    adapter["rotate:get"] = function(node) {
        return $._data(node, 'rotate') || 0;
    }
    if(cssTransform) {
        adapter["rotate:set"] = function(node, name, value) {
            $._data(node, 'rotate', value);
            node.style[cssTransform] = 'rotate(' + (value * Math.PI / 180) + 'rad)';
        }
    }

    var supportBoxSizing = $.cssName("box-sizing");
    adapter["boxSizing:get"] = function(node, name) {
        return supportBoxSizing ? getter(node, name) : document.compatMode == "BackCompat" ? "border-box" : "content-box"
    }

    $.css = function(node, name, value, styles) {
        if(node.style) { //注意string经过call之后，变成String伪对象，不能简单用typeof来检测
            var prop = $.String.camelize(name)
            name = $.cssName(name);
            styles = styles || getStyles(node);
            if(value === void 0) { //获取样式
                return(adapter[prop + ":get"] || getter)(node, name, styles);
            } else { //设置样式
                var type = typeof value,
                    temp;
                if(type === "string" && (temp = rrelNum.exec(value))) {
                    if($.support.calc && name in styles) {
                        //在firefox18, ie10中必须要求calc括号中的运算符两边都有空白才生效
                        var cur = styles[name],
                            unit = (cur.match(/[a-z%]+$/) || [""])[0];
                        return node.style[name] = $.support.calc + "(" + [styles[name], temp[1], temp[2] + unit].join(" ") + ")";
                    } else {
                        value = (+(temp[1] + 1) * +temp[2]) + parseFloat($.css(node, name, void 0, styles));
                        type = "number";
                    }
                }
                if(type === "number" && !isFinite(value + "")) { //因为isFinite(null) == true
                    return;
                }
                if(type === "number" && !$.cssNumber[prop]) {
                    value += "px";
                }
                if(value === "" && !$.support.cloneBackgroundStyle && name.indexOf("background") === 0) {
                    node.style[name] = "inherit";
                }
                (adapter[prop + ":set"] || adapter["_default:set"])(node, name, value, styles);
            }
        }
    }

    $.fn.css = function(name, value) {
        return $.access(this, name, value, $.css);
    }
    var cssPair = {
        Width: ['Left', 'Right'],
        Height: ['Top', 'Bottom']
    }
    var cssShow = {
        position: "absolute",
        visibility: "hidden",
        display: "block"
    }

    function showHidden(node, array) {
        //http://www.cnblogs.com/rubylouvre/archive/2012/10/27/2742529.html
        if(node && node.nodeType == 1 && node.offsetWidth == 0) {
            if(getter(node, "display") == "none") {
                var obj = {
                    node: node
                }
                for(var name in cssShow) {
                    obj[name] = node.style[name];
                    node.style[name] = cssShow[name];
                }
                array.push(obj);
            }
            showHidden(node.parentNode, array);
        }
    }


    function setWH(node, name, val, extra) {
        var which = cssPair[name],
            styles = getStyles(node);
        which.forEach(function(direction) {
            if(extra < 1) val -= parseNumber(styles, 'padding' + direction);
            if(extra < 2) val -= parseNumber(styles, 'border' + direction + 'Width');
            if(extra === 3) {
                val += parseFloat(getter(node, 'margin' + direction, styles)) || 0;
            }
            if(extra === "padding-box") {
                val += parseNumber(styles, 'padding' + direction);
            }
            if(extra === "border-box") {
                val += parseNumber(styles, 'padding' + direction);
                val += parseNumber(styles, 'border' + direction + 'Width');
            }
        });
        return val
    }

    function getWH(node, name, extra) { //注意 name是首字母大写
        var hidden = [];
        showHidden(node, hidden);
        var val = setWH(node, name, node["offset" + name], extra);
        for(var i = 0, obj; obj = hidden[i++];) {
            node = obj.node;
            for(name in obj) {
                if(typeof obj[name] == "string") {
                    node.style[name] = obj[name];
                }
            }
        }
        return val;
    }

    //=========================　处理　width, height, innerWidth, innerHeight, outerWidth, outerHeight　========
    "Height,Width".replace($.rword, function(name) {
        var lower = name.toLowerCase(),
            clientProp = "client" + name,
            scrollProp = "scroll" + name,
            offsetProp = "offset" + name;
        $.cssHooks[lower + ":get"] = function(node) {
            return getWH(node, name, 0) + "px"; //添加相应适配器
        }
        $.cssHooks[lower + ":set"] = function(node, nick, value) {
            var box = $.css(node, "box-sizing"); //nick防止与外面name冲突
            node.style[nick] = box == "content-box" ? value : setWH(node, name, parseFloat(value), box) + "px";
        }
        "inner_1,b_0,outer_2".replace($.rmapper, function(a, b, num) {
            var method = b == "b" ? lower : b + name;
            $.fn[method] = function(value) {
                num = b == "outer" && value === true ? 3 : num;
                return $.access(this, num, value, function(node, num, size) {
                    if($.type(node, "Window")) { //取得窗口尺寸,IE9后可以用node.innerWidth /innerHeight代替
                        return node["inner" + name] || node.document.documentElement[clientProp];
                    }
                    if(node.nodeType === 9) { //取得页面尺寸
                        var doc = node.documentElement;
                        //FF chrome    html.scrollHeight< body.scrollHeight
                        //IE 标准模式 : html.scrollHeight> body.scrollHeight
                        //IE 怪异模式 : html.scrollHeight 最大等于可视窗口多一点？
                        return Math.max(
                        node.body[scrollProp], doc[scrollProp], node.body[offsetProp], doc[offsetProp], doc[clientProp]);
                    } else if(size === void 0) {
                        return getWH(node, name, num)
                    } else {
                        return num > 0 ? this : $.css(node, lower, size);
                    }
                }, this)
            }
        })

    });
    //=========================　生成　show hide toggle　=========================
    var cacheDisplay = $.oneObject("a,abbr,b,span,strong,em,font,i,kbd", "inline"),
        blocks = $.oneObject("div,h1,h2,h3,h4,h5,h6,section,p", "block"),
        shadowRoot, shadowDoc, shadowBody, shadowWin, reuse
        $.applyShadowDOM = function(callback) {
            //用于提供一个沙箱环境,IE6-10,opera,safari,firefox使用iframe, chrome20+使用Shodow DOM
            if(!shadowRoot) {
                if(window.WebKitShadowRoot) { //如果支持WebKitShadowRoot
                    shadowRoot = new WebKitShadowRoot($.html);
                    shadowBody = document.createElement("div");
                    shadowBody.style.cssText = "width:0px;height:0px;"
                    shadowRoot.appendChild(shadowBody);
                } else {
                    shadowRoot = document.createElement("iframe");
                    shadowRoot.frameBorder = shadowRoot.width = shadowRoot.height = 0;
                }
            }
            if(shadowRoot.nodeType == 1) {
                $.html.appendChild(shadowRoot);
                if(!reuse) { //firefox, safari, chrome不能重用shadowDoc,shadowWin
                    shadowDoc = shadowRoot.contentDocument || shadowRoot.contentWindow.document;
                    shadowWin = shadowDoc.defaultView || shadowDoc.parentWindow;
                    shadowDoc.write("<!doctype html><html><body>");
                    shadowDoc.close();
                    reuse = window.VBArray || window.opera; //opera9-12, ie6-10有效
                }
                callback(shadowWin, shadowDoc, shadowDoc.body);
                $.html.removeChild(shadowRoot);
            } else {
                callback(window, document, shadowBody);
                shadowBody.innerHTML = "";
            }

        }

    $.mix(cacheDisplay, blocks);
    $.parseDisplay = function(nodeName) {
        nodeName = nodeName.toLowerCase();
        if(!cacheDisplay[nodeName]) {
            $.applyShadowDOM(function(win, doc, body) {
                var node = doc.createElement(nodeName),
                    val
                    body.appendChild(node);
                if(win.getComputedStyle) {
                    val = win.getComputedStyle(node, null).display
                } else {
                    val = node.currentStyle.display
                }
                cacheDisplay[nodeName] = val; //getter(node, "display")
                body.innerHTML = "";
            });
        }
        return cacheDisplay[nodeName];
    }

    function isHidden(node) {
        return node.sourceIndex === 0 || getter(node, "display") === "none" || !$.contains(node.ownerDocument, node);
    }
    $._isHidden = isHidden;

    function toggelDisplay(nodes, show) {
        var elem, values = [],
            status = [],
            index = 0,
            length = nodes.length;
        //由于传入的元素们可能存在包含关系，因此分开两个循环来处理，第一个循环用于取得当前值或默认值
        for(; index < length; index++) {
            elem = nodes[index];
            if(!elem.style) {
                continue;
            }
            values[index] = $._data(elem, "olddisplay");
            status[index] = isHidden(elem)
            if(!values[index]) {
                values[index] = status[index] ? $.parseDisplay(elem.nodeName) : getter(elem, "display");
                $._data(elem, "olddisplay", values[index])
            }
        }
        //第二个循环用于设置样式，-1为toggle, 1为show, 0为hide
        for(index = 0; index < length; index++) {
            elem = nodes[index];
            if(!elem.style) {
                continue;
            }
            show = show === -1 ? !status[index] : show;
            elem.style.display = show ? values[index] : "none";
        }
        return nodes;
    }
    $.fn.show = function() {
        return toggelDisplay(this, 1);
    }
    $.fn.hide = function() {
        return toggelDisplay(this, 0);
    }
    //state为true时，强制全部显示，为false，强制全部隐藏
    $.fn.toggle = function(state) {
        return toggelDisplay(this, typeof state == "boolean" ? state : -1);
    }

    //=========================　处理　offset　=========================

    function setOffset(node, options) {
        if(node && node.nodeType == 1) {
            var position = getter(node, "position");
            //强逼定位
            if(position === "static") {
                node.style.position = "relative";
            }
            var curElem = $(node),
                curOffset = curElem.offset(),
                curCSSTop = getter(node, "top"),
                curCSSLeft = getter(node, "left"),
                calculatePosition = (position === "absolute" || position === "fixed") && [curCSSTop, curCSSLeft].indexOf("auto") > -1,
                props = {},
                curPosition = {},
                curTop, curLeft;
            if(calculatePosition) {
                curPosition = curElem.position();
                curTop = curPosition.top;
                curLeft = curPosition.left;
            } else {
                //如果是相对定位只要用当前top,left做基数
                curTop = parseFloat(curCSSTop) || 0;
                curLeft = parseFloat(curCSSLeft) || 0;
            }

            if(options.top != null) {
                props.top = (options.top - curOffset.top) + curTop;
            }
            if(options.left != null) {
                props.left = (options.left - curOffset.left) + curLeft;
            }
            curElem.css(props);
        }
    }

    $.fn.offset = function(options) { //取得第一个元素位于页面的坐标
        if(arguments.length) {
            return(!options || (!isFinite(options.top) && !isFinite(options.left))) ? this : this.each(function() {
                setOffset(this, options);
            });
        }

        var node = this[0],
            doc = node && node.ownerDocument,
            pos = {
                left: 0,
                top: 0
            };
        if(!doc) {
            return pos;
        }
        //http://hkom.blog1.fc2.com/?mode=m&no=750 body的偏移量是不包含margin的
        //我们可以通过getBoundingClientRect来获得元素相对于client的rect.
        //http://msdn.microsoft.com/en-us/library/ms536433.aspx
        var box = node.getBoundingClientRect(),
            win = getWindow(doc),
            root = (navigator.vendor || doc.compatMode == "BackCompat") ? doc.body : doc.documentElement,
            clientTop = root.clientTop >> 0,
            clientLeft = root.clientLeft >> 0,
            scrollTop = win.pageYOffset || root.scrollTop,
            scrollLeft = win.pageXOffset || root.scrollLeft;
        // 把滚动距离加到left,top中去。
        // IE一些版本中会自动为HTML元素加上2px的border，我们需要去掉它
        // http://msdn.microsoft.com/en-us/library/ms533564(VS.85).aspx
        pos.top = box.top + scrollTop - clientTop, pos.left = box.left + scrollLeft - clientLeft;

        return pos;
    }
    //=========================　处理　position　=========================
    $.fn.position = function() { //取得元素相对于其offsetParent的坐标
        var offset, node = this[0],
            parentOffset = { //默认的offsetParent相对于视窗的距离
                top: 0,
                left: 0
            }
        if(!node || node.nodeType !== 1) {
            return
        }
        //fixed 元素是相对于window
        if(getter(node, "position") === "fixed") {
            offset = node.getBoundingClientRect();
        } else {
            offset = this.offset(); //得到元素相对于视窗的距离（我们只有它的top与left）
            var offsetParent = this.offsetParent();
            if(offsetParent[0].tagName !== "HTML") {
                parentOffset = offsetParent.offset(); //得到它的offsetParent相对于视窗的距离
            }
            var styles = getStyles(offsetParent[0]);
            parentOffset.top += parseNumber(styles, "borderTopWidth");
            parentOffset.left += parseNumber(styles, "borderLeftWidth");
        }
        return {
            top: offset.top - parentOffset.top - parseFloat(getter(node, "marginTop", styles)) || 0,
            left: offset.left - parentOffset.left - parseFloat(getter(node, "marginLeft", styles)) || 0
        };
    }
    //https://github.com/beviz/jquery-caret-position-getter/blob/master/jquery.caretposition.js
    //https://developer.mozilla.org/en-US/docs/DOM/element.offsetParent
    //如果元素被移出DOM树，或display为none，或作为HTML或BODY元素，或其position的精确值为fixed时，返回null
    $.fn.offsetParent = function() {
        return this.map(function() {
            var el = this.offsetParent;
            while(el && (el.parentNode.nodeType !== 9) && getter(el, "position") === "static") {
                el = el.offsetParent;
            }
            return el || document.documentElement;
        });
    }
    $.fn.scrollParent = function() {
        var scrollParent, node = this[0],
            pos = getter(node, "position")
            if((window.VBArray && (/(static|relative)/).test(pos)) || (/absolute/).test(pos)) {
                scrollParent = this.parents().filter(function() {
                    return(/(relative|absolute|fixed)/).test(getter(this, "position")) && (/(auto|scroll)/).test(getter(this, "overflow") + $.css(this, "overflow-y") + $.css(this, "overflow-x"));
                }).eq(0);
            } else {
                scrollParent = this.parents().filter(function() {
                    return(/(auto|scroll)/).test(getter(this, "overflow") + $.css(this, "overflow-y") + $.css(this, "overflow-x"));
                }).eq(0);
            }
        return(/fixed/).test(pos) || !scrollParent.length ? $(document) : scrollParent;
    }
    //=========================　处理　scrollLeft scrollTop　=========================
    "scrollLeft_pageXOffset,scrollTop_pageYOffset".replace($.rmapper, function(_, method, prop) {
        $.fn[method] = function(val) {
            var node, win, top = method == "scrollTop";
            if(val === void 0) {
                node = this[0];
                if(!node) {
                    return null;
                }
                win = getWindow(node); //获取第一个元素的scrollTop/scrollLeft
                return win ? (prop in win) ? win[prop] : win.document.documentElement[method] : node[method];
            }
            return this.each(function() { //设置匹配元素的scrollTop/scrollLeft
                win = getWindow(this);
                if(win) {
                    win.scrollTo(!top ? val : $(win).scrollLeft(), top ? val : $(win).scrollTop());
                } else {
                    this[method] = val;
                }
            });
        };
    });

    function getWindow(node) {
        return $.type(node, "Window") ? node : node.nodeType === 9 ? node.defaultView || node.parentWindow : false;
    }
    return $;
});

//=========================================
//  事件补丁模块
//==========================================
define("event_fix", !! document.dispatchEvent, ["$node"], function($) {
    //模拟IE678的reset,submit,change的事件代理
    var rformElems = /^(?:input|select|textarea)$/i
    var facade = $.event = {
        special: {},
        fixMouse: function(event) {
            // 处理鼠标事件 http://www.w3help.org/zh-cn/causes/BX9008
            var doc = event.target.ownerDocument || document; //safari与chrome下，滚动条，视窗相关的东西是放在body上
            var box = document.compatMode == "BackCompat" ? doc.body : doc.documentElement
            event.pageX = event.clientX + (box.scrollLeft >> 0) - (box.clientLeft >> 0);
            event.pageY = event.clientY + (box.scrollTop >> 0) - (box.clientTop >> 0);
            //如果不存在relatedTarget属性，为它添加一个
            if(!event.relatedTarget && event.fromElement) { //mouseover mouseout
                event.relatedTarget = event.fromElement === event.target ? event.toElement : event.fromElement;
            }
            //标准浏览判定按下鼠标哪个键，左1中2右3
            var button = event.button
            //IE event.button的意义 0：没有键被按下 1：按下左键 2：按下右键 3：左键与右键同时被按下 4：按下中键 5：左键与中键同时被按下 6：中键与右键同时被按下 7：三个键同时被按下
            event.which = [0, 1, 3, 0, 2, 0, 0, 0][button]; //0现在代表没有意义
        },
        fixKeyboard: function(event) {
            event.which = event.charCode != null ? event.charCode : event.keyCode;
        }
    };
    var special = facade.special

    function simulate(type, elem, event) {
        event = new $.Event(event);
        $.mix({
            type: type,
            isSimulated: true
        });
        $.event.trigger.call(elem, event);
        if(event.defaultPrevented) {
            event.preventDefault();
        }
    }
    special.change = {
        setup: function() {
            if(rformElems.test(this.nodeName)) {
                // IE doesn't fire change on a check/radio until blur; trigger it on click
                // after a propertychange. Eat the blur-change in special.change.handle.
                // This still fires onchange a second time for check/radio after blur.
                if(this.type === "checkbox" || this.type === "radio") {
                    $(this).bind("propertychange._change", function(event) {
                        if(event.originalEvent.propertyName === "checked") {
                            this._just_changed = true;
                        }
                    });
                    $(this).bind("click._change", function(event) {
                        if(this._just_changed && !event.isTrigger) {
                            this._just_changed = false;
                        }
                        // Allow triggered, simulated change events (#11500)
                        simulate("change", this, event);
                    });
                }
                return false;
            }
            // Delegated event; lazy-add a change handler on descendant inputs
            $(this).bind("beforeactivate._change", function(e) {
                var elem = e.target;
                if(rformElems.test(elem.nodeName) && !$._data(elem, "_change_attached")) {
                    $(elem).bind("change._change", function(event) {
                        if(this.parentNode && !event.isSimulated && !event.isTrigger) {
                            simulate("change", this.parentNode, event);
                        }
                        $._data(elem, "_change_attached", true);
                    })
                }
            });
        },
        handle: function(event) {
            var elem = event.target;
            // Swallow native change events from checkbox/radio, we already triggered them above
            if(this !== elem || event.isSimulated || event.isTrigger || (elem.type !== "radio" && elem.type !== "checkbox")) {
                return event.handleObj.handler.apply(this, arguments);
            }
        },
        teardown: function() {
            facade.remove(this, "._change");
            return !rformElems.test(this.nodeName);
        }
    }
    special.submit = {
        setup: function() {
            // Only need this for delegated form submit events
            if(this.tagName === "FORM") {
                return false;
            }
            // Lazy-add a submit handler when a descendant form may potentially be submitted
            $(this).bind("click._submit keypress._submit", function(e) {
                // Node name check avoids a VML-related crash in IE (#9807)
                var elem = e.target,
                form = /input|button/i.test(elem.tagName) ? elem.form : undefined;
                if(form && !$._data(form, "_submit_attached")) {
                    facade.bind(form, {
                        type: "submit._submit",
                        callback: function(event) {
                            event._submit_bubble = true;
                        }
                    });
                    $._data(form, "_submit_attached", true);
                }
            });
        // return undefined since we don't need an event listener
        },

        postDispatch: function(event) {
            // If form was submitted by the user, bubble the event up the tree
            if(event._submit_bubble) {
                delete event._submit_bubble;
                if(this.parentNode && !event.isTrigger) {
                    simulate("submit", this.parentNode, event);
                }
            }
        },

        teardown: function() {
            if(this.tagName == "FORM") {
                return false;
            }
            facade.remove(this, "._submit");
        }
    }
    return $;
})


//=========================================
// 事件系统 v9
//==========================================
define("event", top.dispatchEvent ? ["$node"] : ["$event_fix"], function($) {
    var facade = $.event || ($.event = {
        //对某种事件类型进行特殊处理
        special: {},
        //对Mouse事件这一大类事件类型的事件对象进行特殊处理
        fixMouse: function(event, real) {
            if(event.type === "mousewheel") { //处理滚轮事件
                if("wheelDelta" in real) { //统一为±120，其中正数表示为向上滚动，负数表示向下滚动
                    // http://www.w3help.org/zh-cn/causes/SD9015
                    var delta = real.wheelDelta
                    //opera 9x系列的滚动方向与IE保持一致，10后修正
                    if(window.opera && opera.version() < 10) delta = -delta;
                    event.wheelDelta = Math.round(delta); //修正safari的浮点 bug
                } else if("detail" in real) {
                    event.wheelDelta = -real.detail * 40; //修正FF的detail 为更大众化的wheelDelta
                }
            }
        }
    }),
    eventHooks = facade.special,
    rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
    rtypenamespace = /^([^.]*)(?:\.(.+)|)$/,
    mouseEvents = "contextmenu,click,dblclick,mouseout,mouseover,mouseenter,mouseleave,mousemove,mousedown,mouseup,mousewheel,",
   
    types = mouseEvents + ",keypress,keydown,keyup," + "blur,focus,focusin,focusout," + "abort,error,load,unload,resize,scroll,change,input,select,reset,submit" //input
    $.eventMap = $.oneObject(mouseEvents, "Mouse")
    $.eventSupport = function(eventName, el) {
        el = el || $.html;//此方法只能检测元素节点对某种事件的支持，并且只能检测一般性的事件，对于像表单事件，需要传入input元素进行检测
        eventName = "on" + eventName;
        var ret = eventName in el;
        if(el.setAttribute && !ret) {
            el.setAttribute(eventName, "");
            ret = typeof el[eventName] === "function";
            el.removeAttribute(eventName);
        }
        el = null;
        return ret;
    };

    function Event(src, props) {
        if(!(this instanceof $.Event)) {
            return new Event(src, props);
        }
        this.originalEvent = {}; //保存原生事件对象
        if(src && src.type) {
            this.originalEvent = src; //重写
            this.type = src.type;
        } else {
            this.type = src;
        }
        this.defaultPrevented = false;
        if(props) {
            $.mix(this, props);
        }
        this.timeStamp = new Date - 0;
    };
    Event.prototype = {
        toString: function() {
            return "[object Event]"
        },
        preventDefault: function() { //阻止默认行为
            this.defaultPrevented = true;
            var e = this.originalEvent
            if(e && e.preventDefault) {
                e.preventDefault();
            }
            e.returnValue = false;
            return this;
        },
        stopPropagation: function() { //阻止事件在DOM树中的传播
            var e = this.originalEvent
            if(e && e.stopPropagation) {
                e.stopPropagation();
            } //propagationStopped的命名出自 http://opera.im/kb/userjs/
            e.cancelBubble = this.propagationStopped = true;
            return this;
        },
        stopImmediatePropagation: function() { //阻止事件在一个元素的同种事件的回调中传播
            this.isImmediatePropagationStopped = true;
            this.stopPropagation();
            return this;
        }
    }
    $.Event = Event;
    $.mix(eventHooks, {
        load: { //此事件不能冒泡
            noBubble: true
        },
        click: { //处理checkbox中的点击事件
            trigger: function() {
                if(this.nodeName == "INPUT" && this.type === "checkbox" && this.click) {
                    this.click();
                    return false;
                }
            }
        },
        focus: { //IE9-在不能聚焦到隐藏元素上,强制触发此事件会抛错
            trigger: function() {
                if(this !== document.activeElement && this.focus) {

                    try {
                        this.focus();
                        return false;
                    } catch(e) {}
                }
            },
            delegateType: "focusin"
        },
        blur: {
            trigger: function() { //blur事件的派发使用原生方法实现
                if(this === document.activeElement && this.blur) {
                    this.blur();
                    return false;
                }
            },
            delegateType: "focusout"
        },
        beforeunload: {
            postDispatch: function(event) {
                if(event.result !== void 0) {
                    event.originalEvent.returnValue = event.result;
                }
            }
        }
    });

    $.mix(facade, {
        //addEventListner API的支持情况:chrome 1+ FF1.6+ IE9+ opera 7+ safari 1+;
        //http://functionsource.com/post/addeventlistener-all-the-way-back-to-ie-6
        add: function(elem, hash) {
            var elemData = $._data(elem),
            //取得对应的缓存体
            types = hash.type,
            //原有的事件类型,可能是复数个
            selector = hash.selector,
            //是否使用事件代理
            handler = hash.handler; //回调函数
            if(elem.nodeType === 3 || elem.nodeType === 8 || !types || !handler) {
                return;
            }
            hash.uniqueNumber = $.getUid(handler); //确保hash.uuid与fn.uuid一致
            var events = elemData.events || (elemData.events = []),
            eventHandle = elemData.handle;
            if(!eventHandle) {
                elemData.handle = eventHandle = function(e) {
                    return typeof $ !== "undefined" && (!e || facade.triggered !== e.type) ? facade.dispatch.apply(eventHandle.elem, arguments) : void 0;
                };
                eventHandle.elem = elem; //由于IE的attachEvent回调中的this不指向绑定元素，需要强制缓存它
            }

            types.replace($.rword, function(t) {
                var tns = rtypenamespace.exec(t) || [],
                type = tns[1];
                var namespaces = (tns[2] || "").split(".").sort();
                // 看需不需要特殊处理
                var hook = eventHooks[type] || {};
                // 事件代理与事件绑定可以使用不同的冒充事件
                type = (selector ? hook.delegateType : hook.bindType) || type;
                hook = eventHooks[type] || {};
                var handleObj = $.mix({}, hash, {
                    type: type,
                    origType: tns[1],
                    namespace: namespaces.join(".")
                });

                var handlers = events[type]; //初始化事件列队
                if(!handlers) {
                    handlers = events[type] = [];
                    handlers.delegateCount = 0;
                    if(!hook.setup || hook.setup.call(elem, namespaces, eventHandle) === false) {
                        if($["@bind"] in elem) {
                            $.bind(elem, type, eventHandle)
                        }
                    }
                }
                if(hook.add) {
                    hook.add.call(elem, handleObj);
                }
                //先处理用事件代理的回调，再处理用普通方式绑定的回调
                if(selector) {
                    handlers.splice(handlers.delegateCount++, 0, handleObj);
                } else {
                    handlers.push(handleObj);
                }
                //用于优化fire方法
                facade.global[type] = true;
            })
            //防止IE内在泄漏
            elem = null;
        },
        //用于优化事件派发
        global: {},
        //移除目标元素绑定的回调
        remove: function(elem, hash) {
            var elemData = $._data(elem),
            events, origType
            if(!(events = elemData.events)) return;

            var types = hash.type || "",
            selector = hash.selector,
            handler = hash.handler;
            types.replace($.rword, function(t) {
                var tns = rtypenamespace.exec(t) || [],
                type = origType = tns[1],
                namespaces = tns[2];
                //只传入命名空间,不传入事件类型,则尝试遍历所有事件类型
                if(!type) {
                    for(type in events) {
                        facade.unbind(elem, $.mix({}, hash, {
                            type: type + t
                        }));
                    }
                    return
                }
                var hook = eventHooks[type] || {};
                type = (selector ? hook.delegateType : hook.bindType) || type;
                var handlers = events[type] || [];
                var origCount = handlers.length;
                namespaces = namespaces ? new RegExp("(^|\\.)" + namespaces.split(".").sort().join("\\.(?:.*\\.|)") + "(\\.|$)") : null;

                for(var j = 0, handleObj; j < handlers.length; j++) {
                    handleObj = handlers[j];
                    //如果事件类型相同，回调相同，命名空间相同，选择器相同则移除此handleObj
                    if((origType === handleObj.origType) && (!handler || handler.uniqueNumber === handleObj.uniqueNumber) && (!namespaces || namespaces.test(handleObj.namespace)) && (!selector || selector === handleObj.selector || selector === "**" && handleObj.selector)) {
                        handlers.splice(j--, 1);

                        if(handleObj.selector) {
                            handlers.delegateCount--;
                        }
                        if(hook.remove) {
                            hook.remove.call(elem, handleObj);
                        }
                    }
                }

                if(handlers.length === 0 && origCount !== handlers.length) {
                    if(!hook.teardown || hook.teardown.call(elem, namespaces, elemData.handle) === false) {
                        if($["@bind"] in elem) {
                            $.unbind(elem, type, elemData.handle)
                        }
                    }

                    delete events[type];
                }
            })

            if($.isEmptyObject(events)) {
                delete elemData.handle;
                $._removeData(elem, "events"); //这里会尝试移除缓存体
            }
        },
        //通过传入事件类型或事件对象,触发事件回调,在整个DOM树中执行
        trigger: function(event) {
            var elem = this;
            //跳过文本节点与注释节点，主要是照顾旧式IE
            if(elem && (elem.nodeType === 3 || elem.nodeType === 8)) {
                return;
            }

            var i, cur, old, ontype, handle, eventPath, bubbleType, type = event.type || event,
            namespaces = event.namespace ? event.namespace.split(".") : [];

            // focus/blur morphs to focusin/out; ensure we're not firing them right now
            if(rfocusMorph.test(type + facade.triggered)) {
                return;
            }

            if(type.indexOf(".") >= 0) {
                //分解出命名空间
                namespaces = type.split(".");
                type = namespaces.shift();
                namespaces.sort();
            }
            //如果从来没有绑定过此种事件，也不用继续执行了
            if(!elem && !facade.global[type]) {
                return;
            }

            // Caller can pass in an Event, Object, or just an event type string
            event = typeof event === "object" ?
            // 如果是$.Event实例
            event.originalEvent ? event :
            // Object literal
            new $.Event(type, event) :
            // Just the event type (string)
            new $.Event(type);

            event.type = type;
            event.isTrigger = true;
            event.namespace = namespaces.join(".");
            event.namespace_re = event.namespace ? new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)") : null;
            ontype = type.indexOf(":") < 0 ? "on" + type : "";
            //清除result，方便重用
            event.result = void 0;
            if(!event.target) {
                event.target = elem;
            }
            //取得额外的参数
            var data = $.slice(arguments);
            data[0] = event;
            //判定是否需要用到事件冒充
            var hook = eventHooks[type] || {};
            if(hook.trigger && hook.trigger.apply(elem, data) === false) {
                return;
            }

            //铺设往上冒泡的路径，每小段都包括处理对象与事件类型
            eventPath = [
            [elem, hook.bindType || type]
            ];
            if(!hook.noBubble && !$.type(elem, "Window")) {

                bubbleType = hook.delegateType || type;
                cur = rfocusMorph.test(bubbleType + type) ? elem : elem.parentNode;
                for(old = elem; cur; cur = cur.parentNode) {
                    eventPath.push([cur, bubbleType]);
                    old = cur;
                }
                //一直冒泡到window
                if(old === (elem.ownerDocument || document)) {
                    eventPath.push([old.defaultView || old.parentWindow || window, bubbleType]);
                }
            }

            //沿着之前铺好的路触发事件
            for(i = 0; i < eventPath.length && !event.propagationStopped; i++) {

                cur = eventPath[i][0];
                event.type = eventPath[i][1];

                handle = ($._data(cur, "events") || {})[event.type] && $._data(cur, "handle");
                if(handle) {
                    handle.apply(cur, data);
                }
                //处理直接写在标签中的内联事件或DOM0事件
                handle = ontype && cur[ontype];
                if(handle && handle.apply && handle.apply(cur, data) === false) {
                    event.preventDefault();
                }
            }
            event.type = type;
            //如果没有阻止默认行为
            if(!event.defaultPrevented) {

                if((!hook._default || hook._default.apply(elem.ownerDocument, data) === false) && !(type === "click" && elem.nodeName == "A")) {
                    if(ontype && $.isFunction(elem[type]) && elem.nodeType) {

                        old = elem[ontype];

                        if(old) {
                            elem[ontype] = null;
                        }
                        //防止二次trigger，elem.click会再次触发addEventListener中绑定的事件
                        facade.triggered = type;
                        try {
                            //IE6-8在触发隐藏元素的focus/blur事件时会抛出异常
                            elem[type]();
                        } catch(e) {}
                        delete facade.triggered;

                        if(old) {
                            elem[ontype] = old;
                        }
                    }
                }
            }

            return event.result;
        },
        //执行用户回调,只在当前元素中执行
        dispatch: function(e) {
            //如果不存在事件回调就没有必要继续进行下去
            var eventType = e.type,
            handlers = (($._data(this, "events") || {})[eventType] || [])
            if(!handlers.length) {
                return;
            }
            //摒蔽事件对象在各浏览器下的差异性
            var event = $.event.fix(e),
            delegateCount = handlers.delegateCount,
            args = $.slice(arguments),
            hook = eventHooks[eventType] || {},
            handlerQueue = [],
            ret, selMatch, matched, matches, handleObj, sel
            //重置第一个参数
            args[0] = event;
            event.delegateTarget = this;

            // 经典的AOP模式
            if(hook.preDispatch && hook.preDispatch.call(this, event) === false) {
                return;
            }
            //收集阶段
            //如果使用了事件代理，则先执行事件代理的回调, FF的右键会触发点击事件，与标签不符
            if(delegateCount && !(event.button && eventType === "click")) {
                for(var cur = event.target; cur != this; cur = cur.parentNode || this) {
                    //disabled元素不能触发点击事件
                    if(cur.disabled !== true || eventType !== "click") {
                        selMatch = {};
                        matches = [];
                        for(var i = 0; i < delegateCount; i++) {
                            handleObj = handlers[i];
                            sel = handleObj.selector + " ";//避免与Ovject.prototype的属性冲突,比如toString, valueOf等
                            //判定目标元素(this)的孩子(cur)是否匹配（sel）
                            if(selMatch[sel] === void 0) {
                                selMatch[sel] = $(sel, this).index(cur) >= 0
                            }
                            if(selMatch[sel]) {
                                matches.push(handleObj);
                            }
                        }
                        if(matches.length) {
                            handlerQueue.push({
                                elem: cur,
                                matches: matches
                            });
                        }
                    }
                }
            }

            // 这是事件绑定的回调
            if(handlers.length > delegateCount) {
                handlerQueue.push({
                    elem: this,
                    matches: handlers.slice(delegateCount)
                });
            }

            // 如果没有阻止事件传播，则执行它们
            for(i = 0; i < handlerQueue.length && !event.propagationStopped; i++) {
                matched = handlerQueue[i];
                event.currentTarget = matched.elem;
                for(var j = 0; j < matched.matches.length && !event.isImmediatePropagationStopped; j++) {
                    handleObj = matched.matches[j];
                    //namespace，namespace_re属性只出现在trigger方法中
                    if(!event.namespace || event.namespace_re && event.namespace_re.test(handleObj.namespace)) {
                        //event.data = handleObj.data;这不是一个好意义,因为message事件会有一个同名的data的属性
                        event.handleObj = handleObj;
                        ret = ((eventHooks[handleObj.origType] || {}).handle || handleObj.handler).apply(matched.elem, args);
                        handleObj.times--;
                        if(handleObj.times === 0) { //如果有次数限制并到用光所有次数，则移除它
                            facade.unbind(matched.elem, handleObj)
                        }
                        if(ret !== void 0) {
                            event.result = ret;
                            if(ret === false) {
                                event.preventDefault();
                                event.stopPropagation();
                            }
                        }
                    }
                }
            }

            if(hook.postDispatch) {
                hook.postDispatch.call(this, event);
            }

            return event.result;
        },

        //修正事件对象,摒蔽差异性
        fix: function(event) {
            if(!event.originalEvent) {
                var real = event;
                event = $.Event(real);
                //复制真实事件对象的成员
                for(var p in real) {
                    if(!(p in event)) {
                        event[p] = real[p]
                    }
                }
                //如果不存在target属性，为它添加一个
                if(!event.target) {
                    event.target = event.srcElement || document;
                }
                //safari的事件源对象可能为文本节点，应代入其父节点
                if(event.target.nodeType === 3) {
                    event.target = event.target.parentNode;
                }
                event.metaKey = !! event.ctrlKey; // 处理IE678的组合键
                var callback = facade["fix" + $.eventMap[event.type]]
                if(typeof callback == "function") {
                    callback(event, real)
                }
            }
            return event;
        }
    });
    facade.bind = facade.add;
    facade.unbind = facade.remove;
    //以下是用户使用的API
    $.implement({
        hover: function(fnIn, fnOut) {
            return this.mouseenter(fnIn).mouseleave(fnOut || fnIn);
        },
        delegate: function(selector, types, fn, times) {
            return this.on(types, selector, fn, times);
        },
        live: function(types, fn, times) {
            $.log("$.fn.live() is deprecated")
            $(this.ownerDocument).on(types, this.selector, fn, times);
            return this;
        },
        one: function(types, fn) {
            return this.on(types, fn, 1);
        },
        undelegate: function(selector, types, fn) { /*顺序不能乱*/
            return arguments.length == 1 ? this.off(selector, "**") : this.off(types, fn, selector);
        },
        die: function(types, fn) {
            $.log("$.fn.die() is deprecated")
            $(this.ownerDocument).off(types, fn, this.selector || "**", fn);
            return this;
        },
        fire: function() {
            var args = arguments;
            return this.each(function() {
                facade.trigger.apply(this, args);
            });
        }
    });
    $.fn.trigger = $.fn.fire;
    //这个迭代器产生四个重要的事件绑定API on off bind unbind
    var rtypes = /^[a-z0-9_\-\.\s\,]+$/i
    "on_bind,off_unbind".replace($.rmapper, function(_, method, mapper) {
        $.fn[method] = function(types, selector, fn) {
            if(typeof types === "object") {
                for(var type in types) {
                    $.fn[method](this, type, selector, types[type], fn);
                }
                return this;
            }
            var hash = {};
            for(var i = 0; i < arguments.length; i++) {
                var el = arguments[i];
                if(typeof el == "number") {
                    hash.times = el;
                } else if(typeof el == "function") {
                    hash.handler = el
                } else if(typeof el == "object") {
                    $.mix(hash, el, false);
                }
                if(typeof el === "string") {
                    if(hash.type != null) {
                        hash.selector = el.trim();
                    } else {
                        hash.type = el.trim(); //只能为字母数字-_.空格
                        if(!rtypes.test(hash.type)) {
                            $.error("事件类型格式不正确" , TypeError);
                        }
                    }
                }
            }
            if(!hash.type) {
                $.error("必须指明事件类型" );
            }
            if(method === "on" && !hash.handler) {
                $.error("必须指明事件回调" );
            }
            hash.times = hash.times > 0 ? hash.times : Infinity;
            return this.each(function() {
                facade[mapper](this, hash);
            });
        }
        $.fn[mapper] = function() { // $.fn.bind $.fn.unbind
            return $.fn[method].apply(this, arguments);
        }
    });

    types.replace($.rword, function(type) { //这里产生以事件名命名的快捷方法
        $.eventMap[type] = $.eventMap[type] || (/key/.test(type) ? "Keyboard" : "HTML")
        $.fn[type] = function(callback) {
            return callback ? this.bind(type, callback) : this.fire(type);
        }
    });
    /* mouseenter/mouseleave/focusin/focusout已为标准事件，经测试IE5+，opera11,FF10+都支持它们
详见http://www.filehippo.com/pl/download_opera/changelog/9476/
         */
    if(!+"\v1" || !$.eventSupport("mouseenter")) { //IE6789不能实现捕获与safari chrome不支持
        "mouseenter_mouseover,mouseleave_mouseout".replace($.rmapper, function(_, type, fix) {
            eventHooks[type] = {
                delegateType: fix,
                bindType: fix,
                handle: function(event) {
                    var ret, target = this,
                    related = event.relatedTarget,
                    handleObj = event.handleObj;
                    // For mousenter/leave call the handler if related is outside the target.
                    // NB: No relatedTarget if the mouse left/entered the browser window
                    if(!related || (related !== target && !$.contains(target, related))) {
                        event.type = handleObj.origType;
                        ret = handleObj.handler.apply(this, arguments);
                        event.type = fix;
                    }
                    return ret;
                }
            }
        });
    }
    //现在只有firefox不支持focusin,focusout事件,并且它也不支持DOMFocusIn,DOMFocusOut,不能像DOMMouseScroll那样简单冒充,Firefox 17+
    if(!$.support.focusin) {
        "focusin_focus,focusout_blur".replace($.rmapper, function(_, orig, fix) {
            var attaches = 0,
            handler = function(event) {
                event = facade.fix(event);
                $.mix(event, {
                    type: orig,
                    isSimulated: true
                });
                facade.trigger.call(event.target, event);
            };
            eventHooks[orig] = {
                setup: function() {
                    if(attaches++ === 0) {
                        document.addEventListener(fix, handler, true);
                    }
                },
                teardown: function() {
                    if(--attaches === 0) {
                        document.removeEventListener(fix, handler, true);
                    }
                }
            };
        });
    }
    try {
        //FF需要用DOMMouseScroll事件模拟mousewheel事件
        document.createEvent("MouseScrollEvents");
        eventHooks.mousewheel = {
            bindType: "DOMMouseScroll",
            delegateType: "DOMMouseScroll"
        }
        if($.eventSupport("mousewheel")) {
            delete eventHooks.mousewheel;
        }
    } catch(e) {};

    return $;
})


//=========================================
//  数据交互模块
//==========================================
//var reg = /^[^\u4E00-\u9FA5]*$/;
define("ajax", ["mass", "$interact"], function($) {
    var global = this,
    DOC = global.document,
    r20 = /%20/g,
    rCRLF = /\r?\n/g,
    encode = encodeURIComponent,
    decode = decodeURIComponent,
    rheaders = /^(.*?):[ \t]*([^\r\n]*)\r?$/mg,
    // IE的换行符不包含 \r
    rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
    rnoContent = /^(?:GET|HEAD)$/,
    rquery = /\?/,
    rurl = /^([\w.+-]+:)(?:\/\/([^\/?#:]*)(?::(\d+)|)|)/,
    //在IE下如果重置了document.domain，直接访问window.location会抛错，但用document.URL就ok了
    //http://www.cnblogs.com/WuQiang/archive/2012/09/21/2697474.html
    curl = DOC.URL,
    segments = rurl.exec(curl.toLowerCase()) || [],
    //http://www.cnblogs.com/rubylouvre/archive/2010/04/20/1716486.html
    s = ["XMLHttpRequest", "ActiveXObject('Msxml2.XMLHTTP.6.0')", "ActiveXObject('Msxml2.XMLHTTP.3.0')", "ActiveXObject('Msxml2.XMLHTTP')", "ActiveXObject('Microsoft.XMLHTTP')"];
    if(!+"\v1") {
        var v = DOC.documentMode;
        s[0] = v == 8 ? "XDomainRequest" : location.protocol === "file:" ? "!" : s[0]
    }
    for(var i = 0, axo; axo = s[i++];) {
        try {
            if(eval("new " + axo)) {
                $.xhr = new Function("return new " + axo);
                break;
            }
        } catch(e) {}
    }

    var accepts = {
        xml: "application/xml, text/xml",
        html: "text/html",
        text: "text/plain",
        json: "application/json, text/javascript",
        script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript",
        "*": ["*/"] + ["*"] //避免被压缩掉
    },
    defaults = {
        type: "GET",
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        async: true,
        jsonp: "callback"
    };
    //将data转换为字符串，type转换为大写，添加hasContent，crossDomain属性，如果是GET，将参数绑在URL后面


    function setOptions(opts) {
        opts = $.Object.merge({}, defaults, opts);
        if(opts.crossDomain == null) { //判定是否跨域
            var parts = rurl.exec(opts.url.toLowerCase());
            opts.crossDomain = !! (parts && (parts[1] !== segments[1] || parts[2] !== segments[2] || (parts[3] || (parts[1] === "http:" ? 80 : 443)) != (segments[3] || (segments[1] === "http:" ? 80 : 443))));
        }
        if(opts.data && opts.data !== "string") {
            opts.data = $.param(opts.data);
        }
        opts.url = opts.url.replace(/#.*$/, "").replace(/^\/\//, segments[1] + "//");
        opts.type = opts.type.toUpperCase();
        opts.hasContent = !rnoContent.test(opts.type); //是否为post请求
        if(!opts.hasContent) {
            if(opts.data) { //如果为GET请求,则参数依附于url上
                opts.url += (rquery.test(opts.url) ? "&" : "?") + opts.data;
            }
            if(opts.cache === false) { //添加时间截
                opts.url += (rquery.test(opts.url) ? "&" : "?") + "_time=" + Date.now();
            }
        }
        return opts;
    }

    "get,post".replace($.rword, function(method) {
        $[method] = function(url, data, callback, type) {
            if($.isFunction(data)) {
                type = type || callback;
                callback = data;
                data = undefined;
            }
            return $.ajax({
                type: method,
                url: url,
                data: data,
                success: callback,
                dataType: type
            });
        };

    });

    function isValidParamValue(val) {
        var t = typeof val; // If the type of val is null, undefined, number, string, boolean, return true.
        return val == null || (t !== 'object' && t !== 'function');
    }
    $.mix($, {
        getScript: function(url, callback) {
            return $.get(url, null, callback, "script");
        },

        getJSON: function(url, data, callback) {
            return $.get(url, data, callback, "jsonp");
        },

        
        upload: function(url, form, data, callback, dataType) {
            if($.isFunction(data)) {
                dataType = callback;
                callback = data;
                data = undefined;
            }
            return $.ajax({
                url: url,
                type: 'post',
                dataType: dataType,
                form: form,
                data: data,
                success: callback
            });
        },
        //将一个对象转换为字符串
        param: function(json, bracket) {
            if(!$.isPlainObject(json)) {
                return "";
            }
            bracket = typeof serializeArray == "boolean" ? bracket : !0;
            var buf = [],
            key, val;
            for(key in json) {
                if(json.hasOwnProperty(key)) {
                    val = json[key];
                    key = encode(key);
                    if(isValidParamValue(val)) { //只处理基本数据类型,忽略空数组,函数,正则,日期,节点等
                        buf.push(key, "=", encode(val + ""), "&");
                    } else if(Array.isArray(val) && val.length) { //不能为空数组
                        for(var i = 0, n = val.length; i < n; i++) {
                            if(isValidParamValue(val[i])) {
                                buf.push(key, (bracket ? encode("[]") : ""), "=", encode(val[i] + ""), "&");
                            }
                        }
                    }
                }
            }
            buf.pop();
            return buf.join("").replace(r20, "+");
        },
        //将一个字符串转换为对象
        //$.deparam = jq_deparam = function( params, coerce ) {
        //https://github.com/cowboy/jquery-bbq/blob/master/jquery.ba-bbq.js
        unparam: function(url, query) {
            var json = {};
            if(!url || !$.type(url, "String")) {
                return json
            }
            url = url.replace(/^[^?=]*\?/ig, '').split('#')[0]; //去除网址与hash信息
            //考虑到key中可能有特殊符号如“[].”等，而[]却有是否被编码的可能，所以，牺牲效率以求严谨，就算传了key参数，也是全部解析url。
            var pairs = url.split("&"),
            pair, key, val, i = 0,
            len = pairs.length;
            for(; i < len; ++i) {
                pair = pairs[i].split("=");
                key = decode(pair[0]);
                try {
                    val = decode(pair[1] || "");
                } catch(e) {
                    $.log(e + "decodeURIComponent error : " + pair[1], 3);
                    val = pair[1] || "";
                }
                key = key.replace(/\[\]$/, "") //如果参数名以[]结尾，则当作数组
                var item = json[key];
                if(item === void 0) {
                    json[key] = val; //第一次
                } else if(Array.isArray(item)) {
                    item.push(val); //第三次或三次以上
                } else {
                    json[key] = [item, val]; //第二次,将它转换为数组
                }
            }
            return query ? json[query] : json;
        },
        serialize: function(form) { //表单元素变字符串
            var json = {};
            // 不直接转换form.elements，防止以下情况：   <form > <input name="elements"/><input name="test"/></form>
            $.filter(form || [], function(el) {
                return el.name && !el.disabled && (el.checked === true || /radio|checkbox/.test(el.type))
            }).forEach(function(el) {
                var val = $(el).val(),
                vs;
                val = Array.isArray(val) ? val : [val];
                val = val.map(function(v) {
                    return v.replace(rCRLF, "\r\n");
                });
                // 全部搞成数组，防止同名
                vs = json[el.name] || (json[el.name] = []);
                vs.push.apply(vs, val);
            });
            return $.param(json, false); // 名值键值对序列化,数组元素名字前不加 []
        }
    });
    /*=============================================================================================
    从这里开始是数据交互模块的核心,包含一个ajax方法,ajaxflow对象,传送器集合,转换器集合
    =============================================================================================*/
    var ajaxflow = new $.Flow
    var transports = {} //传送器，我们可以通过XMLHttpRequest, Script, Iframe与后端
    var converters = { //转换器，返回用户想要做的数据（从原始返回值中提取加工）
        text: function(xhr, text, xml) {
            return text != undefined ? text : ("xml" in xml ? xml.xml : new XMLSerializer().serializeToString(xml));
        },
        xml: function(xhr, text, xml) {
            return xml != undefined ? xml : $.parseXML(text);
        },
        html: function(xhr, text, xml) {
            return $.parseHTML(text);
        },
        json: function(xhr, text, xml) {
            return $.parseJSON(text);
        },
        script: function(xhr, text, xml) {
            $.parseJS(text);
        }
    }
    var ajax = $.ajax = function(opts) {
        if(!opts || !opts.url) {
            $.error("参数必须为Object并且拥有url属性" );
        }
        opts = setOptions(opts); //规整化参数对象
        //创建一个伪XMLHttpRequest,能处理complete,success,error等多投事件
        var dummyXHR = new $.XHR(opts),
        dataType = opts.dataType;
        if(opts.form && opts.form.nodeType === 1) {
            dataType = "iframe";
        } else if(dataType == "jsonp") {
            if(opts.crossDomain) { // opts.crossDomain &&
                $.log("使用script发出JSONP请求")
                ajaxflow.fire("start", dummyXHR, opts.url, opts.jsonp, opts.jsonpCallback); //用于jsonp请求
                dataType = "script"
            } else {
                dataType = dummyXHR.options.dataType = "json";
            }
        }
        var transportContructor = transports[dataType] || transports._default,
        transport = new transportContructor();
        transport.dummyXHR = dummyXHR;
        dummyXHR.transport = transport;
        if(opts.contentType) {
            dummyXHR.setRequestHeader("Content-Type", opts.contentType);
        }
        //添加dataType所需要的Accept首部
        dummyXHR.setRequestHeader("Accept", accepts[dataType] ? accepts[dataType] + ", */*; q=0.01" : accepts["*"]);
        for(var i in opts.headers) {
            dummyXHR.setRequestHeader(i, opts.headers[i]);
        }
        "complete success error".replace($.rword, function(name) {
            if(typeof opts[name] === "function") {
                dummyXHR.addEventListener(name, opts[name])
                delete opts[name];
            }
        });
        dummyXHR.readyState = 1;
        // 处理超时
        if(opts.async && opts.timeout > 0) {
            dummyXHR.timeoutID = setTimeout(function() {
                dummyXHR.abort("timeout");
            }, opts.timeout);
        }
        try {
            dummyXHR.state = 1; //已发送
            transport.request();
        } catch(e) {
            if(dummyXHR.status < 2) {
                dummyXHR.dispatch(-1, e);
            } else {
                $.log(e);
            }
        }
        return dummyXHR;
    }

    ajax.isLocal = rlocalProtocol.test(segments[1]);
    
    $.XHR = $.factory({
        inherit: $.Flow,
        init: function(opts) {
            $.mix(this, {
                responseData: null,
                timeoutID: null,
                responseText: null,
                responseXML: null,
                statusText: null,
                transport: null,
                responseHeadersString: "",
                responseHeaders: {},
                requestHeaders: {},
                readyState: 0,
                //internal state
                state: 0,
                status: 0
            });
            this.setOptions("options", opts); //创建一个options保存原始参数
        },
        setRequestHeader: function(name, value) {
            this.requestHeaders[name] = value;
            return this;
        },
        getAllResponseHeaders: function() {
            return this.state === 2 ? this.responseHeadersString : null;
        },
        getResponseHeader: function(name, match) {
            if(this.state === 2) {
                while((match = rheaders.exec(this.responseHeadersString))) {
                    this.responseHeaders[match[1]] = match[2];
                }
                match = this.responseHeaders[name];
            }
            return match === undefined ? null : match;
        },
        overrideMimeType: function(type) {
            // 只有在没有发出请求前才能重写 content-type 首部
            if(!this.state) {
                this.mimeType = type;
            }
            return this;
        },
        toString: function() {
            return "[object XMLHttpRequest]"
        },
        // 中止请求
        abort: function(statusText) {
            statusText = statusText || "abort";
            if(this.transport) {
                this.transport.respond(0, 1);
            }
            this.dispatch(0, statusText);
            return this;
        },
        
        dispatch: function(status, statusText) {
            // 只能执行一次，防止重复执行
            if(this.state == 2) { //2:已执行回调
                return;
            }
            this.state = 2;
            this.readyState = 4;
            var eventType = "error";
            if(status >= 200 && status < 300 || status == 304) {
                if(status == 304) {
                    statusText = "notmodified";
                    eventType = "success";
                } else {
                    try {
                        var dataType = this.options.dataType || this.options.mimeType || this.nativeXHR && this.nativeXHR.responseType;
                        if(!dataType) { //如果没有指定dataType，则根据mimeType或Content-Type进行揣测
                            dataType = this.getResponseHeader("Content-Type") || "";
                            dataType = dataType.match(/json|xml|script|html/) || ["text"];
                            dataType = dataType[0]
                        }
                        this.responseData = converters[dataType](this, this.responseText, this.responseXML);
                        eventType = statusText = "success";
                        $.log("dummyXHR.dispatch success");
                    } catch(e) {
                        $.log("dummyXHR.dispatch parsererror")
                        statusText = "parsererror : " + e;
                    }
                }
            } else if(status < 0) {
                status = 0;
            }
            this.status = status;
            this.statusText = statusText;
            if(this.timeoutID) {
                clearTimeout(this.timeoutID);
                delete this.timeoutID;
            }
            // 到这要么成功，调用success, 要么失败，调用 error, 最终都会调用 complete
            this.fire(eventType, this.responseData, statusText);
            ajaxflow.fire(eventType);
            this.fire("complete", this.responseData, statusText);
            ajaxflow.fire("complete");
            delete this.transport;
        }
    });


    if($.xhr) {
        var nativeXHR = new $.xhr,
        allowCrossDomain = false;
        if("withCredentials" in nativeXHR) {
            allowCrossDomain = true;
        }
        //【XMLHttpRequest】传送器
        transports._default = $.factory({
            //发送请求
            request: function() {
                var dummyXHR = this.dummyXHR,
                options = dummyXHR.options,
                i;
                $.log("XhrTransport.sending.....");
                if(options.crossDomain && !allowCrossDomain) {
                    $.error("本浏览器不支持crossdomain xhr")
                }
                var nativeXHR = this.nativeXHR = new $.xhr,
                self = this;
                if(options.username) {
                    nativeXHR.open(options.type, options.url, options.async, options.username, options.password);
                } else {
                    nativeXHR.open(options.type, options.url, options.async);
                }
                // 如果支持overrideMimeTypeAPI
                if(dummyXHR.mimeType && nativeXHR.overrideMimeType) {
                    nativeXHR.overrideMimeType(dummyXHR.mimeType);
                }
                if(!options.crossDomain && !dummyXHR.requestHeaders["X-Requested-With"]) {
                    dummyXHR.requestHeaders["X-Requested-With"] = "XMLHttpRequest";
                }
                try {
                    for(i in dummyXHR.requestHeaders) {
                        nativeXHR.setRequestHeader(i, dummyXHR.requestHeaders[i]);
                    }
                } catch(e) {
                    $.log(" nativeXHR setRequestHeader occur error ");
                }

                nativeXHR.send(options.hasContent && options.data || null);
                //在同步模式中,IE6,7可能会直接从缓存中读取数据而不会发出请求,因此我们需要手动发出请求
                if(!options.async || nativeXHR.readyState == 4) {
                    this.respond();
                } else {
                    if(nativeXHR.onerror === null) { //如果支持onerror, onload新API
                        nativeXHR.onload = nativeXHR.onerror = function(e) {
                            this.readyState = 4; //IE9
                            this.status = e.type === "load" ? 200 : 500;
                            self.respond();
                        };
                    } else {
                        nativeXHR.onreadystatechange = function() {
                            self.respond();
                        }
                    }
                }
            },
            //用于获取原始的responseXMLresponseText 修正status statusText
            //第二个参数为1时中止清求
            respond: function(event, abort) {
                // 如果网络问题时访问XHR的属性，在FF会抛异常
                // http://helpful.knobs-dials.com/index.php/Component_returned_failure_code:_0x80040111_(NS_ERROR_NOT_AVAILABLE)
                var nativeXHR = this.nativeXHR,
                dummyXHR = this.dummyXHR,
                detachEvent = false;
                try {
                    if(abort || nativeXHR.readyState == 4) {
                        detachEvent = true;
                        if(abort) {
                            if(nativeXHR.readyState !== 4) { // 完成以后 abort 不要调用
                                //IE的XMLHttpRequest.abort实现于 MSXML 3.0+
                                //http://blogs.msdn.com/b/xmlteam/archive/2006/10/23/using-the-right-version-of-msxml-in-internet-explorer.aspx
                                nativeXHR.abort();
                            }
                        } else {
                            var status = nativeXHR.status,
                            xml = nativeXHR.responseXML;
                            dummyXHR.responseHeadersString = nativeXHR.getAllResponseHeaders();
                            // Construct response list
                            if(xml && xml.documentElement /* #4958 */ ) {
                                dummyXHR.responseXML = xml;
                            }
                            dummyXHR.responseText = nativeXHR.responseText;
                            //火狐在跨城请求时访问statusText值会抛出异常
                            try {
                                var statusText = nativeXHR.statusText;
                            } catch(e) {
                                $.log("xhr statustext error : " + e, 3);
                                statusText = "";
                            }
                            //用于处理特殊情况,如果是一个本地请求,只要我们能获取数据就假当它是成功的
                            if(!status && ajax.isLocal && !dummyXHR.options.crossDomain) {
                                status = dummyXHR.responseText ? 200 : 404;
                            //IE有时会把204当作为1223
                            //returning a 204 from a PUT request - IE seems to be handling the 204 from a DELETE request okay.
                            } else if(status === 1223) {
                                status = 204;
                            }
                            dummyXHR.dispatch(status, statusText);
                        }
                    }
                } catch(firefoxAccessException) {
                    detachEvent = true;
                    $.log(firefoxAccessException);
                    if(!abort) {
                        dummyXHR.dispatch(-1, firefoxAccessException + "");
                    }
                } finally {
                    if(detachEvent) {
                        nativeXHR.onerror = nativeXHR.onload = nativeXHR.onreadystatechange = $.noop;
                    }
                }
            }
        });
    }
    //【script节点】传送器，只用于跨域的情况
    transports.script = $.factory({
        request: function() {
            var self = this,
            dummyXHR = self.dummyXHR,
            options = dummyXHR.options,
            head = $.head,
            script = self.script = DOC.createElement("script");
            $.log("ScriptTransport.sending.....");
            if(options.charset) {
                script.charset = options.charset;
            }
            //当script的资源非JS文件时,发生的错误不可捕获
            script.onerror = script[script.uniqueID ? "onreadystatechange" : "onload"] = function(e) {
                e = e || event;
                self.respond((e.type || "error").toLowerCase()); // firefox onerror 没有 type ?!
            };
            script.src = options.url
            head.insertBefore(script, head.firstChild);
        },

        respond: function(event, isAbort) {
            var node = this.script,
            dummyXHR = this.dummyXHR;
            // 防止重复调用,成功后 abort
            if(!node) {
                return;
            }
            if(isAbort || /loaded|complete|undefined/i.test(node.readyState) || event == "error") {
                node.onerror = node.onload = node.onreadystatechange = null;
                var parent = node.parentNode;
                if(parent && parent.nodeType === 1) {
                    parent.removeChild(node);
                    delete this.script;
                }
                //如果没有中止请求并没有报错
                if(!isAbort && event != "error") {
                    dummyXHR.dispatch(200, "success");
                }
                // 非 ie<9 可以判断出来
                else if(event == "error") {
                    dummyXHR.dispatch(500, "scripterror");
                }
            }
        }
    });

    //http://www.decimage.com/web/javascript-cross-domain-solution-with-jsonp.html
    //JSONP请求，借用【script节点】传送器
    converters["jsonp"] = function(xhr) {
        var json = $[xhr.jsonp];
        delete $[xhr.jsonp];
        return json;
    }
    ajaxflow.bind("start", function(e, dummyXHR, url, jsonp, jsonpCallback) {
        $.log("jsonp start...");
        var namespace = DOC.URL.replace(/(#.+|\W)/g, '');
        jsonpCallback = dummyXHR.jsonp = jsonpCallback || "jsonp" + dummyXHR.uuid().replace(/-/g, "");
        dummyXHR.options.url = url + (rquery.test(url) ? "&" : "?") + jsonp + "=" + namespace + "." + jsonpCallback;
        dummyXHR.options.dataType = "jsonp";
        //将后台返回的json保存在惰性函数中
        global[namespace][jsonpCallback] = function(json) {
            $[jsonpCallback] = json;
        };
    });

    function createIframe(dummyXHR, transport) {
        var id = "iframe-upload-" + dummyXHR.uniqueID;
        var iframe = $.parseHTML("<iframe " + " id='" + id + "'" + " name='" + id + "'" + " style='position:absolute;left:-9999px;top:-9999px;/>").firstChild;
        iframe.transport = transport;
        return(DOC.body || DOC.documentElement).insertBefore(iframe, null);
    }

    function addDataToForm(data, form, serializeArray) {
        data = $.unparam(data);
        var ret = [],
        d, isArray, vs, i, e;
        for(d in data) {
            isArray = Array.isArray(data[d]);
            vs = isArray ? data[d] : [data[d]]
            // 数组和原生一样对待，创建多个同名输入域
            for(i = 0; i < vs.length; i++) {
                e = DOC.createElement("input");
                e.type = 'hidden';
                e.name = d + (isArray && serializeArray ? "[]" : "");
                e.value = vs[i];
                form.appendChild(e)
                ret.push(e);
            }
        }
        return ret;
    }
    //【iframe】传送器，专门用于上传
    //http://www.profilepicture.co.uk/tutorials/ajax-file-upload-xmlhttprequest-level-2/ 上传
    transports.iframe = $.factory({
        request: function() {
            var dummyXHR = this.dummyXHR,
            options = dummyXHR.options,
            form = options.form
            //form.enctype的值
            //1:application/x-www-form-urlencoded   在发送前编码所有字符（默认）
            //2:multipart/form-data 不对字符编码。在使用包含文件上传控件的表单时，必须使用该值。
            //3:text/plain  空格转换为 "+" 加号，但不对特殊字符编码。
            this.backups = {
                target: form.target || "",
                action: form.action || "",
                enctype: form.enctype,
                method: form.method
            };
            var iframe = createIframe(dummyXHR, this);
            //必须指定method与enctype，要不在FF报错
            //“表单包含了一个文件输入元素，但是其中缺少 method=POST 以及 enctype=multipart/form-data，所以文件将不会被发送。”
            // 设置target到隐藏iframe，避免整页刷新
            form.target = "iframe-upload-" + dummyXHR.uniqueID;
            form.action = options.url;
            form.method = "POST";
            form.enctype = "multipart/form-data";
            this.fields = options.data ? addDataToForm(options.data, form) : [];
            this.form = form; //一个表单元素
            $.log("iframe transport...");
            setTimeout(function() {
                $(iframe).bind("load error", this.respond);
                form.submit();
            });
        },

        respond: function(event) {
            var iframe = this,
            transport = iframe.transport;
            // 防止重复调用 , 成功后 abort
            if(!transport) {
                return;
            }
            $.log("transports.iframe respond")
            var form = transport.form,
            eventType = event.type,
            dummyXHR = transport.dummyXHR;
            iframe.transport = undefined;
            if(eventType == "load") {
                var doc = iframe.contentDocument ? iframe.contentDocument : window.frames[iframe.id].document;
                var iframeDoc = iframe.contentWindow.document;
                if(doc.XMLDocument) {
                    dummyXHR.responseXML = doc.XMLDocument;
                } else if(doc.body) {
                    // response is html document or plain text
                    dummyXHR.responseText = doc.body.innerHTML;
                    dummyXHR.responseXML = iframeDoc;
                    //当，MIME为"text/plain",浏览器会把文本放到一个PRE标签中
                    if(doc.body.firstChild && doc.body.firstChild.nodeName.toUpperCase() == 'PRE') {
                        dummyXHR.responseText = doc.body.firstChild.firstChild.nodeValue;
                    }
                } else {
                    // response is a xml document
                    dummyXHR.responseXML = doc;
                }
                dummyXHR.dispatch(200, "success");
            } else if(eventType == 'error') {
                dummyXHR.dispatch(500, "error");
            }
            for(var i in transport.backups) {
                form[i] = transport.backups[i];
            }
            //还原form的属性
            transport.fields.forEach(function(elem) {
                elem.parentNode.removeChild(elem);
            });
            $(iframe).unbind("load", transport.respond).unbind("error", transport.respond);
            iframe.clearAttributes && iframe.clearAttributes();
            setTimeout(function() {
                // Fix busy state in FF3
                iframe.parentNode.removeChild(iframe);
                $.log("iframe.parentNode.removeChild(iframe)")
            });
        }
    });
    return $;
});

//=========================================
// 动画模块 v6
//==========================================
define("fx", ["$css"], function($) {
    var types = {
        color: /color/i,
        scroll: /scroll/i
    },
    rfxnum = /^([+\-/*]=)?([\d+.\-]+)([a-z%]*)$/i,
    timeline = $.timeline = [] //时间轴
    $.mix({ //缓动公式
        easing: {
            linear: function(pos) {
                return pos;
            },
            swing: function(pos) {
                return(-Math.cos(pos * Math.PI) / 2) + 0.5;
            }
        },
        fps: 30
    })
    //用于向主列队或元素的子列队插入动画实例，并会让停走了的定时器再次动起来


    function tick(fx) {
        if(fx.queue) { //让同一个元素的动画一个接一个执行
            var gotoQueue = true;
            for(var i = timeline.length, el; el = timeline[--i];) {
                if(el.node == fx.node) { //★★★第一步
                    el.positive.push(fx); //子列队
                    gotoQueue = false
                    break;
                }
            }
            if(gotoQueue) { //★★★第二步
                timeline.unshift(fx);
            }
        } else {
            timeline.push(fx)
        }
        if(tick.id === null) {
            tick.id = setInterval(nextTick, 1000 / $.fps); //原始的setInterval id并执行动画
        }
    }
    tick.id = null;
    //用于从主列队中剔除已经完成或被强制完成的动画实例，一旦主列队被清空，还负责中止定时器，节省内存


    function nextTick() {
        var i = timeline.length;
        while(--i >= 0) {
            if(!(timeline[i].node && animate(timeline[i], i))) {
                timeline.splice(i, 1);
            }
        }
        timeline.length || (clearInterval(tick.id), tick.id = null);
    }

    var effect = $.fn.fx = function(props, /*internal*/ p) {
        var opts = resetArguments.apply(null, arguments);
        if((props = opts.props)) {
            var ease = opts.specialEasing;
            for(var name in props) {
                p = $.cssName(name) || name;
                if(name != p) {
                    props[p] = props[name]; //收集用于渐变的属性
                    ease[p] = ease[name];
                    delete ease[name];
                    delete props[name];
                }
            }
        }
        for(var i = 0, node; node = this[i++];) {
            tick( $.mix({
                positive:[],
                negative:[],
                method: "noop",
                node:node
            }, opts, false));
        }
        return this;
    }
    $.fn.animate = effect;
    //.animate( properties [, duration] [, easing] [, complete] )
    //.animate( properties, options )


    function addOptions(opts, p) {
        switch($.type(p)) {
            case "Object":
                delete p.props;
                $.mix(opts, p);
                break;
            case "Number":
                opts.duration = p;
                break;
            case "String":
                opts.easing = p;
                break;
            case "Function":
                opts.complete = p;
                break;
        }
    }

    function resetArguments(properties) {
        if(isFinite(properties)) {
            return {
                duration: properties
            }
        }
        var opts = {
            props: properties
        }
        //如果第二参数是对象
        for(var i = 1; i < arguments.length; i++) {
            addOptions(opts, arguments[i]);
        }
        opts.duration = typeof opts.duration == "number" ? opts.duration : 400;
        opts.queue = !! (opts.queue == null || opts.queue); //默认使用列队
        opts.specialEasing = opts.specialEasing || {};
        return opts;
    };

    effect.updateHooks = {
        _default: function(node, per, end, obj) {
            $.css(node, obj.name, (end ? obj.to : obj.from + obj.easing(per) * (obj.to - obj.from)) + obj.unit)
        },
        color: function(node, per, end, obj) {
            var pos = obj.easing(per),
            rgb = end ? obj.to : obj.from.map(function(from, i) {
                return Math.min(from + (obj.to[i] - from) * pos % 256, 0);
            });
            node.style[obj.name] = "rgb(" + rgb + ")";
        }
    }
    effect.parseHooks = {
        color: function(node, from, to) {
            return [color2array(from), color2array(to)]
        }
    }
    effect._default = $.css, //getter
    effect.scroll = function(el, prop) { //getter
        return el[prop];
    }
    var Animation = {
        fx: function(nodes, properties, args) {
            //由于构建更高级的基于元素节点的复合动画
            var options = {}
            for(var i = 1; i < args.length; i++) {
                addOptions(options, args[i]);
            }
            "before,after".replace($.rword, function(call) {
                options[call] = properties[call];
                delete properties[call];
            });
            return nodes.fx(properties, options);
        },
        noop: function() {},
        type: function(attr) { //  用于取得适配器的类型
            for(var i in types) {
                if(types[i].test(attr)) {
                    return i;
                }
            }
            return "_default";
        },
        //show 开始时计算其width1 height1 保存原来的width height display改为inline-block或block overflow处理 赋值（width1，height1）
        //hide 保存原来的width height 赋值为(0,0) overflow处理 结束时display改为none;
        //toggle 开始时判定其是否隐藏，使用再决定使用何种策略
        show: function(node, fx) {
            if(node.nodeType == 1 && $._isHidden(node)) {
                var display = $._data(node, "olddisplay");
                if(!display || display == "none") {
                    display = $.parseDisplay(node.nodeName)
                    $._data(node, "olddisplay", display);
                }
                node.style.display = display;
                if("width" in fx.props || "height" in fx.props) { //如果是缩放操作
                    //修正内联元素的display为inline-block，以让其可以进行width/height的动画渐变
                    if(display === "inline" && $.css(node, "float") === "none") {
                        if(!$.support.inlineBlockNeedsLayout) { //w3c
                            node.style.display = "inline-block";
                        } else { //IE
                            if(display === "inline") {
                                node.style.display = "inline-block";
                            } else {
                                node.style.display = "inline";
                                node.style.zoom = 1;
                            }
                        }
                    }
                }
            }
        },
        hide: function(node, fx) {
            if(node.nodeType == 1 && !$._isHidden(node)) {
                var display = $.css(node, "display"),
                s = node.style;
                if(display !== "none" && !$._data(node, "olddisplay")) {
                    $._data(node, "olddisplay", display);
                }
                if("width" in fx.props || "height" in fx.props) { //如果是缩放操作
                    //确保内容不会溢出,记录原来的overflow属性，因为IE在改变overflowX与overflowY时，overflow不会发生改变
                    fx.overflow = [s.overflow, s.overflowX, s.overflowY];
                    s.overflow = "hidden";
                }
                fx.after = function(node, fx) {
                    s.display = "none";
                    if(fx.overflow != null) {
                        ["", "X", "Y"].forEach(function(postfix, index) {
                            s["overflow" + postfix] = fx.overflow[index]
                        });
                    }
                };
            }
        },
        toggle: function(node) {
            $[$._isHidden(node) ? "show" : "hide"](node);
        },
        //用于生成动画实例的关键帧（第一帧与最后一帧）所需要的计算数值与单位，并将回放用的动画放到negative子列队中去
        create: function(node, fx, index) {
            var to, parts, unit, op, parser, props = [],
            revertProps = [],
            orig = {},
            hidden = $._isHidden(node),
            ease = fx.specialEasing,
            hash = fx.props,
            easing = fx.easing //公共缓动公式
            if(!hash.length) {
                for(var name in hash) {
                    if(!hash.hasOwnProperty(name)) {
                        continue
                    }
                    var val = hash[name] //取得结束值
                    var type = Animation.type(name); //取得类型
                    var from = (effect[type] || effect._default)(node, name); //取得起始值
                    //用于分解属性包中的样式或属性,变成可以计算的因子
                    if(val === "show" || (val === "toggle" && hidden)) {
                        val = $._data(node, "old" + name) || from;
                        fx.method = "show";
                        from = 0;
                        $.css(node, name, 0);
                    } else if(val === "hide" || val === "toggle") { //hide
                        orig[name] = $._data(node, "old" + name, from);
                        fx.method = "hide";
                        val = 0;
                    }
                    if((parser = effect.parseHooks[type])) {
                        parts = parser(node, from, val);
                    } else {
                        from = !from || from == "auto" ? 0 : parseFloat(from) //确保from为数字
                        if((parts = rfxnum.exec(val))) {
                            to = parseFloat(parts[2]), //确保to为数字
                            unit = $.cssNumber[name] ? 0 : (parts[3] || "px");
                            if(parts[1]) {
                                op = parts[1].charAt(0); //操作符
                                if(unit && unit !== "px" && (op == "+" || op == "-")) {
                                    $.css(node, name, (to || 1) + unit);
                                    from = ((to || 1) / parseFloat($.css(node, name))) * from;
                                    $.css(node, name, from + unit);
                                }
                                if(op) { //处理+=,-= \= *=
                                    to = eval(from + op + to);
                                }
                            }
                            parts = [from, to]
                        } else {
                            parts = [0, 0]
                        }
                    }
                    from = parts[0];
                    to = parts[1];
                    if(from + "" === to + "") { //不处理初止值都一样的样式与属性
                        continue
                    }
                    var prop = {
                        name: name,
                        from: from,
                        to: to,
                        type: type,
                        easing: $.easing[String(ease[name] || easing).toLowerCase()] || $.easing.swing,
                        unit: unit
                    }
                    props.push(prop);
                    revertProps.push($.mix({}, prop, {
                        to: from,
                        from: to
                    }))
                }
                fx.props = props;
                fx.revertProps = revertProps;
                fx.orig = orig;
            }
            if(fx.record || fx.revert) {
                var fx2 = {}; //回滚到最初状态
                for(name in fx) {
                    fx2[name] = fx[name];
                }
                fx2.record = fx2.revert = void 0
                fx2.props = fx.revertProps.concat();
                fx2.revertProps = fx.props.concat();
                var el = $.timeline[index];
                el.negative.push(fx2); //添加已存负向列队中
            }
        }
    }
    //驱动主列队的动画实例进行补间动画(update)，执行各种回调（before, step, after, complete），
    //并在动画结束后，从子列队选取下一个动画实例取替自身


    function callback(fx, node, name) {
        if(fx[name]) {
            fx[name].call(node, node, fx);
        }
    }

    function animate(fx, index) {
        var node = fx.node,
        now = +new Date;
        if(!fx.startTime) { //第一帧
            callback(fx, node, "before"); //动画开始前的预操作
            fx.props && Animation.create(fx.node, fx, index); //添加props属性与设置负向列队
            fx.props = fx.props || []
            Animation[fx.method].call(node, node, fx); //这里用于设置node.style.display
            fx.startTime = now;
        } else {
            var per = (now - fx.startTime) / fx.duration;
            var end = fx.gotoEnd || per >= 1;
            var hooks = effect.updateHooks
            // 处理渐变
            for(var i = 0, obj; obj = fx.props[i++];) {
                (hooks[obj.type] || hooks._default)(node, per, end, obj);
            }
            if(end) { //最后一帧
                if(fx.method == "hide") {
                    for(var i in fx.orig) { //还原为初始状态
                        $.css(node, i, fx.orig[i]);
                    }
                }
                callback(fx, node, "after"); //动画结束后执行的一些收尾工作
                callback(fx, node, "complete"); //执行用户回调
                if(fx.revert && fx.negative.length) {
                    Array.prototype.unshift.apply(fx.positive, fx.negative.reverse());
                    fx.negative = []; // 清空负向列队
                }
                var neo = fx.positive.shift();
                if(!neo) {
                    return false;
                }
                timeline[index] = neo;
                neo.positive = fx.positive;
                neo.negative = fx.negative;
            } else {
                callback(fx, node, "step"); //每执行一帧调用的回调
            }
        }
        return true;
    }
    $.fn.delay = function(ms) {
        return this.fx(ms);
    }
    //如果clearQueue为true，是否清空列队
    //如果gotoEnd 为true，是否跳到此动画最后一帧
    $.fn.stop = function(clearQueue, gotoEnd) {
        clearQueue = clearQueue ? "1" : ""
        gotoEnd = gotoEnd ? "1" : "0"
        var stopCode = parseInt(clearQueue + gotoEnd, 2); //返回0 1 2 3
        return this.each(function(node) {
            for(var i = 0, fx; fx = timeline[i]; i++) {
                if(fx.node === node) {
                    switch(stopCode) { //如果此时调用了stop方法
                        case 0:
                            //中断当前动画，继续下一个动画
                            fx.update = fx.step = $.noop
                            fx.revert && fx.negative.shift();
                            fx.gotoEnd = true;
                            break;
                        case 1:
                            //立即跳到最后一帧，继续下一个动画
                            fx.gotoEnd = true;
                            break;
                        case 2:
                            //清空该元素的所有动画
                            delete fx.node
                            break;
                        case 3:
                            Array.prototype.unshift.apply(fx.positive, fx.negative.reverse());
                            fx.negative = []; // 清空负向列队
                            for(var j = 0; fx = fx.positive[j++];) {
                                fx.before = fx.after = fx.step = $.noop
                                fx.gotoEnd = true; //立即完成该元素的所有动画
                            }
                            break;
                    }
                }
            }
        });
    }

    var fxAttrs = [
    ["height", "marginTop", "marginBottom", "paddingTop", "paddingBottom"],
    ["width", "marginLeft", "marginRight", "paddingLeft", "paddingRight"],
    ["opacity"]
    ]

    function genFx(type, num) { //生成属性包
        var obj = {};
        fxAttrs.concat.apply([], fxAttrs.slice(0, num)).forEach(function(name) {
            obj[name] = type;
            if(~name.indexOf("margin")) {
                effect.updateHooks[name] = function(node, per, end, obj) {
                    var val = (end ? obj.to : obj.from + (obj.from - obj.to) * obj.easing(per));
                    node.style[name] = Math.max(val, 0) + obj.unit;
                }
            }
        });
        return obj;
    }

    var effects = {
        slideDown: genFx("show", 1),
        slideUp: genFx("hide", 1),
        slideToggle: genFx("toggle", 1),
        fadeIn: {
            opacity: "show"
        },
        fadeOut: {
            opacity: "hide"
        },
        fadeToggle: {
            opacity: "toggle"
        }
    }

    $.each(effects, function(props, method) {
        $.fn[method] = function() {
            return Animation.fx(this, props, arguments);
        }
    });

    ["toggle", "show", "hide"].forEach(function(name, i) {
        var pre = $.fn[name];
        $.fn[name] = function(a) {
            if(!arguments.length || typeof a == "boolean") {
                return pre.apply(this, arguments)
            } else {
                return Animation.fx(this, genFx(name, 3), arguments);
            }
        };
    });

    function beforePuff(node, fx) {
        var position = $.css(node, "position"),
        width = $.css(node, "width"),
        height = $.css(node, "height"),
        left = $.css(node, "left"),
        top = $.css(node, "top");
        node.style.position = "relative";
        $.mix(fx.props, {
            width: "*=1.5",
            height: "*=1.5",
            opacity: "hide",
            left: "-=" + parseInt(width) * 0.25,
            top: "-=" + parseInt(height) * 0.25
        });
        fx.after = function(node, fx) {
            node.style.position = position;
            node.style.width = width;
            node.style.height = height;
            node.style.left = left;
            node.style.top = top;
        }
    }
    //扩大1.5倍并淡去
    $.fn.puff = function() {
        return Animation.fx(this, {
            before: beforePuff
        }, arguments);
    }
    var colorMap = {
        "black": [0, 0, 0],
        "gray": [128, 128, 128],
        "white": [255, 255, 255],
        "orange": [255, 165, 0],
        "red": [255, 0, 0],
        "green": [0, 128, 0],
        "yellow": [255, 255, 0],
        "blue": [0, 0, 255]
    };

    function parseColor(color) {
        var value;
        $.callSandbox($.html, function(doc) {
            var range = doc.body.createTextRange();
            doc.body.style.color = color;
            value = range.queryCommandValue("ForeColor");
        });
        return [value & 0xff, (value & 0xff00) >> 8, (value & 0xff0000) >> 16];
    }

    function color2array(val) { //将字符串变成数组
        var color = val.toLowerCase(),
        ret = [];
        if(colorMap[color]) {
            return colorMap[color];
        }
        if(color.indexOf("rgb") == 0) {
            var match = color.match(/(\d+%?)/g),
            factor = match[0].indexOf("%") !== -1 ? 2.55 : 1
            return(colorMap[color] = [parseInt(match[0]) * factor, parseInt(match[1]) * factor, parseInt(match[2]) * factor]);
        } else if(color.charAt(0) == '#') {
            if(color.length == 4) color = color.replace(/([^#])/g, '$1$1');
            color.replace(/\w{2}/g, function(a) {
                ret.push(parseInt(a, 16))
            });
            return(colorMap[color] = ret);
        }
        if(window.VBArray) {
            return(colorMap[color] = parseColor(color));
        }
        return colorMap.white;
    }
    $.parseColor = color2array
    if($.query && $.query.pseudoHooks) {
        $.query.pseudoHooks.animated = function(el) {
            for(var i = 0, fx; fx = timeline[i++];) {
                if(el == fx.node) {
                    return true
                }
            }
        }
    }
    return $;
})



}(self, self.document); //为了方便在VS系列实现智能提示,把这里的this改成self或window

