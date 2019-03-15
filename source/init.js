'use strict';

const extension = require('./extension');

module.exports = function (server) {
	for (var n in server.services) {
		var service = server.services[n];

		if (service.extensions && service.extensions.vue) {
			extension.setup(service, {
				vendors : {
					'vue'       : {
						dev : require.resolve('vue/dist/vue.js'),
						min : require.resolve('vue/dist/vue.min.js')
					},
					'router'    : {
						dev : require.resolve('vue-router/dist/vue-router.js'),
						min : require.resolve('vue-router/dist/vue-router.min.js')
					},
					'jquery'    : {
						dev : require.resolve('jquery/dist/jquery.js'),
						min : require.resolve('jquery/dist/jquery.min.js'),
						map : [
							require.resolve('jquery/dist/jquery.min.map')
						]
					},
					'socket.io' : {
						dev : require.resolve('socket.io-client/dist/socket.io.dev.js'),
						min : require.resolve('socket.io-client/dist/socket.io.js'),
						map : [
							require.resolve('socket.io-client/dist/socket.io.dev.js.map'),
							require.resolve('socket.io-client/dist/socket.io.js.map')
						]
					},
					'axios'     : {
						dev : require.resolve('axios/dist/axios.js'),
						min : require.resolve('axios/dist/axios.min.js'),
						map : [
							require.resolve('axios/dist/axios.map'),
							require.resolve('axios/dist/axios.min.map')
						]
					}
				}
			});
		}
	}
};