
const file_handling = require("./file_handling.js");
const crypto = require('crypto');
const utilities = require("./utilities.js");
const status_codes = require('http-status-codes').StatusCodes;

//User constructor 
const User = function(email, password, full_name, user_id){
	this.email_address = email;
	this.name = full_name;
	this.id = user_id;
	this.status = status_created;
	this.creation_date = utilities.get_date_and_time(); 
	this.salt = crypto.randomBytes(16).toString('hex');
	this.hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64, `sha512`).toString(`hex`);
}

const compare_user = function(user1, user2){
	return user2.id - user1.id
}

function check_password(password, user_data){
	let hash = crypto.pbkdf2Sync(password, user_data.salt.toString(), 1000, 64, `sha512`).toString(`hex`);
	return (hash == user_data.hash.toString());
}

User.prototype.write_user_data_to_file = async function()
{ 	
	let path_dir = "./users/" + this.id
	await file_handling.fs.mkdir(path_dir);
	await file_handling.fs.writeFile( path_dir + file_handling.user_details_file, JSON.stringify(this) );
}

const status_created = "created"
const status_active = "active";
const status_suspended = "suspended"
const status_deleted = "deleted";

function check_if_valid_status(status){
	if(status == null){
		return "There is no status";
	}
	if (status != status_suspended && status != status_active && status != status_deleted){
		return "Invalid status";
	}
	return null;
}

//------------------------------------------------------------------------------------------------
function check_user_status(user_data){
	let message = "";
	let status = status_codes.OK;
	switch(user_data.status){
		case status_created:
			message = "You should wait until the Admin will approve you"
			status = status_codes.UNAUTHORIZED
			break;
		case status_suspended:
			message =  "This account is suspended";
			status = status_codes.UNAUTHORIZED
			break;
		case status_deleted:
			message =  "This account was deleted";
			status = status_codes.UNAUTHORIZED
			break;
		default:
	}
	return new utilities.validator_response(status, message);
}

module.exports = {
    User : User,
	check_user_status : check_user_status,
    compare_user : compare_user,
    status_deleted : status_deleted,
    status_active : status_active,
    status_suspended : status_suspended,
    status_created : status_created,
	check_if_valid_status : check_if_valid_status,
	check_password: check_password
}