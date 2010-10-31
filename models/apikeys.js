(function() {

var DB = Base.loadFile('../util/db.js').DB,
	DBObject = Base.loadFile('../util/dbObject.js').DBObject;

var ApiKey = function(db) {
    ApiKey.superclass.constructor.call(this, db);
};

Base.extend( ApiKey, DBObject);

ApiKey.NAME = "ApiKey";
ApiKey.COLLECTION = "apikeys";

ApiKey.prototype.get = function( customer_key, callback, scope) {
    var db = this._db,
        id = DBObject.toObjectID(customer_key, db);
	    
	this.load( { _id: id }, {}, {}, function(data) {
		if(!scope)
			scope = this;
        if(data && data.length == 1) {
            db.dereference(data[0].owner, function( err, owner) {
                data[0].owner = owner;
                callback.apply(scope, data);
            });
        } else
            callback.apply(scope, data);
	}
	, this);
};

exports.DBO = ApiKey;

})();