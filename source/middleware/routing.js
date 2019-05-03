'use strict';

const utils = require('../common/utils');

module.exports = {
	retrieve : function (service) {

		let pushRoutesFor = function (routes, container) {
			let result = [];
			for (let r in routes) {
				let route = routes[r];
				if (route.type !== 'action' && (!container || (container === route.container && !route.parent))) {
					result.push({
						name      : route.identifier,
						path      : route.path,// === '/' ? '/_public' : route.path,//route.link.endsWith('/') ? route.link + route.name : route.link,
						alias     : route.alias !== null ? route.alias : undefined,
						component : 'anxeb.vue.retrieve.view(\'' + route.name + '\', \'' + route.view + '\', \'' + (route.$params.script || route.view) + '\')',
						children  : pushRoutesFor(route.childs)
					});
				}
			}
			return result;
		};

		let containers = [];
		let routes = [];
		for (let r in service.routing.routes) {
			let route = service.routing.routes[r];
			if (route.type !== 'action' && !route.parent && route.container) {
				if (containers.indexOf(route.container) < 0) {
					containers.push(route.container);
					let childs = pushRoutesFor(service.routing.routes, route.container, route.container);

					let alias = undefined;
					for (let c = 0; c < childs.length; c++) {
						let croute = childs[c];
						if (croute.path === '/') {
							alias = '/';
							break;
						}
					}

					routes.push({
						name      : childs.length ? null : route.container,
						path      : '/_' + route.container,
						alias     : alias,
						component : 'anxeb.vue.retrieve.container(\'' + route.container + '\')',
						children  : childs
					});
				}
			}
		}

		let result = [];
		result.push('anxeb.vue.router = new VueRouter(' + utils.data.format({
			routes : routes,
			mode   : 'history'
		}, '', true) + ');');

		return result;
	}
};