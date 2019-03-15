'use strict';

const init = require('./source/init');
const pjson = require('./package.json');

module.exports = {
	init        : init,
	name        : pjson.name,
	version     : pjson.version,
	description : pjson.description,
};