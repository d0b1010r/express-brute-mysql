var AbstractClientStore = require('express-brute/lib/AbstractClientStore');
var mysql = require('mysql');
var _ = require('underscore');

module.exports = function MysqlStore (options) {
	AbstractClientStore.apply(this, arguments);
	var client = this.client = mysql.createConnection(this.options);
	this.options = _.extend({}, MysqlStore.defaults, options);
	client.connect();
	client.query('CREATE TABLE IF NOT EXISTS `'  + this.options.table + '` (`id` varchar(255), `data` TEXT, `expires` datetime, PRIMARY KEY (`id`))', function (err, res) {
	});
};
MysqlStore.prototype = Object.create(AbstractClientStore.prototype);
MysqlStore.prototype.set = function mysqlstore_set (key, value, lifetime, callback) {
	lifetime = parseInt(lifetime, 10) || 0;
	var expires = new Date(Date.now() + lifetime);
	value = JSON.stringify(value);
	this.client.query('REPLACE INTO '  + this.options.table + ' (`id`, `data`, `expires`) VALUES (?, ?, ?)', [key, value, expires], function (err, res) {
		if (callback) { return callback(err, res); }
	});
};
MysqlStore.prototype.get = function mysqlstore_get (key, callback) {
	var options = this.options;
	var client = this.client;
	client.query('SELECT * FROM '  + options.table + ' WHERE `id` = ? LIMIT 1', [key], function (err, res) {
		res = res.length && res[0];
		if (err && callback) { return callback(err); }
		if (callback) {
			var data;
			if (!res) { return callback(); }
			if (res.expires < Date.now()) {
				client.query('DELETE * FROM '  + options.table + ' WHERE `id` = ? LIMIT 1', [key], function (err, res) {
					return callback();
				});
			} else {
				try {
					data = JSON.parse(res.data);
				} catch (err) {
					return callback(err);
				}
				data.lastRequest = new Date(data.lastRequest);
				data.firstRequest = new Date(data.firstRequest);
				return callback(null, data);
			}
		}
	});
};
MysqlStore.prototype.reset = function mysqlstore_reset (key, callback) {
	this.client.query('DELETE FROM '  + this.options.table + ' WHERE `id` = ? LIMIT 1', [key], function (err, res) {
		if (callback) { return callback(err, res); }
	});
};

MysqlStore.defaults = {
	host: '127.0.0.1',
	port: 3306,
	user: 'root',
	password: '',
	table: 'brute_log'
};

