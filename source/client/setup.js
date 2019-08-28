anxeb = anxeb || {};
anxeb.vue = anxeb.vue || {
	scopes       : {},
	scripts      : {},
	helpers      : {},
	dependencies : {},
	services     : {},
	factories    : {},
	config       : function (settings) {
		this.settings = settings;
	}
};

anxeb.vue.init = function () {
	var settings = anxeb.vue.settings.root || {
		delimiters : anxeb.vue.settings.delimiters,
		el         : anxeb.vue.settings.element
	};

	settings.provide = settings.provide || {};
	settings.el = settings.el || '#app';
	settings.delimiters = settings.delimiters || ['${', '}'];

	if (anxeb.vue.router) {
		settings.router = anxeb.vue.router;
		settings.router.afterEach(function (to, from) {

		});
	}

	for (var dep  in anxeb.vue.dependencies) {
		var obj = anxeb.vue.dependencies[dep];
		settings.provide[dep] = obj;

		if (typeof obj === 'function') {
			settings.methods[dep] = obj;
		} else {
			settings.data[dep] = obj
		}
	}

	settings.methods.$broadcast = function (name, callback) {
		var _root = this;

		var broad = function (childs) {
			for (var i = 0; i < childs.length; i++) {
				var component = childs[i];
				if (component.$options.name === name || component.$vnode.data.ref === name) {
					if (callback(component) === false) {
						return false;
					}
				}
				if (component.$children) {
					if (broad(component.$children) === false) {
						return false;
					}
				}
			}
		};

		broad(_root.$children);
	};

	settings.methods.$fetch = function (name, timeout) {
		var _root = this;

		return new Promise(function (resolve, reject) {
			var _resolved = false;
			var _timeout = false;

			timeout = timeout || 2000;

			var startTick = Date.now();
			var broad = function () {
				if (_resolved || _timeout) {
					return;
				}
				_root.$broadcast(name, function (component) {
					if (_resolved === false && _timeout === false) {
						_resolved = true;
						resolve(component);
					}
				});

				var cnow = Date.now() - startTick;
				if (cnow < timeout) {
					if (!_timeout) {
						setTimeout(function () {
							broad();
						}, 10);
					}
				} else {
					_timeout = true;
					reject();
				}
			};

			broad();
		});
	};

	if (anxeb.vue.settings.development) {
		console.log('\n%cWelcome to Anxeb Vue Extension\n', 'color:#aaaaff');
	}

	$(document).ready(function () {
		anxeb.vue.root = new Vue(settings);
		anxeb.vue.helpers.root = anxeb.vue.root;
	});
};

anxeb.vue.script = function (name, scriptFile) {
	var _self = this;
	_self.name = name;
	_self.url = anxeb.settings.routing.bundle.path + '/vue/scopes/' + scriptFile;
	_self.loaded = false;
	_self.loading = false;
	_self.data = null;

	let _wating = [];

	let resolveWaiters = function (data) {
		for (let i = 0; i < _wating.length; i++) {
			var wat = _wating[i];
			if (wat.resolve) {
				wat.resolve(data, true);
			}
		}
		_self.loading = false;
		_wating = [];
	};

	let rejectWaiters = function (err) {
		for (let i = 0; i < _wating.length; i++) {
			var wat = _wating[i];
			if (wat.reject) {
				wat.reject(err);
			}
		}
		_wating = [];
	};

	_self.fetch = function (resolve, reject) {
		if (_self.loading) {
			_wating.push({
				resolve : resolve,
				reject  : reject
			});
		} else {
			_self.loading = true;
			if (_self.loaded) {
				if (resolve) {
					resolve(_self.data, true);
				}
			} else {
				$.ajax({
					method   : 'GET',
					url      : _self.url,
					dataType : 'script',
				}).done(function (script, statusText, xhr) {
					_self.loaded = true;
					_self.data = script;
					if (resolve) {
						resolve(_self.data, false);
					}
					resolveWaiters(_self.data);
				}).fail(function (err) {
					if (reject) {
						reject(err);
					}
					rejectWaiters(err);
				});
			}
		}
	};
};

anxeb.vue.page = function (scope) {
	var _self = this;
	var _scope = scope;
	var _router = anxeb.vue.router;

	_self.navigate = function (path, query) {
		return new Promise(function (resolve, reject) {
			_router.push({ path : path, query : query }, function () {
				resolve();
			}, function (res) {
				var err = res && res.response && res.response.data ? res.response.data : res;

				if (anxeb.vue.root.onError) {
					anxeb.vue.root.onError(err)
				}

				if (err && (err.code === 401 || err.code === 6013 || err.code === 6012 || err.code === 6006)) {
					_router.push({
						path  : anxeb.settings.routing.defaults.unauthorized,
						query : { unauth : err.code }
					}, function () {
						resolve();
					}, function (res) {
						var err = res && res.response && res.response.data ? res.response.data : res;
						reject(err);
					});
				} else {
					reject(err);
				}
			});
		});
	};

	_self.name = scope.name;
};

