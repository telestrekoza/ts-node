(function() {

var DB = Base.loadFile('../util/db.js').DB,
	DBObject = Base.loadFile('../util/dbObject.js').DBObject;

var ApiKey = function(db) {
    ApiKey.superclass.constructor.call(this, db, ApiKey.COLLECTION);
};

Base.extend( ApiKey, DBObject);

ApiKey.COLLECTION = "apikeys";

ApiKey.prototype.get = function( customer_key, callback, scope) {
    var id = DBObject.toObjectID(customer_key, this._db);
	    
	this.load( { _id: id }, {}, {}, function(data) {
		if(!scope)
			scope = this;
		callback.apply(scope, data);
	}
	, this);
};

/*
User.prototype.save = function(data, callback, scope) {
    User.superclass.save.apply(this, arguments);
};

User.prototype.create = function(user) {
	if(!user || !user.loginName) {
		return [{}];
	}
	User.superclass.create.call(this, user);
	return [user];
};
*/

ApiKey.prototype.toString = function() {
    return "ApiKey: " + ApiKey.superclass.toString.call(this);
};

exports.DBO = ApiKey;

})();