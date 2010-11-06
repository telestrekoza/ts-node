(function() {

	
var DB = function(host, port, env) {
	this._host = host ? host : DB.HOST;
	this._port = port ? port : null;
	this._env = env ? env : DB.ENV;
	this.db = null;
};

DB.MODULE_NAME = 'mongodb';
DB.HOST = 'localhost';
DB.ENV = 'dev';

DB.prototype.open = function(callback) {
	var self = this,
		mongo = require( DB.MODULE_NAME ),
		port = this._port ? this._port : mongo.Connection.DEFAULT_PORT,
		db = new mongo.Db( this._env, new mongo.Server(this._host, port, {native_parser:true}), {});
	
	//require('util').log("try to open DB: "+this._env + " " + this._host+":"+ port);
	db.open( function( err, db ) {
		var scope = callback.scope ? callback.scope : this,
			fn = err ? callback.failure : callback.success;
		//require('util').log("call "+scope + "."+fn);
		//require('util').log("call "+scope);
		fn.call( scope, err, db );
	});
};

DB.prototype.toString = function() {
	return "DB " + this.host + ":" + this.port + "/" + this.env;
};

exports.DB = DB;
	
})();