anxeb.vue.scope = function (name, params) {
	var _self = this;
	_self.name = name;
	_self.params = params || null;

	_self.page = new anxeb.vue.page(_self);


	var setupEvent = function (params, componentEvent, scopeEvent) {
		var allEvents = [function () {
			if (anxeb.vue.root[scopeEvent]) {
				anxeb.vue.root[scopeEvent](this)
			}
		}];

		var userEvents = params[componentEvent] || [];

		if (userEvents instanceof Array) {
			allEvents = allEvents.concat(userEvents);
		} else {
			allEvents.push(userEvents);
		}
		params[componentEvent] = allEvents;
	};

	_self.setup = function (params, events) {
		if (!_self.params) {
			_self.params = params || {};
		}
		_self.params.delimiters = params.delimiters || _self.params.delimiters || anxeb.vue.settings.delimiters;
		_self.params.name = params.key || _self.params.name || _self.name;
		_self.params.template = params.template;
		_self.params.inject = _self.params.inject || [];

		if (events) {
			setupEvent(_self.params, 'beforeCreate', 'onScopeBeforeCreate');
			setupEvent(_self.params, 'created', 'onScopeCreated');
			setupEvent(_self.params, 'beforeMount', 'onScopeBeforeMount');
			setupEvent(_self.params, 'mounted', 'onScopeMounted');
			setupEvent(_self.params, 'beforeUpdate', 'onScopeBeforeUpdate');
			setupEvent(_self.params, 'updated', 'onScopeUpdated');
			setupEvent(_self.params, 'activated', 'onScopeActivated');
			setupEvent(_self.params, 'deactivated', 'onScopeDeactivated');
			setupEvent(_self.params, 'beforeDestroy', 'onScopeBeforeDestroy');
			setupEvent(_self.params, 'destroyed', 'onScopeDestroyed');
			setupEvent(_self.params, 'errorCaptured', 'onScopeErrorCaptured');
		}

		for (var dep  in anxeb.vue.dependencies) {
			if (typeof _self.params.inject.push === 'function') {
				_self.params.inject.push(dep);
			}
		}
		return _self;
	};

	_self.send = function (resolve) {
		if (_self.params) {
			resolve(_self.params);
		} else {
			anxeb.vue.log.warning('Scope [0] params not defined.', _self.name);
			resolve({
				name     : _self.params,
				template : '<div></div>',
				data     : function () { return {} }
			});
		}
	};
};

anxeb.vue.include = {
	root      : function (params) {
		anxeb.vue.settings.root = params;
	},
	filter    : function (name, params) {
		if (name && params) {
			Vue.filter(name, params)
		}
	},
	directive : function (name, params) {
		if (name && params) {
			if (typeof params === 'function') {
				Vue.directive(name, params(anxeb.vue.helpers));
			} else {
				Vue.directive(name, params)
			}
		}
	},
	factory   : function (name, params) {
		if (name) {
			if (typeof params === 'function') {
				anxeb.vue.dependencies[name] = function (options) {
					var factory = new params(anxeb.vue.helpers, this, options);
					anxeb.vue.factories[name] = factory;
					return factory;
				};
			} else {
				anxeb.vue.dependencies[name] = params;
				anxeb.vue.factories[name] = params;
			}
		}
	},
	service   : function (name, params) {
		if (name) {
			if (typeof params === 'function') {
				var service = new params(anxeb.vue.helpers);
				anxeb.vue.services[name] = service;
				if (typeof service === 'function') {
					anxeb.vue.dependencies[name] = function (options) {
						return service(this, options);
					};
				} else {
					anxeb.vue.dependencies[name] = service;
				}
			} else {
				anxeb.vue.dependencies[name] = params;
				anxeb.vue.services[name] = params;
			}
		}
	},
	helper    : function (name, params) {
		if (name) {
			if (typeof params === 'function') {
				anxeb.vue.helpers[name] = new params();
			} else {
				anxeb.vue.helpers[name] = params;
			}
		}
	},
	scope     : function (name, params) {
		if (name) {
			var scope = new anxeb.vue.scope(name);
			anxeb.vue.scopes[name] = scope;

			if (typeof params === 'function') {
				scope.setup(params(anxeb.vue.helpers, scope.page))
			} else {
				scope.setup(params);
			}
		}
	},
	script    : function (scriptFile) {
		var name = scriptFile;
		var jsIndex = scriptFile.lastIndexOf('.js');
		if (jsIndex > -1) {
			name = scriptFile.substr(0, jsIndex);
		}
		anxeb.vue.scripts[name] = new anxeb.vue.script(name, scriptFile);
	},
	component : function (name, params) {
		var cparams = {};
		if (typeof params === 'function') {
			cparams = new params(anxeb.vue.helpers);
		} else {
			cparams = params;
		}

		cparams.delimiters = cparams.delimiters || anxeb.vue.settings.delimiters;
		cparams.name = cparams.name || name;

		if (cparams.template && cparams.template.startsWith('/')) {
			Vue.component(name, function (resolve, reject) {
				axios({
					method : 'GET',
					url    : anxeb.settings.routing.bundle.path + '/vue/templates' + cparams.template
				}).then(function (res) {
					cparams.template = res.data;
					resolve(cparams);
				}).catch(reject);
			});
		} else {
			Vue.component(name, cparams);
		}
	}
};

