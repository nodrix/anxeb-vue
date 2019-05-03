'use strict';

const utils = require('./common/utils');
const routing = require('./middleware/routing');

module.exports = {
	setup : function (service, params) {
		let _self = this;
		_self.service = service;
		_self.vendors = params.vendors;
		_self.settings = (_self.service.extensions ? _self.service.extensions.vue : undefined) || {};

		if (_self.settings.includes) {
			_self.service.parameters.fill(_self.settings, 'includes');
			_self.service.parameters.fill(_self.settings, 'scopes');
			_self.service.parameters.fill(_self.settings, 'root');
			_self.service.parameters.fill(_self.settings, 'templates');
		}

		if (_self.settings.extension) {
			_self.service.renderer.settings.extension = _self.settings.extension;
			_self.service.renderer.init();
		}

		let lines = ['<!-- Anxeb Vue.js Extension Vendors -->'];

		for (let name in _self.vendors) {
			let dependency = _self.vendors[name];

			_self.service.routing.internal.bundle.include.content('vue/dependency/' + name + '.js', {
				path : _self.settings.development === true ? dependency.dev : dependency.min,
				type : 'application/javascript'
			});

			lines.push('<script src="' + utils.path.join(_self.service.routing.internal.bundle.path, 'vue/dependency/', name + '.js') + '"></script>');

			if (dependency.map) {
				for (let m = 0; m < dependency.map.length; m++) {
					let map = dependency.map[m];
					let mapFile = utils.path.basename(map);
					_self.service.routing.internal.bundle.include.content('vue/dependency/' + mapFile, {
						path : map
					});
				}
			}
		}

		lines.push('\n<!-- Anxeb Vue.js Extension Setup -->');
		lines.push('<script src="' + utils.path.join(_self.service.routing.internal.bundle.path, 'vue/globals.js') + '"></script>');
		lines.push('<script src="' + utils.path.join(_self.service.routing.internal.bundle.path, 'vue/setup.js') + '"></script>');
		lines.push('<script src="' + utils.path.join(_self.service.routing.internal.bundle.path, 'vue/config.js') + '"></script>');

		_self.service.routing.internal.bundle.include.content('vue/config.js', {
			content : 'anxeb.vue.config(' + utils.data.format({
				development : _self.settings.development,
				element     : _self.settings.element,
				delimiters  : _self.settings.delimiters,
				extension   : _self.settings.extension
			}, '', true) + ');',
			type    : 'application/javascript'
		});

		_self.service.routing.internal.bundle.include.content('vue/globals.js', {
			path : require.resolve('./client/globals'),
			type : 'application/javascript'
		});

		_self.service.routing.internal.bundle.include.content('vue/setup.js', {
			path : require.resolve('./client/setup'),
			type : 'application/javascript'
		});

		_self.service.routing.internal.bundle.include.content('vue/routes.js', {
			content : routing.retrieve(_self.service),
			type    : 'application/javascript'
		});

		_self.service.routing.internal.bundle.include.content('vue/init.js', {
			content : 'anxeb.vue.init();',
			type    : 'application/javascript'
		});

		if (_self.settings.templates) {
			let files = _self.service.fetch.files(_self.settings.templates, {
				subfolders : true,
				endsWith   : _self.settings.extension || '.html'
			});
			if (files.length) {
				for (let s = 0; s < files.length; s++) {
					let file = files[s];
					_self.service.routing.internal.bundle.include.content('vue/templates/' + file.filePath, {
						path : file.fullPath,
						type : 'application/html'
					});
				}
			}
		}

		if (_self.settings.root) {
			_self.service.routing.internal.bundle.include.content('vue/root.js', {
				path : _self.settings.root,
				type : 'application/javascript'
			});
			lines.push('<script src="' + utils.path.join(_self.service.routing.internal.bundle.path, 'vue/root.js') + '"></script>');
		}

		if (_self.settings.scopes) {
			let scopes = _self.service.fetch.files(_self.settings.scopes);
			if (scopes.length) {
				let scopeItems = [];

				for (let s = 0; s < scopes.length; s++) {
					let scope = scopes[s];
					_self.service.routing.internal.bundle.include.content('vue/scopes/' + scope.filePath, {
						path : scope.fullPath,
						type : 'application/javascript'
					});
					scopeItems.push('anxeb.vue.include.script("' + scope.filePath + '");');
				}

				_self.service.routing.internal.bundle.include.content('vue/scopes.js', {
					content : scopeItems,
					type    : 'application/javascript'
				});
				lines.push('<script src="' + utils.path.join(_self.service.routing.internal.bundle.path, '/vue/scopes.js') + '"></script>');
			}
		}

		if (_self.settings.includes) {
			let includes = _self.service.fetch.files(_self.settings.includes);

			if (includes.length) {
				lines.push('\n<!-- Anxeb Vue.js Extension Includes -->');

				for (let s = 0; s < includes.length; s++) {
					let include = includes[s];

					if (!_self.settings.scopes || !include.fullPath.startsWithAny(_self.settings.scopes)) {
						_self.service.routing.internal.bundle.include.content('vue/includes/' + include.filePath, {
							path : include.fullPath,
							type : 'application/javascript'
						});
						lines.push('<script src="' + utils.path.join(_self.service.routing.internal.bundle.path, '/vue/includes/', include.filePath) + '"></script>');
					}
				}
			}
		}

		lines.push('\n<!-- Anxeb Vue.js Extension Init -->');
		lines.push('<script src="' + utils.path.join(_self.service.routing.internal.bundle.path, '/vue/routes.js') + '"></script>');
		lines.push('<script src="' + utils.path.join(_self.service.routing.internal.bundle.path, '/vue/init.js') + '"></script>');

		_self.service.renderer.include.partial('anxeb.vue', lines);
	}
};