'use strict';

const path = require('path');

const utils = {
	data : {
		copy   : function (obj) {
			if (obj) {
				return JSON.parse(JSON.stringify(obj));
			} else {
				return null;
			}
		},
		format : function (obj, prefix, ignoreEdges) {
			var result = [];

			let lines = JSON.stringify(obj, null, 4).split('\n');
			for (let i = 0; i < lines.length; i++) {
				let line = lines[i];

				if (line.indexOf(' "anxeb.') > -1) {
					line = line.replace(' "anxeb.', ' anxeb.');
					line = line.replace(')",', '),');
				}

				if (ignoreEdges) {
					if (i === 0 || i === lines.length - 1) {
						result.push(line);
					} else {
						result.push(prefix + line);
					}
				} else {
					result.push(prefix + line);
				}
			}
			return result.join('\n');
		}
	},
	path : path
};

module.exports = utils;