anxeb.vue.storage = {
	save  : function (key, obj) {
		localStorage[key] = JSON.stringify(obj);
	},
	fetch : function (key) {
		var data = localStorage[key];
		if (data) {
			return JSON.parse(data);
		} else {
			return null;
		}
	}
};

anxeb.vue.log = {
	debug   : function (msg, a, b) {
		if (anxeb.vue.settings.development) {
			var result = msg;
			if (a) {
				result = result.replaceAll('[0]', '%c' + a + '%c');
			} else {
				result += '%c%c';
			}
			if (b) {
				result = result.replaceAll('[1]', '%c' + b + '%c');
			} else {
				result += '%c%c';
			}
			console.log('%cAnxeb Vue / %cDebug :%c ' + result, 'color:#999999', 'color:#9999ff', 'color:#ffaaaa', 'color:red', 'color:#ffaaaa', 'color:red', 'color:red');
		}
	},
	warning : function (msg, a, b) {
		if (anxeb.vue.settings.development) {
			var result = msg;
			if (a) {
				result = result.replaceAll('[0]', '%c' + a + '%c');
			} else {
				result += '%c%c';
			}
			if (b) {
				result = result.replaceAll('[1]', '%c' + b + '%c');
			} else {
				result += '%c%c';
			}
			console.log('%cAnxeb Vue / %cWarning :%c ' + result, 'color:#999999', 'color:red', 'color:#ffaaaa', 'color:red', 'color:#ffaaaa', 'color:red', 'color:red');
		}
	}
};

anxeb.vue.retrieve = {
	component : function (params, resolve, reject) {
		var scope = anxeb.vue.scopes[params.name];

		var resolveDefault = function () {
			resolve({
				delimiters : anxeb.vue.settings.delimiters,
				name       : params.key,
				template   : params.template,
				data       : function () {
					return { name : 'default scope ' };
				}
			});
		};

		if (scope) {
			scope.setup(params, true).send(resolve);
		} else {
			var script = anxeb.vue.scripts[params.script];
			if (script) {
				script.fetch(function (data, loaded) {
					var scope = anxeb.vue.scopes[params.name];
					if (scope) {
						scope.setup(params, true).send(resolve);
					} else {
						anxeb.vue.log.warning('Scope [0] not found on script [1].', params.name, params.script);
						resolveDefault();
					}
				}, reject);
			} else {
				anxeb.vue.log.warning('Script [0] not found. Could not load scope [1] from it.', params.script, params.name);
				resolveDefault();
			}
		}
	},
	view      : function (name, view, script, scope) {
		var key = view.replaceAll('/', '-');
		return Vue.component(key, function (resolve, reject) {

			axios({
				method : 'GET',
				url    : anxeb.settings.routing.view.path + '/' + view
			}).then(function (res) {
				anxeb.vue.retrieve.component({
					key      : key,
					script   : script || view,
					name     : scope || script || view,
					template : res.data
				}, resolve, reject);
			}).catch(reject);
		});
	},
	container : function (container) {
		var key = container.replaceAll('/', '-');
		return Vue.component(key, function (resolve, reject) {
			axios({
				method : 'GET',
				url    : anxeb.settings.routing.container.path + '/' + container
			}).then(function (res) {
				anxeb.vue.retrieve.component({
					key      : key,
					script   : container,
					name     : container,
					template : res.data
				}, resolve, reject);
			}).catch(reject);
		});
	}
};

axios.interceptors.request.use(function (config) {
	config.headers['Source'] = 'Anxeb';

	return config;
}, function (error) {
	return Promise.reject(error);
});

anxeb.vue.helpers = {
	socket  : io,
	axios   : axios,
	jquery  : $,
	log     : anxeb.vue.log,
	storage : anxeb.vue.storage
};